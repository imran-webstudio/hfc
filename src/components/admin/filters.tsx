"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";

/** Reads/writes a single URL query param (server components re-render with the new value). */
export function useQueryParam() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value === null || value === "" || value === "all") next.delete(key);
    else next.set(key, value);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };
}

export function FilterSelect({
  param,
  label,
  value,
  options,
  className,
  bare = false,
}: {
  param: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  className?: string;
  bare?: boolean;
}) {
  const set = useQueryParam();
  return (
    <div className={className}>
      <label className={bare ? "sr-only" : "field-label"} htmlFor={`f-${param}`}>{label}</label>
      <select id={`f-${param}`} className={bare ? "h-11 w-full rounded-full border border-line bg-rice px-3 text-sm font-medium text-ink" : "input"} value={value} onChange={(e) => set(param, e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

export function FilterDate({ param, label, value, className, bare = false }: { param: string; label: string; value: string; className?: string; bare?: boolean }) {
  const set = useQueryParam();
  return (
    <div className={className}>
      <label className={bare ? "sr-only" : "field-label"} htmlFor={`f-${param}`}>{label}</label>
      <input id={`f-${param}`} type="date" className={bare ? "h-11 w-full rounded-full border border-line bg-rice px-3 text-sm font-medium text-ink" : "input"} value={value} onChange={(e) => e.target.value && set(param, e.target.value)} />
    </div>
  );
}

export function FilterSearch({ param, label, value, placeholder, className, bare = false }: { param: string; label: string; value: string; placeholder: string; className?: string; bare?: boolean }) {
  const set = useQueryParam();
  const [text, setText] = useState(value);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => set(param, text.trim()), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);
  return (
    <div className={className}>
      <label className={bare ? "sr-only" : "field-label"} htmlFor={`f-${param}`}>{label}</label>
      <div className="relative">
        {bare ? <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" /> : null}
        <input id={`f-${param}`} className={bare ? "h-11 w-full rounded-full border border-line bg-rice pl-10 pr-4 text-sm text-ink" : "input"} placeholder={placeholder} value={text} onChange={(e) => setText(e.target.value)} />
      </div>
    </div>
  );
}

/** Round search control for the phone orders bar. Writes the same `q` param as FilterSearch. */
export function OrderSearchButton() {
  const params = useSearchParams();
  const set = useQueryParam();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(params.get("q") ?? "");
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => set("q", text.trim() || null), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);
  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Search orders"
        aria-expanded={open}
        className="grid h-10 w-10 place-items-center rounded-full bg-rice ring-1 ring-line"
        onClick={() => setOpen((v) => !v)}
      >
        <Search className="h-4 w-4" />
      </button>
      {open ? (
        <input
          autoFocus
          aria-label="Search orders"
          className="absolute right-0 top-12 z-40 w-56 rounded-full border border-line bg-rice px-4 py-2 text-sm text-ink shadow-lg"
          placeholder="Search orders"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      ) : null}
    </div>
  );
}
