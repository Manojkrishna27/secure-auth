// API Endpoints
export const API_BASE_URL = 'http://localhost:5000';


// Auth Endpoints
export const API_ENDPOINTS = {
  login: '/login_verify',
  forgotPassword: '/send_otp',
  verifyOTP: '/verify_otp',
  resetPassword: '/reset_password',
  webcamSnapshot: '/send_snapshot_email',
  dashboard: '/user/dashboard',
  me: '/me',
  loginHistory: '/login_history'
};

// Messages
export const MESSAGES = {
  loginSuccess: 'Login successful! Welcome back.',
  loginError: 'Invalid credentials. Please try again.',
  forgotSuccess: 'Password reset link sent to your email.',
  otpSuccess: 'OTP verified successfully!',
  resetSuccess: 'Password reset successful. Please login again.',
  webcamPermission: 'Camera access needed for security verification.',
  webcamCapture: 'Snapshot captured for security.',
  genericError: 'Something went wrong. Please try again.'
};

// Validation Messages
export const VALIDATION_MSGS = {
  required: 'This field is required.',
  email: 'Please enter a valid email.',
  passwordMin: 'Password must be at least 8 characters.',
  passwordStrength: 'Password must contain uppercase, lowercase, number and special char.',
  otp: 'OTP must be 6 digits.',
  confirmPass: 'Passwords do not match.',
  matchPass: 'Passwords must match.'
};

// Webcam
export const MAX_LOGIN_ATTEMPTS = 3;

