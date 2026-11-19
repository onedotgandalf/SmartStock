// 30-day revenue chart (Recharts area chart).
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { money, moneyShort, shortDate } from "../utils/format.js";

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-navy-100 bg-white px-3 py-2 text-sm shadow-lg">
      <p className="font-medium text-navy-500">{shortDate(d.date)}</p>
      <p className="tabular font-semibold text-navy-900">{money(d.revenue)}</p>
      <p className="text-navy-500">{d.orders} orders</p>
    </div>
  );
}

export default function RevenueChart({ data }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 12, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#16a34a" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#16a34a" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#e6eaf2" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={shortDate}
            tick={{ fontSize: 12, fill: "#6e7c9b" }}
            axisLine={false}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            tickFormatter={moneyShort}
            tick={{ fontSize: 12, fill: "#6e7c9b" }}
            axisLine={false}
            tickLine={false}
            width={64}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#9ea9c2", strokeDasharray: "4 4" }} />
          <Area type="monotone" dataKey="revenue" stroke="#16a34a" strokeWidth={2.5} fill="url(#revFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
