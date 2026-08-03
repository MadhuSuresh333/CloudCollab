import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loginUser, registerUser, fetchCurrentUser } from '../services/authService.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // On mount (or whenever the token changes), verify it and load the profile.
  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }
      try {
        const { data } = await fetchCurrentUser();
        if (!cancelled) setUser(data.data);
      } catch {
        if (!cancelled) {
          setUser(null);
          setToken(null);
          localStorage.removeItem('token');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    hydrate();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const login = useCallback(async (email, password) => {
    setAuthError(null);
    try {
      const { data } = await loginUser({ email, password });
      const { token: authToken, ...userData } = data.data;
      localStorage.setItem('token', authToken);
      setToken(authToken);
      setUser(userData);
      return true;
    } catch (error) {
      setAuthError(error.response?.data?.message || 'Login failed. Please try again.');
      return false;
    }
  }, []);

  const register = useCallback(async (name, email, password) => {
    setAuthError(null);
    try {
      const { data } = await registerUser({ name, email, password });
      const { token: authToken, ...userData } = data.data;
      localStorage.setItem('token', authToken);
      setToken(authToken);
      setUser(userData);
      return true;
    } catch (error) {
      setAuthError(error.response?.data?.message || 'Registration failed. Please try again.');
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, token, loading, authError, login, register, logout, isAuthenticated: !!user }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
