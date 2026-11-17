export default function Loading() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-square rounded-[1.4rem] bg-[#E4E4E1] dark:bg-[#2A2A33]" />
          <div className="mt-2 h-3 w-2/3 rounded bg-[#E4E4E1] dark:bg-[#2A2A33]" />
          <div className="mt-2 h-3 w-1/3 rounded bg-[#E4E4E1] dark:bg-[#2A2A33]" />
        </div>
      ))}
    </div>
  );
}
