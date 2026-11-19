/** "৳1,730" / "৳-300" */
export function taka(n: number): string {
  return `৳${n.toLocaleString("en-US")}`;
}

export function signedTaka(n: number): string {
  return `${n >= 0 ? "+" : "-"}৳${Math.abs(n).toLocaleString("en-US")}`;
}
