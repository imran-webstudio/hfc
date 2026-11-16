"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/cn";

const KEY = "hfc-theme";

export function applyTheme(mode: "light" | "dark") {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(mode);
  root.style.colorScheme = mode;
}

export function ThemeToggle({ labeled = false }: { labeled?: boolean }) {
  const [mode, setMode] = useState<"light" | "dark">("light");

  useEffect(() => {
    const read = () => setMode(document.documentElement.classList.contains("dark") ? "dark" : "light");
    read();
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (localStorage.getItem(KEY)) return;
      const next = mq.matches ? "dark" : "light";
      applyTheme(next);
      setMode(next);
    };
    mq.addEventListener("change", onChange);
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => {
      mq.removeEventListener("change", onChange);
      obs.disconnect();
    };
  }, []);

  function choose(next: "light" | "dark") {
    localStorage.setItem(KEY, next);
    applyTheme(next);
    setMode(next);
  }

  return (
    <div className={cn("flex items-center gap-2", labeled && "w-full justify-between")}>
      {labeled ? <span className="text-xs font-medium text-ink-muted">Light / Dark</span> : null}
      <div className="flex items-center rounded-full bg-sand p-1 ring-1 ring-line" role="group" aria-label="Colour theme">
        <button
          type="button"
          aria-label="Light theme"
          aria-pressed={mode === "light"}
          onClick={() => choose("light")}
          className={cn(
            "grid h-8 w-8 place-items-center rounded-full transition",
            mode === "light" ? "bg-white text-amber-500 shadow-sm" : "text-ink-muted",
          )}
        >
          <Sun className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Dark theme"
          aria-pressed={mode === "dark"}
          onClick={() => choose("dark")}
          className={cn(
            "grid h-8 w-8 place-items-center rounded-full transition",
            mode === "dark" ? "bg-[#5B4CF5] text-white shadow-sm" : "text-ink-muted",
          )}
        >
          <Moon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
