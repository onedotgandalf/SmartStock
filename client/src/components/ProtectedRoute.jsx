// Wrap pages that need a login. Optionally limit them to some roles:
//   <ProtectedRoute roles={["admin"]}> ... </ProtectedRoute>
// Note: this only hides pages in the browser. The real protection is on
// the server, which checks the token and role on every API request.
import { Navigate, useLocation } from "react-router";
import { useAuth } from "../context/AuthContext.jsx";
import { FullPageSpinner } from "./States.jsx";

export default function ProtectedRoute({ roles, children }) {
  const { user, checking } = useAuth();
  const location = useLocation();

  if (checking) return <FullPageSpinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}
