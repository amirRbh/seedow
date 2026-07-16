import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";
import { callAuthed } from "@/lib/authedServerFn";
import { deleteAccount } from "@/lib/account/server.functions";

export function DeleteAccountDialog() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const deleteFn = useServerFn(deleteAccount);
  const [confirmText, setConfirmText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [open, setOpen] = useState(false);

  const expected = user?.email ?? "";
  const canConfirm =
    expected.length > 0 && confirmText.trim().toLowerCase() === expected.toLowerCase();

  const onConfirm = async () => {
    if (!canConfirm) return;
    setSubmitting(true);
    try {
      await callAuthed(deleteFn, undefined as never);
      await signOut();
      toast.success(t("reglages.delete_account_done"));
      navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
      setSubmitting(false);
    }
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setConfirmText("");
      }}
    >
      <AlertDialogTrigger asChild>
        <button className="px-3 py-1.5 text-label border border-paper-3 text-rust rounded hover:border-rust transition-colors">
          {t("reglages.delete_account")}
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("reglages.delete_account_title")}</AlertDialogTitle>
          <AlertDialogDescription>{t("reglages.delete_account_warning")}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-2">
          <label className="text-caption text-ink-3 font-medium">
            {t("reglages.delete_account_confirm_label", { email: expected })}
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={expected}
            autoComplete="off"
            className="w-full mt-2 px-3 py-2.5 rounded border border-paper-3 bg-paper text-body-sm focus:border-ink focus:outline-none"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            disabled={!canConfirm || submitting}
            onClick={(e) => {
              e.preventDefault();
              void onConfirm();
            }}
            className="bg-rust text-paper hover:bg-rust/90 disabled:opacity-40"
          >
            {submitting ? t("common.sending") : t("reglages.delete_account_confirm_cta")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
