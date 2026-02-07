import { useEffect, useState } from "react";
import { getTopics, updateTopicStatus } from "../services/apiClient";
import CreateGroup from "../components/CreateGroup";
import { useAuth } from "../context/AuthContext"; 

function Dashboard() {
  const { user } = useAuth();
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);

  // Učitavanje tema sa backenda
  const loadTopics = async () => {
    try {
      const data = await getTopics();
      // Sortiramo: prvo one što čekaju, pa aktivne, pa završene
      const sorted = data.sort((a, b) => {
        const order = { 'pending': 1, 'active': 2, 'closed': 3 };
        return order[a.status] - order[b.status];
      });
      setTopics(sorted);
    } catch (error) {
      console.error("Greška:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTopics();
  }, []);

  // Funkcija za odobravanje (Pending u Active)
  const handleApprove = async (temaID) => {
    if(!window.confirm("Da li ste sigurni da želite da odobrite ovu temu?")) return;
    try {
      await updateTopicStatus(temaID, "active");
      loadTopics(); // Osveži listu
    } catch (err) {
      alert("Greška: " + err.response?.data?.detail);
    }
  };

  // Funkcija za odbijanje/zatvaranje (Active u Closed)
  const handleFinish = async (temaID) => {
    if(!window.confirm("Završiti glasanje za ovu temu?")) return;
    try {
      await updateTopicStatus(temaID, "closed");
      loadTopics();
    } catch (err) {
      alert("Greška: " + err.response?.data?.detail);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h2 className="text-3xl font-bold text-center mb-6 text-gray-800">Admin Dashboard</h2>

      {/* Komponenta za pravljenje grupe */}
      <div className="mb-8">
        <CreateGroup />
      </div>

      {/* Tabela sa temama */}
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow mt-6 overflow-hidden">
        <div className="p-4 bg-gray-50 border-b">
          <h3 className="font-semibold text-gray-700">Upravljanje Temama</h3>
        </div>

        {loading ? (
          <p className="p-6 text-center">Učitavanje...</p>
        ) : topics.length === 0 ? (
          <p className="p-6 text-center text-gray-500">Nema tema za prikaz.</p>
        ) : (
          <div>
            <div className="grid grid-cols-12 px-6 py-3 border-b bg-gray-100 font-semibold text-sm text-gray-600">
              <div className="col-span-1">ID</div>
              <div className="col-span-5">Naslov Teme</div>
              <div className="col-span-2 text-center">Status</div>
              <div className="col-span-4 text-right">Akcije</div>
            </div>

            {topics.map((t) => (
              <div key={t.id} className="grid grid-cols-12 items-center px-6 py-4 border-b last:border-b-0 hover:bg-gray-50">
                <div className="col-span-1 text-gray-500">#{t.id}</div>
                <div className="col-span-5 font-medium text-gray-800">
                    {t.title}
                    <p className="text-xs text-gray-500 font-normal">{t.description}</p>
                </div>
                
                <div className="col-span-2 text-center">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    t.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    t.status === 'active' ? 'bg-green-100 text-green-800' :
                    'bg-gray-200 text-gray-800'
                  }`}>
                    {t.status.toUpperCase()}
                  </span>
                </div>

                <div className="col-span-4 flex justify-end gap-2">
                  {/* Prikaz dugmića zavisno od statusa */}
                  {t.status === "pending" && (
                    <>
                      <button 
                        onClick={() => handleApprove(t.id)} 
                        className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm transition"
                      >
                        Odobri
                      </button>      
                    </>
                  )}

                  {t.status === "active" && (
                    <button 
                      onClick={() => handleFinish(t.id)} 
                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm transition"
                    >
                      Završi Glasanje
                    </button>
                  )}
                  
                  {t.status === "closed" && (
                    <span className="text-gray-400 text-sm italic">Arhivirano</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;