import { Feather, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, limit, onSnapshot, query, setDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Platform, 
    StatusBar 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// Ensure these are correctly exported from your config file
import { auth, db, storage } from '../../firebaseConfig';

const ProfileScreen = () => {
    const router = useRouter();
    
    const [profileImage, setProfileImage] = useState(null);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [user, setUser] = useState(auth.currentUser);
    const [hasNotificationHistory, setHasNotificationHistory] = useState(false);

    // 1. Listen for Auth State Changes (in case of logout/login)
    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribeAuth();
    }, []);

    // 2. Fetch User Data from Firestore
    useEffect(() => {
        if (user) {
            setLoading(true);
            const userDocRef = doc(db, 'users', user.uid);
            
            // Listen to the user's specific document
            const unsubUser = onSnapshot(userDocRef, (docSnap) => {
                if (docSnap.exists()) {
                    const userData = docSnap.data();
                    setName(userData.username || userData.name || ''); // Handles 'username' from signup or 'name' from profile
                    setEmail(userData.email || '');
                    setPhone(userData.phone || '');
                    setProfileImage(userData.profileImageUrl || 'https://placehold.co/200x200/E0E7FF/3B6EF6?text=User');
                } else {
                     // If doc doesn't exist yet (legacy users), provide defaults
                     setProfileImage('https://placehold.co/200x200/E0E7FF/3B6EF6?text=User');
                }
                setLoading(false);
            }, (error) => {
                console.error("Error fetching user doc:", error);
                setLoading(false);
            });

            // Check for notifications (Optional feature)
            const notifsRef = collection(db, 'users', user.uid, 'notifications');
            const q = query(notifsRef, limit(1));
            const unsubNotifs = onSnapshot(q, (snapshot) => {
                 setHasNotificationHistory(!snapshot.empty);
            });

            return () => {
                unsubUser();
                unsubNotifs();
            };
        } else {
            setLoading(false);
        }
    }, [user]);
    
    // 3. Pick Image Function
    const handleChoosePhoto = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaType.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        // Modern Expo Image Picker uses assets array
        if (!result.canceled && result.assets && result.assets.length > 0) {
            const uri = result.assets[0].uri;
            setProfileImage(uri); // Show immediately for better UX
            await uploadProfileImage(uri);
        }
    };
const uploadProfileImage = async (uri) => {
        if (!user) return;
        console.log(">>> STARTING UPLOAD WITH NEW CODE <<<"); // Add this line!
        setUploading(true);

        try {
            // 1. Convert URI to Blob using XMLHttpRequest (More stable than fetch)
            const blob = await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.onload = function () {
                    resolve(xhr.response);
                };
                xhr.onerror = function (e) {
                    console.log(e);
                    reject(new TypeError("Network request failed"));
                };
                xhr.responseType = "blob";
                xhr.open("GET", uri, true);
                xhr.send(null);
            });

            // 2. Create Reference
            const storageRef = ref(storage, `profile-pictures/${user.uid}`);
            
            // 3. Upload
            await uploadBytes(storageRef, blob);
            
            // 4. Get URL
            const downloadURL = await getDownloadURL(storageRef);

            // 5. Save to Firestore
            const userDocRef = doc(db, 'users', user.uid);
            await setDoc(userDocRef, { profileImageUrl: downloadURL }, { merge: true });
            
            // 6. Close the blob to free memory
            blob.close();

            Alert.alert('Success', 'Profile picture updated!');

        } catch (error) {
            console.error("Error uploading image: ", error);
            Alert.alert('Upload Error', 'Failed to upload profile picture.');
        } finally {
            setUploading(false);
        }
    };

    // 5. Save Text Changes
    const handleSaveChanges = async () => {
        if (!user) {
            Alert.alert('Not Logged In', 'You must be logged in to save changes.');
            return;
        }

        try {
            const userDocRef = doc(db, 'users', user.uid);
            // We use 'username' or 'name' depending on what your app prefers. 
            // This saves 'name' to match the TextInput state.
            await setDoc(userDocRef, { name, email, phone }, { merge: true });
            setIsEditing(false);
            Alert.alert('Success', 'Profile details have been saved!');
        } catch (error) {
            console.error("Error saving profile: ", error);
            Alert.alert('Save Error', 'Failed to save profile details. Please try again.');
        }
    };
    
    const handleLogout = () => {
        auth.signOut()
            .then(() => {
                router.replace('/Screens/LoginScreen'); 
            })
            .catch(error => console.error("Logout Error:", error));
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <ActivityIndicator style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} size="large" color="#3B6EF6" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Profile</Text>
                    <View style={{ width: 24 }} />
                </View>

                <View style={styles.profileContainer}>
                    <View style={styles.imageWrapper}>
                        {profileImage && <Image
                            source={{ uri: profileImage }}
                            style={styles.profileImage}
                        />}
                        <TouchableOpacity style={styles.cameraButton} onPress={handleChoosePhoto} disabled={uploading}>
                            {uploading ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="camera" size={20} color="#fff" />}
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.detailsContainer}>
                    <View style={styles.detailHeader}>
                        <Text style={styles.detailsTitle}>User Details</Text>
                        <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
                            <Text style={styles.editButtonText}>{isEditing ? 'Cancel' : 'Edit'}</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.inputRow}>
                        <Feather name="user" size={20} color="#888" style={styles.inputIcon} />
                        <TextInput style={styles.input} value={name} onChangeText={setName} editable={isEditing} placeholder="Full Name" />
                    </View>
                    <View style={styles.inputRow}>
                        <Feather name="mail" size={20} color="#888" style={styles.inputIcon} />
                        <TextInput style={styles.input} value={email} onChangeText={setEmail} editable={isEditing} keyboardType="email-address" placeholder="Email Address"/>
                    </View>
                     <View style={styles.inputRow}>
                        <Feather name="phone" size={20} color="#888" style={styles.inputIcon} />
                        <TextInput style={styles.input} value={phone} onChangeText={setPhone} editable={isEditing} keyboardType="phone-pad" placeholder="Phone Number"/>
                    </View>
                    {isEditing && (
                        <TouchableOpacity style={styles.saveButton} onPress={handleSaveChanges}>
                            <Text style={styles.saveButtonText}>Save Changes</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.optionsContainer}>
                    {hasNotificationHistory && (
                        <TouchableOpacity 
                            style={styles.optionButton} 
                            onPress={() => router.push('/Screens/NotificationHistoryScreen')}
                        >
                            <Ionicons name="archive-outline" size={22} color="#555" />
                            <Text style={styles.optionText}>Notification History</Text>
                            <Ionicons name="chevron-forward" size={22} color="#aaa" />
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity 
                        style={styles.optionButton} 
                        onPress={() => Alert.alert("Navigate", "Navigate to Terms and Conditions")}
                    >
                        <Ionicons name="document-text-outline" size={22} color="#555" />
                        <Text style={styles.optionText}>Terms and Conditions</Text>
                        <Ionicons name="chevron-forward" size={22} color="#aaa" />
                    </TouchableOpacity>
                     <TouchableOpacity style={styles.optionButton}>
                        <Ionicons name="help-circle-outline" size={22} color="#555" />
                        <Text style={styles.optionText}>Help & Support</Text>
                        <Ionicons name="chevron-forward" size={22} color="#aaa" />
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.optionButton, styles.logoutButton]} onPress={handleLogout}>
                        <Ionicons name="log-out-outline" size={22} color="#D9534F" />
                        <Text style={[styles.optionText, { color: '#D9534F' }]}>Logout</Text>
                    </TouchableOpacity>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F7F8FA',
    },
    scrollContainer: {
        paddingBottom: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    profileContainer: {
        alignItems: 'center',
        marginVertical: 20,
    },
    imageWrapper: {
        position: 'relative',
    },
    profileImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 3,
        borderColor: '#3B6EF6',
    },
    cameraButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#3B6EF6',
        borderRadius: 15,
        padding: 6,
        borderWidth: 2,
        borderColor: '#fff',
    },
    detailsContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 20,
        marginHorizontal: 16,
        marginBottom: 20,
    },
    detailHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    detailsTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    editButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#3B6EF6',
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F7F8FA',
        borderRadius: 8,
        paddingHorizontal: 12,
        marginBottom: 12,
        height: 50,
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#333',
    },
    saveButton: {
        backgroundColor: '#3B6EF6',
        borderRadius: 8,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 10,
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    optionsContainer: {
        marginHorizontal: 16,
    },
    optionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 15,
        borderRadius: 8,
        marginBottom: 10,
    },
    optionText: {
        flex: 1,
        marginLeft: 15,
        fontSize: 16,
        color: '#333',
    },
    logoutButton: {
        marginTop: 10,
    },
});

export default ProfileScreen;