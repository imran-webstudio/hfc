"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/cn";

const KEY = "hfc-theme";

export function applyTheme(mode: "light" | "dark") {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(mode);
  root.style.colorScheme = mode;
}

function subscribe(onStoreChange: () => void) {
  const obs = new MutationObserver(onStoreChange);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const onChange = () => {
    if (localStorage.getItem(KEY)) return;
    applyTheme(mq.matches ? "dark" : "light");
    onStoreChange();
  };
  mq.addEventListener("change", onChange);
  return () => {
    obs.disconnect();
    mq.removeEventListener("change", onChange);
  };
}

function snapshot(): "light" | "dark" {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function ThemeToggle({ labeled = false }: { labeled?: boolean }) {
  const mode = useSyncExternalStore(subscribe, snapshot, () => "light" as const);

  useEffect(() => {
    if (localStorage.getItem(KEY)) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    if (mq.matches && !document.documentElement.classList.contains("dark")) applyTheme("dark");
  }, []);

  function choose(next: "light" | "dark") {
    localStorage.setItem(KEY, next);
    applyTheme(next);
  }

  // One switch, one action: a click anywhere flips to the opposite mode.
  // (Two set-mode buttons felt broken — tapping Sun in light mode did nothing.)
  return (
    <div className={cn("flex items-center gap-2", labeled && "w-full justify-between")}>
      {labeled ? <span className="text-xs font-medium text-ink-muted">Light / Dark</span> : null}
      <button
        type="button"
        aria-label="Toggle colour theme"
        title="Toggle light / dark"
        suppressHydrationWarning
        onClick={() => choose(mode === "dark" ? "light" : "dark")}
        className="flex items-center rounded-full bg-sand p-1 ring-1 ring-line"
      >
        <span className="theme-sun">
          <Sun className="h-4 w-4" />
        </span>
        <span className="theme-moon">
          <Moon className="h-4 w-4" />
        </span>
      </button>
    </div>
  );
}
