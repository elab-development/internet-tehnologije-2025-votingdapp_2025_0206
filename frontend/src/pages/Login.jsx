import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ethers } from "ethers";
import apiClient from "../services/apiClient"; // Koristimo onaj fajl iz Koraka 3
import metamaskLogo from "../assets/metamask.png";

function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async () => {
    setLoading(true);
    setError("");

    try {
      // Provera za MetaMask
      if (!window.ethereum) {
        throw new Error("MetaMask nije instaliran!");
      }

      // Povezivanje na Wallet
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const walletAddress = await signer.getAddress();

      // Potpisivanje poruke (ista kao i u backendu)
      const message = "Login to Voting Dapp";
      const signature = await signer.signMessage(message);

      // Slanje potpisa Python backendu
      const response = await apiClient.post("/login", {
        wallet_address: walletAddress,
        signature: signature
      });

      // Backend vraca token
      const token = response.data.access_token;
      login(token); 

      // Preusmeravanje
      // Ako je admin - Dashboard, ako ne - Home
      if (response.data.user_role === "admin") {
        navigate("/dashboard");
      } else {
        navigate("/home");
      }

    } catch (err) {
      console.error(err);
      setError("Greška pri logovanju: " + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };
  
  const styles = {
    container: { minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", backgroundColor: "#f5f5f5", padding: "20px" },
    card: { backgroundColor: "white", padding: "40px", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", width: "100%", maxWidth: "400px", textAlign: "center" },
    logo: { width: "80px", margin: "0 auto 20px", display: "block" },
    title: { color: "#333", marginBottom: "30px", fontSize: "24px" },
    button: { width: "100%", padding: "14px", backgroundColor: "#4f46e5", color: "white", border: "none", borderRadius: "6px", fontSize: "16px", fontWeight: "bold", cursor: "pointer", marginTop: "10px" },
    error: { color: "#dc2626", marginTop: "15px", padding: "10px", backgroundColor: "#fef2f2", borderRadius: "6px", fontSize: "14px" }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <img src={metamaskLogo} alt="MetaMask" style={styles.logo} />
        <h2 style={styles.title}>Voting Dapp Login</h2>
        
        <button onClick={handleLogin} style={styles.button} disabled={loading}>
          {loading ? "Povezivanje..." : "Login sa MetaMask"}
        </button>
        
        {error && <p style={styles.error}>{error}</p>}
      </div>
    </div>
  );
}

export default Login;