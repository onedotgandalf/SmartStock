# SmartStock: Inventory & Sales Management System

A full-stack web application that helps small and medium-sized businesses manage inventory, sales, purchases, suppliers, customers, expenses and financial reports across several branches (Main Shop, Secondary Shop and Main Warehouse).

Built by **Shin Thant Maung** (ICT, Rangsit University) as an internship portfolio project.

**Tech stack:** React · Tailwind CSS · Recharts · Node.js · Express · PostgreSQL · JWT · OpenAI API (planned)

---

## Project status

SmartStock is being built in 11 steps. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full plan, folder structure, database design and security notes.

| Step | Module | Status |
|---|---|---|
| 1 | Architecture, database, login and roles, dashboard | ✅ Done |
| 2 | Products and categories | Next |
| 3 | Inventory, transfers and low-stock alerts | Planned |
| 4 | Sales and POS with receipts | Planned |
| 5 | Customers | Planned |
| 6 | Suppliers and purchase orders | Planned |
| 7 | Expenses | Planned |
| 8 | Reports with PDF and Excel export | Planned |
| 9 | User management | Planned |
| 10 | AI Business Assistant | Planned |
| 11 | Testing and online deployment | Planned |

### What works now (step 1)

- **Complete PostgreSQL database** with 16 related tables, foreign keys, indexes and rules that keep stock from going negative.
- **Realistic sample data:** 3 branches, 24 products, 5 suppliers, 12 customers, and about 60 days of simulated sales, purchases, stock transfers and expenses that all agree with each other.
- **Secure login:** bcrypt password hashing, JWT tokens, rate-limited login, and accounts checked on every request.
- **Role-based access** on the server:
  - Admins and managers see every branch, plus profit and expenses.
  - Cashiers and warehouse staff see only their own branch, without finance figures.
- **Live dashboard:**
  - Today's sales compared with yesterday, and this month's revenue compared with the same days last month
  - Gross and net profit
  - A 30-day revenue chart and revenue by shop
  - Low-stock alerts, best-selling products and recent transactions
  - A branch switcher
- **Responsive layout:** dark navy sidebar that becomes a slide-in menu on phones.

---

## Run it on your computer

### 1. Install the tools (one time)

| Tool | Download | Check it works |
|---|---|---|
| Node.js 20 or newer (LTS) | https://nodejs.org | `node -v` |
| PostgreSQL 16 or newer | https://www.postgresql.org/download/ | Open **pgAdmin** or `psql --version` |
| Git | https://git-scm.com | `git --version` |

When you install PostgreSQL, **write down the password** you choose for the `postgres` user. You'll need it in step 3.

### 2. Download the project

```bash
git clone https://github.com/onedotgandalf/SmartStock.git
cd SmartStock
```

### 3. Create the database

Open **pgAdmin**, right-click **Databases → Create → Database**, and name it `smartstock`.

Or, in a terminal:

```bash
psql -U postgres -c "CREATE DATABASE smartstock;"
```

### 4. Set up the server

```bash
cd server
npm install
```

Copy `.env.example` to a new file called `.env` (Windows: `copy .env.example .env`, Mac/Linux: `cp .env.example .env`), then open `.env` and change two things:

1. In `DATABASE_URL`, replace `your_postgres_password` with your PostgreSQL password.
2. Replace `JWT_SECRET` with a random secret. Generate one with:
   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```

Create the tables and sample data, then start the API:

```bash
npm run db:setup
npm run dev
```

You should see `✅ Connected to PostgreSQL` and `🚀 SmartStock API running on http://localhost:5000/api`.
Check it in the browser: http://localhost:5000/api/health

### 5. Start the website (in a second terminal)

```bash
cd client
npm install
npm run dev
```

Open **http://localhost:5173** and sign in.

### Demo accounts

All demo accounts use the password **`SmartStock@2026`**. The login page also has buttons that fill these in.

| Role | Email | Sees |
|---|---|---|
| Admin | admin@smartstock.demo | Everything, all branches |
| Manager | manager@smartstock.demo | Operations and finance, all branches |
| Cashier | cashier@smartstock.demo | Main Shop only, no profit figures |
| Warehouse | warehouse@smartstock.demo | Main Warehouse only, no profit figures |

> All company names, people, phone numbers and figures in the sample data are made up.

---

## Useful commands

| Where | Command | What it does |
|---|---|---|
| `server/` | `npm run dev` | Start the API and restart it when files change |
| `server/` | `npm run db:setup` | **Delete** all data and recreate the tables + sample data |
| `client/` | `npm run dev` | Start the website in development mode |
| `client/` | `npm run build` | Build the website for deployment |

## Troubleshooting

| Problem | Fix |
|---|---|
| `password authentication failed` | The password in `DATABASE_URL` is wrong. |
| `database "smartstock" does not exist` | Do step 3 first. |
| `ECONNREFUSED ... 5432` | PostgreSQL isn't running. Start it from Services (Windows) or pgAdmin. |
| `JWT_SECRET must be your own random value` | Replace the example secret in `.env` (step 4). |
| Login page says *Can't reach the server* | The API isn't running. Start `npm run dev` in `server/`. |
| `npm` not recognised | Install Node.js, then close and reopen the terminal. |

## API endpoints (so far)

| Method | URL | Who | Description |
|---|---|---|---|
| GET | `/api/health` | anyone | Server and database status |
| POST | `/api/auth/login` | anyone | Log in, returns a JWT |
| GET | `/api/auth/me` | logged in | The current user |
| GET | `/api/warehouses` | logged in | Branches the user may see |
| GET | `/api/dashboard/summary?warehouseId=` | logged in | All dashboard figures |

## Security

- Passwords are stored only as bcrypt hashes.
- Every protected request checks the JWT **and** that the account is still active.
- Roles are enforced on the server, not only by hiding buttons.
- All SQL uses parameters, so SQL injection isn't possible.
- Secrets such as `JWT_SECRET` and `OPENAI_API_KEY` live in `.env`, which is never uploaded to GitHub.
- The token is kept in `localStorage` for simplicity. For production, an httpOnly cookie is safer against cross-site scripting; this is noted for step 11.
