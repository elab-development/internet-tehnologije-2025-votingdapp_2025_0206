import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin =
    user &&
    Array.isArray(user.memberships) &&
    user.memberships.some((m) => m.role.toLowerCase() === "admin");

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <nav className="bg-indigo-600 text-white px-6 py-4 shadow-md flex justify-between items-center">
      
      <div className="space-x-4">
        <Link
          to="/home"
          className="hover:bg-indigo-500 px-3 py-1 rounded transition"
        >
          Početna
        </Link>
        <Link
          to="/history"
          className="hover:bg-indigo-500 px-3 py-1 rounded transition"
        >
          Istorija
        </Link>
        {isAdmin && (
          <Link
            to="/dashboard"
            className="hover:bg-indigo-500 px-3 py-1 rounded transition"
          >
            Dashboard
          </Link>
        )}
      </div>

      {user && (
        <button
          onClick={handleLogout}
          className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-white font-semibold transition-colors"
        >
          Odjava
        </button>
      )}
    </nav>
  );
}

export default Navbar;
