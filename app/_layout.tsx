import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { JarvisProvider } from '@/state/JarvisContext';
import { useInAppDeepLinking } from '@/lib/deepLink';

export default function RootLayout() {
  useInAppDeepLinking();

  return (
    <SafeAreaProvider>
      <JarvisProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: '#070b13' },
            headerTintColor: '#22d3ee',
            headerTitleStyle: { color: '#f8fafc', fontWeight: '800' },
            contentStyle: { backgroundColor: '#050811' },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="pair" options={{ title: 'Emparelhar' }} />
          <Stack.Screen name="settings" options={{ title: 'Definições' }} />
          <Stack.Screen name="fitness" options={{ title: 'Apple Fitness' }} />
        </Stack>
      </JarvisProvider>
    </SafeAreaProvider>
  );
}