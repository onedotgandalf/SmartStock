import { Link } from "react-router";

export default function NotFoundPage() {
  return (
    <div className="grid min-h-[60vh] place-items-center text-center">
      <div>
        <p className="text-sm font-semibold text-brand-600">404</p>
        <h1 className="mt-2 text-2xl font-bold text-navy-900">Page not found</h1>
        <p className="mt-2 text-sm text-navy-500">This page doesn't exist, or it hasn't been built yet.</p>
        <Link to="/" className="mt-6 inline-block rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
