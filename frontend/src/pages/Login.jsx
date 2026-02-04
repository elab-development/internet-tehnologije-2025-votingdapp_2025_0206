import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import metamaskLogo from "../assets/metamask.png";
import { users } from "../dummyUsers";
import { groups } from "../dummyData";

function Login() {
  const [wallet, setWallet] = useState("");
  const [groupCode, setGroupCode] = useState("");
  const [error, setError] = useState("");

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = () => {
    const group = groups.find(g => g.sifraGrupe === groupCode);
    if (!group) {
      setError("Neispravna šifra grupe");
      return;
    }

    const user = users.find(u => 
      u.walletAddress === wallet && 
      u.grupaID === group.grupaID
    );

    if (!user) {
      setError("Wallet nije član ove grupe");
      return;
    }

    login(user);
    navigate("/home");
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <img src={metamaskLogo} alt="MetaMask" style={styles.logo} />
        <h2 style={styles.title}>Voting DApp Login</h2>
        
        <input
          type="text"
          value={wallet}
          onChange={(e) => setWallet(e.target.value)}
          placeholder="Wallet adresa"
          style={styles.input}
        />
        
        <input
          type="text"
          value={groupCode}
          onChange={(e) => setGroupCode(e.target.value)}
          placeholder="Šifra grupe"
          style={styles.input}
        />
        
        <button onClick={handleLogin} style={styles.button}>
          Prijavi se
        </button>
        
        {error && <p style={styles.error}>{error}</p>}
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    padding: "20px"
  },
  card: {
    backgroundColor: "white",
    padding: "40px",
    borderRadius: "12px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    width: "100%",
    maxWidth: "400px",
    textAlign: "center"
  },
  logo: {
    width: "80px",
    margin: "0 auto 20px",
    display: "block"
  },
  title: {
    color: "#333",
    marginBottom: "30px",
    fontSize: "24px"
  },
  input: {
    width: "100%",
    padding: "12px",
    marginBottom: "15px",
    borderRadius: "6px",
    border: "1px solid #ddd",
    fontSize: "16px",
    boxSizing: "border-box"
  },
  button: {
    width: "100%",
    padding: "14px",
    backgroundColor: "#4f46e5",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
    marginTop: "10px"
  },
  error: {
    color: "#dc2626",
    marginTop: "15px",
    padding: "10px",
    backgroundColor: "#fef2f2",
    borderRadius: "6px",
    fontSize: "14px"
  }
};

export default Login;