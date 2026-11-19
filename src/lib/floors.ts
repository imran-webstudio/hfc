/** "7" → "Floor 7" */
export const floorLabel = (f: string) => `Floor ${f}`;

export function sortFloors(floors: string[]): string[] {
  return [...new Set(floors.map((f) => f.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true }),
  );
}
