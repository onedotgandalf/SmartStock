// A white panel with an optional title row.
export default function Card({ title, subtitle, action, className = "", children }) {
  return (
    <section className={`rounded-xl border border-navy-100 bg-white shadow-sm ${className}`}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-3 border-b border-navy-100 px-5 py-4">
          <div className="min-w-0">
            <h2 className="font-semibold text-navy-900">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-navy-500">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
