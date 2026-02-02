"use client";
import React, { memo } from "react";

type Step = { id: number; title: string; done: boolean; reachable: boolean };

type Props = {
  steps: Step[];
  active: number;
  onGo: (id: number) => void;
};

function StepIndicatorImpl({ steps, active, onGo }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {steps.map((s) => {
        const isActive = s.id === active;
        const base = "px-3 py-2 rounded-xl text-sm border transition select-none";
        const clickable = s.reachable ? "cursor-pointer hover:bg-white/10" : "opacity-50 cursor-not-allowed";
        const state = isActive
          ? "bg-white/10 border-white/20"
          : s.done
            ? "bg-emerald-500/15 border-emerald-400/30"
            : "bg-white/5 border-white/10";
        return (
          <div
            key={s.id}
            className={base + " " + state + " " + clickable}
            onClick={() => s.reachable && onGo(s.id)}
            role="button"
            aria-disabled={!s.reachable}
          >
            <span className="font-semibold mr-2">{s.id}</span>
            {s.title}
          </div>
        );
      })}
    </div>
  );
}

export const StepIndicator = memo(StepIndicatorImpl);
