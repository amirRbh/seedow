import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Search } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useAssetUniverse } from "@/hooks/useAssetUniverse";
import { poolReasons, type PoolReasons } from "@/lib/portfolio/poolReasons";
import { PoolReasonList } from "@/components/discover/PoolReasonList";
import type { CauseTag } from "@/lib/portfolio/types";

/** Actif renvoyé au parent, dans la forme attendue par l'éditeur d'allocation. */
export interface PickedAsset {
  id: string;
  ticker: string;
  name: string;
  asset_class: string;
  /** Note de durabilité sur 0..100 (note ESG composite, pas un effet mesuré). */
  esgScore: number;
  /**
   * Pourquoi ce fonds était proposé — calculé ici, au moment du choix, et
   * transporté avec lui.
   *
   * Le recalculer côté builder demanderait de recharger l'univers pour des
   * champs (exposition par cause, source de la note, historique de marché) que
   * le modèle de vue du builder ne porte pas : il finirait par afficher une
   * justification plus pauvre que celle qui a servi à choisir, ou pire, une
   * autre. Une seule raison, écrite une fois, suit la ligne.
   */
  reasons: PoolReasons;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Ids déjà présents dans le portefeuille en cours — masqués de la liste. */
  excludeIds: string[];
  onPick: (asset: PickedAsset) => void;
  /**
   * Convictions déclarées au questionnaire. Sans elles, la feuille reste une
   * recherche honnête — mais muette : elle ne peut relier aucun fonds à ce que
   * l'utilisateur a dit vouloir financer.
   */
  causes?: CauseTag[];
}

/**
 * Sélecteur d'investissement partagé (Page blanche + Personnaliser).
 *
 * C'est le moment le plus décisif du parcours — celui où l'argent est attribué —
 * et c'était le seul écran sans la moindre explication : une recherche plate sur
 * l'univers entier, sans lien avec les convictions déclarées trois écrans plus
 * tôt. Chaque ligne porte désormais les mêmes raisons que le pool
 * (`lib/portfolio/poolReasons`), pour que choisir et comprendre soient le même
 * geste.
 *
 * Ce que la feuille NE fait pas : réordonner l'univers selon un score. Elle
 * explique ce qui est là, elle ne désigne pas un gagnant.
 */
export function AssetPickerSheet({ open, onOpenChange, excludeIds, onPick, causes }: Props) {
  const { t } = useTranslation();
  const { assets, loading } = useAssetUniverse();
  const [query, setQuery] = useState("");

  const excluded = useMemo(() => new Set(excludeIds), [excludeIds]);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return assets
      .filter((a) => !excluded.has(a.id))
      .filter(
        (a) =>
          q.length === 0 ||
          a.name.toLowerCase().includes(q) ||
          a.ticker.toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q),
      )
      .slice(0, 60);
  }, [assets, excluded, query]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="bg-paper border-paper-3 max-h-[85vh] flex flex-col">
        <SheetHeader className="text-left">
          <SheetTitle className="font-value text-xl text-ink">{t("asset_picker.title")}</SheetTitle>
          <SheetDescription className="text-body-sm text-ink-2">
            {t("asset_picker.desc")}
          </SheetDescription>
        </SheetHeader>

        <div className="relative mt-3">
          <Search
            className="w-4 h-4 text-ink-3 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("asset_picker.search_placeholder")}
            className="w-full bg-paper-2 border border-paper-3 rounded-full pl-9 pr-4 py-2.5 text-body-sm text-ink placeholder:text-ink-3 outline-none focus:border-ink/40 transition-colors"
          />
        </div>

        <div className="mt-3 flex-1 overflow-y-auto -mx-1 px-1">
          {loading ? (
            <p className="text-label text-ink-3 text-center py-8">{t("asset_picker.loading")}</p>
          ) : results.length === 0 ? (
            <p className="text-label text-ink-3 text-center py-8">{t("asset_picker.empty")}</p>
          ) : (
            <ul className="space-y-1.5 pb-4">
              {results.map((a) => {
                // Une seule évaluation par fonds : celle qui est AFFICHÉE est
                // exactement celle qui suivra la ligne dans le builder.
                const reasons = poolReasons({
                  causes: causes ?? [],
                  themes: a.themes,
                  sustainability: Math.round(a.overall_esg_score * 10),
                  esgSource: a.esg_score_source,
                  ter: a.ter_pct / 100,
                  statsObservations: a.stats_observations,
                });
                return (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onPick({
                          id: a.id,
                          ticker: a.ticker,
                          name: a.name,
                          asset_class: a.asset_class,
                          esgScore: Math.round(a.overall_esg_score * 10),
                          reasons,
                        });
                        onOpenChange(false);
                      }}
                      className="w-full flex items-start gap-3 p-3 rounded-2xl border border-paper-3 bg-paper-2 text-left hover:bg-paper-3/40 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-body-sm font-semibold text-ink truncate">{a.name}</p>
                        <p className="text-tag text-ink-3 truncate">
                          {a.ticker} · {a.category}
                        </p>
                        {/* Pourquoi cette ligne, et ce qu'on ignore d'elle. Le
                          modèle de vue ne porte pas l'exposition chiffrée par
                          cause : on passe les thèmes dominants, et `poolReasons`
                          s'en accommode sans rien inventer. */}
                        <PoolReasonList compact className="mt-1" reasons={reasons} />
                      </div>
                      <span className="w-8 h-8 rounded-full bg-ink text-paper flex items-center justify-center flex-shrink-0">
                        <Plus className="w-4 h-4" strokeWidth={2.2} aria-hidden />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
