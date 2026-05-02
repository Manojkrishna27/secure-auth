import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { authAPI } from '../services/api';
import Loader from '../components/ui/Loader';
import { Shield, Users, AlertTriangle, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';
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

const Admin = () => {
  const { user, logout, loading } = useAuth();
  const [loginHistory, setLoginHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Fetch login history
  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await authAPI.loginHistory();
      setLoginHistory(res.data.history || []);
    } catch (err) {
      console.error('Failed to fetch login history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Calculate stats
  const totalAttempts = loginHistory.length;
  const successfulLogins = loginHistory.filter(r => r.status === 'SUCCESS').length;
  const failedLogins = loginHistory.filter(r => r.status === 'FAILED').length;
  const uniqueUsers = [...new Set(loginHistory.map(r => r.email).filter(Boolean))].length;

  if (loading || historyLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-200 flex items-center justify-center">
        <div className="text-center">
          <Loader size="xl" />
          <p className="mt-4 text-gray-600 font-medium">
            Loading admin panel...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="pt-4 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Admin Header */}
          <div className="flex items-center justify-between mb-12">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-2">
                Admin Panel
              </h1>
              <p className="text-xl text-gray-600">
                Security Monitoring Dashboard
              </p>
            </div>
            <Button
              variant="outline"
              size="md"
              onClick={fetchHistory}
              className="px-4 py-2"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Security Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">

            {/* Total Attempts */}
            <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-6 border border-white/50 shadow-2xl">
              <div className="flex items-center">
                <div className="p-3 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-2xl">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 uppercase">
                    Total Attempts
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {totalAttempts}
                  </p>
                </div>
              </div>
            </div>

            {/* Successful */}
            <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-6 border border-white/50 shadow-2xl">
              <div className="flex items-center">
                <div className="p-3 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 uppercase">
                    Successful
                  </p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {successfulLogins}
                  </p>
                </div>
              </div>
            </div>

            {/* Failed (Suspicious) */}
            <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-6 border border-white/50 shadow-2xl">
              <div className="flex items-center">
                <div className="p-3 bg-gradient-to-r from-red-500 to-red-600 rounded-2xl">
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 uppercase">
                    Suspicious
                  </p>
                  <p className="text-2xl font-bold text-red-600">
                    {failedLogins}
                  </p>
                </div>
              </div>
            </div>

            {/* Unique Users */}
            <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-6 border border-white/50 shadow-2xl">
              <div className="flex items-center">
                <div className="p-3 bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 uppercase">
                    Unique Users
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {uniqueUsers}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Suspicious Activity Alert */}
          {failedLogins > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-8 flex items-center">
              <AlertTriangle className="w-6 h-6 text-red-500 mr-3" />
              <div>
                <p className="font-semibold text-red-700">
                  {failedLogins} suspicious login attempt{failedLogins > 1 ? 's' : ''} detected
                </p>
                <p className="text-sm text-red-600">
                  Review the failed attempts below for potential unauthorized access
                </p>
              </div>
            </div>
          )}

          {/* Login History Table */}
          <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/50 shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <Clock className="w-6 h-6 mr-2 text-indigo-600" />
                Login History
              </h2>
              <span className="text-sm text-gray-500">
                Latest 10 records
              </span>
            </div>

            {loginHistory.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No login history</p>
                <p className="text-sm">Login attempts will appear here</p>
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
                          record.status === 'FAILED' ? 'bg-red-50/30' : ''
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

          {/* Back to Dashboard */}
          <div className="text-center mt-8">
            <Button
              variant="outline"
              size="md"
              onClick={logout}
              className="px-6 py-2"
            >
              Sign Out
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Admin;
