"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";

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
        <div className="relative inline-block">
          <Image src={value} alt="Meal preview" width={160} height={112} unoptimized className="h-28 w-40 rounded-xl border border-line object-cover" />
          <button
            type="button"
            aria-label="Remove photo"
            onClick={() => onChange(null)}
            className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-red-600 text-white"
          >
            <X className="h-3.5 w-3.5" />
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
          className={`grid h-32 w-full place-items-center rounded-xl border border-dashed text-center transition ${drag ? "border-leaf bg-leaf/10" : "border-line bg-white/[0.02] hover:bg-white/5"}`}
        >
          <span>
            <span className="block text-sm font-bold">{busy ? "Uploading…" : "Click or drop an image"}</span>
            <span className="mt-1 block text-[11px] text-ink-muted">JPG, PNG, WebP · up to 4.5MB · uploaded to Cloudinary</span>
          </span>
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => void upload(e.target.files?.[0])} />
    </div>
  );
}
