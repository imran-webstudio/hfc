"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import type { ActionResult } from "@/lib/action";

/** Runs a server action, toasts the outcome and refreshes server components on success. */
export function useAct() {
  const router = useRouter();
  const [pending, start] = useTransition();

  function act<T>(fn: () => Promise<ActionResult<T>>, opts: { success?: string; onOk?: (data: T) => void } = {}) {
    start(async () => {
      const res = await fn();
      if (res.ok) {
        if (opts.success) toast.success(opts.success);
        opts.onOk?.(res.data);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return { act, pending };
}
