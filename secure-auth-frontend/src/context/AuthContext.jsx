import React, { createContext, useContext, useReducer } from 'react';

const AuthContext = createContext();

const initialState = {
  user: null,
  loading: false,
  isAuthenticated: false,
};

const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        loading: false,
      };

    case 'LOGOUT':
      return {
        ...initialState,
      };

    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // 🔐 MOCK LOGIN (NO BACKEND)
  const login = async (credentials) => {
    try {
      // fake delay (optional)
      await new Promise((res) => setTimeout(res, 500));

      // fake user
      const mockUser = {
        email: credentials.email,
        name: 'Demo User',
        createdAt: new Date().toISOString(),
      };

      dispatch({ type: 'LOGIN_SUCCESS', payload: mockUser });

      return { success: true };
    } catch (error) {
      return { success: false };
    }
  };

  // 🔓 MOCK LOGOUT
  const logout = async () => {
    dispatch({ type: 'LOGOUT' });
  };

  const value = {
    ...state,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};