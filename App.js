import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

// --- Import Firebase Auth ---
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebaseConfig'; // Adjust path if it's in the root

// --- Import Your Screens ---
import HomeScreen from './app/Screens/HomeScreen'; // Create this new screen
import LoginScreen from './app/Screens/LoginScreen'; // Adjust path to your LoginScreen
import SignUpScreen from './app/Screens/SignUpScreen'; // Adjust path to your SignUpScreen

const Stack = createNativeStackNavigator();

// Screens shown when the user is NOT logged in
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
    </Stack.Navigator>
  );
}

// Screens shown when the user IS logged in
function AppStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Home" component={HomeScreen} />
      {/* Add your other app screens here */}
    </Stack.Navigator>
  );
}

export default function App() {
  const [user, setUser] = useState(null); // The user object from Firebase
  const [initializing, setInitializing] = useState(true);

  // This is the logic you already have!
  // It listens for changes in the user's login state.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (initializing) {
        setInitializing(false);
      }
    });

    // Cleanup listener on unmount
    return unsubscribe;
  }, []);

  // Show a loading screen while Firebase is checking the auth state
  if (initializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // The main navigation logic
  return (
    <NavigationContainer>
      {user ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}