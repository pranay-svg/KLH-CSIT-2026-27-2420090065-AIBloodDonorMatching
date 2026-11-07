import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor to attach JWT Bearer token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('blood_donor_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

/**
 * Formats backend and network errors into clean, human-readable strings.
 * Guarantees that the returned value is always a primitive string safe to render in JSX.
 */
export const formatApiError = (err, defaultMsg = 'An error occurred.') => {
  if (!err) return defaultMsg;

  // Handle network / connection errors
  if (err.code === 'ERR_NETWORK' || !err.response) {
    if (typeof err.message === 'string' && err.message && !err.message.includes('Network Error') && !err.message.includes('AxiosError')) {
      return err.message;
    }
    return 'Unable to reach backend service. Please check your network connection.';
  }

  const responseData = err.response?.data;
  if (!responseData) {
    return (typeof err.message === 'string' && err.message) ? err.message : defaultMsg;
  }

  const detail = responseData.detail;

  // detail is a string
  if (typeof detail === 'string') {
    return detail;
  }

  // detail is an array (e.g. standard FastAPI/Pydantic validation errors: [{loc: [...], msg: ...}])
  if (Array.isArray(detail)) {
    const messages = detail.map((item) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object') {
        const field = Array.isArray(item.loc)
          ? item.loc.filter((x) => x !== 'body').join('.')
          : '';
        const msg = item.msg || item.message || JSON.stringify(item);
        return field ? `${field}: ${msg}` : msg;
      }
      return String(item);
    });
    return messages.filter(Boolean).join('; ') || defaultMsg;
  }

  // detail is an object
  if (detail && typeof detail === 'object') {
    return detail.msg || detail.message || JSON.stringify(detail);
  }

  // Fallback fields on response data
  if (typeof responseData.message === 'string') return responseData.message;
  if (typeof responseData.error === 'string') return responseData.error;

  return String(detail || err.message || defaultMsg);
};

/**
 * Authentication & Role Portals API
 */
export const loginUser = async (credentials) => {
  const response = await apiClient.post('/api/auth/login', credentials);
  return response.data;
};

export const registerUser = async (userData) => {
  const response = await apiClient.post('/api/auth/register', userData);
  return response.data;
};

export const getCurrentUser = async () => {
  const response = await apiClient.get('/api/auth/me');
  return response.data;
};

export const getDemoCredentials = async () => {
  const response = await apiClient.get('/api/auth/demo-credentials');
  return response.data;
};

export const getUsers = async (params = {}) => {
  const response = await apiClient.get('/api/auth/users', { params });
  return response.data;
};


/**
 * System Health & Diagnostics
 */
export const getHealth = async () => {
  const response = await apiClient.get('/health');
  return response.data;
};

/**
 * Donors API
 */
export const getDonors = async (params = {}) => {
  const response = await apiClient.get('/api/donors', { params });
  return response.data;
};

export const getDonor = async (donorId) => {
  const response = await apiClient.get(`/api/donors/${encodeURIComponent(donorId)}`);
  return response.data;
};

export const createDonor = async (donorData) => {
  const response = await apiClient.post('/api/donors', donorData);
  return response.data;
};

export const updateDonor = async (donorId, donorData) => {
  const response = await apiClient.put(`/api/donors/${encodeURIComponent(donorId)}`, donorData);
  return response.data;
};

export const updateDonorStatus = async (donorId, statusData) => {
  const response = await apiClient.patch(`/api/donors/${encodeURIComponent(donorId)}/status`, statusData);
  return response.data;
};

export const updateDonorLocation = async (donorId, locationData) => {
  const response = await apiClient.patch(`/api/donors/${encodeURIComponent(donorId)}/location`, locationData);
  return response.data;
};

export const simulateDonorResponse = async (donorId, responseData) => {
  const response = await apiClient.post(`/api/donors/${encodeURIComponent(donorId)}/response`, responseData);
  return response.data;
};

export const resetSeedDonors = async () => {
  const response = await apiClient.post('/api/donors/seed/reset');
  return response.data;
};

/**
 * Emergency Requests API
 */
export const getEmergencies = async (params = {}) => {
  const response = await apiClient.get('/api/emergencies', { params });
  return response.data;
};

export const getEmergency = async (emergencyId) => {
  const response = await apiClient.get(`/api/emergencies/${encodeURIComponent(emergencyId)}`);
  return response.data;
};

export const createEmergency = async (emergencyData) => {
  const response = await apiClient.post('/api/emergencies', emergencyData);
  return response.data;
};

export const updateEmergencyUrgency = async (emergencyId, emergencyLevel) => {
  const response = await apiClient.patch(`/api/emergencies/${encodeURIComponent(emergencyId)}/urgency`, {
    emergency_level: emergencyLevel,
  });
  return response.data;
};

export const updateEmergencyStatus = async (emergencyId, status) => {
  const response = await apiClient.patch(`/api/emergencies/${encodeURIComponent(emergencyId)}/status`, {
    status,
  });
  return response.data;
};

/**
 * Adaptive Matching Engine API
 */
export const getMatching = async (emergencyId) => {
  const response = await apiClient.get(`/api/matching/${encodeURIComponent(emergencyId)}`);
  return response.data;
};

export const getWeights = async () => {
  const response = await apiClient.get('/api/matching/weights');
  return response.data;
};

export const getEmergencyWeights = async (emergencyLevel) => {
  const response = await apiClient.get(`/api/matching/weights/${encodeURIComponent(emergencyLevel)}`);
  return response.data;
};

export default {
  formatApiError,
  loginUser,
  registerUser,
  getCurrentUser,
  getDemoCredentials,
  getUsers,
  getHealth,
  getDonors,
  getDonor,
  createDonor,
  updateDonor,
  updateDonorStatus,
  updateDonorLocation,
  simulateDonorResponse,
  resetSeedDonors,
  getEmergencies,
  getEmergency,
  createEmergency,
  updateEmergencyUrgency,
  updateEmergencyStatus,
  getMatching,
  getWeights,
  getEmergencyWeights,
};

