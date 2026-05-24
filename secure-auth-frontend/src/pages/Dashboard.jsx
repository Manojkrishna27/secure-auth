import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { authAPI } from '../services/api';
import Loader from '../components/ui/Loader';
import { User, Shield, Activity, LogOut, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';
import Button from '../components/ui/Button';

// Helper: Parse user-agent to get device type
const getDeviceFromUA = (ua) => {
  if (!ua) return 'Unknown Device';
  if (ua.includes('Mobile')) return 'Mobile';
  if (ua.includes('Tablet')) return 'Tablet';
  if (ua.includes('Chrome')) return 'Chrome Browser';
  if (ua.includes('Firefox')) return 'Firefox Browser';
  if (ua.includes('Safari')) return 'Safari Browser';
  return 'Desktop';
};

const Dashboard = () => {
  const { user, logout, loading } = useAuth();
  const [loginHistory, setLoginHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Fetch login history on mount
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await authAPI.loginHistory();
        setLoginHistory(res.data.history || []);
      } catch (err) {
        console.error('Failed to fetch login history:', err);
      } finally {
        setHistoryLoading(false);
      }
    };
    fetchHistory();
  }, []);

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
              Welcome back, {user?.email}! 👋
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
                    {user?.name || user?.email || 'User'}
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
                    SECURE
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
                    {user?.created_at
                      ? `Joined ${new Date(user.created_at).toLocaleString('en-US', { month: 'short', year: 'numeric' }).replace(' ', ' ')}`
                      : 'Joined'}
                  </p>
                </div>
                <LogOut className="w-8 h-8 text-gray-400" />
              </div>
            </div>
          </div>

          {/* Recent Login Activity */}
          <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/50 shadow-2xl overflow-hidden mb-12">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <Clock className="w-6 h-6 mr-2 text-indigo-600" />
                Recent Login Activity
              </h2>
            </div>

            {historyLoading ? (
              <div className="p-12 text-center">
                <Loader size="md" />
              </div>
            ) : loginHistory.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No login activity yet</p>
                <p className="text-sm">Login events will appear here</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Time
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        IP Address
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Device
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {loginHistory.map((record, index) => (
                      <tr
                        key={index}
                        className={`hover:bg-gray-50/50 transition-colors ${
                          record.status === 'FAILED' ? 'bg-red-50/30' : 'bg-white'
                        }`}
                      >
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                              record.status === 'SUCCESS'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {record.status === 'SUCCESS' ? (
                              <>
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Success
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3 mr-1" />
                                Failed
                              </>
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {record.email || 'Unknown'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {record.login_time || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 font-mono">
                          {record.ip_address || 'Unknown'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {getDeviceFromUA(record.user_agent)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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