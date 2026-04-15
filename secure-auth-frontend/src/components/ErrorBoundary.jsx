import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRefresh = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100 py-12 px-4">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-8 text-center">
              <div className="mx-auto w-24 h-24 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl">
                <AlertCircle className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Oops! Something went wrong</h2>
              <p className="text-gray-600 mb-8 max-w-sm mx-auto">
                We're sorry, an unexpected error occurred. Please try refreshing the page.
              </p>
              <div className="space-y-3">
                <button
                  onClick={this.handleRefresh}
                  className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                >
                  Refresh Page
                </button>
                <Link
                  to="/login"
                  className="block w-full text-center text-red-600 hover:text-red-700 font-medium py-3 px-6 border border-red-200 rounded-xl hover:bg-red-50 transition-all duration-200"
                >
                  Go to Login
                </Link>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

