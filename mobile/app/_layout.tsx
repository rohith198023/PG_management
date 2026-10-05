import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { View, ActivityIndicator } from 'react-native';
import { Colors } from '@/constants/colors';

function RootLayoutNav() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const isTenant = user?.role === 'TENANT';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      if (isTenant) {
        router.replace('/(resident-tabs)/dashboard' as any);
      } else {
        router.replace('/(tabs)/dashboard');
      }
    }
  }, [isAuthenticated, isLoading, segments, user]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg }}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(resident-tabs)" />
      <Stack.Screen name="screens/meals" />
      <Stack.Screen name="screens/complaints" />
      <Stack.Screen name="screens/payments" />
      <Stack.Screen name="screens/accounting" />
      <Stack.Screen name="screens/notifications" />
      <Stack.Screen name="screens/users" />
      <Stack.Screen name="settings/gateways" />
      <Stack.Screen name="settings/workspace" />
    </Stack>
  );
}


export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <RootLayoutNav />
    </AuthProvider>
  );
}
