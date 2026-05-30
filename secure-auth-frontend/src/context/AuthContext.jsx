import React, { createContext, useContext, useEffect, useReducer } from "react";
import api, { authAPI } from "../services/api";
import { API_ENDPOINTS } from "../utils/constants";

const AuthContext = createContext();

const initialState = {
  user: null,
  is_admin: false,
  isAuthenticated: false,
  loading: true,
};

const reducer = (state, action) => {
  switch (action.type) {
    case "SET_USER":
      return {
        ...state,
        user: action.payload.user,
        is_admin: action.payload.is_admin === true,
        isAuthenticated: true,
        loading: false,
      };

    case "LOGOUT":
      return {
        user: null,
        is_admin: false,
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
        dispatch({ type: "SET_USER", payload: res.data });
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
      const res = await authAPI.login({
        ...credentials,
        email: credentials.email?.trim().toLowerCase(),
      });

      if (res.status === 200 && res.data.success) {
        const meRes = await api.get(API_ENDPOINTS.me);
        dispatch({ type: "SET_USER", payload: meRes.data });
        return {
          success: true,
          is_admin: meRes.data.is_admin === true,
        };
      }

      dispatch({ type: "LOGOUT" });
      return {
        success: false,
        message: res.data?.message || "Login failed",
        security_token: res.data?.security_token,
      };
    } catch (error) {
      dispatch({ type: "LOGOUT" });
      return {
        success: false,
        message: error.response?.data?.message || "Login failed",
        security_token: error.response?.data?.security_token,
      };
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
        is_admin: state.is_admin,
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