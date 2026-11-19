import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import Logo from "../components/Logo.jsx";
import { useAuth } from "../context/AuthContext.jsx";

// Demo accounts created by `npm run db:setup` (sample data only)
const DEMO_PASSWORD = "SmartStock@2026";
const DEMO_ACCOUNTS = [
  { role: "Admin", email: "admin@smartstock.demo" },
  { role: "Manager", email: "manager@smartstock.demo" },
  { role: "Cashier", email: "cashier@smartstock.demo" },
  { role: "Warehouse", email: "warehouse@smartstock.demo" }
];

const FEATURES = [
  "Stock levels for every branch, updated with each sale",
  "Point of sale with receipts and multiple payment methods",
  "Purchase orders, suppliers and customer history",
  "Profit, expenses and reports, with an AI assistant"
];

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate(location.state?.from || "/", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(account) {
    setEmail(account.email);
    setPassword(DEMO_PASSWORD);
    setError("");
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left: brand panel (hidden on phones) */}
      <div className="relative hidden overflow-hidden bg-navy-900 p-12 text-white lg:flex lg:flex-col">
        <Logo light />
        <div className="my-auto max-w-md">
          <h1 className="text-4xl font-bold leading-tight tracking-tight">
            Run every branch from one screen.
          </h1>
          <p className="mt-4 text-navy-200">
            Inventory, sales, purchasing and reports for your shops and warehouse, always in sync.
          </p>
          <ul className="mt-8 space-y-3">
            {FEATURES.map(f => (
              <li key={f} className="flex items-start gap-3 text-sm text-navy-100">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
                {f}
              </li>
            ))}
          </ul>
        </div>
        {/* Decorative rising bars */}
        <svg className="absolute -bottom-2 right-0 h-56 w-[70%] opacity-90" viewBox="0 0 400 220" preserveAspectRatio="xMaxYMax meet" aria-hidden="true">
          {[40, 70, 55, 95, 80, 120, 105, 150, 135, 180].map((h, i) => (
            <rect key={i} x={i * 40 + 6} y={220 - h} width="26" height={h} rx="5"
              fill={i === 9 ? "#22c55e" : "#26324b"} />
          ))}
        </svg>
      </div>

      {/* Right: login form */}
      <div className="flex items-center justify-center bg-white px-5 py-12 sm:px-10">
        <div className="w-full max-w-sm">
          <div className="lg:hidden"><Logo /></div>
          <h2 className="mt-8 text-2xl font-bold tracking-tight text-navy-900 lg:mt-0">Sign in</h2>
          <p className="mt-1 text-sm text-navy-500">Welcome back. Enter your staff account details.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-navy-700">Email</label>
              <div className="relative">
                <Mail size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
                <input
                  id="email" type="email" autoComplete="email" value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-navy-200 py-2.5 pl-10 pr-3 text-base text-navy-900 placeholder:text-navy-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none sm:text-sm"
                  placeholder="you@company.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-navy-700">Password</label>
              <div className="relative">
                <Lock size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
                <input
                  id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-navy-200 py-2.5 pl-10 pr-11 text-base text-navy-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none sm:text-sm"
                />
                <button
                  type="button" onClick={() => setShowPassword(s => !s)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-2 text-navy-400 hover:text-navy-700"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</p>}

            <button
              type="submit" disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-navy-900 py-2.5 text-sm font-semibold text-white hover:bg-navy-800 focus:ring-2 focus:ring-brand-500/40 focus:outline-none disabled:opacity-70"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="mt-10 rounded-xl border border-navy-100 bg-navy-50 p-4">
            <p className="text-sm font-semibold text-navy-800">Demo accounts</p>
            <p className="mt-0.5 text-xs text-navy-500">Click a role to fill in its login. Each role sees different features.</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map(a => (
                <button
                  key={a.role} type="button" onClick={() => fillDemo(a)}
                  className="rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm font-medium text-navy-700 hover:border-brand-500 hover:text-brand-700"
                >
                  {a.role}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
