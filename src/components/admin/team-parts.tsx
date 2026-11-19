"use client";

import { useEffect, useState } from "react";
import { UserPlus } from "lucide-react";
import {
  addFloorAction,
  addManagerAction,
  createOfficeAction,
  deleteFloorAction,
  deleteOfficeAction,
  managerCandidatesAction,
  removeManagerAction,
  saveLunchCutoffAction,
  setOfficeActiveAction,
  updateFloorAction,
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
        <input id="loc-cutoff" required className="input font-mono" placeholder="12:00" value={cutoff} onChange={(e) => setCutoff(e.target.value)} />
      </div>
      <button type="submit" className="btn btn-spice" disabled={pending}>
        Create location
      </button>
    </form>
  );
}

type Manager = { userId: string; name: string; email: string | null; role: string };
export type FloorRow = { id: string; name: string };
export type LocationRow = { id: string; name: string; address: string | null; active: boolean; lunchCutoff: string; managers: Manager[]; floors: FloorRow[] };

export function LocationCard({ office }: { office: LocationRow }) {
  const { act, pending } = useAct();
  const [cutoff, setCutoff] = useState(office.lunchCutoff);
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editName, setEditName] = useState(office.name);
  const [editAddress, setEditAddress] = useState(office.address ?? "");
  const [newFloor, setNewFloor] = useState("");
  const [floorEdits, setFloorEdits] = useState<Record<string, string>>({});
  const dirty = cutoff.trim() !== office.lunchCutoff;
  const buildingDirty = editName.trim() !== office.name || editAddress.trim() !== (office.address ?? "");

  return (
    <li className="surface-card rounded-3xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-sm font-bold">{office.name}</p>
          {office.address ? <p className="text-[11px] text-ink-muted">{office.address}</p> : null}
        </div>
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
          <input id={`cut-${office.id}`} className="input font-mono" placeholder="12:00" value={cutoff} onChange={(e) => setCutoff(e.target.value)} />
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

      {/* Building edit + delete (spec §11.1). Delete is refused server-side while
          members or orders reference the building. */}
      <form
        className="mt-4 border-t border-line pt-3"
        onSubmit={(e) => {
          e.preventDefault();
          act(() => updateOfficeAction(office.id, { name: editName, address: editAddress }), { success: "Building updated" });
        }}
      >
        <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Building</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <input className="input" aria-label="Building name" value={editName} onChange={(e) => setEditName(e.target.value)} />
          <input className="input" aria-label="Building address" placeholder="Address" value={editAddress} onChange={(e) => setEditAddress(e.target.value)} />
        </div>
        <div className="mt-2 flex gap-2">
          <button type="submit" className="btn btn-ghost btn-sm" disabled={!buildingDirty || pending}>
            Save building
          </button>
          <button type="button" className="btn btn-ghost btn-sm text-[#E03131]" disabled={pending} onClick={() => setConfirmDelete(true)}>
            Delete building
          </button>
        </div>
      </form>

      {/* Dynamic floors for this building (spec §11.2). */}
      <div className="mt-4 border-t border-line pt-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Floors{office.floors.length ? ` · ${office.floors.length}` : ""}</p>
        {office.floors.length === 0 ? <p className="mt-2 text-[11px] text-ink-muted">No floors yet — add the first one below.</p> : null}
        <ul className="mt-2 space-y-1.5">
          {office.floors.map((f) => {
            const val = floorEdits[f.id] ?? f.name;
            return (
              <li key={f.id} className="flex items-center gap-2">
                <input
                  className="input h-9 flex-1"
                  aria-label={`Floor name for ${f.name}`}
                  value={val}
                  onChange={(e) => setFloorEdits((s) => ({ ...s, [f.id]: e.target.value }))}
                />
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={pending || val.trim() === f.name}
                  onClick={() => act(() => updateFloorAction(f.id, val), { success: "Floor updated" })}
                >
                  Save
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm text-[#E03131]"
                  disabled={pending}
                  onClick={() => act(() => deleteFloorAction(f.id), { success: "Floor deleted" })}
                >
                  Delete
                </button>
              </li>
            );
          })}
        </ul>
        <form
          className="mt-2 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            act(() => addFloorAction(office.id, newFloor), { success: "Floor added", onOk: () => setNewFloor("") });
          }}
        >
          <input className="input h-9 flex-1" placeholder="New floor — any label, e.g. 3 or Rooftop" value={newFloor} onChange={(e) => setNewFloor(e.target.value)} />
          <button type="submit" className="btn btn-leaf btn-sm" disabled={pending || !newFloor.trim()}>
            Add floor
          </button>
        </form>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title={`Delete ${office.name}?`}
        text="The building can only be deleted when no members are assigned and it has no orders. Its floors, managers and menu copies will be removed."
        confirmLabel="Delete building"
        danger
        busy={pending}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => act(() => deleteOfficeAction(office.id), { success: "Building deleted", onOk: () => setConfirmDelete(false) })}
      />
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
