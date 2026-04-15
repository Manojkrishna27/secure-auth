import { useState, useCallback } from 'react';
import { showError } from '../components/ToastProvider';

export const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(async (apiCall, onSuccess = null) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiCall();
      if (onSuccess) onSuccess(response.data);
      return response.data;
    } catch (err) {
      setError(err.message || 'API call failed');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return {
    loading,
    error,
    execute,
    clearError
  };
};

