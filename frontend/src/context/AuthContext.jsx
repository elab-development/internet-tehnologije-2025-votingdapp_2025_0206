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
      // Backend salje ulogu malim slovima ("admin"), a tvoj frontend ocekuje velika ("Admin")
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
    }
    setLoading(false);
  }, []);

  const login = (token) => {
    processToken(token);
  };

  const logout = () => {
    sessionStorage.removeItem("voting_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

