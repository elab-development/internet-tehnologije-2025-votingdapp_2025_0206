import { useAuth } from "../context/AuthContext";
import { submitVote } from "../services/voteService";

function TopicCard({ topic, onVoteSuccess }) {
  const { user } = useAuth();
  if (!user) return null;

  const canVote = user.grupaID === topic.grupaID && topic.status === "Objavljena";

  const handleVote = async (choice) => {
    //Provera duplog glasanja
    const votes = JSON.parse(localStorage.getItem('votes') || '{}');
    const userVotes = votes[user.walletAddress] || [];
    
    if (userVotes.includes(topic.temaID)) {
      alert("Već ste glasali na ovu temu");
      return;
    }

    const result = await submitVote(topic.temaID, choice, user.walletAddress);
    
    if (result.success) {
      //sauvaj da je glasao
      userVotes.push(topic.temaID);
      votes[user.walletAddress] = userVotes;
      localStorage.setItem('votes', JSON.stringify(votes));
      
      alert("Glas uspešno zabeležen");
      if (onVoteSuccess) onVoteSuccess();
    } else {
      alert(result.message || "Došlo je do greške");
    }
  };

  return (
    <div className="bg-white p-5 rounded-xl shadow">
      <h3 className="text-xl font-semibold">{topic.naslov}</h3>
      <p className="text-gray-600 mb-2">{topic.opis}</p>
      <div className="text-sm text-gray-500 mb-4">
        <div>Status: <span className="font-medium">{topic.status}</span></div>
        <div>Grupa: {topic.grupaID}</div>
      </div>

      {canVote && (
        <div className="flex gap-2">
          <button onClick={() => handleVote("DA")} className="bg-green-500 text-white px-3 py-1 rounded">DA</button>
          <button onClick={() => handleVote("NE")} className="bg-red-500 text-white px-3 py-1 rounded">NE</button>
          <button onClick={() => handleVote("UZDRŽANO")} className="bg-gray-500 text-white px-3 py-1 rounded">UZDRŽANO</button>
        </div>
      )}
    </div>
  );
}

export default TopicCard;