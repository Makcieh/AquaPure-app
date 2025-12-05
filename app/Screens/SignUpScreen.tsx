import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator } from 'react-native';

// --- Firebase Imports ---
import { router } from 'expo-router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getFirestore } from 'firebase/firestore'; // Added Firestore imports
import { ref, set, getDatabase } from 'firebase/database'; // Added Realtime DB imports
import { auth } from '../../firebaseConfig'; 

// Initialize DB instances (If you exported them in firebaseConfig, import them from there instead)
const db = getFirestore();
const rtdb = getDatabase();

const SignUpScreen = () => { 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // New state to show a spinner while creating database entries
  const [isLoading, setIsLoading] = useState(false); 

  const handleSignUp = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match.");
      return;
    }
    if (password.length < 6) { 
      Alert.alert("Error", "Password should be at least 6 characters long.");
      return;
    }

    setIsLoading(true); // Start loading

    try {
      // 1. Create User in Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Prepare User Data
      const userData = {
        uid: user.uid,
        email: user.email,
        createdAt: serverTimestamp(),
        username: email.split('@')[0], // Default username based on email
        role: 'user', // Default role
        // Add any other default fields your Profile screen expects here
      };

      // 3. Write to Firestore (Essential for your Profile Screen)
      // We use .setDoc with user.uid so the Document ID matches the Auth ID
      await setDoc(doc(db, "users", user.uid), userData);

      // 4. Write to Realtime Database (Optional, but good for redundancy if you use it)
      await set(ref(rtdb, 'users/' + user.uid), {
        email: user.email,
        username: email.split('@')[0],
      });

      console.log('User account created & database initialized!', user.email);
      Alert.alert("Success", "Account created successfully! Please log in.");
      
      // Navigate back to login
      router.push('/Screens/LoginScreen'); 

    } catch (error) {
      let errorMessage = "An unknown error occurred.";
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "That email address is already in use!";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "That email address is invalid!";
      }
      Alert.alert("Sign Up Error", errorMessage);
      console.error(error);
    } finally {
      setIsLoading(false); // Stop loading
    }
  };

  return (
    <LinearGradient
      colors={['#E0F2F7', '#B3E0F2']} 
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Sign Up</Text>

        {/* Email Input */}
        <View style={styles.inputContainer}>
          <MaterialCommunityIcons name="email-outline" size={24} color="#666" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#999"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* Password Input */}
        <View style={styles.inputContainer}>
          <Feather name="lock" size={20} color="#888" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#888"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Feather
              name={showPassword ? 'eye-off' : 'eye'}
              size={20}
              color="#888"
            />
          </TouchableOpacity>
        </View>

        {/* Confirm Password Input */}
        <View style={styles.inputContainer}>
          <Feather name="lock" size={20} color="#888" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            placeholderTextColor="#888"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
          />
          <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
            <Feather
              name={showConfirmPassword ? 'eye-off' : 'eye'}
              size={20}
              color="#888"
            />
          </TouchableOpacity>
        </View>


        {/* Sign Up Button with Loading State */}
        <TouchableOpacity 
            style={[styles.loginButton, isLoading && { opacity: 0.7 }]} 
            onPress={handleSignUp}
            disabled={isLoading}
        >
          {isLoading ? (
             <ActivityIndicator color="#fff" />
          ) : (
             <Text style={styles.loginButtonText}>SIGN UP</Text>
          )}
        </TouchableOpacity>

      <View style={styles.signupPrompt}>
          <Text style={styles.signupText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/Screens/LoginScreen')}>
            <Text style={styles.signupLink}>Login here</Text>
          </TouchableOpacity>
        </View>

      </View>
    </LinearGradient>
  );
};

// ... Styles remain exactly the same as your previous code ...
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '85%',
    maxWidth: 400,
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)', 
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 30,
    alignSelf: 'flex-start',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 20,
    height: 50,
    borderColor: '#E0F2F7',
    borderWidth: 1,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  passwordVisibilityToggle: {
    padding: 5,
  },
  loginButton: { 
    backgroundColor: '#90CAF9',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10, 
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  signupPrompt: { 
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupText: {
    color: '#666',
    fontSize: 14,
  },
  signupLink: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default SignUpScreen;