import { AntDesign, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { signInWithEmailAndPassword } from 'firebase/auth';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth } from '../../firebaseConfig';

// --- NEW: Import the router ---
import { router } from 'expo-router';

const LoginScreen = () => { // <-- No more navigation prop
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

 const handleLogin = () => {
  console.log('Login button pressed. Email:', email, 'Password:', password); // <-- ADD THIS LINE

  if (!email || !password) {
    Alert.alert("Error", "Please enter both email and password.");
    return;
  }
    signInWithEmailAndPassword(auth, email, password)
      .then(userCredentials => {
        const user = userCredentials.user;
        console.log('Successfully logged in...');
        console.log('Logged in with:', user.email);
        // Firebase auth listener in App.js will handle navigation to Home
          router.replace('/Screens/HomeScreen');
      })
      .catch(error => {
        let errorMessage = "An unknown error occurred.";
        if (error.code === 'auth/invalid-email') {
          errorMessage = "That email address is invalid!";
        } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
          errorMessage = "Invalid email or password.";
        } else if (error.code === 'auth/too-many-requests') {
          errorMessage = "Too many failed login attempts. Please try again later.";
        }
        Alert.alert("Login Error", errorMessage);
        console.error(error);
      });
  };

  return (
    <LinearGradient
      colors={['#E0F2F7', '#B3E0F2']} // Light blue gradient
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Login</Text>

        {/* Username/Email Input */}
        <View style={styles.inputContainer}>
          <MaterialCommunityIcons name="email-outline" size={24} color="#666" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Username" // Using Username as per image, but functionally it's email
            placeholderTextColor="#999"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* Password Input */}
        <View style={styles.inputContainer}>
          <MaterialCommunityIcons name="lock-outline" size={24} color="#666" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#999"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.passwordVisibilityToggle}>
            <AntDesign name={showPassword ? "eye" : "eye-invisible"} size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Forgot Password */}
        <TouchableOpacity style={styles.forgotPasswordButton}>
          <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
        </TouchableOpacity>

        {/* Login Button */}
        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
          <Text style={styles.loginButtonText}>LOGIN</Text>
        </TouchableOpacity>

        {/* Don't have an account? Sign up here */}
         <View style={styles.signupPrompt}>
          <Text style={styles.signupText}>Don't have an account? </Text>
          {/* --- NEW: Use router.push() to navigate --- */}
          <TouchableOpacity onPress={() => router.push('/Screens/SignUpScreen')}>
            <Text style={styles.signupLink}>Sign up here</Text>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
};

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
    backgroundColor: 'rgba(255, 255, 255, 0.9)', // Slightly transparent white background for content
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
    alignSelf: 'flex-start', // Align to left
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
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: 30,
  },
  forgotPasswordText: {
    color: '#007AFF', // A standard blue for links
    fontSize: 14,
  },
  loginButton: {
    backgroundColor: '#90CAF9', // A light blue similar to the image
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 20,
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

export default LoginScreen;