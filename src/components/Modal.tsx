"use client";

import { useEffect, useRef } from "react";

/** Native <dialog> so we get the top layer, focus trapping and Esc for free. */
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        // Clicking the backdrop resolves to the dialog element itself.
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="flex items-center justify-between gap-4 border-b border-term-fg/25 px-5 py-3">
        <h2 className="font-display text-xl uppercase leading-none text-term-bright">
          <span className="text-term-dim">&gt;</span> {title}
        </h2>
        <button type="button" onClick={onClose} className="label hover:text-term-fg">
          [ Close ]
        </button>
      </div>
      <div className="p-5">{children}</div>
    </dialog>
  );
}
