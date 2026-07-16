import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/cgu")({
  head: () => ({
    meta: [
      { title: "Conditions Générales d'Utilisation — Seedow" },
      { name: "description", content: "Conditions générales d'utilisation du service Seedow." },
    ],
  }),
  component: CguPage,
});

function CguPage() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="max-w-3xl mx-auto px-6 pt-10 pb-8 border-b border-paper-3">
        <Link
          to="/"
          className="text-[10px] uppercase tracking-[0.18em] text-ink-3 hover:text-ink transition-colors"
        >
          ← Retour à l'accueil
        </Link>
        <h1 className="font-value text-4xl mt-4">Conditions Générales d'Utilisation</h1>
        <p className="text-[12px] text-ink-3 mt-2">Dernière mise à jour : 15 juillet 2026</p>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-10 space-y-10 text-[14px] text-ink-2 leading-relaxed">
        <section className="paper-card p-5 border-l-4 border-l-gold">
          <p className="text-[13px] text-ink">
            <strong>À retenir avant de continuer :</strong> Seedow est, à ce stade, un outil
            pédagogique de simulation. Le portefeuille que tu construis est virtuel et valorisé sur
            des cours réels — aucune somme d'argent n'est investie via l'application. Seedow n'est
            ni un prestataire de services d'investissement (PSI), ni un conseiller en
            investissements financiers (CIF) au sens du droit français, et l'assistant Ethi ne
            fournit pas de conseil en investissement personnalisé.
          </p>
        </section>

        <section>
          <h2 className="font-value text-xl text-ink">1. Objet</h2>
          <p className="mt-2">
            Les présentes CGU régissent l'accès et l'utilisation de l'application Seedow, un service
            qui permet de définir des préférences d'investissement responsable (ESG), de générer un
            portefeuille simulé, de suivre son évolution sur des données de marché réelles, et
            d'échanger avec un assistant pédagogique (Ethi). En créant un compte, tu acceptes les
            présentes CGU.
          </p>
        </section>

        <section>
          <h2 className="font-value text-xl text-ink">2. Accès au service</h2>
          <p className="mt-2">
            L'accès est réservé aux personnes physiques âgées de 18 ans ou plus, disposant de la
            capacité juridique de contracter. Tu t'engages à fournir des informations exactes lors
            de la création de ton compte et à en préserver la confidentialité (identifiants de
            connexion).
          </p>
        </section>

        <section>
          <h2 className="font-value text-xl text-ink">3. Fonctionnement du service</h2>
          <p className="mt-2">
            Après avoir répondu à quelques questions (causes soutenues, secteurs exclus, objectif,
            montant), Seedow génère un portefeuille virtuel à partir d'un univers d'actifs réels
            (ETF, fonds), valorisé sur des cours de marché réels rafraîchis périodiquement. Ce
            portefeuille ne correspond à aucune détention réelle d'actifs financiers.
          </p>
          <p className="mt-2">
            Si tu utilises la fonctionnalité « intention d'investissement réel », les informations
            que tu fournis (montant envisagé, fréquence, contact) constituent une simple
            manifestation d'intérêt destinée à l'équipe Seedow — en aucun cas un ordre
            d'investissement, une souscription ou un engagement contractuel de part et d'autre.
          </p>
        </section>

        <section>
          <h2 className="font-value text-xl text-ink">4. Assistant Ethi</h2>
          <p className="mt-2">
            Ethi est un assistant conversationnel fondé sur un modèle de langage tiers. Il vise à
            expliquer des notions financières et à t'aider à explorer des scénarios à partir des
            données de ton portefeuille simulé. Comme tout système d'intelligence artificielle
            générative, ses réponses peuvent contenir des erreurs ou des approximations. Elles ne
            constituent ni un conseil en investissement personnalisé, ni une recommandation d'achat
            ou de vente d'un actif déterminé, et ne doivent pas être utilisées comme seul fondement
            d'une décision financière réelle.
          </p>
        </section>

        <section>
          <h2 className="font-value text-xl text-ink">5. Absence de garantie de performance</h2>
          <p className="mt-2">
            Les performances, projections et simulations affichées dans l'application sont fondées
            sur des données historiques ou des hypothèses ; elles ne préjugent en rien des
            performances futures et ne constituent pas une garantie de résultat. Si Seedow propose
            un jour un produit d'investissement réel, le capital investi ne serait pas garanti et
            les conditions applicables feraient l'objet d'une information et d'une acceptation
            spécifiques, distinctes des présentes CGU.
          </p>
        </section>

        <section>
          <h2 className="font-value text-xl text-ink">6. Compte et résiliation</h2>
          <p className="mt-2">
            Tu peux supprimer ton compte à tout moment depuis Réglages → Confidentialité ; la
            suppression est immédiate et définitive. L'éditeur peut suspendre ou résilier l'accès
            d'un compte en cas de non-respect des présentes CGU ou d'usage frauduleux ou abusif du
            service (notamment de l'assistant Ethi).
          </p>
        </section>

        <section>
          <h2 className="font-value text-xl text-ink">7. Propriété intellectuelle</h2>
          <p className="mt-2">
            L'ensemble des éléments de l'application (marque, logo, charte graphique, contenus
            pédagogiques, méthodologie, code) est protégé par le droit de la propriété
            intellectuelle et reste la propriété de l'éditeur. Tu bénéficies d'un droit d'usage
            strictement personnel et non commercial du service.
          </p>
        </section>

        <section>
          <h2 className="font-value text-xl text-ink">8. Disponibilité du service</h2>
          <p className="mt-2">
            Seedow est actuellement en phase bêta. L'éditeur met en œuvre des moyens raisonnables
            pour assurer la disponibilité et la fiabilité du service, sans garantie d'accès continu
            ou sans erreur (maintenance, indisponibilité d'un prestataire tiers, etc.).
          </p>
        </section>

        <section>
          <h2 className="font-value text-xl text-ink">9. Limitation de responsabilité</h2>
          <p className="mt-2">
            Seedow est un outil pédagogique. Toute décision d'investissement réelle que tu
            prendrais, y compris sur la base d'informations issues de l'application ou de
            l'assistant Ethi, relève de ta seule responsabilité. L'éditeur ne saurait être tenu
            responsable des pertes financières résultant de décisions d'investissement prises en
            dehors de l'application.
          </p>
        </section>

        <section>
          <h2 className="font-value text-xl text-ink">10. Données personnelles</h2>
          <p className="mt-2">
            Le traitement de tes données personnelles est décrit dans la{" "}
            <Link to="/confidentialite" className="underline hover:text-ink">
              politique de confidentialité
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="font-value text-xl text-ink">11. Modification des CGU</h2>
          <p className="mt-2">
            L'éditeur peut modifier les présentes CGU, notamment pour refléter une évolution du
            service. La version en vigueur est celle publiée sur cette page ; en cas de changement
            substantiel, une information sera affichée dans l'application.
          </p>
        </section>

        <section>
          <h2 className="font-value text-xl text-ink">12. Droit applicable et litiges</h2>
          <p className="mt-2">
            Les présentes CGU sont soumises au droit français. En cas de litige, une solution
            amiable sera recherchée en priorité ; à défaut, les tribunaux français compétents seront
            seuls saisis.
          </p>
        </section>

        <section>
          <h2 className="font-value text-xl text-ink">13. Contact</h2>
          <p className="mt-2">
            Pour toute question relative aux présentes CGU :{" "}
            <a href="mailto:hello@seedow.life" className="underline hover:text-ink">
              hello@seedow.life
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
