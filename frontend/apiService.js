import axios from 'https://cdn.jsdelivr.net/npm/axios@1.3.5/+esm';

// Use the full server address with port where your backend is running
const API_URL = 'http://192.168.70.26:5002/api';

// Create axios instance with auth token
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 20000 // Default timeout for most requests
});

// Add auth token to requests if available
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Set longer timeout for thumbnail generation specifically
  if (config.url === '/thumbnails/generate') {
    config.timeout = 120000; // 2 minutes for thumbnail generation
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
  api.post('/thumbnails/generate', { titleId, quantity })
    .catch(error => {
      // If it's a timeout error, the server might still be processing
      // We'll throw a special error object for this case
      if (error.code === 'ECONNABORTED') {
        console.log('Thumbnail generation request timed out, but the server might still be processing it.');
        const timeoutError = new Error('Thumbnail generation request timed out, but the server might still be processing it.');
        timeoutError.isProcessingTimeout = true;
        timeoutError.titleId = titleId;
        timeoutError.quantity = quantity;
        throw timeoutError;
      }
      throw error;
    });
export const getThumbnails = (titleId) => api.get(`/thumbnails/${titleId}`);

export default api; 