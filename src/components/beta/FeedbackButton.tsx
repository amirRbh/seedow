import { useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { submitBetaFeedback } from "@/lib/beta/beta.functions";
import { callAuthed } from "@/lib/authedServerFn";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Bouton flottant feedback bêta — visible uniquement quand authentifié.
 */
export function FeedbackButton() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [nps, setNps] = useState<number | null>(null);
  const [blocker, setBlocker] = useState("");
  const [wish, setWish] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  if (!user) return null;

  const onSubmit = async () => {
    setSubmitting(true);
    try {
      await callAuthed(submitBetaFeedback, {
        nps: nps ?? undefined,
        blocker: blocker.trim() || undefined,
        wish: wish.trim() || undefined,
        routeWhenSent: pathname,
      });
      setDone(true);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setNps(null);
    setBlocker("");
    setWish("");
    setDone(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 z-30 px-3.5 py-2 rounded-full bg-ink text-paper text-caption font-semibold uppercase tracking-[0.18em] shadow-lg hover:bg-ink-2 transition-colors"
        aria-label={t("beta.feedback_btn_aria")}
      >
        {t("beta.feedback_btn")}
      </button>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) reset();
        }}
      >
        <DialogContent className="max-w-md">
          {done ? (
            <>
              <DialogHeader>
                <DialogTitle>{t("beta.feedback_thanks_title")}</DialogTitle>
                <DialogDescription>{t("beta.feedback_thanks_desc")}</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <button onClick={() => setOpen(false)} className="btn-plant">
                  {t("common.close")}
                </button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>{t("beta.feedback_title")}</DialogTitle>
                <DialogDescription>{t("beta.feedback_desc")}</DialogDescription>
              </DialogHeader>
              <div className="space-y-5 py-2">
                <div>
                  <label className="text-tag uppercase tracking-[0.18em] text-ink-3 font-semibold">
                    {t("beta.feedback_nps_label")}
                  </label>
                  <div className="grid grid-cols-11 gap-1 mt-2">
                    {Array.from({ length: 11 }).map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setNps(i)}
                        className={`py-1.5 rounded text-caption font-semibold border transition-colors ${
                          nps === i
                            ? "border-ink bg-ink text-paper"
                            : "border-paper-3 text-ink-2 hover:border-ink"
                        }`}
                      >
                        {i}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-tag uppercase tracking-[0.18em] text-ink-3 font-semibold">
                    {t("beta.feedback_blocker")}
                  </label>
                  <textarea
                    value={blocker}
                    onChange={(e) => setBlocker(e.target.value)}
                    rows={2}
                    maxLength={2000}
                    className="w-full mt-2 px-3 py-2 rounded border border-paper-3 bg-paper text-body-sm focus:border-ink focus:outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="text-tag uppercase tracking-[0.18em] text-ink-3 font-semibold">
                    {t("beta.feedback_wish")}
                  </label>
                  <textarea
                    value={wish}
                    onChange={(e) => setWish(e.target.value)}
                    rows={2}
                    maxLength={2000}
                    className="w-full mt-2 px-3 py-2 rounded border border-paper-3 bg-paper text-body-sm focus:border-ink focus:outline-none resize-none"
                  />
                </div>
              </div>
              <DialogFooter>
                <button
                  onClick={onSubmit}
                  disabled={submitting || (nps === null && !blocker && !wish)}
                  className="btn-plant w-full justify-center disabled:opacity-40"
                >
                  {submitting ? t("beta.feedback_sending") : t("common.submit")}
                </button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
