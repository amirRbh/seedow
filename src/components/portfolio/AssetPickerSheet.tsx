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

/** Actif renvoyé au parent, dans la forme attendue par l'éditeur d'allocation. */
export interface PickedAsset {
  id: string;
  ticker: string;
  name: string;
  asset_class: string;
  /** Score d'impact sur 0..100. */
  esgScore: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Ids déjà présents dans le portefeuille en cours — masqués de la liste. */
  excludeIds: string[];
  onPick: (asset: PickedAsset) => void;
}

/**
 * Sélecteur d'investissement partagé (Page blanche + Personnaliser).
 * Recherche simple sur l'univers réel, libellés en langage clair. Un tap ajoute
 * la ligne et referme la feuille — pas de jargon, pas de tableau financier.
 */
export function AssetPickerSheet({ open, onOpenChange, excludeIds, onPick }: Props) {
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
              {results.map((a) => (
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
                      });
                      onOpenChange(false);
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl border border-paper-3 bg-paper-2 text-left hover:bg-paper-3/40 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-body-sm font-semibold text-ink truncate">{a.name}</p>
                      <p className="text-tag text-ink-3 truncate">
                        {a.ticker} · {a.category}
                        {" · "}
                        {t("asset_picker.impact_short", {
                          score: Math.round(a.overall_esg_score * 10),
                        })}
                      </p>
                    </div>
                    <span className="w-8 h-8 rounded-full bg-ink text-paper flex items-center justify-center flex-shrink-0">
                      <Plus className="w-4 h-4" strokeWidth={2.2} aria-hidden />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
