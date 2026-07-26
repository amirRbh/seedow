import { Link } from "@tanstack/react-router";

/**
 * Remplace le quiz pour un visiteur non connecté : la lecture du cours reste
 * entièrement libre, seuls le quiz de validation et le suivi de progression /
 * certificat demandent un compte gratuit. Aucun contenu pédagogique n'est
 * masqué ici — on ne bloque pas l'apprentissage, on propose de le valider.
 */
export function CourseQuizGate({ slug }: { slug: string }) {
  return (
    <section className="max-w-2xl mx-auto mt-16 border border-ink/10 rounded-[14px] bg-paper-2 p-8 md:p-10 text-center">
      <p className="eyebrow mb-3">Valide tes acquis</p>
      <h3 className="font-display text-2xl text-ink mb-3">
        Crée un compte gratuit pour passer le quiz
      </h3>
      <p className="text-sm md:text-base text-ink-2 leading-relaxed max-w-md mx-auto mb-7">
        La lecture reste libre. Le quiz et le suivi de ta progression (avec certificat) demandent un
        compte gratuit — sans engagement, sans carte bancaire.
      </p>
      <Link
        to="/auth"
        search={{ redirect: `/cours/${slug}`, mode: "signup" }}
        className="inline-block bg-ink text-paper px-6 py-3 rounded-full font-semibold text-body-sm hover:bg-ink-2 transition-colors"
      >
        Créer mon compte gratuit
      </Link>
    </section>
  );
}
