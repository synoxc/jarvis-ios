import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { JarvisProvider } from '@/state/JarvisContext';
import { theme } from '@/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <JarvisProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: theme.colors.bg },
            headerTintColor: theme.colors.text,
            headerTitleStyle: { color: theme.colors.text },
            contentStyle: { backgroundColor: theme.colors.bg },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="pair" options={{ title: 'Emparelhar' }} />
          <Stack.Screen name="settings" options={{ title: 'Definições' }} />
          <Stack.Screen name="fitness" options={{ title: 'Fitness' }} />
        </Stack>
      </JarvisProvider>
    </SafeAreaProvider>
  );
}
