import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from 'react-native';

import DashboardScreen from '../screens/DashboardScreen';
import DailyLogScreen from '../screens/DailyLogScreen';
import RoutinesScreen from '../screens/RoutinesScreen';
import CycleInsightsScreen from '../screens/CycleInsightsScreen';
import ProfileStackNavigator from './ProfileStackNavigator';
import { colors, typography, borderRadius } from '../constants/theme';

const Tab = createBottomTabNavigator();

const TAB_ICONS: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  Home: 'home',
  Log: 'edit-calendar',
  Routines: 'calendar-today',
  Insights: 'analytics',
  Profile: 'person',
};

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle: styles.tabBar,
        tabBarBackground: () => (
          <BlurView
            intensity={80}
            tint="light"
            style={[StyleSheet.absoluteFill, styles.blurBg]}
          />
        ),
        tabBarIconStyle: styles.iconSlot,
        tabBarLabel: ({ focused }) => (
          <Text style={[styles.tabLabel, focused && styles.activeTabLabel]}>
            {route.name}
          </Text>
        ),
        tabBarIcon: ({ focused }) => {
          const iconName = TAB_ICONS[route.name] ?? 'circle';
          if (focused) {
            return (
              <LinearGradient
                colors={['#7345B6', '#B48A8F']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.activeTab}
              >
                <MaterialIcons name={iconName} size={20} color={colors.white} />
              </LinearGradient>
            );
          }
          return (
            <MaterialIcons name={iconName} size={22} color={colors.tabInactive} />
          );
        },
      })}
    >
      <Tab.Screen name="Home" component={DashboardScreen} />
      <Tab.Screen name="Log" component={DailyLogScreen} />
      <Tab.Screen name="Routines" component={RoutinesScreen} />
      <Tab.Screen name="Insights" component={CycleInsightsScreen} />
      <Tab.Screen name="Profile" component={ProfileStackNavigator} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    borderTopWidth: 0,
    elevation: 0,
    backgroundColor: 'transparent',
    height: Platform.OS === 'ios' ? 90 : 70,
    paddingTop: 8,
    borderTopLeftRadius: 48,
    borderTopRightRadius: 48,
    overflow: 'hidden',
  },
  blurBg: {
    borderTopLeftRadius: 48,
    borderTopRightRadius: 48,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  iconSlot: {
    width: 56,
    height: 30,
  },
  activeTab: {
    width: 56,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.full,
  },
  activeTabLabel: {
    color: colors.secondary,
  },
  tabLabel: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 11,
    color: colors.tabInactive,
    textTransform: 'uppercase',
    letterSpacing: 0.55,
    marginTop: 2,
  },
});
