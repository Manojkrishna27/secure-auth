import axios from 'axios';
import { API_BASE_URL, API_ENDPOINTS } from '../utils/constants';
import { showError } from '../components/ToastProvider';

// 🔌 Create Axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 🚀 Request Interceptor
api.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
);

// ⚠️ Response Interceptor (FULLY SILENT for 401)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    // 🔥 DO NOTHING for 401 (important)
    if (status === 401) {
      return Promise.reject(error);
    }

    if (status === 403) {
      showError('Access denied');
    } else if (status >= 500) {
      showError('Server error. Please try again later.');
    } else if (error.response?.data?.message) {
      showError(error.response.data.message);
    }

    return Promise.reject(error);
  }
);

// 🔐 AUTH APIs
export const authAPI = {
  // Login
  login: (data) => api.post(API_ENDPOINTS.login, data),

  // Logout
  logout: () => api.post('/logout'),

  // Forgot Password
  forgotPassword: (data) =>
    api.post(API_ENDPOINTS.forgotPassword, data),

  // Verify OTP
  verifyOTP: (data) =>
    api.post(API_ENDPOINTS.verifyOTP, data),

  // Reset Password
  resetPassword: (data) =>
    api.post(API_ENDPOINTS.resetPassword, data),

  // Get current user
  me: () => api.get(API_ENDPOINTS.me),

// 📸 Snapshot (FIXED)
  webcamSnapshot: (formData) => {
    return axios.post(
      API_BASE_URL + API_ENDPOINTS.webcamSnapshot,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        withCredentials: false, // keep false
      }
    );
  },

  // 📊 Login History
  loginHistory: () => api.get(API_ENDPOINTS.loginHistory),
};

export default api;
