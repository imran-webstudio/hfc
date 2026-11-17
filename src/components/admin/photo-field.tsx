"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, Upload } from "lucide-react";

/** Optional meal photo: click or drop an image → /api/upload → URL. */
export function PhotoField({ value, onChange }: { value: string | null; onChange: (url: string | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);

  async function upload(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const body = new FormData();
      body.set("file", file);
      const res = await fetch("/api/upload", { method: "POST", body });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error ?? "Upload failed");
      onChange(json.url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <span className="field-label">Meal photo</span>
      {value ? (
        <div className="flex items-center gap-3">
          <Image src={value} alt="Meal preview" width={96} height={96} unoptimized className="h-16 w-16 rounded-xl border border-line object-cover" />
          <button type="button" className="btn btn-ghost" onClick={() => inputRef.current?.click()} disabled={busy}>
            <Upload className="h-4 w-4" /> {busy ? "Uploading…" : "Change photo"}
          </button>
          <button type="button" className="btn btn-text text-sm text-[#E03131]" onClick={() => onChange(null)}>
            Remove
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            void upload(e.dataTransfer.files[0]);
          }}
          className={`grid h-32 w-full place-items-center rounded-2xl border border-dashed text-center transition ${drag ? "border-[#5B4CF5] bg-[#5B4CF5]/10" : "border-line bg-sand hover:bg-ink/5"}`}
        >
          <span>
            <Camera className="mx-auto mb-1 h-6 w-6 text-ink-muted lg:hidden" />
            <Upload className="mx-auto mb-1 hidden h-5 w-5 text-ink-muted lg:block" />
            <span className="block text-sm font-medium lg:hidden">{busy ? "Uploading…" : "Tap to add photo"}</span>
            <span className="hidden text-sm font-medium lg:block">{busy ? "Uploading…" : "Drop a photo or click to upload"}</span>
          </span>
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => void upload(e.target.files?.[0])} />
    </div>
  );
}
