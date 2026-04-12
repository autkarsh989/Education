// Contest (Test) API utilities for React Native
import axios from 'axios';
import Constants from 'expo-constants';
import storage from './storage';
import { apiLogger } from './config';

const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:8000';

const buildError = (error, fallbackMessage) => {
  const detail =
    error?.response?.data?.detail ||
    error?.message ||
    fallbackMessage;
  return new Error(detail);
};

const getAuthHeaders = async () => {
  const token = await storage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export async function getContestQuestions(count = 5) {
  const endpoint = '/contest/questions';
  try {
    const headers = await getAuthHeaders();
    const res = await axios.get(`${API_BASE_URL}${endpoint}`, {
      headers,
      params: { count },
    });
    apiLogger(endpoint, 'GET', res.data);
    return res.data;
  } catch (error) {
    apiLogger(endpoint, 'GET', null, error);
    throw buildError(error, 'Failed to load test questions');
  }
}

export async function submitContestAnswers(payload) {
  const endpoint = '/contest/submit';
  try {
    const headers = await getAuthHeaders();
    const res = await axios.post(`${API_BASE_URL}${endpoint}`, payload, { headers });
    apiLogger(endpoint, 'POST', res.data);
    return res.data;
  } catch (error) {
    apiLogger(endpoint, 'POST', null, error);
    throw buildError(error, 'Failed to submit test');
  }
}

export async function getContestResult(attemptId) {
  const endpoint = `/contest/result/${attemptId}`;
  try {
    const headers = await getAuthHeaders();
    const res = await axios.get(`${API_BASE_URL}${endpoint}`, { headers });
    apiLogger(endpoint, 'GET', res.data);
    return res.data;
  } catch (error) {
    apiLogger(endpoint, 'GET', null, error);
    throw buildError(error, 'Failed to load test result');
  }
}

export async function getContestLeaderboard() {
  const endpoint = '/contest/leaderboard';
  try {
    const headers = await getAuthHeaders();
    const res = await axios.get(`${API_BASE_URL}${endpoint}`, { headers });
    apiLogger(endpoint, 'GET', res.data);
    return res.data;
  } catch (error) {
    apiLogger(endpoint, 'GET', null, error);
    throw buildError(error, 'Failed to load leaderboard');
  }
}
