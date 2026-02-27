import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Navbar() {
  const { user } = useAuth();
  const isAdmin = user && user.uloga === "Admin";

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
    </nav>
  );
}

export default Navbar;
