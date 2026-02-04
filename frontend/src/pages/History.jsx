
import { useEffect, useState } from "react";
import { getVotesHistory } from "../services/api";
import { useAuth } from "../context/AuthContext"; 

function History() {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const load = async () => {
      
      const data = await getVotesHistory(user?.grupaID || null);
      setHistory(data);
    };
    load();
  }, [user?.grupaID]); 

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h2 className="text-3xl font-bold text-center mb-6">
        Istorija odluka {user?.grupaID ? `(Grupa ${user.grupaID})` : ""}
      </h2>

      {history.length === 0 ? (
        <p className="text-center text-gray-500">Nema završenih tema za ovu grupu</p>
      ) : (
        <div className="bg-white p-6 rounded-xl shadow">
          <table className="w-full border-collapse text-center">
            <thead>
              <tr className="bg-indigo-100">
                <th className="border p-2">Tema</th>
                <th className="border p-2">DA</th>
                <th className="border p-2">NE</th>
                <th className="border p-2">UZDRŽANO</th>
                <th className="border p-2">Odluka</th>
                <th className="border p-2">Ukupno</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h, i) => (
                <tr key={i}>
                  <td className="border p-2">{h.tema}</td>
                  <td className="border p-2">{h.da}</td>
                  <td className="border p-2">{h.ne}</td>
                  <td className="border p-2">{h.uzdrzano}</td>
                  <td className="border p-2 font-bold">{h.decision}</td>
                  <td className="border p-2">{h.ukupno}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default History;