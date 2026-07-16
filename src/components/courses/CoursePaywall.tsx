import { Link } from "@tanstack/react-router";

interface Props {
  redirectTo: string;
}

export function CoursePaywall({ redirectTo }: Props) {
  return (
    <div className="relative max-w-2xl mx-auto mt-12">
      {/* Faux contenu flouté pour donner un aperçu */}
      <div
        aria-hidden
        className="select-none pointer-events-none filter blur-sm opacity-60 space-y-4 text-body-lg md:text-base text-ink-2 leading-[1.75]"
      >
        <p>
          La suite de ce cours détaille les mécanismes avancés, les exemples chiffrés et les cas
          pratiques. Tu y trouveras notamment les étapes concrètes pour appliquer ce qui précède à
          ton propre portefeuille.
        </p>
        <p>
          Un quiz de validation t'attend en fin de lecture, pour vérifier que tout est bien clair
          avant de passer à la suite.
        </p>
        <p>
          Le contenu reste accessible gratuitement après création d'un compte — sans engagement,
          sans carte bancaire, sans newsletter forcée.
        </p>
      </div>

      <div className="absolute inset-0 bg-gradient-to-b from-paper/40 via-paper to-paper" />

      <div className="relative -mt-32 z-10 bg-paper border-2 border-ink p-8 md:p-10 text-center">
        <p className="eyebrow mb-4">Lecture complète réservée</p>
        <h3 className="font-display text-2xl md:text-3xl text-ink mb-3">
          Crée un compte pour lire la suite
        </h3>
        <p className="text-sm md:text-base text-ink-2 leading-relaxed max-w-md mx-auto mb-7">
          Compte gratuit, sans engagement, sans carte bancaire. Tu accèdes immédiatement aux 9 cours
          restants, au quiz et à toute la plateforme bêta.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <Link
            to="/auth"
            search={{ redirect: redirectTo, mode: "signup" }}
            className="bg-ink text-paper px-7 py-3.5 text-xs font-semibold uppercase tracking-[0.22em] hover:bg-ink-2 transition-colors"
          >
            Créer un compte gratuit
          </Link>
          <Link
            to="/auth"
            search={{ redirect: redirectTo, mode: "login" }}
            className="text-xs font-semibold uppercase tracking-[0.22em] text-ink-3 hover:text-gold transition-colors px-3"
          >
            J'ai déjà un compte →
          </Link>
        </div>
        <p className="mt-6 text-tag uppercase tracking-[0.2em] text-ink-3">
          Aucune donnée bancaire · résiliation en 1 clic
        </p>
      </div>
    </div>
  );
}
