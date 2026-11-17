import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getViewer } from "@/lib/session";

export const runtime = "nodejs";

const MAX_BYTES = 4.5 * 1024 * 1024;
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/**
 * Meal photo upload (staff only).
 * Uses Cloudinary when CLOUDINARY_* env vars are set, otherwise writes to public/uploads (local dev only).
 */
export async function POST(req: Request) {
  const viewer = await getViewer();
  if (!viewer?.isStaff) return NextResponse.json({ error: "Not allowed" }, { status: 403 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file" }, { status: 400 });
  const ext = TYPES[file.type];
  if (!ext) return NextResponse.json({ error: "Use a JPG, PNG or WebP image." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Image must be 4.5MB or smaller." }, { status: 400 });

  const { CLOUDINARY_CLOUD_NAME: cloud, CLOUDINARY_API_KEY: key, CLOUDINARY_API_SECRET: secret } = process.env;
  if (cloud && key && secret) {
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = "hfc-meals";
    const signature = createHash("sha1").update(`folder=${folder}&timestamp=${timestamp}${secret}`).digest("hex");
    const body = new FormData();
    body.set("file", file);
    body.set("api_key", key);
    body.set("timestamp", String(timestamp));
    body.set("folder", folder);
    body.set("signature", signature);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, { method: "POST", body });
    const json = (await res.json()) as { secure_url?: string; error?: { message?: string } };
    if (!res.ok || !json.secure_url) {
      return NextResponse.json({ error: json.error?.message ?? "Upload failed" }, { status: 502 });
    }
    return NextResponse.json({ url: json.secure_url });
  }

  if (process.env.VERCEL) {
    return NextResponse.json({ error: "Image uploads need Cloudinary configured." }, { status: 501 });
  }
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  const name = `${randomUUID()}.${ext}`;
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return NextResponse.json({ url: `/uploads/${name}` });
}
