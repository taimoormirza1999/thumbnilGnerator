import axios from 'https://cdn.jsdelivr.net/npm/axios@1.3.5/+esm';
   // Add this at the top of apiService.js
   let preventReload = false;
// Use the full server address with port where your backend is running
// const API_URL = 'http://localhost:3002/api';
const { API_URL, OTHER_FLAG } = window.__ENV__
// alert(API_URL+'/api/');
// alert(API_URL);
// Create axios instance with auth token
const api = axios.create({
  baseURL: API_URL + '/api/',
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 100000 // Default timeout for most requests
});

// Add auth token to requests if available
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Set longer timeout for thumbnail generation specifically
  if (config.url === '/thumbnails/generate') {
    config.timeout = 450000; // 2 minutes for thumbnail generation
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
// Regenerate thumbnail endpoint
export const regenerateThumbnail = (titleId, thumbnailId) => 
  api.post('/thumbnails/regenerate', { titleId, thumbnailId });
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
export const getThumbnails = async (titleId) => {
  // Add this check
  if (preventReload) {
    console.log("Prevented API call to avoid reload");
    return { data: { thumbnails: [] } };
  }
  
  // Original code continues...
  const response = await api.get(`/thumbnails/${titleId}`);
  return response;
};

// Cache for thumbnails to reduce database load
const thumbnailCache = {
  data: {},
  timestamp: {},
  maxAge: 5000, // 5 seconds max cache age

  // Get from cache if available and not expired
  get(ids) {
    const key = Array.isArray(ids) ? ids.join(',') : ids;
    const now = Date.now();
    
    // Check if cache exists and is fresh
    if (this.data[key] && (now - this.timestamp[key] < this.maxAge)) {
      console.log(`Using cached data for thumbnails: ${key}`);
      return this.data[key];
    }
    
    return null;
  },
  
  // Store in cache
  set(ids, data) {
    const key = Array.isArray(ids) ? ids.join(',') : ids;
    this.data[key] = data;
    this.timestamp[key] = Date.now();
  }
};

export const getThumbnailsByIds = (ids) => {
  // Handle both array and non-array cases
  const idsArray = Array.isArray(ids) ? ids : [ids];
  
  // Check cache first
  const cachedData = thumbnailCache.get(idsArray);
  if (cachedData) {
    return Promise.resolve(cachedData);
  }
  
  // If not in cache, make the request
  return api.get(`/thumbnails/batch/${idsArray.join(',')}`)
    .then(response => {
      // Store in cache before returning
      thumbnailCache.set(idsArray, response);
      return response;
    });
};

export const getThumbnailById = async (thumbnailId) => {
  const response = await api.get(`/thumbnails/single/${thumbnailId}`);
  return response;
};

export default api; 

// Near your getThumbnails function
setInterval(() => {
  // Check global flag set by app.js
  if (window.preventReload !== undefined) {
    preventReload = window.preventReload;
  }
}, 100); 

