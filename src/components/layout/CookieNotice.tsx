import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

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
    <div className="pointer-events-none fixed inset-x-3 bottom-3 z-[60] flex justify-center safe-area-bottom">
      <div className="glass pointer-events-auto flex max-w-2xl animate-fade-in-up flex-col items-start gap-3 rounded-[24px] p-4 pl-5 sm:flex-row sm:items-center">
        <p className="flex-1 text-label leading-relaxed text-ink-2">
          {t("cookie_notice.text")}{" "}
          <Link
            to="/confidentialite"
            className="font-semibold text-ink underline underline-offset-2 hover:no-underline"
          >
            {t("cookie_notice.learn_more")}
          </Link>
        </p>
        <Button size="sm" onClick={dismiss} className="shrink-0">
          {t("cookie_notice.dismiss")}
        </Button>
      </div>
    </div>
  );
}
