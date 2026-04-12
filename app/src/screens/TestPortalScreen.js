// Test Portal screen for React Native
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Trophy, Clock3, RefreshCcw, Send, Medal } from 'lucide-react-native';

import { useUser } from '../contexts/UserContext';
import {
  getContestLeaderboard,
  getContestQuestions,
  submitContestAnswers,
} from '../utils/contestApi';
import colors from '../styles/colors';

const QUESTION_COUNT = 5;

const formatTime = (seconds) => {
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const remainingSeconds = total % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
};

const formatClassLabel = (value) => {
  if (!value) return 'Class -';
  const raw = String(value);
  if (raw.startsWith('class_')) {
    return `Class ${raw.replace('class_', '')}`;
  }
  return `Class ${raw}`;
};

export default function TestPortalScreen() {
  const { user, loading: userLoading } = useUser();
  const [contest, setContest] = useState(null);
  const [leaderboard, setLeaderboard] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isTestStarted, setIsTestStarted] = useState(false);
  const timerRef = useRef(null);

  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startTimer = () => {
    clearTimer();
    const startedAt = Date.now();
    timerRef.current = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
  };

  const loadLeaderboard = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const data = await getContestLeaderboard();
      setLeaderboard(data);
      setContest(null);
      setAnswers({});
      setResult(null);
      setElapsedSeconds(0);
      setIsTestStarted(false);
      clearTimer();
    } catch (err) {
      setError(err.message || 'Failed to load leaderboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const startTest = async () => {
    setLoading(true);
    setError('');
    try {
      const questionsData = await getContestQuestions(QUESTION_COUNT);
      setContest(questionsData);
      setAnswers({});
      setResult(null);
      setElapsedSeconds(0);
      setIsTestStarted(true);
      startTimer();
    } catch (err) {
      setError(err.message || 'Failed to load test questions');
      setIsTestStarted(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }

    loadLeaderboard();

    return () => clearTimer();
  }, [user, userLoading]);

  useEffect(() => () => clearTimer(), []);

  const handleSelect = (questionId, option) => {
    setAnswers((prev) => ({
      ...prev,
      [String(questionId)]: option,
    }));
  };

  const handleSubmit = async () => {
    if (!contest) return;

    setSubmitting(true);
    setError('');

    try {
      const submission = await submitContestAnswers({
        contest_id: contest.contest_id,
        answers,
        time_taken: elapsedSeconds,
      });

      setResult(submission);
      setLeaderboard({
        class_level: submission.class_level,
        total_students: submission.leaderboard?.length || 0,
        student_username: submission.username,
        student_rank: submission.rank,
        top_score: submission.leaderboard?.[0]?.best_score || submission.score || 0,
        entries: submission.leaderboard || [],
      });
      clearTimer();
      setIsTestStarted(false);
    } catch (err) {
      setError(err.message || 'Failed to submit test');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = async () => {
    setRefreshing(true);
    await startTest();
    setRefreshing(false);
  };

  const handleLeaderboardRefresh = async () => {
    setRefreshing(true);
    try {
      const leaderboardData = await getContestLeaderboard();
      setLeaderboard(leaderboardData);
    } catch (err) {
      setError(err.message || 'Failed to refresh leaderboard');
    } finally {
      setRefreshing(false);
    }
  };

  if (userLoading || loading) {
    return (
      <LinearGradient colors={colors.gradients?.main || ['#6366F1', '#8B5CF6', '#A855F7']} style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingText}>Loading test portal...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (!user) {
    return (
      <LinearGradient colors={colors.gradients?.main || ['#6366F1', '#8B5CF6', '#A855F7']} style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Please sign in to take tests.</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const rankValue = typeof leaderboard?.student_rank === 'number' ? leaderboard.student_rank : null;
  const rankLabel = rankValue ? `#${rankValue}` : 'Unranked';
  const totalStudents = leaderboard?.total_students ?? 0;
  const topScore = leaderboard?.top_score ?? 0;
  const classLabel = formatClassLabel(contest?.class_level || user.class_level || user.level);

  return (
    <LinearGradient colors={colors.gradients?.main || ['#6366F1', '#8B5CF6', '#A855F7']} style={styles.container}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroCard}>
            <View style={styles.heroHeader}>
              <View style={styles.heroIcon}>
                <Trophy size={22} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.heroTitle}>Test Portal</Text>
                <Text style={styles.heroSubtitle}>Take your class test and track rank</Text>
              </View>
            </View>
            <View style={styles.heroMeta}>
              <View style={styles.metaBadge}>
                <Text style={styles.metaText}>{classLabel}</Text>
              </View>
              {isTestStarted && (
                <View style={styles.metaBadge}>
                  <Clock3 size={14} color="#F97316" />
                  <Text style={styles.metaText}>{formatTime(elapsedSeconds)}</Text>
                </View>
              )}
            </View>
          </View>

          {error ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {!isTestStarted && !result && (
            <View style={styles.rankCard}>
              <View style={styles.rankHeader}>
                <View style={styles.rankIcon}>
                  <Medal size={18} color="#F97316" />
                </View>
                <View>
                  <Text style={styles.rankTitle}>My Rank</Text>
                  <Text style={styles.rankSubtitle}>Latest class snapshot</Text>
                </View>
                <TouchableOpacity
                  onPress={handleLeaderboardRefresh}
                  disabled={refreshing}
                  style={styles.refreshButton}
                >
                  <RefreshCcw size={14} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <View style={styles.rankGrid}>
                <View style={styles.rankTile}>
                  <Text style={styles.rankLabel}>Rank</Text>
                  <Text style={styles.rankValue}>{rankLabel}</Text>
                </View>
                <View style={styles.rankTile}>
                  <Text style={styles.rankLabel}>Class Size</Text>
                  <Text style={styles.rankValue}>{totalStudents}</Text>
                </View>
                <View style={styles.rankTile}>
                  <Text style={styles.rankLabel}>Top Score</Text>
                  <Text style={styles.rankValue}>{topScore}%</Text>
                </View>
              </View>
            </View>
          )}

          {!isTestStarted && !result && (
            <View style={styles.leaderboardCard}>
              <View style={styles.leaderboardHeader}>
                <Text style={styles.sectionTitle}>Leaderboard</Text>
                <TouchableOpacity
                  onPress={handleLeaderboardRefresh}
                  disabled={refreshing}
                  style={styles.leaderboardRefresh}
                >
                  <RefreshCcw size={14} color="#FFFFFF" />
                  <Text style={styles.leaderboardRefreshText}>
                    {refreshing ? 'Refreshing' : 'Refresh'}
                  </Text>
                </TouchableOpacity>
              </View>

              {(leaderboard?.entries || []).length > 0 ? (
                leaderboard.entries.slice(0, 8).map((entry) => (
                  <View key={entry.username} style={[
                    styles.leaderboardRow,
                    entry.username === user.username && styles.leaderboardRowActive,
                  ]}>
                    <View style={styles.leaderboardLeft}>
                      <View style={styles.rankBadge}>
                        <Text style={styles.rankBadgeText}>{entry.rank}</Text>
                      </View>
                      <View style={styles.leaderboardNameWrap}>
                        <Text style={styles.leaderboardName} numberOfLines={1}>
                          {entry.name || entry.username}
                        </Text>
                        <Text style={styles.leaderboardClass}>{entry.class_level}</Text>
                      </View>
                    </View>
                    <Text style={styles.leaderboardScore}>{entry.best_score}%</Text>
                  </View>
                ))
              ) : (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>No leaderboard entries yet.</Text>
                </View>
              )}
            </View>
          )}

          {!isTestStarted && !result && (
            <TouchableOpacity style={styles.startButton} onPress={startTest} disabled={loading}>
              <Text style={styles.startButtonText}>{loading ? 'Starting...' : 'Start Test'}</Text>
            </TouchableOpacity>
          )}

          {isTestStarted && (
            <View style={styles.questionsCard}>
              <View style={styles.questionsHeader}>
                <Text style={styles.sectionTitle}>Questions</Text>
                <Text style={styles.questionsMeta}>{answeredCount}/{contest?.questions?.length || 0} answered</Text>
              </View>

              {(contest?.questions || []).map((question, index) => {
                const selected = answers[String(question.id)];
                return (
                  <View key={question.id} style={styles.questionBlock}>
                    <Text style={styles.questionLabel}>Question {index + 1}</Text>
                    <Text style={styles.questionText}>{question.question}</Text>
                    <View style={styles.optionsList}>
                      {question.options.map((option) => {
                        const active = selected === option;
                        return (
                          <TouchableOpacity
                            key={option}
                            onPress={() => handleSelect(question.id, option)}
                            style={[styles.optionButton, active && styles.optionButtonActive]}
                          >
                            <Text style={[styles.optionText, active && styles.optionTextActive]}>
                              {option}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {isTestStarted && (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.secondaryButton, refreshing && styles.buttonDisabled]}
                onPress={handleRetry}
                disabled={refreshing}
              >
                <RefreshCcw size={16} color="#FFFFFF" />
                <Text style={styles.secondaryButtonText}>New Test</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryButton, (submitting || answeredCount === 0) && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={submitting || answeredCount === 0}
              >
                <Send size={16} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>{submitting ? 'Submitting...' : 'Submit'}</Text>
              </TouchableOpacity>
            </View>
          )}

          {result && !isTestStarted && (
            <View style={styles.resultCard}>
              <Text style={styles.sectionTitle}>Your Result</Text>
              <View style={styles.resultRow}>
                <View style={styles.resultTile}>
                  <Text style={styles.resultLabel}>Score</Text>
                  <Text style={styles.resultValue}>{result.score}%</Text>
                </View>
                <View style={styles.resultTile}>
                  <Text style={styles.resultLabel}>Correct</Text>
                  <Text style={styles.resultValue}>{result.correct_count}/{result.total_questions}</Text>
                </View>
                <View style={styles.resultTile}>
                  <Text style={styles.resultLabel}>Rank</Text>
                  <Text style={styles.resultValue}>#{result.rank}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.startButton} onPress={handleRetry} disabled={refreshing}>
                <Text style={styles.startButtonText}>Start New Test</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 80 }} />
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: { padding: 12 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { color: '#FFFFFF', marginTop: 8 },
  heroCard: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
  },
  heroHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(249,115,22,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  heroSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  heroMeta: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  metaText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  errorCard: {
    backgroundColor: 'rgba(239,68,68,0.2)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  errorText: { color: '#FEE2E2', fontSize: 12 },
  rankCard: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
  },
  rankHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rankIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(249,115,22,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  rankSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 2 },
  refreshButton: {
    marginLeft: 'auto',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 12,
    padding: 8,
  },
  rankGrid: { flexDirection: 'row', gap: 10, marginTop: 12 },
  rankTile: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 14,
    padding: 10,
  },
  rankLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
  rankValue: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginTop: 4 },
  leaderboardCard: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
  },
  leaderboardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  leaderboardRefresh: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  leaderboardRefreshText: { color: '#FFFFFF', fontSize: 11 },
  leaderboardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  leaderboardRowActive: {
    backgroundColor: 'rgba(249,115,22,0.15)',
    borderRadius: 12,
    paddingHorizontal: 8,
  },
  leaderboardLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
  leaderboardNameWrap: { flex: 1 },
  leaderboardName: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  leaderboardClass: { color: 'rgba(255,255,255,0.6)', fontSize: 10, marginTop: 2 },
  leaderboardScore: { color: '#FFFFFF', fontWeight: '700' },
  emptyCard: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyText: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  startButton: {
    backgroundColor: '#F97316',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  startButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  questionsCard: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
  },
  questionsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  questionsMeta: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
  questionBlock: { marginBottom: 16 },
  questionLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, textTransform: 'uppercase' },
  questionText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', marginTop: 6 },
  optionsList: { marginTop: 10, gap: 8 },
  optionButton: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    padding: 12,
  },
  optionButtonActive: {
    backgroundColor: 'rgba(249,115,22,0.2)',
    borderColor: 'rgba(249,115,22,0.6)',
  },
  optionText: { color: '#FFFFFF', fontSize: 13 },
  optionTextActive: { color: '#FFFFFF', fontWeight: '700' },
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 14,
    paddingVertical: 12,
  },
  secondaryButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F97316',
    borderRadius: 14,
    paddingVertical: 12,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  buttonDisabled: { opacity: 0.6 },
  resultCard: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
  },
  resultRow: { flexDirection: 'row', gap: 10, marginTop: 12, marginBottom: 12 },
  resultTile: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 12,
    padding: 10,
  },
  resultLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
  resultValue: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', marginTop: 4 },
});
