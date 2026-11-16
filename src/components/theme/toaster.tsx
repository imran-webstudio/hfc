"use client";

import { useEffect, useState } from "react";
import { Toaster } from "sonner";

export function AppToaster() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    const read = () => setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return (
    <Toaster
      theme={theme}
      position="top-center"
      toastOptions={{
        style: {
          background: "var(--hfc-surface)",
          border: "1px solid var(--hfc-line)",
          color: "var(--hfc-ink)",
        },
      }}
    />
  );
}
