import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDeposits } from "@/hooks/useDeposits";

type Method = "card" | "wallet" | "sepa";
type Step = "amount" | "method" | "details" | "confirm" | "success";

interface DepositSheetProps {
  open: boolean;
  onClose: () => void;
  /** Optionnel : asset ciblé (affiché en en-tête) */
  assetName?: string;
}

/**
 * Maquette de dépôt d'argent — UI complète, sans vrai débit.
 * Trois moyens : carte bancaire, Apple/Google Pay, virement SEPA.
 */
export function DepositSheet({ open, onClose, assetName }: DepositSheetProps) {
  const [step, setStep] = useState<Step>("amount");
  const [amount, setAmount] = useState(100);
  const [method, setMethod] = useState<Method>("card");
  const [processing, setProcessing] = useState(false);

  const reset = () => {
    setStep("amount");
    setAmount(100);
    setMethod("card");
    setProcessing(false);
  };

  const close = () => {
    onClose();
    setTimeout(reset, 250);
  };

  const submit = () => {
    setProcessing(true);
    // Simule le traitement
    setTimeout(() => {
      setProcessing(false);
      setStep("success");
    }, 1400);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 280 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-paper rounded-t-3xl max-h-[92vh] overflow-y-auto"
          >
            <div className="max-w-lg mx-auto p-5 pb-8">
              {/* Handle */}
              <div className="w-10 h-1 bg-paper-3 rounded-full mx-auto mb-5" />

              {/* En-tête */}
              <div className="flex items-start justify-between mb-5">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.15em] text-ink-3 font-medium">
                    Déposer
                  </p>
                  <h2 className="font-value text-2xl text-ink mt-0.5">
                    {assetName ? `Investir dans ${assetName}` : "Alimenter mon jardin"}
                  </h2>
                </div>
                <button
                  onClick={close}
                  aria-label="Fermer"
                  className="text-ink-3 hover:text-ink p-1"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>

              {/* Indicateur d'étape */}
              {step !== "success" && <StepIndicator current={step} />}

              {/* Contenu */}
              <div className="mt-6">
                {step === "amount" && (
                  <AmountStep
                    amount={amount}
                    setAmount={setAmount}
                    onNext={() => setStep("method")}
                  />
                )}
                {step === "method" && (
                  <MethodStep
                    method={method}
                    setMethod={setMethod}
                    onBack={() => setStep("amount")}
                    onNext={() => setStep("details")}
                  />
                )}
                {step === "details" && (
                  <DetailsStep
                    method={method}
                    onBack={() => setStep("method")}
                    onNext={() => setStep("confirm")}
                  />
                )}
                {step === "confirm" && (
                  <ConfirmStep
                    amount={amount}
                    method={method}
                    processing={processing}
                    onBack={() => setStep("details")}
                    onSubmit={submit}
                  />
                )}
                {step === "success" && <SuccessStep amount={amount} method={method} onClose={close} />}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────
// Étape : montant
// ─────────────────────────────────────────────────────────

function AmountStep({
  amount,
  setAmount,
  onNext,
}: {
  amount: number;
  setAmount: (n: number) => void;
  onNext: () => void;
}) {
  const presets = [50, 100, 250, 500, 1000];
  return (
    <div className="space-y-5">
      <div>
        <label className="text-[10px] uppercase tracking-[0.15em] text-ink-3 font-medium block mb-3">
          Montant à investir
        </label>
        <div className="flex items-center gap-2 border-b border-ink pb-3">
          <span className="font-value text-4xl text-ink">€</span>
          <input
            type="number"
            value={amount || ""}
            onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
            min={10}
            max={100000}
            className="font-value text-5xl text-ink bg-transparent flex-1 outline-none tabular-nums w-0"
            placeholder="0"
          />
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          {presets.map((p) => (
            <button
              key={p}
              onClick={() => setAmount(p)}
              className={`px-3 py-1.5 text-[12px] rounded-full border transition-colors ${
                amount === p
                  ? "bg-ink text-paper border-ink"
                  : "bg-paper text-ink-2 border-paper-3 hover:border-ink"
              }`}
            >
              {p} €
            </button>
          ))}
        </div>
      </div>

      <p className="text-[11px] text-ink-3 leading-relaxed">
        Montant minimum 10 €. Aucun frais d'entrée. Vous pouvez retirer à tout moment.
      </p>

      <button
        onClick={onNext}
        disabled={amount < 10}
        className="w-full bg-ink text-paper text-[14px] font-medium py-3 rounded-lg hover:bg-moss-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Continuer
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Étape : moyen de paiement
// ─────────────────────────────────────────────────────────

function MethodStep({
  method,
  setMethod,
  onBack,
  onNext,
}: {
  method: Method;
  setMethod: (m: Method) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const methods: { id: Method; label: string; desc: string; icon: React.ReactNode }[] = [
    {
      id: "card",
      label: "Carte bancaire",
      desc: "Visa, Mastercard. Crédit immédiat.",
      icon: <CardIcon />,
    },
    {
      id: "wallet",
      label: "Apple Pay / Google Pay",
      desc: "Validation par Face ID ou empreinte.",
      icon: <WalletIcon />,
    },
    {
      id: "sepa",
      label: "Virement SEPA",
      desc: "Mandat de prélèvement IBAN. 2 jours ouvrés.",
      icon: <BankIcon />,
    },
  ];

  return (
    <div className="space-y-4">
      <p className="text-[10px] uppercase tracking-[0.15em] text-ink-3 font-medium">
        Choisir un moyen de paiement
      </p>
      <div className="space-y-2">
        {methods.map((m) => {
          const active = method === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setMethod(m.id)}
              className={`w-full flex items-center gap-3 p-3.5 border rounded-lg text-left transition-colors ${
                active ? "border-ink bg-ink/5" : "border-paper-3 hover:border-ink-3"
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  active ? "bg-ink text-paper" : "bg-paper-2 text-ink-2"
                }`}
              >
                {m.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-ink">{m.label}</p>
                <p className="text-[11px] text-ink-3 mt-0.5">{m.desc}</p>
              </div>
              <div
                className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                  active ? "border-ink" : "border-paper-3"
                }`}
              >
                {active && <div className="w-full h-full rounded-full bg-ink scale-50" />}
              </div>
            </button>
          );
        })}
      </div>

      <NavButtons onBack={onBack} onNext={onNext} nextLabel="Continuer" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Étape : détails du moyen de paiement
// ─────────────────────────────────────────────────────────

function DetailsStep({
  method,
  onBack,
  onNext,
}: {
  method: Method;
  onBack: () => void;
  onNext: () => void;
}) {
  if (method === "card") return <CardForm onBack={onBack} onNext={onNext} />;
  if (method === "wallet") return <WalletForm onBack={onBack} onNext={onNext} />;
  return <SepaForm onBack={onBack} onNext={onNext} />;
}

function CardForm({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  const [number, setNumber] = useState("");
  const [exp, setExp] = useState("");
  const [cvv, setCvv] = useState("");
  const [name, setName] = useState("");

  const valid = number.replace(/\s/g, "").length >= 13 && exp.length === 5 && cvv.length >= 3 && name.length > 1;

  return (
    <div className="space-y-4">
      <p className="text-[10px] uppercase tracking-[0.15em] text-ink-3 font-medium">Carte bancaire</p>
      <Field label="Numéro de carte">
        <input
          type="text"
          value={number}
          onChange={(e) => setNumber(formatCardNumber(e.target.value))}
          maxLength={19}
          placeholder="4242 4242 4242 4242"
          className="w-full bg-transparent text-[14px] outline-none tabular-nums"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Expiration">
          <input
            type="text"
            value={exp}
            onChange={(e) => setExp(formatExp(e.target.value))}
            maxLength={5}
            placeholder="MM/AA"
            className="w-full bg-transparent text-[14px] outline-none tabular-nums"
          />
        </Field>
        <Field label="CVV">
          <input
            type="text"
            value={cvv}
            onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="123"
            className="w-full bg-transparent text-[14px] outline-none tabular-nums"
          />
        </Field>
      </div>
      <Field label="Titulaire">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Jean Dupont"
          className="w-full bg-transparent text-[14px] outline-none"
        />
      </Field>

      <SecurityNote text="Connexion chiffrée TLS · 3D Secure si requis" />
      <NavButtons onBack={onBack} onNext={onNext} nextLabel="Vérifier" disabled={!valid} />
    </div>
  );
}

function WalletForm({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  return (
    <div className="space-y-4">
      <p className="text-[10px] uppercase tracking-[0.15em] text-ink-3 font-medium">Wallet mobile</p>
      <div className="border border-paper-3 rounded-lg p-5 text-center">
        <div className="w-12 h-12 rounded-full bg-ink text-paper flex items-center justify-center mx-auto mb-3">
          <WalletIcon />
        </div>
        <p className="text-[13px] text-ink font-medium">Apple Pay détecté sur cet appareil</p>
        <p className="text-[11px] text-ink-3 mt-1.5 leading-relaxed">
          Vous validerez le paiement avec Face ID, Touch ID ou votre code à l'étape suivante.
          Aucune donnée de carte n'est partagée avec Seedow.
        </p>
      </div>
      <SecurityNote text="Tokenisation Apple · données carte jamais stockées" />
      <NavButtons onBack={onBack} onNext={onNext} nextLabel="Continuer" />
    </div>
  );
}

function SepaForm({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  const [iban, setIban] = useState("");
  const [holder, setHolder] = useState("");
  const [accept, setAccept] = useState(false);

  const cleanIban = iban.replace(/\s/g, "");
  const valid = cleanIban.length >= 15 && cleanIban.length <= 34 && holder.length > 1 && accept;

  return (
    <div className="space-y-4">
      <p className="text-[10px] uppercase tracking-[0.15em] text-ink-3 font-medium">
        Virement SEPA — mandat de prélèvement
      </p>
      <Field label="IBAN">
        <input
          type="text"
          value={iban}
          onChange={(e) => setIban(formatIban(e.target.value))}
          placeholder="FR76 3000 6000 0123 4567 8901 234"
          className="w-full bg-transparent text-[14px] outline-none tabular-nums"
        />
      </Field>
      <Field label="Titulaire du compte">
        <input
          type="text"
          value={holder}
          onChange={(e) => setHolder(e.target.value)}
          placeholder="Jean Dupont"
          className="w-full bg-transparent text-[14px] outline-none"
        />
      </Field>

      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={accept}
          onChange={(e) => setAccept(e.target.checked)}
          className="mt-0.5 accent-ink"
        />
        <span className="text-[11px] text-ink-2 leading-relaxed">
          J'autorise Seedow à émettre des prélèvements sur mon compte conformément au mandat SEPA Core.
          Je peux le révoquer à tout moment.
        </span>
      </label>

      <SecurityNote text="ICS Seedow : FR12ZZZ123456 · délai de réception : 2 jours ouvrés" />
      <NavButtons onBack={onBack} onNext={onNext} nextLabel="Vérifier" disabled={!valid} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Étape : confirmation
// ─────────────────────────────────────────────────────────

function ConfirmStep({
  amount,
  method,
  processing,
  onBack,
  onSubmit,
}: {
  amount: number;
  method: Method;
  processing: boolean;
  onBack: () => void;
  onSubmit: () => void;
}) {
  const methodLabel: Record<Method, string> = {
    card: "Carte bancaire ••• 4242",
    wallet: "Apple Pay",
    sepa: "Virement SEPA",
  };

  return (
    <div className="space-y-5">
      <p className="text-[10px] uppercase tracking-[0.15em] text-ink-3 font-medium">Récapitulatif</p>

      <div className="border-t border-b border-paper-3 divide-y divide-paper-3">
        <SummaryRow label="Montant" value={`${amount.toLocaleString("fr-FR")} €`} bold />
        <SummaryRow label="Frais d'entrée" value="0,00 €" />
        <SummaryRow label="Moyen de paiement" value={methodLabel[method]} />
        <SummaryRow
          label="Disponibilité"
          value={method === "sepa" ? "Sous 2 jours ouvrés" : "Immédiate"}
        />
      </div>

      <p className="text-[11px] text-ink-3 leading-relaxed">
        En validant, vous confirmez avoir lu et accepté les conditions générales d'investissement.
        Investir comporte un risque de perte en capital.
      </p>

      <button
        onClick={onSubmit}
        disabled={processing}
        className="w-full bg-ink text-paper text-[14px] font-medium py-3 rounded-lg hover:bg-moss-2 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {processing ? (
          <>
            <span className="inline-block w-3 h-3 border-2 border-paper border-t-transparent rounded-full animate-spin" />
            Traitement…
          </>
        ) : (
          `Confirmer · ${amount.toLocaleString("fr-FR")} €`
        )}
      </button>
      {!processing && (
        <button
          onClick={onBack}
          className="w-full text-[12px] text-ink-3 hover:text-ink py-2"
        >
          Modifier
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Étape : succès
// ─────────────────────────────────────────────────────────

function SuccessStep({
  amount,
  method,
  onClose,
}: {
  amount: number;
  method: Method;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-6"
    >
      <div className="w-14 h-14 rounded-full bg-moss-5 text-moss-1 flex items-center justify-center mx-auto mb-4">
        <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <polyline points="4,12 10,18 20,6" />
        </svg>
      </div>
      <h3 className="font-value text-2xl text-ink">Dépôt enregistré</h3>
      <p className="text-[13px] text-ink-2 mt-2 max-w-xs mx-auto leading-relaxed">
        {method === "sepa"
          ? `Votre virement de ${amount.toLocaleString("fr-FR")} € sera crédité sous 2 jours ouvrés.`
          : `${amount.toLocaleString("fr-FR")} € ont été ajoutés à votre jardin.`}
      </p>
      <p className="text-[10px] text-ink-3 mt-4">
        Démo : aucun débit réel n'a été effectué.
      </p>
      <button
        onClick={onClose}
        className="mt-6 w-full bg-ink text-paper text-[14px] font-medium py-3 rounded-lg hover:bg-moss-2 transition-colors"
      >
        Retour
      </button>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────
// Helpers UI
// ─────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: Exclude<Step, "success"> }) {
  const order: Exclude<Step, "success">[] = ["amount", "method", "details", "confirm"];
  const idx = order.indexOf(current);
  return (
    <div className="flex gap-1.5">
      {order.map((_, i) => (
        <div
          key={i}
          className={`h-0.5 flex-1 rounded-full transition-colors ${
            i <= idx ? "bg-ink" : "bg-paper-3"
          }`}
        />
      ))}
    </div>
  );
}

function NavButtons({
  onBack,
  onNext,
  nextLabel,
  disabled,
}: {
  onBack: () => void;
  onNext: () => void;
  nextLabel: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-2 pt-2">
      <button
        onClick={onBack}
        className="px-4 py-3 text-[13px] text-ink-2 hover:text-ink border border-paper-3 hover:border-ink rounded-lg transition-colors"
      >
        Retour
      </button>
      <button
        onClick={onNext}
        disabled={disabled}
        className="flex-1 bg-ink text-paper text-[14px] font-medium py-3 rounded-lg hover:bg-moss-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {nextLabel}
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border border-paper-3 rounded-lg px-3 py-2 focus-within:border-ink transition-colors">
      <label className="text-[10px] uppercase tracking-[0.12em] text-ink-3 font-medium block mb-0.5">
        {label}
      </label>
      {children}
    </div>
  );
}

function SummaryRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-baseline justify-between py-3">
      <span className="text-[12px] text-ink-2">{label}</span>
      <span className={`tabular-nums ${bold ? "font-value text-[16px] text-ink" : "text-[13px] text-ink"}`}>
        {value}
      </span>
    </div>
  );
}

function SecurityNote({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 text-[10px] text-ink-3">
      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 flex-shrink-0 mt-px" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="11" width="16" height="10" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </svg>
      <span>{text}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Format helpers
// ─────────────────────────────────────────────────────────

function formatCardNumber(v: string) {
  return v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
}
function formatExp(v: string) {
  const digits = v.replace(/\D/g, "").slice(0, 4);
  if (digits.length < 3) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}
function formatIban(v: string) {
  return v.replace(/\s/g, "").toUpperCase().slice(0, 34).replace(/(.{4})/g, "$1 ").trim();
}

// ─────────────────────────────────────────────────────────
// Icons
// ─────────────────────────────────────────────────────────

function CardIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18" />
      <path d="M7 15h2" />
    </svg>
  );
}
function WalletIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a4 4 0 0 0-4 4v0a4 4 0 0 0 8 0v0a4 4 0 0 0-4-4Z" />
      <path d="M5 21V11a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v10" />
    </svg>
  );
}
function BankIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10l9-6 9 6" />
      <path d="M5 10v9M19 10v9M9 10v9M15 10v9" />
      <path d="M3 21h18" />
    </svg>
  );
}
