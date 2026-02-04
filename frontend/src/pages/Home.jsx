
import { useEffect, useState, useCallback } from "react";
import { getActiveTopics, proposeTopic } from "../services/api"; 
import TopicCard from "../components/TopicCard";
import { useAuth } from "../context/AuthContext";

function Home() {
  const { user } = useAuth();
  const [topics, setTopics] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  const loadTopics = useCallback(async () => {
    const data = await getActiveTopics();
    const filtered = user.grupaID
      ? data.filter((t) => t.grupaID === user.grupaID)
      : data;
    setTopics(filtered);
  }, [user.grupaID]);

  useEffect(() => {
    loadTopics();
  }, [loadTopics]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!title.trim() || !description.trim()) {
      setError("Unesite naslov i opis teme");
      return;
    }

    try {
      await proposeTopic({
        naslov: title,
        opis: description,
        grupaID: user.grupaID,
      });
      
      setTitle("");
      setDescription("");
      alert("Tema poslata na odobrenje adminu");
      loadTopics();
    } catch (err) {
      setError("Greška pri kreiranju teme");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-indigo-600 text-white py-8 px-6 text-center">
        <h2 className="text-3xl font-bold mb-2">Voting dApp</h2>
        <p className="text-indigo-100">
          {user?.uloga === "User" ? "Glasajte o temama" : "Upravljajte glasanjem"}
        </p>
      </div>

      <div className="p-6 max-w-6xl mx-auto">
        <div className="bg-white p-6 rounded-xl shadow mb-10">
          <h3 className="text-xl font-semibold mb-4">Predloži novu temu</h3>
          
          {error && <p className="text-red-600 mb-3">{error}</p>}
          
          <form onSubmit={handleSubmit}>
            <input
              className="border w-full p-2 mb-3"
              placeholder="Naslov teme"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <textarea
              className="border w-full p-2 mb-4"
              placeholder="Opis teme"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <button className="bg-indigo-600 text-white px-4 py-2 rounded w-full">
              Pošalji na odobrenje
            </button>
          </form>
        </div>

        <div>
          <h3 className="text-2xl font-bold mb-6">
            Aktuelne teme za grupu {user.grupaID}
          </h3>
          
          {topics.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              {user.grupaID ? "Nema tema za ovu grupu" : "Nema dostupnih tema"}
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {topics.map((t) => (
                <TopicCard key={t.temaID} topic={t} onVoteSuccess={loadTopics} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Home;