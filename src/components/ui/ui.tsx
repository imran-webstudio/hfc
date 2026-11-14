import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("surface-card rounded-2xl", className)}>{children}</div>;
}

type ChipTone = "leaf" | "red" | "amber" | "muted";
export function Chip({ tone = "leaf", className, children }: { tone?: ChipTone; className?: string; children: ReactNode }) {
  return <span className={cn("chip", `chip-${tone}`, className)}>{children}</span>;
}

/** Page heading: round teal icon + Syne title + optional subtitle. */
export function PageTitle({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex items-start gap-3">
      <div className="mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-leaf/15 text-leaf">{icon}</div>
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">{title}</h1>
        {children ? <p className="mt-1 max-w-xl text-xs leading-relaxed text-ink-muted">{children}</p> : null}
      </div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  tone = "ink",
  icon,
  className,
}: {
  label: string;
  value: ReactNode;
  tone?: "ink" | "spice" | "leaf";
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("stat-card surface-card", className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">{label}</p>
        {icon ? <span className="relative z-10 grid h-7 w-7 place-items-center rounded-lg bg-leaf/15 text-leaf">{icon}</span> : null}
      </div>
      <p
        className={cn(
          "relative z-10 mt-2 font-display text-2xl font-bold",
          tone === "spice" && "text-spice-deep",
          tone === "leaf" && "text-leaf-deep",
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function EmptyNote({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("surface-card rounded-2xl px-5 py-4 text-sm text-ink-muted", className)}>{children}</div>;
}
