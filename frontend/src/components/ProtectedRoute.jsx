import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, roles }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/" replace />;
  }

 
  if (roles && !roles.includes(user.uloga)) {
    return <Navigate to="/home" replace />;
  }

  return children;
}