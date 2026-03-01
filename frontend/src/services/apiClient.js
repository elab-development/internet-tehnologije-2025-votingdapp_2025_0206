import axios from 'axios';

// Adresa gde se nalazi Python uvicorn
const API_URL = process.env.REACT_APP_API_URL;
if (!API_URL) {
  throw new Error("REACT_APP_API_URL is not configured");
}

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Ovo postavlja token za svaki zahtev ka backendu
apiClient.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('voting_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Funkcija za učlanjenje u grupu
export const joinGroup = async (accessCode) => {
  const response = await apiClient.post("/join", { access_code: accessCode });
  return response.data;
};

// Dohvati informacije o trenutno ulogovanom korisniku.
export const getCurrentUser = async () => {
  const response = await apiClient.get("/me");
  return response.data;
};

// Funkcija za dobavljanje tema
export const getTopics = async () => {
  const response = await apiClient.get("/topics");
  return response.data;
};

// Dohvati grupe kojima je prijavljeni korisnik admin
export const getMyGroups = async () => {
  const response = await apiClient.get("/groups/mine");
  return response.data;
};

// Funkcija za predlaganje teme
export const createTopic = async (title, description) => {
  return apiClient.post("/topics", { title, description });
};

// Funkcija za promenu statusa teme (active ili closed)
export const updateTopicStatus = async (topicId, status, payload = null) => {
  // status mora biti "active" ili "closed"
  if (payload) {
    return apiClient.put(`/topics/${topicId}/${status}`, payload);
  }
  return apiClient.put(`/topics/${topicId}/${status}`);
};

// Funkcija koja proverava glas(YES", "NO" ili "ABSTAIN)
export const castVote = async (topicId, decision) => {
  return apiClient.post("/votes", { topic_id: topicId, decision });
};

export default apiClient;
