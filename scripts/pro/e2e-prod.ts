/**
 * Parcours complet de Seedow Pro sur l'application PUBLIÉE, avec un compte et un
 * client FICTIFS. Lancé par le workflow « Pro ops » (tâche e2e), jamais en local
 * sur des données réelles.
 *
 *   bun run scripts/pro/e2e-prod.ts --phase upload   # étapes 1 à 3
 *   (le workflow lance alors `ingest.ts --inbox` : étapes 4 et 5, analyse)
 *   bun run scripts/pro/e2e-prod.ts --phase report   # étapes 6 à 8 + isolation
 *
 *   1. connexion du compte de test, création du cabinet fictif (ou reprise) ;
 *   2. recueil d'un client fictif (parcours « détaillé ») ;
 *   3. dépôt d'une annexe réelle (Ecofi Enjeux Futurs, jeu de référence) ;
 *   6. allocation « ISIN ; montant », aperçu : le fonds est reconnu dans la base ;
 *   7. génération du rapport ;
 *   8. téléchargement : le PDF reçu a l'empreinte enregistrée en base ;
 *   +  isolation : un second compte de test ne voit ni le rapport ni le PDF.
 *
 * Données créées (toutes marquées comme tests) : deux comptes
 * `seedow-pro-e2e-{a,b}@example.com` (domaine réservé aux exemples, aucun
 * e-mail envoyé), un cabinet « Cabinet de démonstration Seedow (fictif) »,
 * ORIAS 00000000, des clients `E2E-…`, leurs fiches de recueil et rapports.
 * Les rapports sont immuables par conception : ils restent, rangés dans ce
 * cabinet fictif. Aucune donnée existante n'est modifiée.
 *
 * Captures d'écran et état : `out/e2e/`. Env : SUPABASE_URL,
 * SUPABASE_SERVICE_ROLE_KEY, VITE_SUPABASE_PUBLISHABLE_KEY, E2E_BASE_URL.
 */
import { createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { createClient } from "@supabase/supabase-js";
// Playwright n'est installé que dans le job « e2e » du workflow (hors lockfile :
// dépendance lourde, inutile à l'application et au Worker) — d'où l'import non typé.
// @ts-expect-error module absent du projet, présent à l'exécution dans le job e2e
import { chromium } from "playwright";
import { z } from "zod";
import { serviceClient } from "./lib/supabase";

type Page = Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>["newPage"]>>;

const { values: opts } = parseArgs({
  options: { phase: { type: "string" }, out: { type: "string", default: "out/e2e" } },
});
const phase = z.enum(["upload", "report"]).parse(opts.phase);
const BASE = (process.env.E2E_BASE_URL ?? "https://seedow.lovable.app").replace(/\/$/, "");
const OUT = opts.out!;
const STATE = join(OUT, "state.json");
const ANNEX = "fixtures/annexes/ecofi-enjeux-futurs-fr.pdf";
const ISIN = "FR0010592022";
const USERS = { a: "seedow-pro-e2e-a@example.com", b: "seedow-pro-e2e-b@example.com" };
const CABINET = { name: "Cabinet de démonstration Seedow (fictif)", orias: "00000000" };

await mkdir(OUT, { recursive: true });
const admin = serviceClient();
const steps: { step: string; ok: boolean; detail: string }[] = [];
const record = (step: string, ok: boolean, detail: string) => {
  steps.push({ step, ok, detail });
  console.log(`${ok ? "✓" : "✗"} ${step} — ${detail}`);
  if (!ok) throw new Error(`${step} : ${detail}`);
};

/** Compte de test confirmé, mot de passe aléatoire renouvelé à chaque run (jamais stocké). */
async function testAccount(email: string): Promise<{ id: string; password: string }> {
  const password = randomBytes(24).toString("base64url");
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => u.email === email);
    if (found) {
      const up = await admin.auth.admin.updateUserById(found.id, { password });
      if (up.error) throw up.error;
      return { id: found.id, password };
    }
    if (data.users.length < 200) break;
  }
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { e2e: true, purpose: "Seedow Pro — test de bout en bout, compte fictif" },
  });
  if (error) throw error;
  return { id: data.user.id, password };
}

async function shot(page: Page, name: string) {
  await page.screenshot({ path: join(OUT, `${phase}-${name}.png`), fullPage: true });
}

async function login(page: Page, email: string, password: string) {
  await page.goto(`${BASE}/auth?mode=login&redirect=${encodeURIComponent("/pro")}`);
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/pro(\/|$|\?)/, { timeout: 30_000 });
}

const browser = await chromium.launch();
const context = await browser.newContext({ acceptDownloads: true, locale: "fr-FR" });
const page = await context.newPage();
page.setDefaultTimeout(30_000);

try {
  const a = await testAccount(USERS.a);
  await login(page, USERS.a, a.password);
  record("1. connexion", true, `compte de test ${USERS.a}`);

  if (phase === "upload") {
    // 1. Cabinet fictif (créé une fois, repris ensuite).
    if (
      await page
        .getByLabel("Nom du cabinet")
        .isVisible()
        .catch(() => false)
    ) {
      await page.getByLabel("Nom du cabinet").fill(CABINET.name);
      await page.getByLabel("Numéro ORIAS").fill(CABINET.orias);
      await page.getByRole("button", { name: "Créer le cabinet" }).click();
      await page.getByRole("navigation", { name: "Seedow Pro" }).waitFor();
      record("1. cabinet", true, `créé : ${CABINET.name}`);
    } else {
      await page.getByRole("navigation", { name: "Seedow Pro" }).waitFor();
      record("1. cabinet", true, "déjà existant, repris");
    }
    await shot(page, "1-cabinet");

    // 2. Client fictif, parcours détaillé.
    const clientRef = `E2E-${new Date().toISOString().slice(0, 16).replace(/\D/g, "")}`;
    await page.goto(`${BASE}/pro/clients/new`);
    await page.locator("#client-ref").fill(clientRef);
    await page.getByRole("button", { name: "Oui", exact: true }).click();
    await page.getByRole("button", { name: "Oui, il les détaille" }).click();
    await page.locator("#sfdr").fill("10");
    await shot(page, "2-recueil");
    await page.getByRole("button", { name: "Enregistrer le recueil" }).click();
    await page.waitForURL(/\/pro\/rapports\/new\?profile=/);
    const profileId = new URL(page.url()).searchParams.get("profile");
    record("2. client fictif", Boolean(profileId), `${clientRef} (profil ${profileId})`);
    const fiche = await admin
      .from("pro_collection_records")
      .select("id, pdf_sha256")
      .eq("client_profile_id", profileId!)
      .maybeSingle();
    record(
      "2. fiche de recueil archivée",
      !fiche.error && Boolean(fiche.data),
      fiche.error?.message ??
        `sha256 ${(fiche.data as { pdf_sha256?: string } | null)?.pdf_sha256}`,
    );

    // 3. Dépôt de l'annexe.
    await page.goto(`${BASE}/pro/fonds`);
    await page.locator("#up-isin").fill(ISIN);
    await page.locator("#up-file").setInputFiles(ANNEX);
    await page.getByRole("button", { name: "Déposer" }).click();
    await page.getByText("Annexe déposée").waitFor();
    await shot(page, "3-depot");
    const inbox = await admin.storage.from("pro-annexes").list(`inbox/${a.id}`, { limit: 100 });
    const deposited = (inbox.data ?? []).some((f) => f.name.startsWith(`${ISIN}__`));
    record("3. dépôt de l'annexe", deposited, `inbox/${a.id}/${ISIN}__…`);

    await writeFile(STATE, JSON.stringify({ profileId, clientRef, userA: a.id }, null, 2));
  } else {
    const state = z
      .object({ profileId: z.string().uuid(), clientRef: z.string(), userA: z.string().uuid() })
      .parse(JSON.parse(await readFile(STATE, "utf8")));

    // 4-5. L'analyse (ingest --inbox) a tourné entre les deux phases.
    const fsd = await admin
      .from("pro_fund_current_data")
      .select("isin, status, min_sustainable_pct, sfdr_article")
      .eq("isin", ISIN)
      .maybeSingle();
    record(
      "4-5. analyse de l'annexe",
      !fsd.error && Boolean(fsd.data),
      fsd.error?.message ?? JSON.stringify(fsd.data),
    );

    // 6. Allocation et aperçu : le fonds est reconnu.
    await page.goto(`${BASE}/pro/rapports/new?profile=${state.profileId}`);
    await page.locator("#isins").fill(`${ISIN} ; 10000`);
    await page.getByRole("button", { name: "Aperçu des résultats" }).click();
    const row = page.locator("tr", { hasText: ISIN });
    await row.first().waitFor();
    await shot(page, "6-apercu");
    record(
      "6. correspondance avec la base",
      true,
      (await row.first().innerText()).replace(/\s+/g, " "),
    );

    // 7. Rapport.
    await page.getByRole("button", { name: /^Générer le rapport/ }).click();
    await page.waitForURL(/\/pro\/rapports\?created=/);
    const reportId = new URL(page.url()).searchParams.get("created")!;
    const rep = await admin
      .from("pro_reports")
      .select("id, pdf_sha256, engine_version")
      .eq("id", reportId)
      .single();
    record("7. rapport généré et archivé", !rep.error, rep.error?.message ?? `rapport ${reportId}`);
    await shot(page, "7-rapports");

    // 8. Téléchargement : même empreinte que la ligne archivée.
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page
        .locator("li", { hasText: `Rapport ${reportId}` })
        .getByRole("button", { name: "Télécharger" })
        .click(),
    ]);
    const file = join(OUT, `rapport-${reportId}.pdf`);
    await download.saveAs(file);
    const bytes = await readFile(file);
    const sha = createHash("sha256").update(bytes).digest("hex");
    const expected = (rep.data as { pdf_sha256: string }).pdf_sha256;
    record(
      "8. export et téléchargement",
      bytes.subarray(0, 4).toString("latin1") === "%PDF" && sha === expected,
      `${bytes.length} octets, sha256 ${sha.slice(0, 16)}… ${sha === expected ? "=" : "≠"} base`,
    );

    // Isolation : le compte B ne voit ni le rapport ni le PDF de A.
    const b = await testAccount(USERS.b);
    const anonKey =
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!anonKey) throw new Error("VITE_SUPABASE_PUBLISHABLE_KEY requise pour le test d'isolation");
    const asB = createClient(process.env.SUPABASE_URL!, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const signIn = await asB.auth.signInWithPassword({ email: USERS.b, password: b.password });
    if (signIn.error) throw signIn.error;
    const seen = await asB.from("pro_reports").select("id").eq("id", reportId);
    const pdf = await asB.storage
      .from("pro-reports")
      .createSignedUrl(
        `${(await admin.from("pro_reports").select("pdf_path").eq("id", reportId).single()).data?.pdf_path}`,
        60,
      );
    record(
      "isolation entre cabinets",
      (seen.data ?? []).length === 0 && Boolean(pdf.error),
      `B voit ${(seen.data ?? []).length} rapport(s) de A ; lien signé du PDF de A : ${pdf.error ? "refusé" : "ACCORDÉ"}`,
    );
  }
} catch (e) {
  await shot(page, "echec").catch(() => undefined);
  steps.push({ step: "arrêt", ok: false, detail: e instanceof Error ? e.message : String(e) });
  console.error(`✗ ${e instanceof Error ? e.message : String(e)}`);
} finally {
  await browser.close();
  await writeFile(join(OUT, `${phase}-steps.json`), JSON.stringify(steps, null, 2) + "\n");
}
if (steps.some((s) => !s.ok)) process.exit(1);
