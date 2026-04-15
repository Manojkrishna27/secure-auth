import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';

const VerifyOTP = () => {
  const [otp, setOtp] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const email = location.state?.email;

  // 🔒 Protect route
  useEffect(() => {
    if (!email) {
      navigate('/forgot-password');
    }
  }, [email, navigate]);

  const handleVerify = (e) => {
    e.preventDefault();

    if (otp.length < 4) {
      alert("Enter valid OTP");
      return;
    }

    // 🔥 Mock success
    navigate('/reset-password', {
      state: { email },
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 to-blue-200 px-4">

      <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-6">
          <img
            src="/google-icon.png"
            alt="Logo"
            className="w-16 h-16 mx-auto mb-3"
          />
          <h2 className="text-2xl font-bold text-gray-800">
            Verify OTP
          </h2>
          <p className="text-gray-500 text-sm">
            Enter the OTP sent to
          </p>
          <p className="text-blue-600 font-medium text-sm">
            {email}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleVerify} className="space-y-5">

          <input
            type="text"
            placeholder="Enter OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            maxLength={6}
            className="w-full text-center text-lg tracking-widest px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
          />

          <button
            type="submit"
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl font-semibold transition duration-300"
          >
            Verify OTP
          </button>
        </form>

        {/* Resend + Back */}
        <div className="text-center mt-6 space-y-2">
          <p className="text-sm text-gray-500">
            Didn’t receive OTP?
          </p>
          <button className="text-blue-600 text-sm hover:underline">
            Resend OTP
          </button>

          <div>
            <Link
              to="/forgot-password"
              className="text-sm text-gray-500 hover:underline"
            >
              ← Back
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};

export default VerifyOTP;