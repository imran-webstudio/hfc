"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { toast } from "sonner";

type InstallEvent = Event & { prompt: () => Promise<void> };
const KEY = "hfc-install-dismissed-until";

/** PWA install banner ("Install app / Install / Not now / ×"). */
export function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [deferred, setDeferred] = useState<InstallEvent | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    const until = Number(localStorage.getItem(KEY) ?? 0);
    if (!standalone && Date.now() > until) setVisible(true);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  function dismiss(days: number) {
    localStorage.setItem(KEY, String(Date.now() + days * 86_400_000));
    setVisible(false);
  }

  async function install() {
    if (deferred) {
      await deferred.prompt();
      setDeferred(null);
      dismiss(365);
    } else {
      toast.info("Use your browser menu and choose “Add to Home screen” / “Install app”.");
    }
  }

  if (!visible || pathname === "/") return null;
  return (
    <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
      <div className="surface-card flex w-full max-w-md items-start gap-3 rounded-2xl p-3.5 shadow-2xl">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-leaf/15 text-leaf">
          <Download className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">Install app</p>
          <p className="mt-0.5 text-xs text-ink-muted">Add to your home screen for faster access and offline support.</p>
          <div className="mt-2.5 flex gap-2">
            <button className="btn btn-leaf btn-sm" onClick={install}>
              Install
            </button>
            <button className="btn btn-text btn-sm" onClick={() => dismiss(1)}>
              Not now
            </button>
          </div>
        </div>
        <button aria-label="Dismiss" className="text-ink-muted hover:text-ink" onClick={() => dismiss(365)}>
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
