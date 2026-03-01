import { useState } from "react";
import apiClient from "../services/apiClient"; // backend calls
import { connectWallet } from "../services/web3";
import { createGroupOnBlockchain } from "../services/contractServise";
import { useAuth } from "../context/AuthContext";

function CreateGroup() {
  const { refreshUser } = useAuth();
  const [name, setName] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    setMessage("");
    setIsError(false);
    
    if (!name || !accessCode) {
      setMessage("Popuni sva polja");
      setIsError(true);
      return;
    }

    setLoading(true);

    try {
      // prvo povezivanje novog naloga
      const account = await connectWallet();
      if (!account) throw new Error("Morate povezati MetaMask");

      // kreiraj ugovor na lancu (MetaMask signature + tx)
      const { txHash, groupAddress } = await createGroupOnBlockchain(account);

      // zatim obavesti backend; backend čita receipt i upisuje tačnu on-chain adresu
      const response = await apiClient.post("/groups", {
        name: name,
        access_code: accessCode,
        transaction_hash: txHash
      });

      const savedContractAddress = response.data?.contract_address || groupAddress;
      if (savedContractAddress) {
        setMessage(`Uspeh! Grupa "${name}" je kreirana na ${savedContractAddress.substring(0,10)}`);
      } else {
        setMessage(`Grupa "${name}" je sačuvana. Contract adresa će se dopuniti nakon blockchain sync-a.`);
      }

      await refreshUser();
      setName("");
      setAccessCode("");
      
    } catch (error) {
      setIsError(true);
      // Prikazujemo backend detalj, ili JS grešku (MetaMask/env), pa tek onda fallback poruku
      const detailedMessage =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        error?.message ||
        "Došlo je do greške pri kreiranju.";
      setMessage(detailedMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow max-w-md mx-auto mt-6">
      <h3 className="text-xl font-semibold mb-4 text-gray-800">Napravi novu grupu</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Naziv Grupe</label>
          <input
            className="border border-gray-300 w-full p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
            placeholder="npr. Tim Alpha"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Pristupna šifra</label>
          <input
            className="border border-gray-300 w-full p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
            placeholder="npr. tajna123"
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value)}
          />
        </div>

        <button
          onClick={handleCreate}
          disabled={loading}
          className={`w-full py-2 px-4 rounded text-white font-semibold transition-colors ${
            loading ? "bg-indigo-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"
          }`}
        >
          {loading ? "Kreiranje..." : "Kreiraj grupu"}
        </button>

        {message && (
          <div className={`p-3 rounded text-sm text-center ${isError ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}

export default CreateGroup;
