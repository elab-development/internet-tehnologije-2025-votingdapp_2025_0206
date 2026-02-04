
import { useEffect, useState } from "react";
import { getAllTopics, approveTopic, rejectTopic, finishTopic } from "../services/api";
import CreateGroup from "../components/CreateGroup";
import { useAuth } from "../context/AuthContext"; 

function Dashboard() {
  const { user } = useAuth();
  const [topics, setTopics] = useState([]);

  const loadTopics = async () => {
    const data = await getAllTopics();
    setTopics(data);
  };

  useEffect(() => {
    loadTopics();
  }, []);

  const handleApprove = async (temaID) => {
    await approveTopic(temaID);
    loadTopics();
  };

  const handleReject = async (temaID) => {
    await rejectTopic(temaID);
    loadTopics();
  };

  const handleFinish = async (temaID) => {
    await finishTopic(temaID);
    loadTopics();
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h2 className="text-3xl font-bold text-center mb-6">Administratorski pregled tema</h2>

      {/*SAMO ADMIN VIDI CreateGroup*/}
      {user?.uloga === "Admin" && <CreateGroup />}

      <div className="bg-white rounded-xl shadow mt-6">
        <div className="grid grid-cols-3 px-6 py-3 border-b font-semibold text-gray-600">
          <div>Tema</div>
          <div>Status</div>
          <div className="text-right">Akcije</div>
        </div>

        {topics.map((t) => (
          <div key={t.temaID} className="grid grid-cols-3 items-center px-6 py-4 border-b last:border-b-0">
            <div className="font-medium">{t.naslov}</div>
            <div className="text-sm text-gray-600">{t.status}</div>

            <div className="flex justify-end gap-2">
              {t.status === "ČekaOdobrenje" && (
                <>
                  <button onClick={() => handleApprove(t.temaID)} className="bg-green-500 text-white px-3 py-1 rounded">
                    Odobri
                  </button>
                  <button onClick={() => handleReject(t.temaID)} className="bg-red-500 text-white px-3 py-1 rounded">
                    Odbij
                  </button>
                </>
              )}

              {t.status === "Objavljena" && (
                <button onClick={() => handleFinish(t.temaID)} className="bg-indigo-600 text-white px-3 py-1 rounded">
                  Završi glasanje
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Dashboard;