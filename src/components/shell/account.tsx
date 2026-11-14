import { LogOut } from "lucide-react";
import { signOutAction } from "@/actions/auth";
import { taka } from "@/lib/money";
import { cn } from "@/lib/cn";
import { getMemberSummary } from "@/server/summary";

/** Name + "Due ৳300" / "Bal ৳500" figure. */
export async function AccountFigure({ userId, name, align = "right" }: { userId: string; name: string; align?: "left" | "right" }) {
  const s = await getMemberSummary(userId);
  return (
    <div className={cn("leading-tight", align === "right" ? "text-right" : "text-left")}>
      <p className="max-w-32 truncate text-xs font-semibold">{name}</p>
      {s.totalDue > 0 ? (
        <p className="text-[11px] font-bold text-red-400">Due {taka(s.totalDue)}</p>
      ) : (
        <p className="text-[11px] font-bold text-leaf">Bal {taka(s.balance)}</p>
      )}
    </div>
  );
}

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <button type="submit" className="btn btn-ghost btn-sm gap-1.5">
        <LogOut className="h-3.5 w-3.5" />
        Out
      </button>
    </form>
  );
}
