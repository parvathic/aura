import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet, AppState, AppStateStatus, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import TabNavigator from './src/navigation/TabNavigator';
import OnboardingScreen from './src/screens/OnboardingScreen';
import { getDatabase, getSetting } from './src/db/database';
import { rescheduleAllNotifications } from './src/engine/notificationScheduler';
import { colors } from './src/constants/theme';
import { onAppLockChanged, onAppReset, onDataRestored } from './src/state/appEvents';
import LockScreen, { PrivacyCover } from './src/components/security/LockScreen';
import { applyFilePrivacy } from './src/security/filePrivacy';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [dbReady, setDbReady] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  // App Lock: `locked` shows the Face ID screen; `covered` hides content in the app switcher
  const [lockEnabled, setLockEnabled] = useState(false);
  const [locked, setLocked] = useState(false);
  const [covered, setCovered] = useState(false);
  const lockEnabledRef = useRef(false);
  lockEnabledRef.current = lockEnabled;

  // Bumped after a restore so every screen remounts and reloads its data
  const [dataVersion, setDataVersion] = useState(0);

  // Load fonts
  const [fontsLoaded] = useFonts({
    'PlusJakartaSans-Regular': require('./assets/fonts/PlusJakartaSans-Regular.ttf'),
    'PlusJakartaSans-Medium': require('./assets/fonts/PlusJakartaSans-Medium.ttf'),
    'PlusJakartaSans-SemiBold': require('./assets/fonts/PlusJakartaSans-SemiBold.ttf'),
    'PlusJakartaSans-Bold': require('./assets/fonts/PlusJakartaSans-Bold.ttf'),
    'PlusJakartaSans-ExtraBold': require('./assets/fonts/PlusJakartaSans-ExtraBold.ttf'),
  });

  // Initialize database
  useEffect(() => {
    (async () => {
      try {
        await getDatabase();
        await applyFilePrivacy().catch((e) => console.error('[Aura] File privacy:', e));
        setDbReady(true);

        const [setting, lock] = await Promise.all([
          getSetting('onboarding_complete'),
          getSetting('app_lock_enabled'),
        ]);
        setOnboardingComplete(setting === '1');
        if (lock === '1') {
          setLockEnabled(true);
          setLocked(true);
        }
      } catch (e) {
        console.error('[Aura] Database failed to open:', e);
        setDbReady(true);
      } finally {
        setCheckingOnboarding(false);
      }
    })();
  }, []);

  // Settings > Reset App wipes the database (including the lock setting) and returns to onboarding
  useEffect(
    () =>
      onAppReset(() => {
        setOnboardingComplete(false);
        setLockEnabled(false);
      }),
    [],
  );

  useEffect(() => onAppLockChanged(setLockEnabled), []);

  // After restoring a backup, re-read onboarding state and reload every screen
  useEffect(
    () =>
      onDataRestored(async () => {
        setOnboardingComplete((await getSetting('onboarding_complete')) === '1');
        setDataVersion((v) => v + 1);
        rescheduleAllNotifications().catch(console.error);
      }),
    [],
  );

  // Lock when Aura goes to the background; hide content while it's in the app switcher
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background' && lockEnabledRef.current) setLocked(true);
      setCovered(state !== 'active');
    });
    return () => subscription.remove();
  }, []);

  // Reschedule notifications when app comes to foreground
  useEffect(() => {
    if (Platform.OS === 'web') return; // No real notifications on web
    const handleAppStateChange = (state: AppStateStatus) => {
      if (state === 'active' && onboardingComplete) {
        rescheduleAllNotifications().catch(console.error);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [onboardingComplete]);

  // Hide splash screen when ready
  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded && dbReady && !checkingOnboarding) {
      await SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, dbReady, checkingOnboarding]);

  if (!fontsLoaded || !dbReady || checkingOnboarding) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.secondary} />
      </View>
    );
  }

  const handleOnboardingComplete = () => {
    setOnboardingComplete(true);
    if (Platform.OS !== 'web') {
      rescheduleAllNotifications().catch(console.error);
    }
  };

  return (
    <SafeAreaProvider>
      <View style={styles.container} onLayout={onLayoutRootView}>
        <StatusBar style="dark" />
        {onboardingComplete ? (
          <NavigationContainer key={dataVersion}>
            <TabNavigator />
          </NavigationContainer>
        ) : (
          <OnboardingScreen key={dataVersion} onComplete={handleOnboardingComplete} />
        )}
        {locked ? (
          <LockScreen onUnlock={() => setLocked(false)} />
        ) : covered ? (
          <PrivacyCover />
        ) : null}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
