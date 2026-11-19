import { LogOut, Menu, Store } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { roleLabel } from "../utils/format.js";

// Top bar: menu button (phones), branch picker, and the logged-in user.
export default function Topbar({ onMenu, warehouses, branchId, onBranchChange }) {
  const { user, logout, canSeeAllBranches } = useAuth();
  const initials = user.fullName.split(" ").map(w => w[0]).slice(0, 2).join("");

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-navy-100 bg-white/95 px-4 backdrop-blur sm:px-6">
      <button onClick={onMenu} className="rounded-lg p-2 text-navy-600 hover:bg-navy-50 lg:hidden" aria-label="Open menu">
        <Menu size={22} />
      </button>

      {/* Branch picker: admins and managers can switch; other staff see their own branch */}
      <div className="flex min-w-0 items-center gap-2">
        <Store size={18} className="shrink-0 text-navy-400" />
        {canSeeAllBranches ? (
          <select
            id="branch-select"
            value={branchId ?? ""}
            onChange={e => onBranchChange(e.target.value ? Number(e.target.value) : null)}
            className="min-w-0 rounded-lg border border-navy-200 bg-white py-2 pl-3 pr-8 text-sm font-medium text-navy-800 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
            aria-label="Branch"
          >
            <option value="">All branches</option>
            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        ) : (
          <span className="truncate text-sm font-medium text-navy-800">{user.warehouseName || "All branches"}</span>
        )}
      </div>

      <div className="ml-auto flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-semibold leading-tight text-navy-900">{user.fullName}</p>
          <p className="text-xs text-navy-500">{roleLabel[user.role]}</p>
        </div>
        <div className="grid h-9 w-9 place-items-center rounded-full bg-navy-900 text-sm font-semibold text-white" aria-hidden="true">
          {initials}
        </div>
        <button
          onClick={logout}
          className="rounded-lg p-2 text-navy-500 hover:bg-navy-50 hover:text-navy-900"
          title="Log out"
          aria-label="Log out"
        >
          <LogOut size={19} />
        </button>
      </div>
    </header>
  );
}
