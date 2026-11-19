import { useCallback, useEffect, useState } from "react";
import { useOutletContext } from "react-router";
import { AlertTriangle, Banknote, Boxes, ShoppingBag, TrendingUp, Wallet } from "lucide-react";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import Card from "../components/Card.jsx";
import StatCard from "../components/StatCard.jsx";
import RevenueChart from "../components/RevenueChart.jsx";
import { EmptyState, ErrorState, Skeleton } from "../components/States.jsx";
import { dateTime, greeting, money, number, percentChange } from "../utils/format.js";

export default function DashboardPage() {
  const { user, canSeeAllBranches } = useAuth();
  const { branchId, warehouses } = useOutletContext();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const retry = useCallback(() => setReloadKey(k => k + 1), []);

  // Load the summary again whenever the branch changes (or "Try again" is pressed).
  // `active` stops an old, slow response from replacing a newer one.
  useEffect(() => {
    let active = true;
    setError("");
    setData(null);
    api("/dashboard/summary", { params: { warehouseId: branchId } })
      .then(d => { if (active) setData(d); })
      .catch(err => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [branchId, reloadKey]);

  const branchName = canSeeAllBranches
    ? (warehouses.find(w => w.id === branchId)?.name ?? "All branches")
    : (user.warehouseName ?? "All branches");
  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Bangkok" });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">
          {greeting()}, {user.fullName.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-navy-500">{today} · {branchName}</p>
      </div>

      {error && <ErrorState message={error} onRetry={retry} />}
      {!error && !data && <DashboardSkeleton />}
      {data && <DashboardContent data={data} canSeeFinance={data.month.grossProfit !== null} />}
    </div>
  );
}

function DashboardContent({ data, canSeeFinance }) {
  const { today, month, products, lowStock, recentSales, dailyRevenue, topProducts, revenueByBranch } = data;
  const margin = month.revenue ? (month.grossProfit / month.revenue) * 100 : 0;
  const maxTop = Math.max(...topProducts.map(p => p.revenue), 1);
  const branchTotal = revenueByBranch.reduce((s, b) => s + b.revenue, 0);
  const thirtyDayTotal = dailyRevenue.reduce((s, d) => s + d.revenue, 0);

  return (
    <>
      {/* KPI tiles */}
      <div className={`grid gap-4 sm:grid-cols-2 ${canSeeFinance ? "xl:grid-cols-4" : "xl:grid-cols-3"}`}>
        <StatCard
          label="Today's sales" icon={ShoppingBag} value={money(today.revenue)}
          change={percentChange(today.revenue, today.yesterdayRevenue)}
          changeLabel={`${number(today.orders)} orders · vs yesterday`}
        />
        <StatCard
          label="Revenue this month" icon={Banknote} value={money(month.revenue)}
          change={percentChange(month.revenue, month.lastMonthRevenueToDate)}
          changeLabel="vs same days last month"
        />
        {canSeeFinance && (
          <StatCard
            label="Gross profit this month" icon={TrendingUp} value={money(month.grossProfit)}
            tone={month.grossProfit >= 0 ? "positive" : "negative"}
            note={`${margin.toFixed(1)}% margin · after cost of goods`}
          />
        )}
        {canSeeFinance && (
          <StatCard
            label="Net profit this month" icon={Wallet} value={money(month.netProfit)}
            tone={month.netProfit >= 0 ? "positive" : "negative"}
            note={`After ${money(month.expenses)} expenses`}
          />
        )}
        {!canSeeFinance && (
          <StatCard
            label="Products" icon={Boxes} value={number(products.total)}
            note={`${number(lowStock.count)} low on stock`}
          />
        )}
      </div>

      {/* Chart + branch split */}
      <div className="grid gap-6 xl:grid-cols-3">
        <Card
          title="Revenue, last 30 days"
          subtitle={`${money(thirtyDayTotal)} total`}
          className="xl:col-span-2"
        >
          <div className="px-2 pb-3 pt-4 sm:px-4">
            <RevenueChart data={dailyRevenue} />
          </div>
        </Card>

        <Card title="Revenue by shop" subtitle="This month">
          <ul className="space-y-5 p-5">
            {revenueByBranch.length === 0 && <li><EmptyState>This branch is a warehouse, so it has no shop sales.</EmptyState></li>}
            {revenueByBranch.map(b => {
              const share = branchTotal ? (b.revenue / branchTotal) * 100 : 0;
              return (
                <li key={b.id}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-medium text-navy-800">{b.name}</span>
                    <span className="tabular font-semibold text-navy-900">{money(b.revenue)}</span>
                  </div>
                  <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-navy-100">
                    <div className="h-full rounded-full bg-brand-500" style={{ width: `${share}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-navy-500">{share.toFixed(0)}% of shop revenue</p>
                </li>
              );
            })}
            <li className="flex items-center justify-between border-t border-navy-100 pt-4 text-sm">
              <span className="text-navy-500">Active products</span>
              <span className="tabular font-semibold">{number(products.total)}</span>
            </li>
          </ul>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Low stock */}
        <Card
          title="Low-stock alerts"
          subtitle="At or below the reorder level"
          action={lowStock.count > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
              <AlertTriangle size={13} /> {lowStock.count}
            </span>
          )}
        >
          {lowStock.items.length === 0 ? (
            <EmptyState>All products are above their reorder level.</EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-navy-500">
                    <th className="px-5 py-2.5 font-medium">Product</th>
                    <th className="px-3 py-2.5 font-medium">Branch</th>
                    <th className="px-5 py-2.5 text-right font-medium">In stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-100">
                  {lowStock.items.map(i => (
                    <tr key={`${i.id}-${i.warehouse}`}>
                      <td className="px-5 py-3">
                        <p className="font-medium text-navy-900">{i.name}</p>
                        <p className="text-xs text-navy-500">{i.code}</p>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-navy-600">{i.warehouse}</td>
                      <td className="whitespace-nowrap px-5 py-3 text-right">
                        <span className={`tabular rounded-md px-2 py-1 text-xs font-semibold ${
                          i.quantity === 0 ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
                          {i.quantity === 0 ? "Out of stock" : `${number(i.quantity)} / ${number(i.reorder_level)}`}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Best sellers */}
        <Card title="Best-selling products" subtitle="This month, by revenue">
          {topProducts.length === 0 ? (
            <EmptyState>No sales yet this month.</EmptyState>
          ) : (
            <ol className="space-y-4 p-5">
              {topProducts.map((p, i) => (
                <li key={p.id} className="flex items-center gap-4">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-navy-50 text-sm font-semibold text-navy-600">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="truncate text-sm font-medium text-navy-900">{p.name}</p>
                      <p className="tabular shrink-0 text-sm font-semibold text-navy-900">{money(p.revenue)}</p>
                    </div>
                    <div className="mt-1.5 flex items-center gap-3">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-navy-100">
                        <div className="h-full rounded-full bg-navy-700" style={{ width: `${(p.revenue / maxTop) * 100}%` }} />
                      </div>
                      <span className="tabular shrink-0 text-xs text-navy-500">{number(p.quantity)} sold</span>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      {/* Recent transactions */}
      <Card title="Recent transactions" subtitle="Latest completed sales">
        {recentSales.length === 0 ? (
          <EmptyState>No sales yet.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-left text-xs text-navy-500">
                  <th className="px-5 py-2.5 font-medium">Invoice</th>
                  <th className="px-3 py-2.5 font-medium">Customer</th>
                  <th className="px-3 py-2.5 font-medium">Branch</th>
                  <th className="px-3 py-2.5 font-medium">Payment</th>
                  <th className="px-3 py-2.5 font-medium">Time</th>
                  <th className="px-5 py-2.5 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100">
                {recentSales.map(s => (
                  <tr key={s.id} className="hover:bg-navy-50/60">
                    <td className="whitespace-nowrap px-5 py-3 font-medium text-navy-900">{s.invoice_no}</td>
                    <td className="px-3 py-3 text-navy-700">{s.customer}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-navy-600">{s.warehouse}</td>
                    <td className="whitespace-nowrap px-3 py-3 capitalize text-navy-600">{(s.methods || "-").replaceAll("_", " ")}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-navy-600">{dateTime(s.created_at)}</td>
                    <td className="tabular whitespace-nowrap px-5 py-3 text-right font-semibold text-navy-900">{money(s.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-label="Loading dashboard">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <Skeleton className="h-96 xl:col-span-2" />
        <Skeleton className="h-96" />
      </div>
    </div>
  );
}
