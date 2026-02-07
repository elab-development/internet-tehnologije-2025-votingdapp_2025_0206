import axios from 'axios';

// Adresa gde se nalazi Python uvicorn
const API_URL = 'http://127.0.0.1:8000';

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

export default apiClient;