import { Redirect } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

// Import onAuthStateChanged AND the User type
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../firebaseConfig';

const Index = () => {
  // Apply the fix here by adding <User | null>
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
    // ADD THIS LOG TO SEE IF THE LISTENER IS WORKING
    console.log('Auth state changed, user:', currentUser?.email);
    
    setUser(currentUser);
    setLoading(false);
  });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (user) {
    return <Redirect href="/Screens/HomeScreen" />;
  } else {
    return <Redirect href="/Screens/LoginScreen" />;
  }
};

export default Index;