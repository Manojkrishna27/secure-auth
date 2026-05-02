import React from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Link, useNavigate } from 'react-router-dom';
import * as yup from 'yup';
import { authAPI } from '../services/api';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import { Mail } from 'lucide-react';
import { showSuccess, showError } from '../components/ToastProvider';
import { MESSAGES } from '../utils/constants';

const schema = yup.object({
  email: yup.string().email('Invalid email').required('Email required'),
});

const ForgotPassword = () => {
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data) => {
    try {
      const res = await authAPI.forgotPassword(data);
      if (res.data.success) {
        showSuccess('OTP sent to your email!');
        navigate('/verify-otp', { state: { email: data.email } });
      } else {
        showError(res.data.message);
      }
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to send OTP');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/google-icon.png" alt="Google" className="w-20 h-20 rounded-2xl shadow-2xl object-contain mx-auto mb-8" />
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Forgot Password?</h2>
          <p className="text-gray-600">Enter your email to receive OTP</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Input
            label="Email"
            type="email"
            error={errors.email?.message}
            {...register('email')}
            icon={<Mail className="w-5 h-5 text-gray-400" />}
          />

          <Button type="submit" loading={isSubmitting} className="w-full">
            Send OTP
          </Button>
        </form>

        <div className="text-center mt-6">
          <Link to="/login" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            ← Back to Login
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default ForgotPassword;
