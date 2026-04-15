import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const navigate = useNavigate();
  const location = useLocation();

  const email = location.state?.email;

  // 🔒 Protect route
  useEffect(() => {
    if (!email) {
      navigate('/forgot-password');
    }
  }, [email, navigate]);

  const handleReset = (e) => {
    e.preventDefault();

    if (password.length < 6) {
      alert("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    console.log("Password reset for:", email);

    // 🔥 Mock success
    alert("Password reset successful!");

    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-200 px-4">

      <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-6">
          <img
            src="/google-icon.png"
            alt="Logo"
            className="w-16 h-16 mx-auto mb-3"
          />
          <h2 className="text-2xl font-bold text-gray-800">
            Reset Password
          </h2>
          <p className="text-gray-500 text-sm">
            Create a new password for
          </p>
          <p className="text-blue-600 font-medium text-sm">
            {email}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleReset} className="space-y-5">

          <input
            type="password"
            placeholder="New Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
          />

          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
          />

          <button
            type="submit"
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl font-semibold transition duration-300"
          >
            Reset Password
          </button>
        </form>

        {/* Back */}
        <div className="text-center mt-6">
          <Link
            to="/login"
            className="text-sm text-gray-500 hover:underline"
          >
            ← Back to Login
          </Link>
        </div>

      </div>
    </div>
  );
};

export default ResetPassword;