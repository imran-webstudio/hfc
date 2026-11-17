"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);
  if (!offline) return null;
  return (
    <p className="mb-4 flex items-center justify-center gap-2 rounded-2xl bg-[#FDECC8] px-3 py-2.5 text-[13px] font-medium leading-tight text-[#7A5B12] dark:bg-[#3a3018] dark:text-[#F6E7C1]">
      <WifiOff className="h-4 w-4" />
      You’re offline. We’ll sync when you’re back.
    </p>
  );
}
