import { db } from '../../firebaseConfig';
import { onSnapshot } from 'firebase/firestore';
import { collection, query, where, getDocs, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

// 1. Log Daily Usage
export const logDailyUsage = async (userId, litersToAdd) => {
  if (!userId) return;

  const today = new Date().toISOString().split('T')[0];
  const docRef = doc(db, 'users', userId, 'daily_water_usage', today);

  try {
    const docSnap = await getDoc(docRef);
    let newTotal = litersToAdd;

    if (docSnap.exists()) {
      newTotal += docSnap.data().liters;
    }

    await setDoc(docRef, {
      date: today,
      liters: newTotal,
      lastUpdated: serverTimestamp()
    });
    console.log(`✅ Logged ${litersToAdd}L. New Total: ${newTotal}`);
  } catch (error) {
    console.error("❌ Error logging usage:", error);
  }
};

// 2. Get Weekly Data
export const fetchWeeklyData = async (userId) => {
  if (!userId) return [];

  const today = new Date();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(today.getDate() - 7);
  const dateString = sevenDaysAgo.toISOString().split('T')[0];

  const colRef = collection(db, 'users', userId, 'daily_water_usage');
  const q = query(colRef, where('date', '>=', dateString));

  try {
    const querySnapshot = await getDocs(q);
    
    const data = querySnapshot.docs.map(doc => ({
      label: doc.data().date.slice(5), 
      value: doc.data().liters
    }));

    return data.sort((a, b) => a.label.localeCompare(b.label)); 
  } catch (error) {
    console.error("❌ Error fetching weekly stats:", error);
    return [];
  }
};

// 3. Get Total Stats (THE FIX IS HERE)
export const fetchAnalyticsSummary = async (userId) => {
  // 🛑 FIX 1: Return strings if no user
  if (!userId) return { totalLiters: '0', moneySaved: '0' }; 

  const colRef = collection(db, 'users', userId, 'daily_water_usage');
  
  try {
    const querySnapshot = await getDocs(colRef);
    let totalLiters = 0;

    querySnapshot.forEach((doc) => {
      totalLiters += doc.data().liters;
    });

    const PRICE_PER_LITER_SAVED = 3.00; 

    // 🛑 FIX 2: Force conversion to string using String() or toFixed()
    return {
      totalLiters: totalLiters.toFixed(1), // .toFixed() always returns a String
      moneySaved: (totalLiters * PRICE_PER_LITER_SAVED).toFixed(0) // String
    };
  } catch (error) {
    console.error("❌ Error fetching summary:", error);
    // 🛑 FIX 3: Return strings on error
    return { totalLiters: '0', moneySaved: '0' }; 
  }
};
// 4. REAL-TIME LISTENER: Weekly Data
export const subscribeToWeeklyData = (userId, callback) => {
  if (!userId) return () => {};

  const today = new Date();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(today.getDate() - 7);
  const dateString = sevenDaysAgo.toISOString().split('T')[0];

  const colRef = collection(db, 'users', userId, 'daily_water_usage');
  const q = query(colRef, where('date', '>=', dateString));

  // The 'onSnapshot' function runs automatically whenever the database changes
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({
      label: doc.data().date.slice(5), 
      value: doc.data().liters
    }));
    
    // Send the fresh data back to the Home Screen
    callback(data.sort((a, b) => a.label.localeCompare(b.label)));
  });

  return unsubscribe; // Return the "stop listening" button
};

// 5. REAL-TIME LISTENER: Analytics Summary
export const subscribeToAnalyticsSummary = (userId, callback) => {
  if (!userId) return () => {};

  const colRef = collection(db, 'users', userId, 'daily_water_usage');

  const unsubscribe = onSnapshot(colRef, (snapshot) => {
    let totalLiters = 0;
    snapshot.forEach((doc) => {
      totalLiters += doc.data().liters;
    });

    const PRICE_PER_LITER_SAVED = 3.00;

    callback({
      totalLiters: totalLiters.toFixed(1),
      moneySaved: (totalLiters * PRICE_PER_LITER_SAVED).toFixed(0)
    });
  });

  return unsubscribe;
};
// 6. REAL-TIME: Monthly Data (Show all days in current month)
export const subscribeToMonthlyData = (userId, callback) => {
  if (!userId) return () => {};

  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // e.g., "12"
  
  // Range: "2025-12-01" to "2025-12-31"
  const startDate = `${year}-${month}-01`;
  const endDate = `${year}-${month}-31`;

  const colRef = collection(db, 'users', userId, 'daily_water_usage');
  const q = query(colRef, where('date', '>=', startDate), where('date', '<=', endDate));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({
      label: doc.data().date.slice(8), // Get day only ("02" from "2025-12-02")
      value: doc.data().liters
    }));
    // Sort by day (1, 2, 3...)
    callback(data.sort((a, b) => a.label.localeCompare(b.label)));
  });

  return unsubscribe;
};

// 7. REAL-TIME: Yearly Data (Aggregate days into months)
export const subscribeToYearlyData = (userId, callback) => {
  if (!userId) return () => {};

  const year = new Date().getFullYear(); // "2025"
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  const colRef = collection(db, 'users', userId, 'daily_water_usage');
  const q = query(colRef, where('date', '>=', startDate), where('date', '<=', endDate));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    // 1. Create buckets for Jan-Dec
    const monthlyTotals = Array(12).fill(0);
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // 2. Sum up every daily document into its month bucket
    snapshot.forEach(doc => {
      const dateStr = doc.data().date; // "2025-12-02"
      const monthIndex = parseInt(dateStr.split('-')[1], 10) - 1; // 12 -> Index 11 (Dec)
      if (monthIndex >= 0 && monthIndex < 12) {
        monthlyTotals[monthIndex] += doc.data().liters;
      }
    });

    // 3. Format for Graph
    const data = monthNames.map((name, index) => ({
      label: name,
      value: monthlyTotals[index]
    }));

    callback(data);
  });

  return unsubscribe;
};