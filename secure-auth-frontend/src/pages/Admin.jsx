import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { authAPI } from '../services/api';
import Loader from '../components/ui/Loader';
import {
  Shield,
  Users,
  Activity,
  LogOut,
  CheckCircle,
  XCircle,
  Clock,
  UserPlus,
  AlertTriangle,
} from 'lucide-react';
import Button from '../components/ui/Button';
import { getDeviceFromUA } from '../utils/device';

const StatusBadge = ({ status }) => (
  <span
    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
      status === 'SUCCESS'
        ? 'bg-emerald-100 text-emerald-700'
        : 'bg-red-100 text-red-700'
    }`}
  >
    {status === 'SUCCESS' ? (
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
);

const LoginActivityTable = ({ records, emptyTitle, emptySubtitle }) => {
  if (records.length === 0) {
    return (
      <div className="p-12 text-center text-gray-500">
        <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p className="text-lg font-medium">{emptyTitle}</p>
        <p className="text-sm">{emptySubtitle}</p>
      </div>
    );
  }

  return (
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
          {records.map((record, index) => (
            <tr
              key={`${record.email}-${record.login_time}-${index}`}
              className={`hover:bg-gray-50/50 transition-colors ${
                record.status === 'FAILED' ? 'bg-red-50/30' : 'bg-white'
              }`}
            >
              <td className="px-6 py-4">
                <StatusBadge status={record.status} />
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
  );
};

const Admin = () => {
  const { user, is_admin, logout, loading } = useAuth();
  const [stats, setStats] = useState(null);
  const [loginHistory, setLoginHistory] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    if (is_admin !== true) return;

    const fetchAdminData = async () => {
      setPageLoading(true);
      try {
        const [statsRes, historyRes, registrationsRes] = await Promise.all([
          authAPI.adminStats(),
          authAPI.adminLoginHistory(),
          authAPI.adminRegistrations(),
        ]);

        setStats(statsRes.data);
        setLoginHistory(historyRes.data.history || []);
        setRegistrations(registrationsRes.data.registrations || []);
      } catch (err) {
        console.error('Failed to fetch admin data:', err);
      } finally {
        setPageLoading(false);
      }
    };

    fetchAdminData();
  }, [is_admin]);

  if (loading) {
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

  if (is_admin !== true) {
    return <Navigate to="/dashboard" replace />;
  }

  const securityEvents = loginHistory.filter((r) => r.status === 'FAILED');

  const formatRegistrationDate = (createdAt) => {
    if (!createdAt) return 'N/A';
    const date = new Date(createdAt);
    if (Number.isNaN(date.getTime())) return createdAt;
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="pt-4 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-4">
              Admin Panel
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Security monitoring for {user?.email}
            </p>
          </div>

          {pageLoading ? (
            <div className="p-12 text-center">
              <Loader size="xl" />
              <p className="mt-4 text-gray-600 font-medium">
                Loading admin data...
              </p>
            </div>
          ) : (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">

                <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-8 border border-white/50 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:-translate-y-2">
                  <div className="flex items-center">
                    <div className="p-3 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-2xl">
                      <Users className="w-8 h-8 text-white" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                        Total Users
                      </p>
                      <p className="text-3xl font-bold text-gray-900">
                        {stats?.total_users ?? 0}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-8 border border-white/50 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:-translate-y-2">
                  <div className="flex items-center">
                    <div className="p-3 bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl">
                      <Activity className="w-8 h-8 text-white" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                        Total Login Attempts
                      </p>
                      <p className="text-3xl font-bold text-gray-900">
                        {stats?.total_logins ?? 0}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-8 border border-white/50 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:-translate-y-2">
                  <div className="flex items-center">
                    <div className="p-3 bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-2xl">
                      <CheckCircle className="w-8 h-8 text-white" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                        Successful Logins
                      </p>
                      <p className="text-3xl font-bold text-emerald-500">
                        {stats?.successful_logins ?? 0}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-8 border border-white/50 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:-translate-y-2">
                  <div className="flex items-center">
                    <div className="p-3 bg-gradient-to-r from-red-500 to-red-600 rounded-2xl">
                      <XCircle className="w-8 h-8 text-white" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                        Failed Logins
                      </p>
                      <p className="text-3xl font-bold text-red-600">
                        {stats?.failed_logins ?? 0}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity Summary */}
              <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-8 border border-white/50 shadow-2xl mb-12">
                <div className="flex items-center mb-6">
                  <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl">
                    <Shield className="w-8 h-8 text-white" />
                  </div>
                  <div className="ml-4">
                    <h2 className="text-2xl font-bold text-gray-900">
                      Recent Activity Summary
                    </h2>
                    <p className="text-sm text-gray-600">
                      System-wide login analytics
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                    <p className="text-sm font-medium text-gray-600 uppercase tracking-wide mb-2">
                      Login Success Count
                    </p>
                    <p className="text-3xl font-bold text-emerald-600">
                      {stats?.successful_logins ?? 0}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                    <p className="text-sm font-medium text-gray-600 uppercase tracking-wide mb-2">
                      Login Failure Count
                    </p>
                    <p className="text-3xl font-bold text-red-600">
                      {stats?.failed_logins ?? 0}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                    <p className="text-sm font-medium text-gray-600 uppercase tracking-wide mb-2">
                      Success Rate
                    </p>
                    <p className="text-3xl font-bold text-gray-900">
                      {stats?.success_rate ?? 0}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Recent Security Events */}
              <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/50 shadow-2xl overflow-hidden mb-12">
                <div className="p-6 border-b border-gray-100">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                    <AlertTriangle className="w-6 h-6 mr-2 text-red-500" />
                    Recent Security Events
                  </h2>
                </div>

                <LoginActivityTable
                  records={securityEvents}
                  emptyTitle="No security events"
                  emptySubtitle="Failed login attempts will appear here"
                />
              </div>

              {/* Recent Login Activity (Global) */}
              <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/50 shadow-2xl overflow-hidden mb-12">
                <div className="p-6 border-b border-gray-100">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                    <Clock className="w-6 h-6 mr-2 text-indigo-600" />
                    Recent Login Activity
                  </h2>
                </div>

                <LoginActivityTable
                  records={loginHistory}
                  emptyTitle="No login activity yet"
                  emptySubtitle="Login events will appear here"
                />
              </div>

              {/* Recent Registrations */}
              <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/50 shadow-2xl overflow-hidden mb-12">
                <div className="p-6 border-b border-gray-100">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                    <UserPlus className="w-6 h-6 mr-2 text-indigo-600" />
                    Recent Registrations
                  </h2>
                </div>

                {registrations.length === 0 ? (
                  <div className="p-12 text-center text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium">No registrations yet</p>
                    <p className="text-sm">New user sign-ups will appear here</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Name
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Email
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Registration Date
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {registrations.map((record, index) => (
                          <tr
                            key={`${record.email}-${index}`}
                            className="hover:bg-gray-50/50 transition-colors bg-white"
                          >
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">
                              {record.name || 'N/A'}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {record.email || 'Unknown'}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {formatRegistrationDate(record.created_at)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

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

export default Admin;
