// Formatting helpers so money and dates look the same everywhere.

const thb = new Intl.NumberFormat("en-US", { style: "currency", currency: "THB", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const thbShort = new Intl.NumberFormat("en-US", { style: "currency", currency: "THB", notation: "compact", maximumFractionDigits: 1 });
const num = new Intl.NumberFormat("en-US");

export const money = n => thb.format(n ?? 0);            // ฿12,345.00
export const moneyShort = n => thbShort.format(n ?? 0);  // ฿12.3K
export const number = n => num.format(n ?? 0);           // 12,345

// Percentage change from `before` to `now`. Returns null if there's nothing to compare.
export function percentChange(now, before) {
  if (!before) return null;
  return ((now - before) / before) * 100;
}

export function dateTime(value) {
  return new Date(value).toLocaleString("en-GB", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok"
  });
}

// "2026-11-20" -> "20 Nov"
export function shortDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

export function greeting() {
  const h = Number(new Date().toLocaleString("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: "Asia/Bangkok" }));
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export const roleLabel = {
  admin: "Admin",
  manager: "Manager",
  cashier: "Cashier",
  warehouse: "Warehouse Staff"
};
