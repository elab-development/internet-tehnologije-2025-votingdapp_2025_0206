import { createContext, useContext, useState } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  //login prima usera
  const login = (userData) => {
    setUser(userData);
    //moze i localStorage.setItem("user", JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    //localStorage.removeItem("user");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

