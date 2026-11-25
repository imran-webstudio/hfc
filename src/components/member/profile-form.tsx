"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Upload } from "lucide-react";
import { toast } from "sonner";
import { saveProfileAction } from "@/actions/member";
import { useAct } from "@/components/ui/use-act";

/** Downscale big photos in the browser (max 512px, JPEG) so avatar uploads stay small. */
async function shrinkAvatar(file: File): Promise<File> {
  if (file.size <= 300 * 1024) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 512 / Math.max(bmp.width, bmp.height));
    if (scale >= 1) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")?.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    return blob ? new File([blob], "avatar.jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}

type Props = {
  offices: { id: string; name: string }[];
  /** Dynamic floor registry (spec §11.3): floors of the selected building only. */
  floorsByOffice?: Record<string, string[]>;
  /** Admin-predefined companies of the selected building only. */
  companiesByOffice?: Record<string, string[]>;
  initial: { employeeId: string; phone: string; officeId: string; floor: string; company: string; address: string; image: string | null };
  zoneName: string | null;
  /** First-time setup: after saving, continue to the main menu. */
  firstTime?: boolean;
};

export function ProfileForm({ offices, floorsByOffice, companiesByOffice, initial, zoneName, firstTime }: Props) {
  const { act, pending } = useAct();
  const router = useRouter();
  const [v, setV] = useState(initial);
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV((s) => ({ ...s, [k]: e.target.value }));
  const floorOptions = v.officeId ? floorsByOffice?.[v.officeId] ?? [] : [];
  const companyOptions = v.officeId ? companiesByOffice?.[v.officeId] ?? [] : [];
  const onOffice = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const officeId = e.target.value;
    const opts = floorsByOffice?.[officeId] ?? [];
    const comps = companiesByOffice?.[officeId] ?? [];
    setV((s) => ({
      ...s,
      officeId,
      floor: opts.includes(s.floor) ? s.floor : opts[0] ?? s.floor,
      company: comps.includes(s.company) ? s.company : comps[0] ?? s.company,
    }));
  };
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  async function uploadPhoto(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const body = new FormData();
      body.set("file", await shrinkAvatar(file));
      body.set("kind", "avatar");
      const res = await fetch("/api/upload", { method: "POST", body });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error ?? "Upload failed");
      setV((s) => ({ ...s, image: json.url ?? null }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <form
      className="surface-card space-y-4 rounded-2xl p-5"
      onSubmit={(e) => {
        e.preventDefault();
        act(() => saveProfileAction(v), {
          success: firstTime ? "Profile saved — welcome!" : "Profile saved",
          onOk: firstTime ? () => router.push("/app") : undefined,
        });
      }}
    >
      <div>
        <span className="field-label">Profile photo</span>
        <div className="flex items-center gap-3">
          {v.image ? (
            <Image src={v.image} alt="Your profile photo" width={80} height={80} unoptimized className="h-20 w-20 shrink-0 rounded-full border border-line object-cover" />
          ) : (
            <span className="grid h-20 w-20 shrink-0 place-items-center rounded-full border border-dashed border-line bg-surface-muted text-ink-muted">
              <Camera className="h-7 w-7" />
            </span>
          )}
          <div className="flex flex-col items-start gap-1.5">
            <button type="button" className="btn btn-ghost" onClick={() => fileRef.current?.click()} disabled={uploading}>
              <Upload className="h-4 w-4" /> {uploading ? "Uploading…" : v.image ? "Change photo" : "Upload photo"}
            </button>
            {v.image ? (
              <button type="button" className="btn btn-text text-sm text-[#E03131]" onClick={() => setV((s) => ({ ...s, image: null }))}>
                Remove
              </button>
            ) : null}
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => uploadPhoto(e.target.files?.[0])} />
        </div>
        <p className="mt-1.5 text-[10px] leading-snug text-ink-muted">Optional — the catering team sees it next to your name, so delivery can recognise you.</p>
      </div>
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
          <label className="field-label" htmlFor="office">Building</label>
          <select id="office" className="input" required value={v.officeId} onChange={onOffice}>
            <option value="">Select building…</option>
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
        <label className="field-label" htmlFor="company">Company / Organisation</label>
        {companyOptions.length ? (
          <select id="company" className="input" required value={v.company} onChange={set("company")}>
            <option value="">Select company…</option>
            {companyOptions.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        ) : (
          <input id="company" className="input" required placeholder="e.g. Softvence" value={v.company} onChange={set("company")} />
        )}
        <p className="mt-1 text-[10px] leading-snug text-ink-muted">The company you work for in this building — it is shown on your orders so delivery can find you.</p>
      </div>
      <div>
        <label className="field-label" htmlFor="address">Address</label>
        <input id="address" className="input" required placeholder="e.g. Ambon Complex, Dhaka 1212" value={v.address} onChange={set("address")} />
      </div>
      <button type="submit" className="btn btn-spice w-full py-3" disabled={pending}>
        {pending ? "Saving…" : firstTime ? "Save & continue" : "Save changes"}
      </button>
      <p className="text-[11px] text-ink-muted">
        Catering zone: <b className="text-ink">{zoneName ?? "Not set"}</b>
      </p>
    </form>
  );
}
