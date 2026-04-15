import React from 'react';
import { useAuth } from '../hooks/useAuth';
import Loader from '../components/ui/Loader';
import { User, Shield, Activity, LogOut } from 'lucide-react';
import Button from '../components/ui/Button';

const Dashboard = () => {
  const { user, logout, loading } = useAuth();

  // 🔄 Show loader while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-200 flex items-center justify-center">
        <div className="text-center">
          <Loader size="xl" />
          <p className="mt-4 text-gray-600 font-medium">
            Loading dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="pt-4 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-4">
              Dashboard
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Welcome back, {user?.name || user?.email}! 👋
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">

            {/* Account */}
            <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-8 border border-white/50 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:-translate-y-2">
              <div className="flex items-center">
                <div className="p-3 bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-2xl">
                  <User className="w-8 h-8 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                    Account
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {user?.email?.slice(0, 6) || 'ACTIVE'}
                  </p>
                </div>
              </div>
            </div>

            {/* Security */}
            <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-8 border border-white/50 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:-translate-y-2">
              <div className="flex items-center">
                <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                    Security
                  </p>
                  <p className="text-3xl font-bold text-emerald-500">
                    VERIFIED
                  </p>
                </div>
              </div>
            </div>

            {/* Sessions */}
            <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-8 border border-white/50 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:-translate-y-2">
              <div className="flex items-center">
                <div className="p-3 bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl">
                  <Activity className="w-8 h-8 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                    Sessions
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    Active
                  </p>
                </div>
              </div>
            </div>

            {/* Joined */}
            <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-8 border border-white/50 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:-translate-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                    Joined
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {user?.createdAt
                      ? new Date(user.createdAt).toLocaleDateString()
                      : 'Recent'}
                  </p>
                </div>
                <LogOut className="w-8 h-8 text-gray-400" />
              </div>
            </div>

          </div>

          {/* Logout */}
          <div className="text-center">
            <Button
              variant="outline"
              size="lg"
              onClick={logout}
              className="px-8 py-3 text-lg font-semibold"
            >
              <LogOut className="w-5 h-5 mr-2" />
              Sign Out Securely
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;