"use client";
import React, { memo } from "react";

type Props = { checked: boolean; onChange: (v: boolean) => void; label: string; color?: "blue" | "violet" | "green" };

function ToggleImpl({ checked, onChange, label, color = "blue" }: Props) {
  const ring =
    color === "violet" ? "focus:ring-violet-400/60" : color === "green" ? "focus:ring-emerald-400/60" : "focus:ring-blue-400/60";
  const bg =
    checked
      ? color === "violet"
        ? "bg-violet-500"
        : color === "green"
          ? "bg-emerald-500"
          : "bg-blue-500"
      : "bg-white/10";
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2">
      <div className="text-sm text-slate-100">{label}</div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={"relative inline-flex h-6 w-11 items-center rounded-full transition " + bg + " outline-none focus:ring-2 " + ring}
      >
        <span className={"inline-block h-5 w-5 transform rounded-full bg-white transition " + (checked ? "translate-x-5" : "translate-x-1")} />
      </button>
    </div>
  );
}

export const Toggle = memo(ToggleImpl);
