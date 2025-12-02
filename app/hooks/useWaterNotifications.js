import { useState, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'; 
import { auth, db } from '../firebaseConfig'; // Ensure you import 'db' (Firestore) here

// 1. Configure Notification Appearance
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const useWaterNotifications = (sensorData) => {
  const lastAlertTime = useRef(0); 

  // 2. Safety Logic
  const isSafe = 
    (sensorData.ph >= 6.5 && sensorData.ph <= 8.5) && 
    (sensorData.turbidity < 5); 

  // 3. Permission Request
  useEffect(() => {
    async function requestPermissions() {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.log('Permission not granted for notifications');
      }
    }
    requestPermissions();
  }, []);

  // 4. Watcher Logic
  useEffect(() => {
    // Prevent false alarms on initial load (0 values)
    if (sensorData.ph === 0 && sensorData.turbidity === 0) return;

    if (!isSafe) {
      const now = Date.now();
      // COOLDOWN: Only alert every 1 hour (3600000ms) 
      // Change to 10000 (10s) for testing purposes
      if (now - lastAlertTime.current > 3600000) { 
        const alertMessage = `Water is Unsafe! pH: ${sensorData.ph.toFixed(1)} | Turbidity: ${sensorData.turbidity.toFixed(1)} NTU`;
        
        triggerAlert(alertMessage);
        saveToHistory(alertMessage); // <--- THIS CONNECTS TO YOUR HISTORY SCREEN
        
        lastAlertTime.current = now;
      }
    }
  }, [sensorData, isSafe]);

  // A. Local Phone Notification
  const triggerAlert = async (message) => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "⚠️ CONTAMINATION ALERT",
        body: message,
      },
      trigger: null,
    });
  };

  // B. Save to Firebase Firestore (The Bridge)
  const saveToHistory = async (message) => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    try {
      // This path matches exactly what your NotificationHistoryScreen is listening to
      await addDoc(collection(db, 'users', userId, 'notifications'), {
        message: message,
        createdAt: serverTimestamp(), // Uses server time for accurate history sorting
        type: 'alert'
      });
      console.log("✅ Alert saved to history");
    } catch (error) {
      console.error("❌ Failed to save history:", error);
    }
  };

  return { isSafe };
};