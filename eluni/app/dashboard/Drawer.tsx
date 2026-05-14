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
  width = "420px",
}: Props) {
  return (
    <div
      className="drawer-enter relative z-20 flex h-full flex-col border-r border-app bg-surface shadow-xl"
      style={{ width }}
    >
      <div className="flex items-start justify-between gap-3 border-b border-app px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-app">{title}</h2>
          {subtitle && (
            <p className="mt-0.5 text-xs text-muted-app">{subtitle}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-app transition hover:bg-surface-2"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
    </div>
  );
}
