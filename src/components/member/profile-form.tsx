"use client";

import { useState } from "react";
import { saveProfileAction } from "@/actions/member";
import { useAct } from "@/components/ui/use-act";

type Props = {
  offices: { id: string; name: string }[];
  /** Dynamic floor registry (spec §11.3): floors of the selected building only. */
  floorsByOffice?: Record<string, string[]>;
  initial: { employeeId: string; phone: string; officeId: string; floor: string; desk: string; address: string };
  zoneName: string | null;
};

export function ProfileForm({ offices, floorsByOffice, initial, zoneName }: Props) {
  const { act, pending } = useAct();
  const [v, setV] = useState(initial);
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV((s) => ({ ...s, [k]: e.target.value }));
  const floorOptions = v.officeId ? floorsByOffice?.[v.officeId] ?? [] : [];
  const onOffice = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const officeId = e.target.value;
    const opts = floorsByOffice?.[officeId] ?? [];
    setV((s) => ({ ...s, officeId, floor: opts.includes(s.floor) ? s.floor : opts[0] ?? s.floor }));
  };

  return (
    <form
      className="surface-card space-y-4 rounded-2xl p-5"
      onSubmit={(e) => {
        e.preventDefault();
        act(() => saveProfileAction(v), { success: "Profile saved" });
      }}
    >
      <div>
        <label className="field-label" htmlFor="employeeId">Employee ID</label>
        <input id="employeeId" className="input" required placeholder="e.g. EMP-1042" value={v.employeeId} onChange={set("employeeId")} />
      </div>
      <div>
        <label className="field-label" htmlFor="phone">Phone number</label>
        <input id="phone" className="input" required type="tel" placeholder="e.g. 01712345678" value={v.phone} onChange={set("phone")} />
      </div>
      <div className="grid grid-cols-[1fr_7rem] gap-3">
        <div>
          <label className="field-label" htmlFor="office">Office / Building</label>
          <select id="office" className="input" required value={v.officeId} onChange={onOffice}>
            <option value="">Select office…</option>
            {offices.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
          <p className="mt-1 text-[10px] leading-snug text-ink-muted">This also sets your catering zone for menus and orders.</p>
        </div>
        <div>
          <label className="field-label" htmlFor="floor">Floor</label>
          {floorOptions.length ? (
            <select id="floor" className="input" required value={v.floor} onChange={set("floor")}>
              <option value="">Select floor…</option>
              {floorOptions.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          ) : (
            <input id="floor" className="input" required placeholder="e.g. 5" value={v.floor} onChange={set("floor")} />
          )}
        </div>
      </div>
      <div>
        <label className="field-label" htmlFor="desk">Desk number</label>
        <input id="desk" className="input" required placeholder="e.g. D-12" value={v.desk} onChange={set("desk")} />
      </div>
      <div>
        <label className="field-label" htmlFor="address">Address</label>
        <input id="address" className="input" required placeholder="e.g. Ambon Complex, Dhaka 1212" value={v.address} onChange={set("address")} />
      </div>
      <button type="submit" className="btn btn-spice w-full py-3" disabled={pending}>
        {pending ? "Saving…" : "Save changes"}
      </button>
      <p className="text-[11px] text-ink-muted">
        Catering zone: <b className="text-ink">{zoneName ?? "Not set"}</b>
      </p>
    </form>
  );
}
