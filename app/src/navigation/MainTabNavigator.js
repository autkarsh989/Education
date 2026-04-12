// Main Tab Navigator with bottom tabs
import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, MessageSquare, Compass, User, Trophy } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

import HomeScreen from '../screens/HomeScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ExploreScreen from '../screens/ExploreScreen';
import ProfileScreen from '../screens/ProfileScreen';
import TestPortalScreen from '../screens/TestPortalScreen';
import { useLanguage } from '../contexts/LanguageContext';
import { useUser } from '../contexts/UserContext';
import colors from '../styles/colors';
import { getContestLeaderboard } from '../utils/contestApi';

const Tab = createBottomTabNavigator();

function TabBarIcon({ focused, icon: Icon, label, badgeText }) {
  return (
    <View style={styles.tabItem}>
      {focused && (
        <View style={styles.activeIndicator} />
      )}
      <View style={styles.iconWrapper}>
        <Icon 
          size={24} 
          color={focused ? colors.primary.cyan : 'rgba(255,255,255,0.7)'} 
        />
        {badgeText ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badgeText}</Text>
          </View>
        ) : null}
      </View>
      <Text style={[
        styles.tabLabel,
        { color: focused ? colors.primary.cyan : 'rgba(255,255,255,0.7)' }
      ]}>
        {label}
      </Text>
    </View>
  );
}

export default function MainTabNavigator() {
  const { lang } = useLanguage();
  const { user, loading: userLoading } = useUser();
  const [contestRank, setContestRank] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadRank = async () => {
      if (userLoading) return;
      if (!user) {
        if (isMounted) setContestRank(null);
        return;
      }

      try {
        const data = await getContestLeaderboard();
        if (isMounted) {
          setContestRank(typeof data?.student_rank === 'number' ? data.student_rank : null);
        }
      } catch (error) {
        if (isMounted) setContestRank(null);
      }
    };

    loadRank();

    return () => {
      isMounted = false;
    };
  }, [user, userLoading]);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon 
              focused={focused} 
              icon={Home} 
              label={lang === 'hi' ? 'होम' : 'Home'} 
            />
          ),
        }}
      />
      <Tab.Screen 
        name="History" 
        component={HistoryScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon 
              focused={focused} 
              icon={MessageSquare} 
              label={lang === 'hi' ? 'चैट' : 'History'} 
            />
          ),
        }}
      />
      <Tab.Screen 
        name="Explore" 
        component={ExploreScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon 
              focused={focused} 
              icon={Compass} 
              label={lang === 'hi' ? 'खोजें' : 'Explore'} 
            />
          ),
        }}
      />
      <Tab.Screen 
        name="TestPortal" 
        component={TestPortalScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon 
              focused={focused} 
              icon={Trophy} 
              label={lang === 'hi' ? 'टेस्ट' : 'Test'}
              badgeText={contestRank ? `#${contestRank}` : null}
            />
          ),
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon 
              focused={focused} 
              icon={User} 
              label={lang === 'hi' ? 'प्रोफ़ाइल' : 'Profile'} 
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderTopWidth: 0,
    elevation: 0,
    height: 70,
    paddingBottom: 10,
    paddingTop: 10,
    position: 'absolute',
    borderRadius: 20,
    marginHorizontal: 10,
    marginBottom: 10,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  iconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -14,
    backgroundColor: '#F97316',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: '500',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -8,
    width: 32,
    height: 3,
    backgroundColor: colors.primary.cyan,
    borderRadius: 2,
  },
});
