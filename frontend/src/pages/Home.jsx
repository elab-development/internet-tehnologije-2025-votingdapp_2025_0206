import { useState, useEffect } from "react";
import { getTopics, createTopic, joinGroup, castVote } from "../services/apiClient";
import CreateGroup from "../components/CreateGroup";
import { connectWallet } from "../services/web3";
import { castVote as castVoteOnChain } from "../services/contractServise";
import { useAuth } from "../context/AuthContext";

function Home() {
  const { user, walletAccount, refreshUser } = useAuth();
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State za forme
  const [joinCode, setJoinCode] = useState("");
  const [newTopic, setNewTopic] = useState({ title: "", description: "" });
  const [message, setMessage] = useState("");
  const [joining, setJoining] = useState(false);
  const [votingTopicId, setVotingTopicId] = useState(null);

  // Učitaj teme čim se stranica otvori
  const loadTopics = async () => {
    try {
      const data = await getTopics();
      setTopics(data);
    } catch {
      setMessage("Greška pri učitavanju tema.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTopics();
  }, []);

  // Funkcija za ulazak u grupu
  const handleJoinGroup = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    const accessCode = joinCode.trim();
    if (!accessCode) {
      setMessage("Unesi šifru grupe.");
      return;
    }

    setJoining(true);
    try {
      const result = await joinGroup(accessCode);
      setMessage(result?.message || "Uspešno ste ušli u grupu!");
      setJoinCode("");
      await refreshUser();
      await loadTopics(); // Osveži teme da vidimo sadržaj grupe
    } catch (error) {
      const detail = error?.response?.data?.detail;
      const detailText = Array.isArray(detail)
        ? detail.map((item) => item?.msg || JSON.stringify(item)).join(", ")
        : detail;
      setMessage("Greška: " + (detailText || error.message || "Pogrešna šifra"));
    } finally {
      setJoining(false);
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

  // Funkcija za glasanje
  const handleVote = async (topic, decision) => {
    if (!topic?.contract_address) {
      setMessage("Tema nema adresu ugovora grupe.");
      return;
    }
    if (!Number.isInteger(topic?.on_chain_topic_id)) {
      setMessage("Tema nema on-chain topic ID, nije moguće glasati.");
      return;
    }

    const voteMap = { YES: 0, NO: 1, ABSTAIN: 2 };
    const choice = voteMap[decision];
    if (choice === undefined) {
      setMessage("Nevažeća odluka glasanja.");
      return;
    }

    try {
      setVotingTopicId(topic.id);
      const account = await connectWallet();
      if (!account) {
        throw new Error("MetaMask nalog nije povezan");
      }

      const loggedWallet = user?.walletAddress?.toLowerCase();
      if (loggedWallet && loggedWallet !== account.toLowerCase()) {
        throw new Error("Poveži isti MetaMask nalog kojim si ulogovan");
      }

      const { txHash } = await castVoteOnChain(
        topic.contract_address,
        topic.on_chain_topic_id,
        choice,
        account
      );

      await castVote(topic.id, decision, {
        transaction_hash: txHash,
        contract_address: topic.contract_address,
        on_chain_topic_id: topic.on_chain_topic_id,
      });

      setMessage(`Glas uspešno zabeležen on-chain. Tx: ${txHash?.slice(0, 12)}...`);
      await loadTopics();
    } catch (error) {
      setMessage("Greška: " + (error?.response?.data?.detail || error?.message || "Neuspešno glasanje"));
    } finally {
      setVotingTopicId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        
        {/* header */}
        <div className="bg-white p-6 rounded-xl shadow mb-6">
          <h1 className="text-2xl font-bold text-gray-800">
            Povezan MetaMask nalog: {walletAccount ? `${walletAccount.substring(0, 10)}...` : "nije povezan"}
          </h1>
          {message && <p className="mt-2 p-2 bg-blue-100 text-blue-800 rounded">{message}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Akcije (Create, Join & Predlozi)*/}
          <div className="space-y-6">
            {/* Kartica za kreiranje grupe */}
            {user?.uloga !== "Admin" && <CreateGroup />}

            {/* Kartica za ulazak u grupu */}
            <div className="bg-white p-5 rounded-xl shadow">
              <h3 className="font-semibold mb-3">Pristupi Grupi</h3>
              <form onSubmit={handleJoinGroup}>
                <input 
                  type="text" 
                  placeholder="Unesi šifru grupe" 
                  className="w-full border p-2 rounded mb-2"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                />
                <button 
                  type="submit"
                  disabled={joining}
                  className={`w-full text-white py-2 rounded transition ${
                    joining ? "bg-indigo-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"
                  }`}
                >
                  {joining ? "Učitavanje..." : "Uđi u grupu"}
                </button>
              </form>
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
            <div className="bg-white p-3 rounded-xl shadow text-sm text-gray-700">
              Grupa: <span className="font-semibold">{user?.groupName || "Niste u grupi"}</span>
            </div>
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
                  {/* VIZUELNI PRIKAZ REZULTATA */}
                  {topic.results && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex justify-between text-xs font-bold text-gray-500 uppercase mb-2">
                        <span>Trenutni rezultati</span>
                        <span>Ukupno glasova: {topic.results.yes + topic.results.no + topic.results.abstain}</span>
                      </div>

                  {/* Progres bar koji se puni */}
                  <div className="w-full bg-gray-200 rounded-full h-3 flex overflow-hidden mb-2">
                    <div 
                      style={{ width: `${(topic.results.yes / (topic.results.yes + topic.results.no + topic.results.abstain || 1)) * 100}%` }}
                      className="bg-green-500 h-full transition-all duration-700"
                      title="ZA"
                    ></div>
                    <div 
                      style={{ width: `${(topic.results.no / (topic.results.yes + topic.results.no + topic.results.abstain || 1)) * 100}%` }}
                      className="bg-red-500 h-full transition-all duration-700"
                      title="PROTIV"
                    ></div>
                    <div 
                      style={{ width: `${(topic.results.abstain / (topic.results.yes + topic.results.no + topic.results.abstain || 1)) * 100}%` }}
                      className="bg-gray-400 h-full transition-all duration-700"
                      title="UZDRŽANO"
                    ></div>
                  </div>

                  {/* Brojevi ispod bara */}
                  <div className="flex justify-between text-xs font-medium">
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      <span className="text-green-700">ZA: {topic.results.yes}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                      <span className="text-red-700">PROTIV: {topic.results.no}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                      <span className="text-gray-600">UZDRŽANO: {topic.results.abstain}</span>
                    </div>
                  </div>
                </div>
              )}
                  {/* Dugme za glasanje(u radu)*/}
                  {topic.status === 'active' && (
                    <div className="mt-4 flex flex-wrap gap-3">
                       <button 
                         onClick={() => handleVote(topic, "YES")}
                         disabled={votingTopicId === topic.id}
                         className={`flex-1 text-white py-2 px-4 rounded font-semibold transition shadow-sm ${
                           votingTopicId === topic.id
                             ? "bg-green-300 cursor-not-allowed"
                             : "bg-green-500 hover:bg-green-600"
                         }`}
                       >
                         {votingTopicId === topic.id ? "Čekaj..." : "ZA"}
                       </button>
                       <button 
                         onClick={() => handleVote(topic, "NO")}
                         disabled={votingTopicId === topic.id}
                         className={`flex-1 text-white py-2 px-4 rounded font-semibold transition shadow-sm ${
                           votingTopicId === topic.id
                             ? "bg-red-300 cursor-not-allowed"
                             : "bg-red-500 hover:bg-red-600"
                         }`}
                       >
                         PROTIV
                       </button>
                       <button 
                         onClick={() => handleVote(topic, "ABSTAIN")}
                         disabled={votingTopicId === topic.id}
                         className={`flex-1 text-white py-2 px-4 rounded font-semibold transition shadow-sm ${
                           votingTopicId === topic.id
                             ? "bg-gray-300 cursor-not-allowed"
                             : "bg-gray-500 hover:bg-gray-600"
                         }`}
                       >
                         UZDRŽANO
                       </button>
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
