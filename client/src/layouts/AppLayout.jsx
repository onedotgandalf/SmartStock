// The frame around every logged-in page: sidebar + top bar + page content.
// The chosen branch is shared with pages through <Outlet context>:
//   const { branchId } = useOutletContext();
import { useEffect, useState } from "react";
import { Outlet } from "react-router";
import Sidebar from "../components/Sidebar.jsx";
import Topbar from "../components/Topbar.jsx";
import { api } from "../api/client.js";

const BRANCH_KEY = "smartstock_branch";

export default function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [warehouses, setWarehouses] = useState([]);
  const [branchId, setBranchId] = useState(() => {
    const saved = Number(sessionStorage.getItem(BRANCH_KEY));
    return saved || null;
  });

  useEffect(() => {
    api("/warehouses").then(d => setWarehouses(d.warehouses)).catch(() => setWarehouses([]));
  }, []);

  function changeBranch(id) {
    setBranchId(id);
    if (id) sessionStorage.setItem(BRANCH_KEY, id);
    else sessionStorage.removeItem(BRANCH_KEY);
  }

  return (
    <div className="min-h-screen">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="lg:pl-64">
        <Topbar
          onMenu={() => setMenuOpen(true)}
          warehouses={warehouses}
          branchId={branchId}
          onBranchChange={changeBranch}
        />
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
          <Outlet context={{ branchId, warehouses }} />
        </main>
      </div>
    </div>
  );
}
