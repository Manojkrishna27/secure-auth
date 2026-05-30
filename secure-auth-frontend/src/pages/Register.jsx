import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User } from 'lucide-react';

import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';

import { authAPI } from '../services/api';
import { registerSchema } from '../utils/validation';

import { showSuccess, showError } from '../components/ToastProvider';
import { MESSAGES } from '../utils/constants';


const Register = () => {
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm({
    resolver: yupResolver(registerSchema),
  });

  const [passwordVisible, setPasswordVisible] = useState(false);

  const password = watch('password');

  const onSubmit = async (data) => {
    try {
      const res = await authAPI.register({
        name: data.name,
        email: data.email,
        password: data.password,
      });

      if (res.data.success) {
        showSuccess(res.data.message || MESSAGES.registerSuccess);
        navigate('/login', { replace: true });
      } else {
        showError(res.data.message || MESSAGES.registerError);
      }

    } catch (error) {
      showError(error.response?.data?.message || MESSAGES.genericError);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="w-full max-w-md">
        <div className="text-center mb-8">
          <img
            src={new URL('../assets/google-icon.png', import.meta.url).toString()}
            alt="Logo"
            className="w-20 h-20 rounded-full shadow-md object-cover mx-auto mb-6"
          />

          <h2 className="text-3xl font-bold text-gray-900 mb-2">Create your account</h2>
          <p className="text-gray-600">Sign up to get started with SecureAuth</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Input
            label="Full Name"
            type="text"
            error={errors.name?.message}
            {...register('name')}
            icon={
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            }
          />

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

          <Input
            label="Confirm Password"
            type="password"
            showPasswordToggle
            passwordVisible={passwordVisible}
            onTogglePassword={() => setPasswordVisible(!passwordVisible)}
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />

          <Button type="submit" loading={isSubmitting} disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Creating account...' : 'Sign Up'}
          </Button>
        </form>

        <div className="text-center mt-6">
          <button
            type="button"
            onClick={() => navigate('/login', { replace: true })}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Already have an account? Login
          </button>
        </div>
      </Card>
    </div>
  );
};

export default Register;

