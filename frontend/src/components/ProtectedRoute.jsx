import { Navigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, roles }) {
  const { user, refreshUser } = useAuth();

  // check for updates when component mounts or user changes
  useEffect(() => {
    if (user && refreshUser) {
      refreshUser();
    }
  }, [user, refreshUser]);

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (roles && !roles.includes(user.uloga)) {
    return <Navigate to="/home" replace />;
  }

  return children;
}