import { useState, useEffect } from "react";
import { getTopics, createTopic, joinGroup } from "../services/apiClient"; // Uvozimo naše funkcije
import { useAuth } from "../context/AuthContext";

function Home() {
  const { user } = useAuth();
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State za forme
  const [joinCode, setJoinCode] = useState("");
  const [newTopic, setNewTopic] = useState({ title: "", description: "" });
  const [message, setMessage] = useState("");

  // Učitaj teme čim se stranica otvori
  const loadTopics = async () => {
    try {
      const data = await getTopics();
      setTopics(data);
    } catch (error) {
      console.error("Greška pri učitavanju tema:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTopics();
  }, []);

  // Funkcija za ulazak u grupu
  const handleJoinGroup = async () => {
    try {
      await joinGroup(joinCode);
      setMessage("Uspešno ste ušli u grupu!");
      setJoinCode("");
      loadTopics(); // Osveži teme da vidimo sadržaj nove grupe
    } catch (error) {
      setMessage("Greška: " + (error.response?.data?.detail || "Pogrešna šifra"));
    }
  };

  // Funkcija za predlaganje teme
  const handleCreateTopic = async (e) => {
    e.preventDefault();
    try {
      await createTopic(newTopic.title, newTopic.description);
      setMessage("Tema poslata na odobrenje!");
      setNewTopic({ title: "", description: "" });
      loadTopics(); // Osveži listu
    } catch (error) {
      setMessage("Greška: " + (error.response?.data?.detail || "Niste član grupe!"));
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        
        {/* header */}
        <div className="bg-white p-6 rounded-xl shadow mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Dobrodošli, {user?.walletAddress?.substring(0,6)}...</h1>
          {message && <p className="mt-2 p-2 bg-blue-100 text-blue-800 rounded">{message}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Akcije (Join & Predlozi)*/}
          <div className="space-y-6">
            
            {/* Kartica za ulazak u grupu */}
            <div className="bg-white p-5 rounded-xl shadow">
              <h3 className="font-semibold mb-3">Pristupi Grupi</h3>
              <input 
                type="text" 
                placeholder="Unesi šifru grupe" 
                className="w-full border p-2 rounded mb-2"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
              />
              <button 
                onClick={handleJoinGroup}
                className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 transition"
              >
                Uđi u grupu
              </button>
            </div>

            {/* Kartica za novu temu */}
            <div className="bg-white p-5 rounded-xl shadow">
              <h3 className="font-semibold mb-3">Predloži Temu</h3>
              <form onSubmit={handleCreateTopic}>
                <input 
                  type="text" 
                  placeholder="Naslov teme" 
                  className="w-full border p-2 rounded mb-2"
                  value={newTopic.title}
                  onChange={(e) => setNewTopic({...newTopic, title: e.target.value})}
                  required
                />
                <textarea 
                  placeholder="Opis (šta se glasa?)" 
                  className="w-full border p-2 rounded mb-2"
                  value={newTopic.description}
                  onChange={(e) => setNewTopic({...newTopic, description: e.target.value})}
                  required
                />
                <button type="submit" className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition">
                  Pošalji predlog
                </button>
              </form>
            </div>
          </div>

          {/* Lista tema */}
          <div className="md:col-span-2 space-y-4">
            <h2 className="text-xl font-bold text-gray-700">Aktuelne Teme</h2>
            
            {loading ? (
              <p>Učitavanje...</p>
            ) : topics.length === 0 ? (
              <div className="bg-white p-8 rounded-xl shadow text-center text-gray-500">
                <p>Nema tema za prikaz.</p>
                <p className="text-sm">Ili niste u grupi, ili nema aktivnih tema.</p>
              </div>
            ) : (
              topics.map((topic) => (
                <div key={topic.id} className="bg-white p-5 rounded-xl shadow border-l-4 border-indigo-500">
                  <div className="flex justify-between items-start">
                    <h3 className="text-lg font-bold">{topic.title}</h3>
                    <span className={`text-xs px-2 py-1 rounded ${
                      topic.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {topic.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-gray-600 mt-2">{topic.description}</p>
                  
                  {/* Dugme za glasanje(u radu)*/}
                  {topic.status === 'active' && (
                    <div className="mt-4 flex gap-2">
                       <button className="px-3 py-1 bg-gray-200 rounded text-sm">Glasanje uskoro...</button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

export default Home;