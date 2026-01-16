// ParentDashboardScreen for React Native
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogOut, RefreshCw, User } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useParent } from '../../contexts/ParentContext';
import colors from '../../styles/colors';

export default function ParentDashboardScreen() {
  const navigation = useNavigation();
  const { parent, stats, statsLoading, fetchStats, logout } = useParent();

  useEffect(() => {
    fetchStats();
  }, []);

  const handleLogout = async () => {
    await logout();
  };

  return (
    <LinearGradient colors={colors.gradients.main} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Parent Dashboard</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconButton} onPress={fetchStats}>
              <RefreshCw size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('ParentProfile')}>
              <User size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={handleLogout}>
              <LogOut size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {statsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FFFFFF" />
              <Text style={styles.loadingText}>Loading stats...</Text>
            </View>
          ) : stats ? (
            <>
              {/* Child Info Card */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>👧 Child's Progress</Text>
                <Text style={styles.childName}>{stats.child?.name || stats.child?.username || 'Student'}</Text>
                <Text style={styles.childInfo}>
                  {stats.child?.class_level || `Level ${stats.child?.level || 1}`}
                </Text>
              </View>

              {/* Stats Cards */}
              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{stats.child?.total_attempts || 0}</Text>
                  <Text style={styles.statLabel}>Problems Solved</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{Math.round((stats.child?.accuracy || 0) * 100)}%</Text>
                  <Text style={styles.statLabel}>Accuracy</Text>
                </View>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{stats.child?.current_streak || 0}</Text>
                  <Text style={styles.statLabel}>Day Streak 🔥</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{typeof stats.child?.score === 'number' ? stats.child.score.toFixed(1) : '0.0'}</Text>
                  <Text style={styles.statLabel}>Score</Text>
                </View>
              </View>

              {/* Comparison Card */}
              {stats.comparison && (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>📊 Class Comparison</Text>
                  <Text style={styles.activityText}>
                    Rank: {stats.comparison.rank || 'N/A'} of {stats.comparison.class_count || 0} students
                  </Text>
                  <Text style={styles.activityText}>
                    Percentile: {typeof stats.comparison.percentile === 'number' ? stats.comparison.percentile.toFixed(1) : '0.0'}%
                  </Text>
                  <Text style={styles.activityText}>
                    Class Average: {typeof stats.comparison.avg_score === 'number' ? stats.comparison.avg_score.toFixed(1) : '0.0'}
                  </Text>
                  <Text style={styles.activityText}>
                    Top Score: {typeof stats.comparison.top_score === 'number' ? stats.comparison.top_score.toFixed(1) : '0.0'}
                  </Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No stats available</Text>
              <TouchableOpacity style={styles.retryButton} onPress={fetchStats}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF' },
  headerActions: { flexDirection: 'row', gap: 12 },
  iconButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
  },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16 },
  loadingContainer: { alignItems: 'center', padding: 40 },
  loadingText: { color: '#FFFFFF', marginTop: 12 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: { fontSize: 18, fontWeight: '600', color: '#FFFFFF', marginBottom: 12 },
  childName: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF' },
  childInfo: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: { fontSize: 28, fontWeight: 'bold', color: '#FFFFFF' },
  statLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  activityText: { fontSize: 14, color: 'rgba(255,255,255,0.8)', lineHeight: 20 },
  emptyContainer: { alignItems: 'center', padding: 40 },
  emptyText: { color: 'rgba(255,255,255,0.7)', fontSize: 16 },
  retryButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
  },
  retryText: { color: '#FFFFFF', fontWeight: '600' },
});
