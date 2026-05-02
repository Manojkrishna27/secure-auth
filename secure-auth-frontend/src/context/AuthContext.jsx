import React, { createContext, useContext, useEffect, useReducer } from "react";
import api from "../services/api";
import { API_ENDPOINTS } from "../utils/constants";

const AuthContext = createContext();

const initialState = {
  user: null,
  isAuthenticated: false,
  loading: true,
};

const reducer = (state, action) => {
  switch (action.type) {
    case "SET_USER":
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        loading: false,
      };

    case "LOGOUT":
      return {
        user: null,
        isAuthenticated: false,
        loading: false,
      };

    case "SET_LOADING":
      return {
        ...state,
        loading: true,
      };

    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  // 🔁 Check session on load
  useEffect(() => {
    const checkAuth = async () => {
      dispatch({ type: "SET_LOADING" });
      try {
        const res = await api.get(API_ENDPOINTS.me);
        dispatch({ type: "SET_USER", payload: res.data.user });
      } catch {
        dispatch({ type: "LOGOUT" });
      }
    };

    checkAuth();
  }, []);

  // 🔐 LOGIN FUNCTION
  const login = async (credentials) => {
    dispatch({ type: "SET_LOADING" });
    try {
      const res = await api.post(API_ENDPOINTS.login, credentials);

      if (res.data.success) {
        dispatch({ type: "SET_USER", payload: res.data.user });
        return { success: true };
      }

      return { success: false, message: res.data.message };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Login failed' };
    }
  };

  // 🔓 LOGOUT FUNCTION
  const logout = async () => {
    try {
      await api.post(API_ENDPOINTS.logout || '/logout');
    } catch (e) {
      // Ignore logout errors
    } finally {
      dispatch({ type: "LOGOUT" });
    }
  };

  // ✅ RETURN (ONLY UI HERE)
  return (
    <AuthContext.Provider
      value={{
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        loading: state.loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);