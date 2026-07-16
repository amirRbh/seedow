import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/confidentialite")({
  head: () => ({
    meta: [
      { title: "Politique de confidentialité — Seedow" },
      {
        name: "description",
        content: "Comment Seedow collecte, utilise et protège tes données personnelles.",
      },
    ],
  }),
  component: ConfidentialitePage,
});

function ConfidentialitePage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="max-w-3xl mx-auto px-6 pt-10 pb-8 border-b border-paper-3">
        <Link
          to="/"
          className="text-tag uppercase tracking-[0.18em] text-ink-3 hover:text-ink transition-colors"
        >
          ← Retour à l'accueil
        </Link>
        <h1 className="font-value text-4xl mt-4">Politique de confidentialité</h1>
        <p className="text-label text-ink-3 mt-2">Dernière mise à jour : 15 juillet 2026</p>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-10 space-y-10 text-body text-ink-2 leading-relaxed">
        <section>
          <p>
            Cette politique explique quelles données Seedow collecte, pourquoi, avec qui elles sont
            partagées, combien de temps elles sont conservées, et comment exercer tes droits. Le
            responsable de traitement est l'éditeur du site, dont les coordonnées figurent dans les{" "}
            <Link to="/mentions-legales" className="underline hover:text-ink">
              mentions légales
            </Link>{" "}
            — contact :{" "}
            <a href="mailto:hello@seedow.life" className="underline hover:text-ink">
              hello@seedow.life
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="font-value text-xl text-ink">1. Données collectées</h2>
          <ul className="mt-3 space-y-2 list-disc pl-5">
            <li>
              Identifiants de compte : email, mot de passe (jamais stocké en clair, géré par
              Supabase Auth) ou identifiant Google si tu utilises la connexion Google.
            </li>
            <li>
              Préférences d'investissement renseignées lors de l'onboarding : causes soutenues,
              secteurs exclus, objectif, montant envisagé.
            </li>
            <li>
              Le portefeuille virtuel généré à partir de ces préférences, son historique et ses
              métriques (allocation, performance simulée, score ESG).
            </li>
            <li>
              Les objectifs financiers que tu crées et ton historique de décisions dans
              l'application.
            </li>
            <li>Les messages échangés avec l'assistant Ethi.</li>
            <li>
              Si tu utilises la fonctionnalité dédiée : une intention d'investissement réel (montant
              envisagé, fréquence, email de contact) — une simple manifestation d'intérêt, jamais un
              ordre d'investissement.
            </li>
            <li>Les retours que tu envoies via le bouton de feedback bêta.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-value text-xl text-ink">2. Stockage local du navigateur</h2>
          <p className="mt-2">
            Seedow n'utilise aucun cookie publicitaire ni de mesure d'audience tierce. Le navigateur
            stocke uniquement, en local (localStorage) : le jeton de session (pour rester connecté),
            la langue choisie, et quelques préférences d'affichage (mode focus, portefeuille actif,
            encarts déjà lus). Rien de tout cela n'est transmis à un tiers à des fins publicitaires.
          </p>
        </section>

        <section>
          <h2 className="font-value text-xl text-ink">3. À quoi servent ces données</h2>
          <p className="mt-2">
            À fournir le service (générer et faire vivre ton portefeuille simulé, suivre tes
            objectifs, faire fonctionner l'assistant Ethi), à améliorer le produit pendant la phase
            bêta, et à te répondre si tu nous contactes. La base légale est l'exécution des{" "}
            <Link to="/cgu" className="underline hover:text-ink">
              CGU
            </Link>{" "}
            que tu acceptes à l'inscription, ou l'intérêt légitime pour l'amélioration du produit en
            bêta.
          </p>
        </section>

        <section>
          <h2 className="font-value text-xl text-ink">4. Avec qui tes données sont partagées</h2>
          <ul className="mt-3 space-y-2 list-disc pl-5">
            <li>
              <strong>Supabase</strong> (via Lovable Cloud) : hébergement de la base de données et
              gestion de l'authentification.
            </li>
            <li>
              <strong>Cloudflare</strong> : hébergement edge de l'application.
            </li>
            <li>
              <strong>Google</strong> : uniquement si tu choisis de te connecter via « Continuer
              avec Google ».
            </li>
            <li>
              <strong>Google Gemini</strong>, via Lovable AI Gateway : les messages que tu envoies à
              l'assistant Ethi, ainsi qu'un résumé technique de ton portefeuille (allocations,
              montants, indicateurs — jamais ton nom ni ton email), sont transmis à ce modèle de
              langage tiers pour générer une réponse.
            </li>
            <li>
              <strong>Yahoo Finance</strong> : utilisé côté serveur pour récupérer des cours de
              marché publics — aucune donnée personnelle ne lui est transmise.
            </li>
          </ul>
          <p className="mt-3">
            Certains de ces prestataires sont basés hors de l'Union européenne (États-Unis
            notamment). Ces transferts s'appuient sur les garanties prévues par leurs prestataires
            respectifs (clauses contractuelles types ou mécanisme équivalent). Seedow ne vend ni ne
            loue tes données à des tiers à des fins commerciales.
          </p>
        </section>

        <section>
          <h2 className="font-value text-xl text-ink">5. Durée de conservation</h2>
          <p className="mt-2">
            Tes données sont conservées tant que ton compte existe. Tu peux les supprimer à tout
            moment (voir ci-dessous) ; la suppression est immédiate et définitive.
          </p>
        </section>

        <section>
          <h2 className="font-value text-xl text-ink">6. Tes droits</h2>
          <p className="mt-2">
            Conformément au RGPD, tu disposes d'un droit d'accès, de rectification, d'effacement, de
            portabilité, de limitation et d'opposition sur tes données.
          </p>
          <ul className="mt-3 space-y-2 list-disc pl-5">
            <li>
              <strong>Accès et portabilité</strong> : depuis{" "}
              <button
                onClick={() => navigate({ to: "/reglages" })}
                className="underline hover:text-ink"
              >
                Réglages → Confidentialité
              </button>
              , tu peux télécharger l'ensemble de tes données au format JSON.
            </li>
            <li>
              <strong>Effacement</strong> : depuis le même écran, tu peux supprimer définitivement
              ton compte et toutes les données associées.
            </li>
            <li>
              Pour toute autre demande (rectification, limitation, opposition), écris à{" "}
              <a href="mailto:hello@seedow.life" className="underline hover:text-ink">
                hello@seedow.life
              </a>
              .
            </li>
            <li>
              Tu peux également introduire une réclamation auprès de la{" "}
              <a
                href="https://www.cnil.fr"
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-ink"
              >
                CNIL
              </a>
              .
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-value text-xl text-ink">7. Sécurité</h2>
          <p className="mt-2">
            Les échanges avec l'application sont chiffrés (HTTPS). L'accès à tes données en base est
            restreint par des règles de sécurité au niveau des lignes (Row Level Security) :
            personne d'autre que toi ne peut lire ton portefeuille ou tes préférences via
            l'application.
          </p>
        </section>

        <section>
          <h2 className="font-value text-xl text-ink">8. Âge minimum</h2>
          <p className="mt-2">Seedow est réservé aux personnes âgées de 18 ans ou plus.</p>
        </section>
      </div>
    </div>
  );
}
