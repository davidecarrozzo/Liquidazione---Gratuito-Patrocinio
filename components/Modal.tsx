"use client";
import React, { memo, useEffect } from "react";

type Props = { open: boolean; onClose: () => void; title: string; children: React.ReactNode };

function ModalImpl({ open, onClose, title, children }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-5xl rounded-2xl border border-white/10 bg-oltremare-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="text-sm font-semibold">{title}</div>
          <button className="rounded-lg bg-white/10 px-3 py-1 text-sm hover:bg-white/15" onClick={onClose}>
            Chiudi
          </button>
        </div>
        <div className="p-4 max-h-[75vh] overflow-auto">{children}</div>
      </div>
    </div>
  );
}

export const Modal = memo(ModalImpl);
