/**
 * Lecture minimale de fichiers .xlsx, **sans dépendance**.
 *
 * Plusieurs jeux de données ESG publics (SBTi, notamment) ne sont distribués
 * qu'en .xlsx. Embarquer une bibliothèque tableur pour les lire alourdirait le
 * bundle Edge (§8, limites Cloudflare Workers) alors qu'un .xlsx n'est qu'une
 * archive ZIP contenant du XML : `node:zlib` suffit.
 *
 * Portée assumée : lire la première feuille d'un classeur simple en lignes
 * clé→valeur. Pas de formules, pas de styles, pas de dates typées — les valeurs
 * sont rendues telles qu'écrites dans le fichier. Suffisant pour un jeu de
 * données tabulaire publié ; inadapté à un classeur de calcul.
 */

import { inflateRawSync } from "node:zlib";

const SIG_EOCD = "PK\x05\x06";
const SIG_CENTRAL_DIR = 0x02014b50;

/**
 * Extrait une entrée d'archive ZIP par nom (stockée ou deflate), ou `null` si
 * elle est absente ou illisible.
 *
 * Passe obligatoirement par le **répertoire central**. Les en-têtes locaux d'une
 * archive écrite en flux portent le drapeau « data descriptor » (bit 3 des
 * flags), auquel cas leur champ « taille compressée » vaut 0 et l'entrée est
 * illisible depuis l'en-tête local seul. C'est le cas des fichiers publiés par
 * SBTi (`flags=0x808`, `compSize=0` sur toutes les entrées) — un lecteur qui
 * s'appuie sur les en-têtes locaux y renvoie silencieusement zéro ligne.
 *
 * Pas de gestion ZIP64 : superflu pour des jeux de données de quelques Mo, et
 * une archive au-delà de 4 Go renvoie `null` plutôt qu'un contenu erroné.
 */
export function unzipEntry(buf: Buffer, name: string): string | null {
  const eocd = buf.lastIndexOf(SIG_EOCD, buf.length - 1, "binary");
  if (eocd < 0 || eocd + 20 > buf.length) return null;

  const entryCount = buf.readUInt16LE(eocd + 10);
  let pos = buf.readUInt32LE(eocd + 16);
  const target = Buffer.from(name, "utf8");

  for (let i = 0; i < entryCount; i++) {
    if (pos + 46 > buf.length || buf.readUInt32LE(pos) !== SIG_CENTRAL_DIR) return null;
    const method = buf.readUInt16LE(pos + 10);
    const compSize = buf.readUInt32LE(pos + 20);
    const nameLen = buf.readUInt16LE(pos + 28);
    const extraLen = buf.readUInt16LE(pos + 30);
    const commentLen = buf.readUInt16LE(pos + 32);
    const localOffset = buf.readUInt32LE(pos + 42);

    if (buf.subarray(pos + 46, pos + 46 + nameLen).equals(target)) {
      // Les longueurs de nom/extra de l'en-tête LOCAL peuvent différer de celles
      // du répertoire central : on relit celles du local pour situer les données.
      if (localOffset + 30 > buf.length) return null;
      const dataStart =
        localOffset + 30 + buf.readUInt16LE(localOffset + 26) + buf.readUInt16LE(localOffset + 28);
      const data = buf.subarray(dataStart, dataStart + compSize);
      try {
        return (method === 0 ? data : inflateRawSync(data)).toString("utf8");
      } catch {
        return null;
      }
    }
    pos += 46 + nameLen + extraLen + commentLen;
  }
  return null;
}

/** Déséchappe les entités XML. `&amp;` en dernier, sinon double décodage. */
export function unescapeXml(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

/**
 * Parse la première feuille d'un .xlsx en lignes clé→valeur, la première ligne
 * servant d'en-têtes. Une colonne sans en-tête est ignorée ; une cellule absente
 * rend une chaîne vide (jamais une valeur inventée).
 *
 * Rend `[]` — plutôt que de lever — si le fichier n'est pas un .xlsx lisible :
 * l'appelant décide quoi faire d'un jeu de données indisponible.
 */
export function parseXlsxSheet(buf: Buffer): Record<string, string>[] {
  const sheetXml = unzipEntry(buf, "xl/worksheets/sheet1.xml");
  if (!sheetXml) return [];

  const sharedXml = unzipEntry(buf, "xl/sharedStrings.xml") ?? "";
  const shared = [...sharedXml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) =>
    unescapeXml(m[1].replace(/<[^>]+>/g, "")),
  );

  const rows: Record<string, string>[] = [];
  let headers: Record<string, string> | null = null;

  for (const rowMatch of sheetXml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells: Record<string, string> = {};
    for (const c of rowMatch[1].matchAll(
      /<c r="([A-Z]+)\d+"([^>]*)>[\s\S]*?<v>([\s\S]*?)<\/v>[\s\S]*?<\/c>/g,
    )) {
      const [, col, attrs, raw] = c;
      cells[col] = attrs.includes('t="s"') ? (shared[Number(raw)] ?? "") : unescapeXml(raw);
    }
    if (!headers) {
      headers = cells;
      continue;
    }
    const out: Record<string, string> = {};
    for (const [col, header] of Object.entries(headers)) {
      if (header) out[header] = cells[col] ?? "";
    }
    rows.push(out);
  }
  return rows;
}
