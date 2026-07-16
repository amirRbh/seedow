import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";

const STORAGE_KEY = "seedow.cookie_notice_dismissed";

/**
 * Seedow ne pose aucun cookie publicitaire ou de mesure d'audience tierce —
 * juste du localStorage strictement fonctionnel (session, langue, préférences).
 * Pas de bandeau de consentement à cocher : une simple information, dismissible.
 */
export function CookieNotice() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) !== "1") setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] border-t border-paper-3 bg-paper/95 backdrop-blur px-4 py-3 safe-area-bottom">
      <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <p className="flex-1 text-[12px] text-ink-2 leading-relaxed">
          {t("cookie_notice.text")}{" "}
          <Link to="/confidentialite" className="underline hover:text-ink">
            {t("cookie_notice.learn_more")}
          </Link>
        </p>
        <button
          onClick={dismiss}
          className="shrink-0 px-3 py-1.5 text-[12px] font-medium border border-ink rounded hover:bg-ink hover:text-paper transition-colors"
        >
          {t("cookie_notice.dismiss")}
        </button>
      </div>
    </div>
  );
}
