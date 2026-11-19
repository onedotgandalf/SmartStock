// A KPI tile: label, big value, and an optional change badge.
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

export default function StatCard({ label, value, icon: Icon, change, changeLabel, note, tone = "default" }) {
  const valueColor = tone === "negative" ? "text-red-600" : tone === "positive" ? "text-brand-700" : "text-navy-900";

  return (
    <div className="rounded-xl border border-navy-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-navy-500">{label}</p>
        {Icon && (
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-navy-50 text-navy-600">
            <Icon size={18} />
          </span>
        )}
      </div>
      <p className={`tabular mt-3 text-2xl font-bold tracking-tight ${valueColor}`}>{value}</p>
      <div className="mt-2 flex min-h-5 flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        {change != null && Number.isFinite(change) && (
          <span className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-semibold ${
            change >= 0 ? "bg-brand-50 text-brand-700" : "bg-red-50 text-red-700"}`}>
            {change >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            {Math.abs(change).toFixed(1)}%
          </span>
        )}
        {changeLabel && <span className="text-navy-500">{changeLabel}</span>}
        {note && <span className="text-navy-500">{note}</span>}
      </div>
    </div>
  );
}
