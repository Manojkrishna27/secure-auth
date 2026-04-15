import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();

    console.log("Mock OTP sent to:", email);

    navigate('/verify-otp', {
      state: { email },
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-200 px-4">

      <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-6">
          <img
            src="/google-icon.png"
            alt="Logo"
            className="w-16 h-16 mx-auto mb-3"
          />
          <h2 className="text-2xl font-bold text-gray-800">
            Forgot Password
          </h2>
          <p className="text-gray-500 text-sm">
            Enter your email to receive OTP
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">

          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
          />

          <button
            type="submit"
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl font-semibold transition duration-300"
          >
            Send OTP
          </button>
        </form>

        {/* Back */}
        <div className="text-center mt-6">
          <Link
            to="/login"
            className="text-blue-600 text-sm hover:underline"
          >
            ← Back to Login
          </Link>
        </div>

      </div>
    </div>
  );
};

export default ForgotPassword;