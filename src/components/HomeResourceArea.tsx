import type { ReactNode } from 'react';

export interface HomeResourceItem {
  id: string;
  label: string;
  value?: string | number;
  icon?: ReactNode;
  onClick?: () => void;
  ariaLabel?: string;
}

export interface HomeResourceAreaProps {
  /** Expandable resource slots (e.g. Coins, Gems). */
  items?: HomeResourceItem[];
  children?: ReactNode;
  className?: string;
}

/**
 * Reusable, expandable top-right container reserving dedicated layout space
 * on the Home Screen for in-game resource indicators (Coins, Gems, and future currencies).
 * Renders a non-interactive architectural reserve slot when no items are provided.
 */
export function HomeResourceArea({
  items,
  children,
  className = '',
}: HomeResourceAreaProps) {
  const hasItems = Boolean(items && items.length > 0);
  const hasContent = hasItems || Boolean(children);

  if (!hasContent) {
    return (
      <div
        aria-hidden="true"
        data-testid="home-resource-reserve"
        className={`flex min-h-[46px] w-24 shrink-0 items-center justify-end gap-2 sm:w-36 ${className}`}
      >
        <div className="h-[46px] w-full rounded-xl border border-amber-400/12 bg-[#0c1220]/28 shadow-[inset_0_1px_0_rgba(255,232,175,0.06)]" />
      </div>
    );
  }

  return (
    <div
      data-testid="home-resource-area"
      className={`flex min-h-[46px] shrink-0 items-center justify-end gap-1.5 sm:gap-2 ${className}`}
    >
      {items?.map((item) => {
        const inner = (
          <>
            {item.icon ? <span className="shrink-0">{item.icon}</span> : null}
            <div className="min-w-0 leading-tight text-left">
              <div className="text-[9px] font-semibold tracking-wider text-amber-200/75 uppercase sm:text-[10px]">
                {item.label}
              </div>
              {item.value !== undefined ? (
                <div className="font-mono-tabular text-xs font-bold text-amber-100 sm:text-[13px]">
                  {item.value}
                </div>
              ) : null}
            </div>
          </>
        );

        const sharedClass =
          'flex min-h-[46px] items-center gap-1.5 rounded-xl border border-amber-400/40 bg-gradient-to-b from-[#131c2e]/92 to-[#0b111d]/95 px-2.5 py-1.5 shadow-[0_8px_22px_rgba(0,0,0,0.48),inset_0_1px_0_rgba(255,232,175,0.16)] sm:gap-2 sm:px-3';

        if (item.onClick) {
          return (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              aria-label={item.ariaLabel ?? `${item.label}: ${item.value ?? ''}`}
              className={`${sharedClass} transition-transform duration-150 hover:border-amber-300/70 active:scale-[0.97]`}
            >
              {inner}
            </button>
          );
        }

        return (
          <div key={item.id} className={sharedClass}>
            {inner}
          </div>
        );
      })}
      {children}
    </div>
  );
}
