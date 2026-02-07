import { useState, useEffect } from "react";
import { getTopics } from "../services/apiClient";

function History() {
  const [closedTopics, setClosedTopics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const data = await getTopics();
        // Filtriramo samo završene teme
        const filtered = data.filter(topic => topic.status === 'closed');
        setClosedTopics(filtered);
      } catch (error) {
        console.error("Greška pri učitavanju arhive:", error);
      } finally {
        setLoading(false);
      }
    };
    loadHistory();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-800 mb-8 border-b pb-4">
          Arhiva Glasanja
        </h2>

        {loading ? (
          <p className="text-center text-gray-500">Učitavanje arhive...</p>
        ) : closedTopics.length === 0 ? (
          <div className="bg-white p-10 rounded-xl shadow text-center">
            <p className="text-gray-500">Još uvek nema završenih glasanja.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {closedTopics.map((topic) => (
              <div key={topic.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-gray-800">{topic.title}</h3>
                  <span className="bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-xs font-bold uppercase">
                    Završeno
                  </span>
                </div>
                
                <p className="text-gray-600 mb-6">{topic.description}</p>

                {/* KONAČNI REZULTATI */}
                <div className="bg-indigo-50 p-4 rounded-lg">
                  <p className="text-sm font-bold text-indigo-900 mb-3 uppercase tracking-wider">
                    Konačni rezultati:
                  </p>
                  
                  <div className="space-y-4">
                    {/* Progress bar za ZA */}
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-semibold text-green-700">ZA</span>
                        <span className="font-bold">{topic.results?.yes}</span>
                      </div>
                      <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-green-500 h-full" 
                          style={{ width: `${(topic.results?.yes / (topic.results?.yes + topic.results?.no + topic.results?.abstain || 1)) * 100}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Progress bar za PROTIV */}
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-semibold text-red-700">PROTIV</span>
                        <span className="font-bold">{topic.results?.no}</span>
                      </div>
                      <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-red-500 h-full" 
                          style={{ width: `${(topic.results?.no / (topic.results?.yes + topic.results?.no + topic.results?.abstain || 1)) * 100}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Progress bar za UZDRŽANO */}
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-semibold text-gray-600">UZDRŽANO</span>
                        <span className="font-bold">{topic.results?.abstain}</span>
                      </div>
                      <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-gray-400 h-full" 
                          style={{ width: `${(topic.results?.abstain / (topic.results?.yes + topic.results?.no + topic.results?.abstain || 1)) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default History;