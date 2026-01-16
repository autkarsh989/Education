// ParentContext adapted from web app for React Native
import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  registerParent,
  loginParent,
  fetchParentStats,
  sendParentFeedback,
  getParentToken,
  clearParentToken,
} from '../utils/parentApi';

export const ParentContext = createContext();

export function useParent() {
  return useContext(ParentContext);
}

export function ParentProvider({ children }) {
  const [parent, setParent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    initializeParent();
  }, []);

  const initializeParent = async () => {
    try {
      const token = await getParentToken();
      if (token) {
        const statsData = await fetchParentStats(token);
        if (statsData) {
          setParent({
            authenticated: true,
            student_username: statsData.child?.username,
          });
          setStats(statsData);
        }
      }
    } catch (error) {
      console.error('Token validation failed:', error);
      await clearParentToken();
      setParent(null);
    } finally {
      setLoading(false);
    }
  };

  const register = async (parentData) => {
    try {
      const data = await registerParent(parentData);
      return { success: true, data };
    } catch (err) {
      return { success: false, message: err.message || 'Registration failed' };
    }
  };

  const login = async (username, password) => {
    try {
      const data = await loginParent({ username, password });

      if (data.access_token) {
        const statsData = await fetchParentStats(data.access_token);
        
        setParent({
          authenticated: true,
          username,
          student_username: statsData.child?.username,
        });
        setStats(statsData);
      }

      return { success: true };
    } catch (err) {
      return { success: false, message: err.message || 'Login failed' };
    }
  };

  const logout = async () => {
    await clearParentToken();
    setParent(null);
    setStats(null);
  };

  const fetchStats = async () => {
    const token = await getParentToken();
    if (!token) {
      console.log('[ParentContext] No token found');
      return { success: false, message: 'Not authenticated' };
    }

    setStatsLoading(true);
    try {
      console.log('[ParentContext] Fetching stats...');
      const statsData = await fetchParentStats(token);
      console.log('[ParentContext] Stats received:', JSON.stringify(statsData, null, 2));
      setStats(statsData);
      return { success: true, data: statsData };
    } catch (err) {
      console.error('[ParentContext] Error fetching stats:', err);
      if (err.message?.includes('Session expired') || err.message?.includes('401')) {
        await logout();
        return { success: false, message: 'Session expired. Please login again.', expired: true };
      }
      return { success: false, message: err.message || 'Failed to fetch stats' };
    } finally {
      setStatsLoading(false);
    }
  };

  const sendFeedback = async (message) => {
    const token = await getParentToken();
    if (!token) {
      return { success: false, message: 'Not authenticated' };
    }

    try {
      const response = await sendParentFeedback(message, token);
      return { success: true, data: response };
    } catch (err) {
      if (err.message?.includes('Session expired') || err.message?.includes('401')) {
        await logout();
        return { success: false, message: 'Session expired. Please login again.', expired: true };
      }
      return { success: false, message: err.message || 'Failed to send feedback' };
    }
  };

  return (
    <ParentContext.Provider
      value={{
        parent,
        loading,
        stats,
        statsLoading,
        register,
        login,
        logout,
        fetchStats,
        sendFeedback,
      }}
    >
      {children}
    </ParentContext.Provider>
  );
}
