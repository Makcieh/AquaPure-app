import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";


// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBSY1AlmvoJT373kniOL8X8J9AAZdawnPk",
  authDomain: "aquapurereactnativeapp.firebaseapp.com",
  databaseURL: "https://aquapurereactnativeapp-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "aquapurereactnativeapp",
  storageBucket: "aquapurereactnativeapp.firebasestorage.app",
  messagingSenderId: "611954779802",
  appId: "1:611954779802:web:c87bba2c11d7533fca2123",
  measurementId: "G-HFCHDVJ72K"
};
const app = initializeApp(firebaseConfig);

// 1. Auth
const auth = getAuth(app);

// 2. Firestore (For User Profiles)
const db = getFirestore(app);

// 3. Realtime Database (For Sensors)
// We create a specific variable for this to avoid confusion
const realtimeDb = getDatabase(app); 

export { auth, db, realtimeDb };