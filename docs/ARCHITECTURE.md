# SmartStock Architecture

This document explains how SmartStock is built: the big picture, the folders, the database, security, and the plan for building it step by step.

## 1. The big picture

SmartStock has three parts that talk to each other:

```
┌──────────────────────┐     HTTP + JSON      ┌───────────────────────┐      SQL       ┌──────────────┐
│  client (React)      │  ─────────────────▶  │  server (Express)     │  ───────────▶  │  PostgreSQL  │
│  runs in the browser │  ◀─────────────────  │  REST API on :5000    │  ◀───────────  │  database    │
│  Vite dev server     │   JWT in header      │  checks JWT + role    │                │              │
│  on :5173            │                      │  validates input      │                │              │
└──────────────────────┘                      └───────────┬───────────┘                └──────────────┘
                                                          │ (step 10)
                                                          ▼
                                                   OpenAI API (AI assistant)
```

- **client**: what the user sees. React pages, Tailwind CSS styling, Recharts charts. It never talks to the database directly.
- **server**: the "brain". Every request goes through it. It checks who you are (JWT), what you're allowed to do (role), validates the data, and runs SQL.
- **database**: PostgreSQL stores everything. Rules like "stock can never go below zero" are enforced here too, so even a bug in the code can't break the data.
- **OpenAI API**: only the server calls it, so the API key is never sent to the browser.

### Request flow example: a cashier logs in

1. The cashier types email and password on the Login page.
2. React sends `POST /api/auth/login` to the server.
3. The server finds the user, checks the password against the bcrypt hash, and creates a JWT (a signed token that says "user 3, role cashier, valid for 8 hours").
4. React stores the token and sends it in the `Authorization: Bearer <token>` header with every later request.
5. On each request, the `authenticate` middleware checks the token, and the `authorize("admin", "manager")` middleware checks the role.

## 2. Folder structure

```
SmartStock/
├── README.md                  How to install and run
├── docs/
│   └── ARCHITECTURE.md        This file
├── server/                    Back-end (Node.js + Express)
│   ├── package.json
│   ├── .env.example           Copy to .env and fill in your own values
│   └── src/
│       ├── index.js           Starts the server
│       ├── app.js             Creates the Express app, adds middleware and routes
│       ├── config/
│       │   ├── env.js         Reads and checks environment variables
│       │   └── db.js          PostgreSQL connection pool + transaction helper
│       ├── db/
│       │   ├── schema.sql     All tables, keys, indexes and rules
│       │   ├── seed.js        Realistic sample data
│       │   └── setup.js       Runs schema.sql then seed.js  (npm run db:setup)
│       ├── middleware/
│       │   ├── auth.js        authenticate (JWT) + authorize (roles)
│       │   ├── validate.js    Checks request data with zod schemas
│       │   └── error.js       One place that turns errors into clean JSON
│       ├── utils/
│       │   └── httpError.js   Helper to throw errors with a status code
│       ├── controllers/       What each endpoint actually does
│       │   ├── auth.controller.js
│       │   ├── dashboard.controller.js
│       │   └── warehouse.controller.js
│       └── routes/            Which URL goes to which controller
│           ├── index.js
│           ├── auth.routes.js
│           └── dashboard.routes.js
└── client/                    Front-end (React + Vite + Tailwind)
    ├── package.json
    ├── vite.config.js         Also forwards /api calls to the server
    ├── index.html
    └── src/
        ├── main.jsx           Starts React
        ├── App.jsx            Page routes
        ├── index.css          Tailwind + theme colours
        ├── api/client.js      fetch wrapper that adds the JWT and handles errors
        ├── context/AuthContext.jsx   Who is logged in
        ├── components/        Reusable pieces (Sidebar, Topbar, StatCard, Card, RevenueChart, ...)
        ├── layouts/AppLayout.jsx     Sidebar + top bar around every page
        ├── pages/             One file per screen (LoginPage, DashboardPage, ...)
        └── utils/
            ├── format.js      Money and date formatting
            └── navigation.js  Sidebar menu and which roles see each item
```

New features follow the same pattern: a `routes/x.routes.js` + `controllers/x.controller.js` on the server, and a `pages/XPage.jsx` on the client.

## 3. Database design

All money is stored as `NUMERIC(12,2)` (exact, never floating point). All tables have an `id` primary key and `created_at`.

| Table | What it stores | Key relationships |
|---|---|---|
| `roles` | admin, manager, cashier, warehouse | |
| `users` | staff accounts, bcrypt password hash | `role_id → roles`, optional `warehouse_id` (home branch) |
| `warehouses` | Main Shop, Secondary Shop, Main Warehouse | |
| `categories` | product categories | |
| `products` | code, barcode, name, prices, reorder level | `category_id → categories` |
| `inventory` | how many of each product are in each warehouse | unique `(product_id, warehouse_id)` |
| `stock_movements` | every change to stock, ever (the history) | `product_id`, `warehouse_id`, `user_id` |
| `suppliers` | supplier contact details | |
| `customers` | regular and wholesale customers | |
| `sales` | one row per receipt | `customer_id`, `warehouse_id`, `user_id` |
| `sale_items` | the products on each receipt | `sale_id → sales`, `product_id` |
| `purchases` | purchase orders to suppliers | `supplier_id`, `warehouse_id` |
| `purchase_items` | products on each purchase order | `purchase_id → purchases` |
| `payments` | money in (sales) and money out (to suppliers) | `sale_id` **or** `purchase_id` |
| `expense_categories` | rent, salaries, transport... | |
| `expenses` | business expenses | `category_id`, `warehouse_id` |

### How stock stays correct

- `inventory.quantity` has `CHECK (quantity >= 0)`, so the database refuses negative stock.
- Every stock change happens **inside a transaction** together with its `stock_movements` row. Either both are saved or neither.
- When selling, the server runs
  `UPDATE inventory SET quantity = quantity - $qty WHERE product_id = $p AND warehouse_id = $w AND quantity >= $qty`.
  This is atomic: if two cashiers sell the last item at the same moment, PostgreSQL locks the row, one update succeeds, and the other updates 0 rows, so the server returns "not enough stock" instead of selling something that isn't there.
- Products in a sale are always processed in the same order (by product id), so two sales can't deadlock each other.
- Sales and purchases copy the price at the time (`unit_price`, `unit_cost`) so old receipts never change when prices change later.

## 4. Security

| Risk | What SmartStock does |
|---|---|
| Stolen passwords | Passwords are hashed with bcrypt (12 rounds). The plain password is never stored. |
| Fake logins | JWT signed with a long secret from `.env`, expires after 8 hours. |
| Staff doing things they shouldn't | `authorize()` middleware checks the role on **the server**, not only by hiding buttons. |
| Password guessing | Login is rate-limited (10 attempts per 15 minutes per IP). |
| SQL injection | Every query uses parameters (`$1, $2`), never string building. |
| Bad input | Every request body is validated with zod before it reaches the database. |
| Leaked secrets | `.env` is in `.gitignore`. Only `.env.example` (no real values) is on GitHub. |
| OpenAI key leak | The key lives only in the server's `.env`. The browser never sees it. |
| Common web attacks | `helmet` sets secure HTTP headers. CORS only allows the client's address. |
| AI inventing numbers | The AI only receives figures the server reads from the database, and is told to answer only from them. |

## 5. Development plan

Each step ends with something that runs and can be tested.

| Step | What gets built | Status |
|---|---|---|
| 1 | Architecture, database schema + sample data, Express server, JWT login and roles, React app with login, layout and live dashboard summary | **Done** |
| 2 | Products and categories: list, search, filter, add, edit, delete, images | Next |
| 3 | Inventory: stock per branch, stock in/out, adjustments, history, transfers between branches, low-stock alerts | |
| 4 | Sales and POS: product search and barcode scan, cart, discounts, payment methods, receipt printing, stock deducted automatically | |
| 5 | Customers: profiles, wholesale/regular, purchase history, total spending | |
| 6 | Suppliers and purchase orders: create, track status, receive stock, outstanding payments | |
| 7 | Expenses: categories, salaries, transport, warehouse costs, history | |
| 8 | Full dashboard and reports: charts, profit, best sellers, daily/weekly/monthly, export to PDF and Excel | |
| 9 | User management: admin creates staff accounts and assigns roles and branches | |
| 10 | AI Business Assistant (OpenAI), answering only from real database figures | |
| 11 | Final polish, testing and deployment online (Render / Railway + Neon / Supabase) | |
