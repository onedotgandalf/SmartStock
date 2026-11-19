// ============================================================
// seed.js — fills the database with realistic sample data:
// a small consumer-goods business in Pathum Thani with two shops
// and one warehouse, and about 60 days of history.
//
// The history is SIMULATED day by day, exactly like the real app
// would work: purchases add stock to the warehouse, transfers move
// stock to the shops, and sales take stock out. Every change is
// written to stock_movements, so inventory, history, sales and
// profit figures all agree with each other.
//
// All names, companies and phone numbers are made up.
// ============================================================
import bcrypt from "bcryptjs";

export const DEMO_PASSWORD = "SmartStock@2026";
const DAYS_OF_HISTORY = 60;
const TZ_OFFSET = "+07:00"; // Bangkok

// Small seeded random generator, so every run creates the same data
function makeRandom(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = makeRandom(20261120);
const int = (min, max) => Math.floor(rand() * (max - min + 1)) + min;
const pick = arr => arr[Math.floor(rand() * arr.length)];
const round2 = n => Math.round(n * 100) / 100;
const pad = (n, len = 2) => String(n).padStart(len, "0");

// EAN-13 barcode with a correct check digit (885 = Thailand prefix)
function ean13(n) {
  const base = "885" + pad(4471, 4) + pad(n, 5);
  const sum = [...base].reduce((s, d, i) => s + Number(d) * (i % 2 ? 3 : 1), 0);
  return base + ((10 - (sum % 10)) % 10);
}

// "Today" in Bangkok as YYYY-MM-DD, and helpers to move between days
function bangkokToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
}
function addDays(iso, days) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
const at = (iso, h, m) => new Date(`${iso}T${pad(h)}:${pad(m)}:00${TZ_OFFSET}`);

// Insert many rows with one query per 400 rows
async function insertMany(client, table, columns, rows) {
  for (let i = 0; i < rows.length; i += 400) {
    const chunk = rows.slice(i, i + 400);
    const params = [];
    const values = chunk.map(row => {
      const ph = row.map(v => { params.push(v); return `$${params.length}`; });
      return `(${ph.join(",")})`;
    });
    await client.query(`INSERT INTO ${table} (${columns.join(",")}) VALUES ${values.join(",")}`, params);
  }
}

// ------------------------------------------------------------
// Fixed reference data
// ------------------------------------------------------------
const WAREHOUSES = [
  { id: 1, name: "Main Shop",       type: "shop",      address: "112 Phahonyothin Rd, Khlong Nueng, Khlong Luang, Pathum Thani 12120", phone: "02-555-0141" },
  { id: 2, name: "Secondary Shop",  type: "shop",      address: "58/3 Rangsit-Nakhon Nayok Rd, Prachathipat, Thanyaburi, Pathum Thani 12130", phone: "02-555-0142" },
  { id: 3, name: "Main Warehouse",  type: "warehouse", address: "9 Moo 4, Khlong Song, Khlong Luang, Pathum Thani 12120", phone: "02-555-0143" }
];

const ROLES = [
  { id: 1, name: "admin",     description: "Full system access" },
  { id: 2, name: "manager",   description: "Manages operations, purchasing and reports" },
  { id: 3, name: "cashier",   description: "Processes sales at a shop" },
  { id: 4, name: "warehouse", description: "Manages stock, transfers and receiving" }
];

const USERS = [
  { id: 1, full_name: "Shin Thant Maung",  email: "admin@smartstock.demo",     role_id: 1, warehouse_id: null },
  { id: 2, full_name: "Kanokwan Srisuk",   email: "manager@smartstock.demo",   role_id: 2, warehouse_id: null },
  { id: 3, full_name: "Thanawat Boonmee",  email: "cashier@smartstock.demo",   role_id: 3, warehouse_id: 1 },
  { id: 4, full_name: "Nattapong Kaewdee", email: "warehouse@smartstock.demo", role_id: 4, warehouse_id: 3 },
  { id: 5, full_name: "Pimchanok Wongsa",  email: "cashier2@smartstock.demo",  role_id: 3, warehouse_id: 2 }
];

const CATEGORIES = [
  { id: 1, name: "Beverages",       description: "Water, tea, coffee, juice and milk" },
  { id: 2, name: "Snacks",          description: "Chips, crackers and sweets" },
  { id: 3, name: "Dry Food",        description: "Rice, noodles, sauces and cooking ingredients" },
  { id: 4, name: "Household",       description: "Cleaning and home supplies" },
  { id: 5, name: "Personal Care",   description: "Shampoo, soap and oral care" }
];

// [code, name, category, unit, cost, price, reorder level, description]
const PRODUCTS = [
  ["BEV-001", "Drinking Water 600ml (Pack of 12)", 1, "pack", 42, 59, 30, "Purified drinking water, 12 bottles shrink-wrapped."],
  ["BEV-002", "Green Tea Honey Lemon 500ml",       1, "bottle", 14, 20, 48, "Ready-to-drink Japanese-style green tea."],
  ["BEV-003", "3-in-1 Instant Coffee (27 Sachets)",1, "bag", 98, 135, 15, "Coffee, creamer and sugar in single-serve sachets."],
  ["BEV-004", "Orange Juice 100% 1L",              1, "carton", 52, 75, 20, "No added sugar, keep refrigerated after opening."],
  ["BEV-005", "Energy Drink 150ml (Pack of 10)",   1, "pack", 85, 110, 20, "Classic Thai energy drink, glass bottles."],
  ["BEV-006", "UHT Milk Plain 225ml (Pack of 4)",  1, "pack", 40, 52, 30, "Long-life full cream milk."],
  ["SNK-001", "Potato Chips Original 75g",         2, "bag", 22, 32, 40, "Thin-cut salted potato chips."],
  ["SNK-002", "Crispy Seaweed Original 32g",       2, "bag", 26, 39, 30, "Roasted seaweed snack."],
  ["SNK-003", "Prawn Crackers 62g",                2, "bag", 14, 20, 40, "Light, crunchy prawn-flavoured crackers."],
  ["SNK-004", "Chocolate Wafer (Box of 12)",       2, "box", 58, 79, 15, "Individually wrapped chocolate wafers."],
  ["DRY-001", "Thai Hom Mali Jasmine Rice 5kg",    3, "bag", 165, 215, 20, "Premium grade new-crop jasmine rice."],
  ["DRY-002", "Instant Noodles Tom Yum (Pack of 30)", 3, "box", 128, 165, 15, "Hot and sour shrimp flavour, 55g per pack."],
  ["DRY-003", "Fish Sauce 700ml",                  3, "bottle", 24, 35, 30, "Anchovy fish sauce, first press."],
  ["DRY-004", "Light Soy Sauce 600ml",             3, "bottle", 32, 45, 25, "Naturally brewed soy sauce."],
  ["DRY-005", "Palm Cooking Oil 1L",               3, "bottle", 44, 58, 30, "Refined palm olein for frying."],
  ["DRY-006", "White Sugar 1kg",                   3, "bag", 21, 28, 40, "Refined cane sugar."],
  ["HOU-001", "Dishwashing Liquid Lime 550ml",     4, "bottle", 26, 39, 30, "Cuts grease, lime scent."],
  ["HOU-002", "Laundry Powder 2.7kg",              4, "bag", 145, 189, 12, "Concentrated powder for machine and hand wash."],
  ["HOU-003", "Toilet Tissue (24 Rolls)",          4, "pack", 155, 199, 12, "2-ply soft tissue, 24 rolls."],
  ["HOU-004", "Garbage Bags 24x28\" (30 pcs)",     4, "pack", 28, 42, 20, "Black heavy-duty bags."],
  ["PER-001", "Herbal Shampoo 400ml",              5, "bottle", 82, 119, 15, "Thai herbal shampoo for daily use."],
  ["PER-002", "Fluoride Toothpaste 160g",          5, "tube", 42, 59, 25, "Cavity protection with mint."],
  ["PER-003", "Bath Soap Bar (Pack of 4)",         5, "pack", 38, 55, 20, "Moisturising soap, 4 x 90g."],
  ["PER-004", "Hand Sanitizer Gel 500ml",          5, "bottle", 55, 89, 10, "70% alcohol gel with pump."]
];

const SUPPLIERS = [
  { id: 1, name: "Siam Beverage Distribution Co., Ltd.", contact_person: "Somchai Rattanakul", phone: "02-555-0201", email: "sales@siambev.example", address: "Bang Na, Bangkok", tax_id: "0105558012345", cats: [1] },
  { id: 2, name: "Golden Snack Trading Co., Ltd.",       contact_person: "Wipada Chaiyaporn",  phone: "02-555-0202", email: "order@goldensnack.example", address: "Bang Phli, Samut Prakan", tax_id: "0115559023456", cats: [2] },
  { id: 3, name: "Rangsit Rice & Grocery Supply",        contact_person: "Prasert Thongdee",   phone: "02-555-0203", email: "prasert@rangsitrice.example", address: "Thanyaburi, Pathum Thani", tax_id: "0135560034567", cats: [3] },
  { id: 4, name: "CleanHome Thailand Co., Ltd.",         contact_person: "Araya Suwannarat",   phone: "02-555-0204", email: "b2b@cleanhome.example", address: "Lat Krabang, Bangkok", tax_id: "0105561045678", cats: [4] },
  { id: 5, name: "Bangkok Personal Care Wholesale",      contact_person: "Krit Sangthong",     phone: "02-555-0205", email: "krit@bkkpc.example", address: "Pak Kret, Nonthaburi", tax_id: "0125562056789", cats: [5] }
];

const CUSTOMERS = [
  { id: 1,  name: "Malee Jaidee",                 type: "regular",   phone: "081-555-0301" },
  { id: 2,  name: "Somsak Phromma",               type: "regular",   phone: "082-555-0302" },
  { id: 3,  name: "Ananya Chotikul",              type: "regular",   phone: "083-555-0303" },
  { id: 4,  name: "Wichai Saelim",                type: "regular",   phone: "084-555-0304" },
  { id: 5,  name: "Rattana Inthawong",            type: "regular",   phone: "085-555-0305" },
  { id: 6,  name: "Chatchai Boonyarit",           type: "regular",   phone: "086-555-0306" },
  { id: 7,  name: "Sunisa Kaewmanee",             type: "regular",   phone: "087-555-0307" },
  { id: 8,  name: "Kittipong Mahasuk",            type: "regular",   phone: "089-555-0308" },
  { id: 9,  name: "Khlong Luang Mini Mart",       type: "wholesale", phone: "02-555-0309" },
  { id: 10, name: "Baan Suan Restaurant",         type: "wholesale", phone: "02-555-0310" },
  { id: 11, name: "Rangsit Dormitory Shop",       type: "wholesale", phone: "02-555-0311" },
  { id: 12, name: "Thanyaburi Coffee & Snack",    type: "wholesale", phone: "02-555-0312" }
];

const EXPENSE_CATEGORIES = ["Rent", "Employee Salaries", "Electricity & Water", "Transportation", "Warehouse Expenses", "Marketing", "Maintenance"];

// Shop "target" stock: transfers top shops back up to about this level
const SHOP_TARGET = { 1: 120, 2: 80 };
// These products are slow to restock lately, so they end up low (for low-stock alerts)
const SLOW_RESTOCK = new Set(["BEV-003", "SNK-002", "HOU-003", "PER-004", "DRY-001"]);

export async function seed(client) {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const today = bangkokToday();
  const start = addDays(today, -DAYS_OF_HISTORY);
  const nowBkk = new Date();

  // ---------- Reference data ----------
  await insertMany(client, "warehouses", ["id", "name", "type", "address", "phone"],
    WAREHOUSES.map(w => [w.id, w.name, w.type, w.address, w.phone]));
  await insertMany(client, "roles", ["id", "name", "description"], ROLES.map(r => [r.id, r.name, r.description]));
  await insertMany(client, "users", ["id", "full_name", "email", "password_hash", "role_id", "warehouse_id"],
    USERS.map(u => [u.id, u.full_name, u.email, passwordHash, u.role_id, u.warehouse_id]));
  await insertMany(client, "categories", ["id", "name", "description"], CATEGORIES.map(c => [c.id, c.name, c.description]));

  const products = PRODUCTS.map(([code, name, category_id, unit, cost, price, reorder, desc], i) => ({
    id: i + 1, code, name, category_id, unit, cost, price,
    wholesale: round2(price * 0.92), reorder, desc, barcode: ean13(i + 1)
  }));
  await insertMany(client, "products",
    ["id", "code", "barcode", "name", "description", "category_id", "unit", "purchase_price", "selling_price", "wholesale_price", "reorder_level"],
    products.map(p => [p.id, p.code, p.barcode, p.name, p.desc, p.category_id, p.unit, p.cost, p.price, p.wholesale, p.reorder]));

  await insertMany(client, "suppliers", ["id", "name", "contact_person", "phone", "email", "address", "tax_id"],
    SUPPLIERS.map(s => [s.id, s.name, s.contact_person, s.phone, s.email, s.address, s.tax_id]));
  await insertMany(client, "customers", ["id", "name", "type", "phone"], CUSTOMERS.map(c => [c.id, c.name, c.type, c.phone]));
  await insertMany(client, "expense_categories", ["id", "name"], EXPENSE_CATEGORIES.map((n, i) => [i + 1, n]));

  // ---------- Simulated history ----------
  const stock = {}; // stock["productId:warehouseId"] = quantity
  const key = (p, w) => `${p}:${w}`;
  const movements = [];
  const move = (productId, warehouseId, type, qty, when, refType, refId, note, userId) => {
    const k = key(productId, warehouseId);
    stock[k] = (stock[k] || 0) + qty;
    movements.push([productId, warehouseId, type, qty, stock[k], refType, refId, note, userId, when]);
  };

  // Opening stock on the first day
  const openAt = at(start, 7, 30);
  for (const p of products) {
    move(p.id, 3, "opening", int(250, 500), openAt, null, null, "Opening stock", 4);
    move(p.id, 1, "opening", int(90, 140), openAt, null, null, "Opening stock", 4);
    move(p.id, 2, "opening", int(60, 100), openAt, null, null, "Opening stock", 4);
  }

  const sales = [], saleItems = [], payments = [], purchases = [], purchaseItems = [], expenses = [];
  let saleId = 0, purchaseId = 0;

  for (let d = 0; d <= DAYS_OF_HISTORY; d++) {
    const day = addDays(start, d);
    const ymd = day.replaceAll("-", "");
    const isToday = day === today;
    const weekday = new Date(day + "T12:00:00Z").getUTCDay();
    const recent = d > DAYS_OF_HISTORY - 9; // the last 9 days

    // Purchases: every 3 days, one supplier delivers to the warehouse
    if (d % 3 === 1 && !isToday) {
      const supplier = SUPPLIERS[(d / 3 | 0) % SUPPLIERS.length];
      purchaseId++;
      const items = products.filter(p => supplier.cats.includes(p.category_id) && !(recent && SLOW_RESTOCK.has(p.code)));
      let total = 0;
      const receivedAt = at(day, 7, 45); // before the morning transfers and sales
      for (const p of items) {
        const qty = int(20, 35) * 10;
        const lt = round2(qty * p.cost);
        total += lt;
        purchaseItems.push([purchaseId, p.id, qty, p.cost, lt]);
        move(p.id, 3, "purchase", qty, receivedAt, "purchase", purchaseId, null, 4);
      }
      purchases.push([purchaseId, `PO-${ymd}-${pad(1, 4)}`, supplier.id, 3, 2, "received", round2(total), day, addDays(day, 2), receivedAt, null, at(addDays(day, -2), 10, 0)]);
      // Most suppliers are paid by bank transfer; the newest purchases are still unpaid
      if (d < DAYS_OF_HISTORY - 8) payments.push([null, purchaseId, "bank_transfer", round2(total), `TRF${ymd}${supplier.id}`, at(addDays(day, 7), 14, 0), 2]);
    }

    // Transfers: on Mondays and Thursdays the warehouse tops up both shops
    if ((weekday === 1 || weekday === 4) && !(isToday && nowBkk < at(day, 8, 30))) {
      const when = at(day, 8, 30);
      for (const shop of [1, 2]) {
        for (const p of products) {
          if (recent && SLOW_RESTOCK.has(p.code)) continue;
          const have = stock[key(p.id, shop)] || 0;
          const need = SHOP_TARGET[shop] - have;
          const available = stock[key(p.id, 3)] || 0;
          const qty = Math.min(need, available);
          if (need >= 20 && qty > 0) {
            move(p.id, 3, "transfer_out", -qty, when, "transfer", null, `To ${WAREHOUSES[shop - 1].name}`, 4);
            move(p.id, shop, "transfer_in", qty, when, "transfer", null, "From Main Warehouse", 4);
          }
        }
      }
    }

    // Sales: more on weekends; today only up to the current time
    const count = (weekday === 0 || weekday === 6) ? int(50, 66) : int(38, 52);
    const times = Array.from({ length: count }, () => [int(9, 20), int(0, 59)])
      .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    let seq = 0;

    for (const [h, m] of times) {
      const when = at(day, h, m);
      if (when > nowBkk) break;
      const shop = rand() < 0.62 ? 1 : 2;
      const cashier = shop === 1 ? 3 : 5;
      const r = rand();
      const customer = r < 0.55 ? null : r < 0.85 ? pick(CUSTOMERS.slice(0, 8)) : pick(CUSTOMERS.slice(8));
      const wholesale = customer?.type === "wholesale";

      const chosen = [...products].sort(() => rand() - 0.5).slice(0, wholesale ? int(3, 6) : int(1, 4))
        .sort((a, b) => a.id - b.id);
      const lines = [];
      for (const p of chosen) {
        const want = wholesale ? int(4, 12) : (rand() < 0.75 ? 1 : int(2, 3));
        const have = stock[key(p.id, shop)] || 0;
        const qty = Math.min(want, have);
        if (qty <= 0) continue;
        const price = wholesale ? p.wholesale : p.price;
        lines.push({ p, qty, price, total: round2(qty * price) });
      }
      if (!lines.length) continue;

      saleId++; seq++;
      const subtotal = round2(lines.reduce((s, l) => s + l.total, 0));
      const discount = wholesale && subtotal > 1500 ? round2(Math.floor(subtotal * 0.03)) : (rand() < 0.06 ? 10 : 0);
      const total = round2(subtotal - discount);
      sales.push([saleId, `INV-${ymd}-${pad(seq, 4)}`, customer?.id ?? null, shop, cashier, subtotal, discount, total, "completed", when]);
      for (const l of lines) {
        saleItems.push([saleId, l.p.id, l.qty, l.price, l.p.cost, l.total]);
        move(l.p.id, shop, "sale", -l.qty, when, "sale", saleId, null, cashier);
      }
      const method = wholesale ? pick(["bank_transfer", "promptpay", "cash"]) : (rand() < 0.5 ? "cash" : rand() < 0.65 ? "promptpay" : "card");
      payments.push([saleId, null, method, total, null, when, cashier]);
    }

    // Expenses
    const dom = Number(day.slice(8, 10));
    const exp = (cat, wh, amount, desc, date = day) => expenses.push([cat, wh, amount, desc, date, 2]);
    if (dom === 1) {
      exp(1, 1, 18000, "Monthly rent, Main Shop");
      exp(1, 2, 12000, "Monthly rent, Secondary Shop");
      exp(1, 3, 15000, "Monthly rent, Main Warehouse");
    }
    if (dom === 5) {
      exp(3, 1, int(5200, 6800), "Electricity and water bill, Main Shop");
      exp(3, 2, int(3400, 4600), "Electricity and water bill, Secondary Shop");
      exp(3, 3, int(2800, 3900), "Electricity and water bill, Main Warehouse");
    }
    if (dom === 25) {
      exp(2, 1, 26000, "Staff salaries, Main Shop (2 staff)");
      exp(2, 2, 13000, "Staff salary, Secondary Shop");
      exp(2, 3, 14000, "Staff salary, Main Warehouse");
      exp(2, null, 22000, "Manager salary");
    }
    if (weekday === 1 || weekday === 4) exp(4, 3, int(450, 900), "Truck fuel for shop deliveries");
    if (d % 3 === 1 && !isToday) exp(4, 3, int(600, 1500), "Supplier delivery fee");
    if (dom === 15) exp(5, 3, int(1800, 3500), "Pallets, shrink wrap and cartons");
    if (dom === 10) exp(6, null, int(1500, 3000), "Facebook and LINE OA promotion");
    if (dom === 20 && rand() < 0.6) exp(7, pick([1, 2]), int(800, 2500), "Air conditioner service");
  }

  // Two purchase orders that are on the way, and one draft
  for (const [status, sup, daysAgo] of [["ordered", 1, 2], ["ordered", 3, 1], ["draft", 5, 0]]) {
    purchaseId++;
    const day = addDays(today, -daysAgo);
    const supplier = SUPPLIERS[sup - 1];
    let total = 0;
    for (const p of products.filter(p => supplier.cats.includes(p.category_id))) {
      const qty = int(10, 20) * 10;
      const lt = round2(qty * p.cost);
      total += lt;
      purchaseItems.push([purchaseId, p.id, qty, p.cost, lt]);
    }
    purchases.push([purchaseId, `PO-${day.replaceAll("-", "")}-${pad(2, 4)}`, sup, 3, 2, status, round2(total), day, addDays(day, 3), null,
      status === "draft" ? "Check prices before sending" : null, at(day, 11, 0)]);
  }

  // ---------- Save everything ----------
  await insertMany(client, "purchases",
    ["id", "po_number", "supplier_id", "warehouse_id", "user_id", "status", "total", "order_date", "expected_date", "received_at", "note", "created_at"], purchases);
  await insertMany(client, "purchase_items", ["purchase_id", "product_id", "quantity", "unit_cost", "line_total"], purchaseItems);
  await insertMany(client, "sales",
    ["id", "invoice_no", "customer_id", "warehouse_id", "user_id", "subtotal", "discount", "total", "status", "created_at"], sales);
  await insertMany(client, "sale_items", ["sale_id", "product_id", "quantity", "unit_price", "unit_cost", "line_total"], saleItems);
  await insertMany(client, "payments", ["sale_id", "purchase_id", "method", "amount", "reference", "paid_at", "user_id"], payments);
  await insertMany(client, "expenses", ["category_id", "warehouse_id", "amount", "description", "expense_date", "user_id"], expenses);
  await insertMany(client, "stock_movements",
    ["product_id", "warehouse_id", "type", "quantity", "balance_after", "reference_type", "reference_id", "note", "user_id", "created_at"], movements);
  await insertMany(client, "inventory", ["product_id", "warehouse_id", "quantity"],
    Object.entries(stock).map(([k, q]) => [...k.split(":").map(Number), q]));

  // We inserted our own ids, so move each id counter past the highest id
  for (const t of ["warehouses", "roles", "users", "categories", "products", "suppliers", "customers", "expense_categories", "sales", "purchases"]) {
    await client.query(`SELECT setval(pg_get_serial_sequence('${t}', 'id'), (SELECT MAX(id) FROM ${t}))`);
  }

  return { sales: sales.length, purchases: purchases.length, movements: movements.length, expenses: expenses.length };
}
