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
import { ShieldCheck } from 'lucide-react';
import { showSuccess, showError } from '../components/ToastProvider';

const schema = yup.object({
  otp: yup.string().length(6, 'OTP must be 6 digits').required('OTP required'),
});

const VerifyOTP = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
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
    reset,
  } = useForm({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const res = await authAPI.verifyOTP({ email, ...data });
      if (res.data.success) {
        showSuccess('OTP verified successfully!');
        navigate('/reset-password', { state: { email } });
      } else {
        showError(res.data.message);
        reset();
      }
    } catch (error) {
      showError(error.response?.data?.message || 'Verification failed');
      reset();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      const res = await authAPI.forgotPassword({ email });
      if (res.data.success) {
        showSuccess('New OTP sent!');
      }
    } catch (error) {
      showError('Resend failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 bg-gradient-to-br from-indigo-50 to-blue-50">
      <Card className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-r from-green-400 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
            <ShieldCheck className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Verify OTP</h2>
          <p className="text-gray-600 mb-2">Enter the 6-digit code sent to</p>
          <p className="text-blue-600 font-semibold bg-blue-50 px-3 py-1 rounded-full inline-block">
            {email}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Input
            label="OTP Code"
            type="text"
            error={errors.otp?.message}
            {...register('otp')}
            placeholder="123456"
            maxLength={6}
            className="text-center text-2xl tracking-widest font-mono"
            icon={loading ? <Loader size="sm" /> : null}
          />

          <Button type="submit" loading={loading} className="w-full">
            Verify OTP
          </Button>
        </form>

        <div className="text-center space-y-3 mt-8 pt-6 border-t">
          <button
            onClick={handleResend}
            disabled={loading}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium underline disabled:opacity-50"
          >
            Resend OTP
          </button>
          <Link to="/login" className="text-sm text-gray-500 hover:text-gray-700 block">
            ← Back to Login
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default VerifyOTP;
