import type { ReactNode } from 'react';

export interface HomeResourceItem {
  id: string;
  label: string;
  value?: string | number;
  icon?: ReactNode;
}

export interface HomeResourceAreaProps {
  /** Future expandable resource slots (e.g. Coins, Gems). Left empty until implemented. */
  items?: HomeResourceItem[];
  children?: ReactNode;
  className?: string;
}

/**
 * Reusable, expandable top-right container reserving dedicated layout space
 * on the Home Screen for future resource indicators (such as Coins and Gems).
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
      className={`flex min-h-[46px] shrink-0 items-center justify-end gap-2 ${className}`}
    >
      {items?.map((item) => (
        <div
          key={item.id}
          className="flex min-h-[46px] items-center gap-2 rounded-xl border border-amber-400/35 bg-gradient-to-b from-[#131c2e]/92 to-[#0b111d]/95 px-3 py-1.5 shadow-[0_8px_22px_rgba(0,0,0,0.48),inset_0_1px_0_rgba(255,232,175,0.16)]"
        >
          {item.icon ? <span className="shrink-0">{item.icon}</span> : null}
          <div className="min-w-0 leading-tight">
            <div className="text-[10px] font-semibold tracking-wider text-amber-200/75 uppercase">
              {item.label}
            </div>
            {item.value !== undefined ? (
              <div className="font-mono-tabular text-xs font-bold text-amber-100">
                {item.value}
              </div>
            ) : null}
          </div>
        </div>
      ))}
      {children}
    </div>
  );
}
