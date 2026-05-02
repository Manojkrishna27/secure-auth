import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import * as yup from 'yup';
import { authAPI } from '../services/api';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import Loader from '../components/ui/Loader';
import { Lock, CheckCircle } from 'lucide-react';
import { showSuccess, showError } from '../components/ToastProvider';

const schema = yup.object({
  password: yup.string().min(8, 'Password must be at least 8 characters').required('Password required'),
  confirmPassword: yup.string().oneOf([yup.ref('password')], 'Passwords must match').required('Confirm password required'),
});

const ResetPassword = () => {
  const [email, setEmail] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const stateEmail = location.state?.email;
    if (stateEmail) {
      setEmail(stateEmail);
    } else {
      navigate('/forgot-password');
    }
  }, [location.state?.email, navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
  } = useForm({
    resolver: yupResolver(schema),
  });

  const password = watch('password');

  const onSubmit = async (data) => {
    try {
      const res = await authAPI.resetPassword({ email, ...data });
      if (res.data.success) {
        showSuccess('Password reset successful! You can now login.');
        navigate('/login');
      } else {
        showError(res.data.message);
      }
    } catch (error) {
      showError(error.response?.data?.message || 'Reset failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Reset Password</h2>
          <p className="text-gray-600 mb-2">Create your new password for</p>
          <p className="text-blue-600 font-semibold bg-blue-50 px-3 py-1 rounded-full inline-block">
            {email}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Input
            label="New Password"
            type="password"
            error={errors.password?.message}
            {...register('password')}
            placeholder="At least 8 characters"
            icon={<Lock className="w-5 h-5 text-gray-400" />}
          />

          <Input
            label="Confirm Password"
            type="password"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
            placeholder="Repeat new password"
            icon={<Lock className="w-5 h-5 text-gray-400" />}
          />

          <Button type="submit" className="w-full">
            Reset Password
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

export default ResetPassword;
