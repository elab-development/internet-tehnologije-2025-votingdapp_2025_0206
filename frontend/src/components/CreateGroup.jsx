import { useState } from "react";
import apiClient from "../services/apiClient"; // most sa backendom

function CreateGroup() {
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
      // Šaljemo podatke na Backend
      // apiClient automatski dodaje tvoj Admin Token u header
      await apiClient.post("/groups", {
        name: name,
        access_code: accessCode
      });

      setMessage(`Uspeh! Grupa "${name}" je kreirana.`);
      setName("");
      setAccessCode("");
      
    } catch (error) {
      setIsError(true);
      // Prikazujemo poruku koju je Backend poslao (npr. "Grupa već postoji")
      setMessage(error.response?.data?.detail || "Došlo je do greške pri kreiranju.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow max-w-md mx-auto mt-6">
      <h3 className="text-xl font-semibold mb-4 text-gray-800">Kreiranje nove grupe</h3>

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