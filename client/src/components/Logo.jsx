export default function Logo({ light = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg viewBox="0 0 32 32" className="h-9 w-9 shrink-0" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill={light ? "#16a34a" : "#0f1830"} />
        <path d="M8 20l8 4 8-4M8 15l8 4 8-4M16 6l8 4-8 4-8-4z" fill="none"
          stroke={light ? "#ffffff" : "#22c55e"} strokeWidth="2.2" strokeLinejoin="round" />
      </svg>
      <span className={`text-lg font-bold tracking-tight ${light ? "text-white" : "text-navy-900"}`}>
        Smart<span className="text-brand-500">Stock</span>
      </span>
    </div>
  );
}
