import axios from 'axios';
import { API_BASE_URL, API_ENDPOINTS } from '../utils/constants';
import { showError } from '../components/ToastProvider';

// 🔌 Create Axios instance
const api = axios.create({
  baseURL: API_BASE_URL, // http://localhost:5000
  withCredentials: true, // IMPORTANT for HTTP-only cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// 🚀 Request Interceptor (optional)
api.interceptors.request.use(
  (config) => {
    // Cookies are automatically sent
    return config;
  },
  (error) => Promise.reject(error)
);

// ⚠️ Response Interceptor (Global Error Handling)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    if (status === 401) {
      // 🔐 Unauthorized → redirect to login
      window.location.href = '/login';
    } else if (status === 403) {
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

  // Forgot Password (Send OTP)
  forgotPassword: (data) => api.post(API_ENDPOINTS.forgotPassword, data),

  // Verify OTP
  verifyOTP: (data) => api.post(API_ENDPOINTS.verifyOTP, data),

  // Reset Password
  resetPassword: (data) => api.post(API_ENDPOINTS.resetPassword, data),

  // Get Logged-in User
  me: () => api.get(API_ENDPOINTS.me),

  // 📸 Snapshot (FormData)
  webcamSnapshot: (blob) => {
    const formData = new FormData();
    formData.append('snapshot', blob, 'snapshot.jpg');

    return api.post(API_ENDPOINTS.webcamSnapshot, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

// 📦 Export base instance
export default api;