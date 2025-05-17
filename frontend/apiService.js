import axios from 'https://cdn.jsdelivr.net/npm/axios@1.3.5/+esm';

// Use the full server address with port where your backend is running
const API_URL = 'http://209.38.206.36:3000/api';

// Create axios instance with auth token
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 10000 // Add timeout to avoid long waits on network issues
});

// Add auth token to requests if available
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth endpoints
export const login = (email, password) => api.post('/auth/login', { email, password });
export const register = (username, email, password) => api.post('/auth/register', { username, email, password });
export const getProfile = () => api.get('/auth/me');

// Title endpoints
export const createTitle = (title, instructions) => api.post('/titles', { title, instructions });
export const getTitles = () => api.get('/titles');
export const getTitle = (id) => api.get(`/titles/${id}`);
export const updateTitle = (id, title, instructions) => api.put(`/titles/${id}`, { title, instructions });
export const deleteTitle = (id) => api.delete(`/titles/${id}`);

// Reference endpoints
export const uploadReference = (titleId, imageData, isGlobal = false) => 
  api.post('/references', { titleId, imageData, isGlobal });
export const getReferences = (titleId) => api.get(`/references/${titleId}`);
export const getGlobalReferences = () => api.get('/references/global');
export const deleteReference = (id) => api.delete(`/references/${id}`);

// Thumbnail endpoints
export const generateThumbnails = (titleId, quantity = 5) => 
  api.post('/thumbnails/generate', { titleId, quantity });
export const getThumbnails = (titleId) => api.get(`/thumbnails/${titleId}`);

export default api; 