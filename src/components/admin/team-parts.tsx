"use client";

import { useEffect, useState } from "react";
import { MoreVertical, Pencil, Plus, Trash2, UserPlus } from "lucide-react";
import {
  addCompanyAction,
  addFloorAction,
  addManagerAction,
  createOfficeAction,
  deleteCompanyAction,
  deleteFloorAction,
  deleteOfficeAction,
  managerCandidatesAction,
  removeManagerAction,
  saveLunchCutoffAction,
  setOfficeActiveAction,
  updateOfficeAction,
} from "@/actions/admin-team";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { useAct } from "@/components/ui/use-act";
import { Chip } from "@/components/ui/ui";
import { cn } from "@/lib/cn";

export function NewLocationForm() {
  const { act, pending } = useAct();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [cutoff, setCutoff] = useState("14:00");
  return (
    <form
      className="surface-card mb-8 space-y-4 rounded-3xl p-5"
      onSubmit={(e) => {
        e.preventDefault();
        act(() => createOfficeAction({ name, address, cutoff }), {
          success: "Location created",
          onOk: () => {
            setName("");
            setAddress("");
            setCutoff("14:00");
          },
        });
      }}
    >
      <h2 className="font-display text-base font-bold">New location</h2>
      <div>
        <label className="field-label" htmlFor="loc-name">Name</label>
        <input id="loc-name" required className="input" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label className="field-label" htmlFor="loc-address">Address</label>
        <input id="loc-address" className="input" value={address} onChange={(e) => setAddress(e.target.value)} />
      </div>
      <div>
        <label className="field-label" htmlFor="loc-cutoff">Order cutoff (24h, Asia/Dhaka)</label>
        <input id="loc-cutoff" required type="time" className="input" value={cutoff} onChange={(e) => setCutoff(e.target.value)} />
      </div>
      <button type="submit" className="btn btn-spice" disabled={pending}>
        Create location
      </button>
    </form>
  );
}

type Manager = { userId: string; name: string; email: string | null; role: string };
export type FloorRow = { id: string; name: string };
export type CompanyRow = { id: string; name: string };
export type LocationRow = { id: string; name: string; address: string | null; active: boolean; lunchCutoff: string; managers: Manager[]; floors: FloorRow[]; companies: CompanyRow[] };

export function LocationCard({ office }: { office: LocationRow }) {
  const { act, pending } = useAct();
  const [cutoff, setCutoff] = useState(office.lunchCutoff);
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editName, setEditName] = useState(office.name);
  const [editAddress, setEditAddress] = useState(office.address ?? "");
  const [newFloor, setNewFloor] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const dirty = cutoff.trim() !== office.lunchCutoff;

  return (
    <li className="surface-card rounded-3xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-[17px] font-extrabold">{office.name}</p>
          {office.address ? <p className="text-xs text-ink-muted">{office.address}</p> : null}
        </div>
        <div className="relative flex shrink-0 items-center gap-1.5">
          <button
            role="switch"
            aria-checked={office.active}
            aria-label={`${office.name} active`}
            disabled={pending}
            onClick={() => act(() => setOfficeActiveAction(office.id, !office.active), { success: office.active ? "Location deactivated" : "Location activated" })}
            className={cn("flex items-center gap-2 rounded-full border px-2 py-1 text-[11px] font-bold transition", office.active ? "border-leaf/40 bg-leaf/15 text-leaf" : "border-line text-ink-muted")}
          >
            <span className={cn("relative h-4 w-7 rounded-full transition", office.active ? "bg-leaf" : "bg-ink/20")}>
              <span className={cn("absolute top-0.5 h-3 w-3 rounded-full bg-[#04201c] transition-all", office.active ? "left-3.5" : "left-0.5 bg-white")} />
            </span>
            {office.active ? "Active" : "Inactive"}
          </button>
          <button
            type="button"
            aria-label={`More actions for ${office.name}`}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="grid h-8 w-8 place-items-center rounded-full text-ink-muted transition hover:bg-ink/5 hover:text-ink"
          >
            <MoreVertical className="h-5 w-5" />
          </button>
          {menuOpen ? (
            <>
              <button type="button" aria-hidden tabIndex={-1} className="fixed inset-0 z-20 cursor-default" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full z-30 mt-1.5 w-52 rounded-2xl border border-line bg-rice p-1.5 shadow-xl">
                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-[#5B4CF5] transition hover:bg-[#5B4CF5]/10"
                  onClick={() => {
                    setMenuOpen(false);
                    setEditName(office.name);
                    setEditAddress(office.address ?? "");
                    setEditOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4" /> Edit location
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-[#E03131] transition hover:bg-[#E03131]/10"
                  onClick={() => {
                    setMenuOpen(false);
                    setConfirmDelete(true);
                  }}
                >
                  <Trash2 className="h-4 w-4" /> Remove location
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>

      <form
        className="mt-3"
        onSubmit={(e) => {
          e.preventDefault();
          act(() => saveLunchCutoffAction(office.id, cutoff), { success: "Cutoff saved" });
        }}
      >
        <label className="field-label" htmlFor={`cut-${office.id}`}>Lunch cutoff (24h)</label>
        <div className="flex gap-2">
          <input id={`cut-${office.id}`} type="time" className="input" value={cutoff} onChange={(e) => setCutoff(e.target.value)} />
          <button type="submit" className="btn btn-ghost" disabled={!dirty || pending}>
            Save cutoff
          </button>
        </div>
      </form>

      <div className="mt-3 rounded-xl border border-line bg-ink/5 p-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Managers{office.managers.length ? ` · ${office.managers.length}` : ""}</p>
          <button className="btn btn-leaf btn-sm gap-1.5" onClick={() => setOpen(true)}>
            <UserPlus className="h-3.5 w-3.5" /> Add managers
          </button>
        </div>
        {office.managers.length === 0 ? (
          <p className="mt-2 text-[11px] text-ink-muted">No managers yet — add someone who can run this office.</p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {office.managers.map((m) => (
              <Chip key={m.userId}>{m.name}</Chip>
            ))}
          </div>
        )}
      </div>

      {/* Floors sit directly under Location · Cutoff · Managers (owner's layout).
          Editing/removing the location itself lives in the ⋮ menu by Active. */}
      <div className="mt-4 border-t border-line pt-3">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Floors{office.floors.length ? ` · ${office.floors.length}` : ""}</p>
          <p className="text-[11px] text-ink-muted">Manage floors for this location</p>
        </div>
        {office.floors.length === 0 ? <p className="mt-2 text-[11px] text-ink-muted">No floors yet — add the first one below.</p> : null}
        <ul className="mt-2.5 space-y-2">
          {office.floors.map((f) => (
            <li key={f.id} className="flex items-center justify-between gap-3 rounded-xl border border-line px-3.5 py-2.5">
              <span className="text-sm font-bold">{f.name}</span>
              <button
                type="button"
                className="shrink-0 rounded-full bg-[#E03131]/10 px-3.5 py-1.5 text-xs font-bold text-[#E03131] transition hover:bg-[#E03131]/20 disabled:opacity-50"
                disabled={pending}
                onClick={() => act(() => deleteFloorAction(f.id), { success: "Floor deleted" })}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
        <form
          className="mt-3 flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            act(() => addFloorAction(office.id, newFloor), { success: "Floor added", onOk: () => setNewFloor("") });
          }}
        >
          <input className="input h-11 flex-1 rounded-full px-4" placeholder="Enter floor name/number" value={newFloor} onChange={(e) => setNewFloor(e.target.value)} />
          <button
            type="submit"
            aria-label="Add floor"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#5B4CF5] text-white transition hover:bg-[#4A3EDB] disabled:opacity-50"
            disabled={pending || !newFloor.trim()}
          >
            <Plus className="h-5 w-5" />
          </button>
        </form>
        <p className="mt-1.5 text-[11px] text-ink-muted">New floor will be added immediately.</p>
      </div>

      {/* Companies are predefined per building, like floors: members pick
          theirs in Profile instead of typing it. */}
      <div className="mt-4 border-t border-line pt-3">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Companies{office.companies.length ? ` · ${office.companies.length}` : ""}</p>
          <p className="text-[11px] text-ink-muted">Manage companies for this location</p>
        </div>
        {office.companies.length === 0 ? <p className="mt-2 text-[11px] text-ink-muted">No companies yet — add the first one below.</p> : null}
        <ul className="mt-2.5 space-y-2">
          {office.companies.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 rounded-xl border border-line px-3.5 py-2.5">
              <span className="text-sm font-bold">{c.name}</span>
              <button
                type="button"
                className="shrink-0 rounded-full bg-[#E03131]/10 px-3.5 py-1.5 text-xs font-bold text-[#E03131] transition hover:bg-[#E03131]/20 disabled:opacity-50"
                disabled={pending}
                onClick={() => act(() => deleteCompanyAction(c.id), { success: "Company deleted" })}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
        <form
          className="mt-3 flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            act(() => addCompanyAction(office.id, newCompany), { success: "Company added", onOk: () => setNewCompany("") });
          }}
        >
          <input className="input h-11 flex-1 rounded-full px-4" placeholder="Enter company name" value={newCompany} onChange={(e) => setNewCompany(e.target.value)} />
          <button
            type="submit"
            aria-label="Add company"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#5B4CF5] text-white transition hover:bg-[#4A3EDB] disabled:opacity-50"
            disabled={pending || !newCompany.trim()}
          >
            <Plus className="h-5 w-5" />
          </button>
        </form>
        <p className="mt-1.5 text-[11px] text-ink-muted">New company will be added immediately.</p>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title={`Remove ${office.name}?`}
        text="This removes the location with its floors, companies and managers. It can only be removed when no members are assigned to it and it has no orders — if food delivery has just stopped here, deactivating it instead keeps the history."
        confirmLabel="Remove location"
        danger
        busy={pending}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => act(() => deleteOfficeAction(office.id), { success: "Location removed", onOk: () => setConfirmDelete(false) })}
      />
      {editOpen ? (
        <Modal open onClose={() => setEditOpen(false)} title="Edit location" subtitle={office.name}>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              act(() => updateOfficeAction(office.id, { name: editName, address: editAddress }), {
                success: "Location updated",
                onOk: () => setEditOpen(false),
              });
            }}
          >
            <div>
              <label className="field-label" htmlFor={`edit-name-${office.id}`}>Name</label>
              <input id={`edit-name-${office.id}`} required className="input" value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div>
              <label className="field-label" htmlFor={`edit-address-${office.id}`}>Address</label>
              <input id={`edit-address-${office.id}`} className="input" value={editAddress} onChange={(e) => setEditAddress(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-spice w-full" disabled={pending || !editName.trim()}>
              {pending ? "Saving…" : "Save changes"}
            </button>
          </form>
        </Modal>
      ) : null}
      {open ? <ManagersModal office={office} onClose={() => setOpen(false)} /> : null}
    </li>
  );
}

type Candidate = { id: string; name: string | null; email: string | null; employeeId: string | null };

function ManagersModal({ office, onClose }: { office: LocationRow; onClose: () => void }) {
  const { act, pending } = useAct();
  const [q, setQ] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let live = true;
    const t = setTimeout(async () => {
      const r = await managerCandidatesAction(office.id, q);
      if (live && r.ok) setCandidates(r.data);
    }, 200);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [q, office.id, version, office.managers.length]);

  return (
    <Modal open onClose={onClose} title="Managers" subtitle={office.name}>
      <p className="field-label">Assigned</p>
      {office.managers.length === 0 ? (
        <p className="mb-4 text-[11px] text-ink-muted">Nobody assigned yet.</p>
      ) : (
        <ul className="mb-4 space-y-1.5">
          {office.managers.map((m) => (
            <li key={m.userId} className="flex items-center justify-between rounded-xl bg-ink/[0.04] px-3 py-2">
              <div>
                <p className="text-xs font-bold">{m.name}</p>
                <p className="text-[10px] text-ink-muted">
                  {m.email} · {m.role}
                </p>
              </div>
              <button
                className="btn btn-text btn-sm"
                disabled={pending}
                onClick={() => act(() => removeManagerAction(office.id, m.userId), { success: "Manager removed", onOk: () => setVersion((v) => v + 1) })}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <label className="field-label" htmlFor="mgr-search">Add manager</label>
      <input id="mgr-search" className="input mb-2" placeholder="Search name, email, or employee ID" autoFocus value={q} onChange={(e) => setQ(e.target.value)} />
      <ul className="max-h-64 space-y-0.5 overflow-y-auto">
        {candidates.length === 0 ? <li className="px-1 py-2 text-[11px] text-ink-muted">No matching members.</li> : null}
        {candidates.map((c) => (
          <li key={c.id}>
            <button
              className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left hover:bg-ink/5"
              disabled={pending}
              onClick={() => act(() => addManagerAction(office.id, c.id), { success: `${c.name} is now a manager`, onOk: () => setVersion((v) => v + 1) })}
            >
              <span>
                <span className="block text-xs font-bold">{c.name}</span>
                <span className="block text-[10px] text-ink-muted">
                  {c.email} · {c.employeeId ?? "—"}
                </span>
              </span>
              <UserPlus className="h-3.5 w-3.5 text-leaf" />
            </button>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
