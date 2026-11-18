import { Link } from "@tanstack/react-router";
import { GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Remplace le quiz pour un visiteur non connecté : la lecture du cours reste
 * entièrement libre, seuls le quiz de validation et le suivi de progression /
 * certificat demandent un compte gratuit. Aucun contenu pédagogique n'est
 * masqué ici — on ne bloque pas l'apprentissage, on propose de le valider.
 */
export function CourseQuizGate({ slug }: { slug: string }) {
  return (
    <section className="tile-accent mx-auto mt-16 flex max-w-2xl flex-col items-center p-8 text-center md:p-10">
      <span className="icon-badge h-14 w-14 rounded-[18px]">
        <GraduationCap aria-hidden />
      </span>
      <p className="stamp mt-5">Valide tes acquis</p>
      <h3 className="mt-2 text-[clamp(22px,2.6vw,28px)]">
        Crée un compte gratuit pour passer le quiz
      </h3>
      <p className="mx-auto mt-3 mb-7 max-w-md text-body leading-relaxed text-ink-2">
        La lecture reste libre. Le quiz et le suivi de ta progression (avec certificat) demandent un
        compte gratuit — sans engagement, sans carte bancaire.
      </p>
      <Button asChild>
        <Link to="/auth" search={{ redirect: `/cours/${slug}`, mode: "signup" }}>
          Créer mon compte gratuit
        </Link>
      </Button>
    </section>
  );
}
