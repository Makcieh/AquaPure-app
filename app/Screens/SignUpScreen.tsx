import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

// --- Type Imports ---

// --- Firebase Imports ---
import { router } from 'expo-router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebaseConfig';


// Define the screens and their params in your navigation stack
// type RootStackParamList = {
//   Login: undefined;
//   SignUp: undefined; // No params expected for SignUp
// };
// --- Use the full file paths for route names ---

// Define the type for the SignUpScreen's props
// type Props = NativeStackScreenProps<RootStackParamList, 'SignUp'>;

const SignUpScreen = () => { // <-- Apply the type here
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSignUp = () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match.");
      return;
    }
    if (password.length < 6) { // Firebase requires at least 6 characters for password
      Alert.alert("Error", "Password should be at least 6 characters long.");
      return;
    }

    createUserWithEmailAndPassword(auth, email, password)
      .then(userCredentials => {
        const user = userCredentials.user;
        console.log('User account created & signed in!', user.email);
        Alert.alert("Success", "Account created successfully! Please log in.");
       router.push('/Screens/SignUpScreen'); // Navigate back to login after successful signup
      })
      .catch(error => {
        let errorMessage = "An unknown error occurred.";
        if (error.code === 'auth/email-already-in-use') {
          errorMessage = "That email address is already in use!";
        } else if (error.code === 'auth/invalid-email') {
          errorMessage = "That email address is invalid!";
        }
        Alert.alert("Sign Up Error", errorMessage);
        console.error(error);
      });
  };

  return (
    <LinearGradient
      colors={['#E0F2F7', '#B3E0F2']} // Light blue gradient
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


        {/* Sign Up Button */}
        <TouchableOpacity style={styles.loginButton} onPress={handleSignUp}>
          <Text style={styles.loginButtonText}>SIGN UP</Text>
        </TouchableOpacity>

      <View style={styles.signupPrompt}>
          <Text style={styles.signupText}>Already have an account? </Text>
           {/* --- NEW: Use router.push() to navigate --- */}
          <TouchableOpacity onPress={() => router.push('/Screens/LoginScreen')}>
            <Text style={styles.signupLink}>Login here</Text>
          </TouchableOpacity>
        </View>

      </View>
    </LinearGradient>
  );
};

// Re-use the same styles object for consistency
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
  // No forgot password for signup
  loginButton: { // Renamed from signupButton for consistency in styling, but functionally it's for signup
    backgroundColor: '#90CAF9',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10, // Added margin top for a bit of space
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  signupPrompt: { // Renamed from loginPrompt for consistency
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