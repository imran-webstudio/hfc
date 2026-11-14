"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

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
}: {
  param: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  className?: string;
}) {
  const set = useQueryParam();
  return (
    <div className={className}>
      <label className="field-label" htmlFor={`f-${param}`}>{label}</label>
      <select id={`f-${param}`} className="input" value={value} onChange={(e) => set(param, e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

export function FilterDate({ param, label, value, className }: { param: string; label: string; value: string; className?: string }) {
  const set = useQueryParam();
  return (
    <div className={className}>
      <label className="field-label" htmlFor={`f-${param}`}>{label}</label>
      <input id={`f-${param}`} type="date" className="input" value={value} onChange={(e) => e.target.value && set(param, e.target.value)} />
    </div>
  );
}

export function FilterSearch({ param, label, value, placeholder, className }: { param: string; label: string; value: string; placeholder: string; className?: string }) {
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
      <label className="field-label" htmlFor={`f-${param}`}>{label}</label>
      <input id={`f-${param}`} className="input" placeholder={placeholder} value={text} onChange={(e) => setText(e.target.value)} />
    </div>
  );
}
