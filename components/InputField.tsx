"use client";

import React, { memo, useEffect, useMemo, useState } from "react";
import debounce from "lodash.debounce";

type Props = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: "text" | "date";
  className?: string;
};

function InputFieldImpl({ label, value, onChange, placeholder, type = "text", className }: Props) {
  const [local, setLocal] = useState(value);

  useEffect(() => setLocal(value), [value]);

  const debouncedCommit = useMemo(
    () => debounce((v: string) => onChange(v), 250, { trailing: true }),
    [onChange]
  );

  useEffect(() => () => debouncedCommit.cancel(), [debouncedCommit]);

  return (
    <label className={"block " + (className ?? "")}>
      <div className="text-xs font-semibold text-slate-200/90 mb-1">{label}</div>
      <input
        type={type}
        value={local}
        placeholder={placeholder}
        onChange={(e) => {
          const v = e.target.value;
          setLocal(v);
          debouncedCommit(v);
        }}
        className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400/60"
      />
    </label>
  );
}

export const InputField = memo(InputFieldImpl);
