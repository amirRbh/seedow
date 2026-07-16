import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

export interface SimulationFormValues {
  initial: number;
  monthly: number;
  years: number;
  annualReturnLow: number;
  annualReturnHigh: number;
  shockPct?: number;
}

interface Props {
  onSubmit: (values: SimulationFormValues) => void;
  onCancel: () => void;
}

export function SimulationForm({ onSubmit, onCancel }: Props) {
  const { t } = useTranslation();
  const [monthly, setMonthly] = useState(100);
  const [initial, setInitial] = useState(0);
  const [years, setYears] = useState(10);
  const [stress, setStress] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      initial: Math.max(0, initial),
      monthly: Math.max(0, monthly),
      years: Math.max(1, Math.min(40, years)),
      annualReturnLow: 0.04,
      annualReturnHigh: 0.06,
      shockPct: stress ? -0.2 : undefined,
    });
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      onSubmit={submit}
      className="bg-paper/10 border border-paper/15 rounded-2xl p-3 space-y-3 backdrop-blur-xl"
    >
      <p className="text-tag uppercase tracking-[0.18em] text-paper/50 font-semibold">
        {t("ethi.sim.title")}
      </p>
      <div className="grid grid-cols-3 gap-2">
        <Field
          label={t("ethi.sim.monthly")}
          suffix="€/mo"
          value={monthly}
          onChange={setMonthly}
          step={50}
        />
        <Field
          label={t("ethi.sim.initial")}
          suffix="€"
          value={initial}
          onChange={setInitial}
          step={500}
        />
        <Field
          label={t("ethi.sim.years")}
          suffix="y"
          value={years}
          onChange={setYears}
          step={1}
          min={1}
          max={40}
        />
      </div>
      <label className="flex items-center gap-2 text-caption text-paper/70">
        <input
          type="checkbox"
          checked={stress}
          onChange={(e) => setStress(e.target.checked)}
          className="accent-moss-3"
        />
        {t("ethi.sim.stress")}
      </label>
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 rounded-full text-caption text-paper/60 hover:text-paper/90 transition-colors"
        >
          {t("common.cancel")}
        </button>
        <button
          type="submit"
          className="px-3 py-1.5 rounded-full text-caption bg-moss-2 hover:bg-moss-1 text-paper font-medium transition-colors"
        >
          {t("ethi.sim.run")}
        </button>
      </div>
    </motion.form>
  );
}

function Field({
  label,
  suffix,
  value,
  onChange,
  step = 1,
  min = 0,
  max,
}: {
  label: string;
  suffix: string;
  value: number;
  onChange: (n: number) => void;
  step?: number;
  min?: number;
  max?: number;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-tag uppercase tracking-wider text-paper/50">{label}</span>
      <div className="flex items-center gap-1 bg-paper/5 border border-paper/10 rounded-md px-2 py-1.5">
        <input
          type="number"
          value={value}
          step={step}
          min={min}
          max={max}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full bg-transparent outline-none text-sm text-paper font-value"
        />
        <span className="text-tag text-paper/40">{suffix}</span>
      </div>
    </label>
  );
}
