"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, ChevronRight, Search, Wallet, X } from "lucide-react";
import { depositAction } from "@/actions/admin-users";
import { useAct } from "@/components/ui/use-act";
import { signedTaka, taka } from "@/lib/money";

export type UserRow = {
  id: string;
  name: string;
  role: "USER" | "SUPER_ADMIN";
  isManager: boolean;
  banned: boolean;
  zoneId: string | null;
  balance: number;
  due: number;
  employeeId: string | null;
  officeName: string | null;
  floor: string | null;
  company: string | null;
};

const AVATARS = [
  { bg: "#5B4CF5", fg: "#fff" },
  { bg: "#D4FF3A", fg: "#0B0B0F" },
  { bg: "#FB7185", fg: "#fff" },
  { bg: "#7C6BF2", fg: "#fff" },
  { bg: "#9CA3AF", fg: "#fff" },
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

function avatar(name: string, banned: boolean) {
  if (banned) return { bg: "#D9D9DE", fg: "#3A3A44" };
  let n = 0;
  for (const c of name) n = (n + c.charCodeAt(0)) % AVATARS.length;
  return AVATARS[n];
}

export function UsersBoard({ rows, controls, totals }: { rows: UserRow[]; controls?: React.ReactNode; totals: { due: number; credit: number } }) {
  const [payOpen, setPayOpen] = useState(false);
  // Headline totals are for every member in scope, not just the filtered list —
  // opening ?balance=due must not zero out the Credit total (and vice versa).
  const due = totals.due;
  const credit = totals.credit;
  const shown = rows;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight lg:text-4xl">Users & deposits</h1>
        <button type="button" className="btn shrink-0 bg-[#5B4CF5] text-white hover:bg-[#4636e0]" onClick={() => setPayOpen(true)}>
          <Wallet className="h-4 w-4" /> Add Money
        </button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="flex items-center gap-3 rounded-[1.75rem] bg-[#FDECEC] px-5 py-5 dark:bg-[#E03131]/15">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#E03131] text-xl font-extrabold text-white">!</span>
          <div>
            <p className="text-sm font-medium text-ink-muted">Due</p>
            <p className="tnum text-[30px] font-extrabold leading-tight text-[#E03131]">{taka(due)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-[1.75rem] bg-[#E4F5EC] px-5 py-5 dark:bg-[#0F9B8E]/15">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#12B76A] text-white">
            <Check className="h-6 w-6" strokeWidth={3} />
          </span>
          <div>
            <p className="text-sm font-medium text-ink-muted">Credit</p>
            <p className="tnum text-[30px] font-extrabold leading-tight text-[#0B7A55] dark:text-[#12B76A]">{taka(credit)}</p>
          </div>
        </div>
      </div>

      {controls ? <div className="mb-3">{controls}</div> : null}

      {shown.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-line px-4 py-10 text-center text-sm text-ink-muted">No members match these filters.</p>
      ) : (
        <ul className="space-y-2">
          {shown.map((u) => (
            <UserRowLink key={u.id} u={u} />
          ))}
        </ul>
      )}

      {payOpen ? <AddMoney rows={rows.filter((r) => !r.banned)} onClose={() => setPayOpen(false)} /> : null}
    </div>
  );
}

function UserRowLink({ u }: { u: UserRow }) {
  const color = avatar(u.name, u.banned);
  return (
    <li>
      <Link href={`/admin/users/${u.id}`} className="surface-card flex items-center gap-3 rounded-2xl px-3 py-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-bold" style={{ background: color.bg, color: color.fg }}>
          {initials(u.name)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate font-semibold">{u.name}</span>
            {u.role === "SUPER_ADMIN" ? <span className="shrink-0 rounded-full bg-[#5B4CF5]/15 px-2 py-0.5 text-[10px] font-bold text-[#5B4CF5]">Admin</span> : null}
          </span>
          <span className="mt-0.5 block truncate text-[13px] font-medium leading-snug text-ink/80">
            <span className="text-ink-muted">ID:</span> {u.employeeId ?? "—"} <span className="text-ink-muted">• Office:</span> {u.officeName ?? "—"}
          </span>
          <span className="block truncate text-[13px] font-medium leading-snug text-ink/80">
            <span className="text-ink-muted">Floor:</span> {u.floor ?? "—"} <span className="text-ink-muted">• Company:</span> {u.company ?? "—"}
          </span>
        </span>
        <BalancePill u={u} />
        <ChevronRight className="h-4 w-4 shrink-0 text-ink-muted lg:hidden" />
      </Link>
    </li>
  );
}

function BalancePill({ u }: { u: UserRow }) {
  if (u.banned) return <span className="rounded-full bg-[#0B0B0F] px-3 py-1 text-xs font-semibold text-white">Blocked</span>;
  if (u.balance < 0) return <span className="tnum rounded-full bg-[#FDE8E8] px-3 py-1 text-xs font-semibold text-[#E03131]">{signedTaka(u.balance)} due</span>;
  if (u.balance > 0) return <span className="tnum rounded-full bg-[#E7F8C9] px-3 py-1 text-xs font-semibold text-[#3D6B12]">{signedTaka(u.balance)}</span>;
  return <span className="tnum rounded-full bg-sand px-3 py-1 text-xs font-semibold text-ink-muted">৳0 Clear</span>;
}

function AddMoney({ rows, onClose }: { rows: UserRow[]; onClose: () => void }) {
  const { act, pending } = useAct();
  const [id, setId] = useState(rows[0]?.id ?? "");
  const [amount, setAmount] = useState<number | "">(500);
  const [note, setNote] = useState("Cash received");
  const [q, setQ] = useState("");
  const filtered = useMemo(() => rows.filter((r) => r.name.toLowerCase().includes(q.trim().toLowerCase())), [rows, q]);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="Add money">
      <form
        className="surface-card w-full max-w-md rounded-3xl p-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!id) return;
          act(() => depositAction(id, Number(amount), note), { success: "Deposit recorded", onOk: onClose });
        }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Add money</h2>
          <button type="button" aria-label="Close" onClick={onClose} className="icon-btn">
            <X className="h-4 w-4" />
          </button>
        </div>
        <label className="field-label" htmlFor="pay-q">Member</label>
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <input id="pay-q" className="input pl-9" placeholder="Name or employee ID" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input mb-3" value={id} onChange={(e) => setId(e.target.value)} required>
          {filtered.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
              {r.employeeId ? ` · ${r.employeeId}` : ""}
            </option>
          ))}
        </select>
        <label className="field-label" htmlFor="pay-amt">Amount ৳</label>
        <input id="pay-amt" type="number" min={1} required className="input mb-3" value={amount} onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))} />
        <label className="field-label" htmlFor="pay-note">Note</label>
        <input id="pay-note" className="input mb-4" value={note} onChange={(e) => setNote(e.target.value)} />
        <button type="submit" className="btn w-full bg-[#D4FF3A] text-[#0B0B0F]" disabled={pending || !id}>
          Record deposit
        </button>
      </form>
    </div>
  );
}
