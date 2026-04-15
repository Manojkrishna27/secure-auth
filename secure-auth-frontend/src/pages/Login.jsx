import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useAuth } from '../hooks/useAuth';
import { useWebcam } from '../hooks/useWebcam';
import { loginSchema } from '../utils/validation';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';
import { showSuccess } from '../components/ToastProvider';
import { MESSAGES, MAX_LOGIN_ATTEMPTS } from '../utils/constants';

const Login = () => {
  const { login, loading, isAuthenticated } = useAuth();
  const [loginAttempts, setLoginAttempts] = useState(0);
  const navigate = useNavigate();

  const { captureSnapshot } = useWebcam();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(loginSchema),
  });

  const [passwordVisible, setPasswordVisible] = useState(false);

  // 📸 Handle snapshot
  const handleSecurityCapture = async () => {
    try {
      const snapshot = await captureSnapshot();
      if (snapshot) {
        // call API directly here OR via authAPI if needed
        const formData = new FormData();
        formData.append('snapshot', snapshot, 'snapshot.jpg');

        await fetch('http://localhost:5000/send_snapshot_email', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });
      }
    } catch (error) {
      console.error('Snapshot failed');
    }
  };

  // 🔐 Handle login
  const onSubmit = async (data) => {
    const result = await login(data);

    if (result.success) {
      showSuccess(MESSAGES.loginSuccess);
      setLoginAttempts(0);
      navigate('/dashboard', { replace: true });
    } else {
      // ✅ FIXED LOGIN ATTEMPT LOGIC
      setLoginAttempts((prev) => {
        const newAttempts = prev + 1;

        if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
          handleSecurityCapture();
        }

        return newAttempts;
      });
    }
  };

  // 🔁 Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="w-full max-w-md">
        <div className="text-center">
          <img
            src="/google-icon.png"
            alt="Google"
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
            onTogglePassword={() =>
              setPasswordVisible(!passwordVisible)
            }
            error={errors.password?.message}
            {...register('password')}
            icon={
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            }
          />

          <Button type="submit" loading={loading} className="w-full">
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