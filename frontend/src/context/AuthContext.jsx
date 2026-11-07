import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loginUser, registerUser, getCurrentUser, getDemoCredentials, formatApiError } from '../services/api';

const AuthContext = createContext(null);

export { formatApiError };

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('blood_donor_token'));
  const [activeRole, setActiveRole] = useState(() => localStorage.getItem('blood_donor_role') || null);
  const [demoCredentials, setDemoCredentials] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Fetch demo credentials on boot for fast 1-click evaluation
  useEffect(() => {
    getDemoCredentials()
      .then((creds) => setDemoCredentials(creds))
      .catch((err) => console.warn('Could not load demo credentials:', err));
  }, []);

  // Restore authenticated session
  const verifySession = useCallback(async () => {
    const storedToken = localStorage.getItem('blood_donor_token');
    if (!storedToken) {
      setCurrentUser(null);
      setActiveRole(null);
      setIsLoading(false);
      return;
    }

    try {
      const user = await getCurrentUser();
      setCurrentUser(user);
      setActiveRole(user.role);
      localStorage.setItem('blood_donor_role', user.role);
    } catch (err) {
      console.warn('Session expired or invalid, clearing local storage:', err);
      localStorage.removeItem('blood_donor_token');
      localStorage.removeItem('blood_donor_role');
      setToken(null);
      setCurrentUser(null);
      setActiveRole(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    verifySession();
  }, [verifySession]);

  const [isDemoFallback, setIsDemoFallback] = useState(false);

  // Controlled Academic Demo Credentials Map
  const ACADEMIC_DEMO_ACCOUNTS = {
    'admin@bloodbank.org': {
      password: 'admin123',
      user: {
        id: 'admin-001',
        email: 'admin@bloodbank.org',
        name: 'Dr. Blood Bank Admin',
        role: 'admin',
        is_active: true,
      },
    },
    'donor@example.com': {
      password: 'donor123',
      user: {
        id: 'donor-001',
        email: 'donor@example.com',
        name: 'Dr. Aarav Patel',
        role: 'donor',
        donor_id: 'donor-001',
        blood_group: 'O+',
        phone: '+91 98450 11201',
        is_active: true,
      },
    },
    'user@example.com': {
      password: 'user123',
      user: {
        id: 'user-001',
        email: 'user@example.com',
        name: 'Siddharth Rao',
        role: 'user',
        blood_group: 'A+',
        phone: '+91 98111 22334',
        address: 'Indiranagar, Bengaluru',
        is_active: true,
      },
    },
  };

  // Login handler
  const login = async (email, password, expectedRole = null) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const res = await loginUser({ email, password, expected_role: expectedRole });
      localStorage.setItem('blood_donor_token', res.access_token);
      localStorage.setItem('blood_donor_role', res.user.role);
      setToken(res.access_token);
      setCurrentUser(res.user);
      setActiveRole(res.user.role);
      setIsDemoFallback(false);
      return res.user;
    } catch (err) {
      // Controlled Academic Demo Fallback (Only if backend connection is unavailable & matching exact demo credentials)
      const isNetworkError = !err.response || err.code === 'ERR_NETWORK' || err.message?.includes('Network Error');
      const demoAccount = ACADEMIC_DEMO_ACCOUNTS[email.trim().toLowerCase()];

      if (isNetworkError && demoAccount && demoAccount.password === password) {
        if (expectedRole && demoAccount.user.role !== expectedRole) {
          const roleMismatchMsg = `Role mismatch: this demo account belongs to ${demoAccount.user.role}.`;
          setAuthError(roleMismatchMsg);
          throw new Error(roleMismatchMsg);
        }

        const fallbackUser = demoAccount.user;
        const fallbackToken = `demo-fallback-token-${fallbackUser.role}`;
        localStorage.setItem('blood_donor_token', fallbackToken);
        localStorage.setItem('blood_donor_role', fallbackUser.role);
        setToken(fallbackToken);
        setCurrentUser(fallbackUser);
        setActiveRole(fallbackUser.role);
        setIsDemoFallback(true);
        return fallbackUser;
      }

      const defaultErr = isNetworkError
        ? 'Backend service offline. For presentation, use one of the 3 Academic Demo accounts.'
        : 'Authentication failed. Please check credentials.';
      const msg = formatApiError(err, defaultErr);
      const safeMsg = typeof msg === 'string' ? msg : String(msg);
      safeSetAuthError(safeMsg);
      throw new Error(safeMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // 1-Click quick login for demo and evaluation
  const loginWithDemo = async (role) => {
    const credMap = {
      admin: { email: 'admin@bloodbank.org', password: 'admin123', expected_role: 'admin' },
      donor: { email: 'donor@example.com', password: 'donor123', expected_role: 'donor' },
      user: { email: 'user@example.com', password: 'user123', expected_role: 'user' },
    };
    const cred = credMap[role];
    if (!cred) throw new Error(`Unknown role: ${role}`);
    return await login(cred.email, cred.password, cred.expected_role);
  };

  // Register handler
  const register = async (userData) => {
    setIsLoading(true);
    safeSetAuthError(null);
    try {
      const res = await registerUser(userData);
      localStorage.setItem('blood_donor_token', res.access_token);
      localStorage.setItem('blood_donor_role', res.user.role);
      setToken(res.access_token);
      setCurrentUser(res.user);
      setActiveRole(res.user.role);
      setIsDemoFallback(false);
      return res.user;
    } catch (err) {
      const msg = formatApiError(err, 'Registration failed. Check connection and fields.');
      const safeMsg = typeof msg === 'string' ? msg : String(msg);
      safeSetAuthError(safeMsg);
      throw new Error(safeMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Safe setter that guarantees authError is always a primitive string or null
  const safeSetAuthError = (err) => {
    if (!err) {
      setAuthError(null);
    } else if (typeof err === 'string') {
      setAuthError(err);
    } else {
      setAuthError(formatApiError(err));
    }
  };

  // Logout handler - only exit to Auth Gateway
  const logout = () => {
    localStorage.removeItem('blood_donor_token');
    localStorage.removeItem('blood_donor_role');
    setToken(null);
    setCurrentUser(null);
    setActiveRole(null);
    safeSetAuthError(null);
    setIsDemoFallback(false);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        token,
        activeRole,
        demoCredentials,
        isLoading,
        authError,
        isDemoFallback,
        setAuthError: safeSetAuthError,
        login,
        loginWithDemo,
        register,
        logout,
        refreshSession: verifySession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
