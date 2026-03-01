import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { jwtDecode } from "jwt-decode";
import { getCurrentUser } from "../services/apiClient";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [walletAccount, setWalletAccount] = useState(null);
  const [loading, setLoading] = useState(true);

  const normalizeRole = (role) => {
    if (!role) return "User";
    return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
  };

  const logout = useCallback(() => {
    sessionStorage.removeItem("voting_token");
    setUser(null);
  }, []);

  // Funkcija koja cita token i izvlaci podatke (korisnik i njegova uloga)
  const processToken = useCallback((token) => {
    try {
      const decoded = jwtDecode(token);
      const roleCapitalized = normalizeRole(decoded.role);
      
      setUser({
        walletAddress: decoded.sub,
        uloga: roleCapitalized, // Sada će biti "Admin" ili "User"
        groupId: null,
        groupName: null,
      });
      sessionStorage.setItem("voting_token", token);
    } catch (error) {
      console.error("Loš token", error);
      logout();
    }
  }, [logout]);

  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser((prev) => ({
        ...prev,
        walletAddress: currentUser.wallet_address || prev?.walletAddress,
        uloga: normalizeRole(currentUser.role),
        groupId: currentUser.group_id ?? null,
        groupName: currentUser.group_name ?? null,
      }));
    } catch {
      logout();
    }
  }, [logout]);

  useEffect(() => {
    // Kad se učita stranica, proveri da li već imamo token
    const initAuth = async () => {
      const token = sessionStorage.getItem("voting_token");
      if (token) {
        processToken(token);
        await refreshUser();
      }
      setLoading(false);
    };

    initAuth();
  }, [processToken, refreshUser]);

  useEffect(() => {
    if (!window.ethereum) return undefined;

    const handleAccountsChanged = (accounts) => {
      const nextAccount = accounts?.[0] || null;
      setWalletAccount(nextAccount);

      // Ako je korisnik promenio nalog u MetaMask-u, izbaci ga iz sesije
      // da ne ostane token vezan za drugi wallet.
      if (user?.walletAddress) {
        const currentUserWallet = user.walletAddress.toLowerCase();
        const nextWallet = (nextAccount || "").toLowerCase();
        if (!nextWallet || currentUserWallet !== nextWallet) {
          logout();
        }
      }
    };

    window.ethereum
      .request({ method: "eth_accounts" })
      .then(handleAccountsChanged)
      .catch(() => {});

    window.ethereum.on("accountsChanged", handleAccountsChanged);

    return () => {
      if (window.ethereum?.removeListener) {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      }
    };
  }, [logout, user?.walletAddress]);

  const login = async (token) => {
    processToken(token);
    await refreshUser();
  };

  return (
    <AuthContext.Provider value={{ user, walletAccount, login, logout, loading, refreshUser }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
