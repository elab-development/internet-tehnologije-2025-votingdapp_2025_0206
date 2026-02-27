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
      // Backend salje ulogu malim slovima ("admin"), a frontend ocekuje velika ("Admin")
      const roleCapitalized = decoded.role.charAt(0).toUpperCase() + decoded.role.slice(1);
      
      setUser({
        walletAddress: decoded.sub,
        uloga: roleCapitalized, // Sada će biti "Admin" ili "User"
      });
      sessionStorage.setItem("voting_token", token);
    } catch (error) {
      console.error("Loš token", error);
      logout();
    }
  };

  useEffect(() => {
    // Kad se učita stranica, proveri da li već imamo token
    const token = sessionStorage.getItem("voting_token");
    if (token) {
      processToken(token);
      // odmah pitaj server za najnoviju ulogu/korisnika
      refreshUser().catch(() => {});
    }
    setLoading(false);
  }, []);

  const login = async (token) => {
    processToken(token);
    // nakon pristizanja tokena, osveži iz backend-a
    await refreshUser().catch(() => {});
  };

  const logout = () => {
    sessionStorage.removeItem("voting_token");
    setUser(null);
  };

  // reload latest user info from backend; will update role if changed
  const refreshUser = async () => {
    try {
      const res = await import("../services/apiClient").then(m => m.getCurrentUser());
      const roleCapitalized = res.role.charAt(0).toUpperCase() + res.role.slice(1);
      setUser({
        walletAddress: res.wallet_address,
        uloga: roleCapitalized,
      });
    } catch (err) {
      // ako je token istekao ili je invalidan, otpusti korisnika
      console.error("Failed to refresh user:", err);
      logout();
    }
  };


  return (
    <AuthContext.Provider
      value={{ user, login, logout, loading, refreshUser }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

