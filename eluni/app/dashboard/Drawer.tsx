"use client";

import { X } from "lucide-react";

interface Props {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: string;
}

export function Drawer({
  title,
  subtitle,
  onClose,
  children,
  width = "460px",
}: Props) {
  return (
    <div
      className="drawer-enter relative z-20 flex h-full flex-col border-r border-app bg-surface shadow-xl"
      style={{ width }}
    >
      <div className="flex items-start justify-between gap-3 border-b border-app px-6 py-5">
        <div>
          <h2 className="text-lg font-semibold text-app">{title}</h2>
          {subtitle && (
            <p className="mt-1 text-sm text-muted-app">{subtitle}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-app transition hover:bg-surface-2"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
    </div>
  );
}
