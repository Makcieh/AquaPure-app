import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="Screens/LoginScreen" options={{ headerShown: false }} />
      <Stack.Screen name="Screens/SignUpScreen" options={{ headerShown: false }} />
      <Stack.Screen name="Screens/HomeScreen" options={{ headerShown: false }} />
      <Stack.Screen name="Screens/ProfileScreen" options={{ headerShown: false }} />
    </Stack>
  );
}