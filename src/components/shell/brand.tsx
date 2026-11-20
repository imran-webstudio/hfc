import Image from "next/image";
import Link from "next/link";
import { config } from "@/lib/config";
import { cn } from "@/lib/cn";

export function Brand({ href = "/app", className, stacked }: { href?: string; className?: string; stacked?: boolean }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2.5", className)}>
      <Image src="/logo.png" alt="" width={28} height={28} className="h-7 w-7 shrink-0 rounded-full object-contain" />
      <span className={cn("font-display text-sm font-bold leading-tight text-leaf", stacked && "max-w-40")}>{config.brand}</span>
    </Link>
  );
}
