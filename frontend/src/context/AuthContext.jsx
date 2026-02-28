import { createContext, useContext, useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Funkcija koja cita token i izvlaci podatke (korisnik i njegova uloga)
  const processToken = (token) => {
    try {
      const decoded = jwtDecode(token);
      const roleCapitalized = decoded.role.charAt(0).toUpperCase() + decoded.role.slice(1);
      setUser({
        walletAddress: decoded.sub,
        uloga: roleCapitalized,
        memberships: [],
      });
      sessionStorage.setItem("voting_token", token);
    } catch (error) {
      console.error("Loš token", error);
      logout();
    }
  };

  useEffect(() => {
    const token = sessionStorage.getItem("voting_token");
    if (token) {
      processToken(token);
      refreshUser().catch(() => {});
    }
    setLoading(false);
  }, []);

  const login = async (token) => {
    processToken(token);
    await refreshUser().catch(() => {});
  };

  const logout = () => {
    sessionStorage.removeItem("voting_token");
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const res = await import("../services/apiClient").then((m) => m.getCurrentUser());
      const roleCapitalized = res.role.charAt(0).toUpperCase() + res.role.slice(1);
      setUser({
        walletAddress: res.wallet_address,
        uloga: roleCapitalized,
        memberships: res.memberships || [],
      });
    } catch (err) {
      console.error("Failed to refresh user:", err);
      logout();
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, refreshUser }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

