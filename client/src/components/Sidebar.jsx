import { NavLink } from "react-router";
import { X } from "lucide-react";
import Logo from "./Logo.jsx";
import { NAV_SECTIONS } from "../utils/navigation.js";
import { useAuth } from "../context/AuthContext.jsx";

// Dark navy sidebar. On phones it slides in from the left (open / onClose).
export default function Sidebar({ open, onClose }) {
  const { user } = useAuth();

  return (
    <>
      {/* Dark overlay behind the sidebar on small screens */}
      <div
        className={`fixed inset-0 z-30 bg-navy-950/60 transition-opacity lg:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-navy-900 text-navy-200 transition-transform lg:translate-x-0
          ${open ? "translate-x-0" : "-translate-x-full"}`}
        aria-label="Main navigation"
      >
        <div className="flex h-16 items-center justify-between px-5">
          <Logo light />
          <button onClick={onClose} className="rounded-lg p-2 text-navy-300 hover:bg-navy-800 lg:hidden" aria-label="Close menu">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
          {NAV_SECTIONS.map(section => {
            const items = section.items.filter(i => i.roles.includes(user.role));
            if (!items.length) return null;
            return (
              <div key={section.title}>
                <p className="mb-2 px-3 text-xs font-semibold text-navy-400">{section.title}</p>
                <ul className="space-y-0.5">
                  {items.map(item => (
                    <li key={item.label}>
                      {item.step ? (
                        <span
                          className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-navy-500"
                          title={`Planned for build step ${item.step}`}
                        >
                          <item.icon size={18} />
                          <span className="flex-1">{item.label}</span>
                          <span className="rounded bg-navy-800 px-1.5 py-0.5 text-[11px] font-medium text-navy-400">Step {item.step}</span>
                        </span>
                      ) : (
                        <NavLink
                          to={item.to}
                          end
                          onClick={onClose}
                          className={({ isActive }) =>
                            `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                              isActive ? "bg-brand-600 text-white" : "text-navy-200 hover:bg-navy-800 hover:text-white"
                            }`}
                        >
                          <item.icon size={18} />
                          {item.label}
                        </NavLink>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </nav>

        <div className="border-t border-navy-800 px-5 py-4 text-xs text-navy-400">
          SmartStock v0.1 · Build step 1 of 11
        </div>
      </aside>
    </>
  );
}
