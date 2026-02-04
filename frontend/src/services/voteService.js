import { vote as apiVote } from "./api";

export const submitVote = async (topicId, choice, wallet) => {
  const votes = JSON.parse(localStorage.getItem("votes")) || {};
  const topicVotes = votes[topicId] || [];

  if (topicVotes.includes(wallet)) {
    return { success: false, message: "Već ste glasali" };
  }

  await apiVote(topicId, choice, wallet);

  votes[topicId] = [...topicVotes, wallet];
  localStorage.setItem("votes", JSON.stringify(votes));

  return { success: true };
};

