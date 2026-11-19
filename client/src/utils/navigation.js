// The sidebar menu. Each item lists which roles can see it.
// `step` marks modules that are planned but not built yet (see docs/ARCHITECTURE.md).
// They are shown greyed out and can't be clicked. When a module is built,
// remove its `step` and add its page to App.jsx.
import {
  LayoutDashboard, Package, Warehouse, ShoppingCart, Truck, Building2,
  Users, Receipt, BarChart3, UserCog, Sparkles
} from "lucide-react";

const ALL = ["admin", "manager", "cashier", "warehouse"];

export const NAV_SECTIONS = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", to: "/", icon: LayoutDashboard, roles: ALL },
      { label: "AI Assistant", to: "/assistant", icon: Sparkles, roles: ["admin", "manager"], step: 10 }
    ]
  },
  {
    title: "Operations",
    items: [
      { label: "Point of Sale", to: "/pos", icon: ShoppingCart, roles: ["admin", "manager", "cashier"], step: 4 },
      { label: "Products", to: "/products", icon: Package, roles: ALL, step: 2 },
      { label: "Inventory", to: "/inventory", icon: Warehouse, roles: ["admin", "manager", "warehouse"], step: 3 },
      { label: "Purchases", to: "/purchases", icon: Truck, roles: ["admin", "manager", "warehouse"], step: 6 }
    ]
  },
  {
    title: "Contacts",
    items: [
      { label: "Customers", to: "/customers", icon: Users, roles: ["admin", "manager", "cashier"], step: 5 },
      { label: "Suppliers", to: "/suppliers", icon: Building2, roles: ["admin", "manager", "warehouse"], step: 6 }
    ]
  },
  {
    title: "Finance",
    items: [
      { label: "Expenses", to: "/expenses", icon: Receipt, roles: ["admin", "manager"], step: 7 },
      { label: "Reports", to: "/reports", icon: BarChart3, roles: ["admin", "manager"], step: 8 }
    ]
  },
  {
    title: "Settings",
    items: [
      { label: "Users & Roles", to: "/users", icon: UserCog, roles: ["admin"], step: 9 }
    ]
  }
];
