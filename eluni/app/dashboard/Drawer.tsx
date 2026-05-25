"use client";

import { X } from "lucide-react";

interface Props {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Ширина в CSS-формате (по умолчанию 360px). */
  width?: string;
  /** С какой стороны въезжает (по умолчанию справа — как в макете). */
  side?: "left" | "right";
}

/**
 * Боковая панель. По макету «Инцидент» крепится справа, узкая (~340-380px),
 * белая (или surface), с заголовком и крестиком сверху.
 */
export function Drawer({
  title,
  subtitle,
  onClose,
  children,
  width = "360px",
  side = "right",
}: Props) {
  const isRight = side === "right";
  return (
    <div
      className={`${
        isRight ? "drawer-enter-right border-l" : "drawer-enter border-r"
      } relative z-20 flex h-full flex-col border-app bg-surface shadow-card`}
      style={{ width }}
    >
      <div className="flex items-start justify-between gap-3 px-5 py-4">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-app">{title}</h2>
          {subtitle && (
            <p className="mt-0.5 truncate text-xs text-muted-app">{subtitle}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-muted-app transition hover:bg-surface-2 hover:text-app"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 pb-5">{children}</div>
    </div>
  );
}
