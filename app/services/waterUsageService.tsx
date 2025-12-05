import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  setDoc, 
  getDoc, 
  serverTimestamp, 
  onSnapshot, 
  orderBy 
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';

// 🛠️ HELPER: Get Date String (YYYY-MM-DD) in USER'S Local Timezone
// This prevents the "Yesterday" bug when working late at night.
const getLocalYYYYMMDD = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// 1. Log Daily Usage
export const logDailyUsage = async (userId, litersToAdd) => {
  if (!userId) return;

  // ✅ FIX: Use Local Time instead of UTC (toISOString)
  const today = getLocalYYYYMMDD(new Date());
  
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
    console.log(`✅ Logged ${litersToAdd}L for ${today}. New Total: ${newTotal}`);
  } catch (error) {
    console.error("❌ Error logging usage:", error);
  }
};

// 2. Get Weekly Data (Fetch Once - Legacy)
export const fetchWeeklyData = async (userId) => {
  // Keeping this for reference, but we use the listener below mostly
  if (!userId) return [];
  return []; 
};

// 3. Get Total Stats
export const fetchAnalyticsSummary = async (userId) => {
  if (!userId) return { totalLiters: '0', moneySaved: '0' }; 

  const colRef = collection(db, 'users', userId, 'daily_water_usage');
  
  try {
    const querySnapshot = await getDocs(colRef);
    let totalLiters = 0;

    querySnapshot.forEach((doc) => {
      totalLiters += doc.data().liters;
    });

    const PRICE_PER_LITER_SAVED = 3.00; 

    return {
      totalLiters: totalLiters.toFixed(1),
      moneySaved: (totalLiters * PRICE_PER_LITER_SAVED).toFixed(0)
    };
  } catch (error) {
    console.error("❌ Error fetching summary:", error);
    return { totalLiters: '0', moneySaved: '0' }; 
  }
};

// 4. REAL-TIME LISTENER: Rolling Weekly Data (Past 7 Days)
export const subscribeToWeeklyData = (userId, callback) => {
  if (!userId) return () => {};

  const today = new Date();
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  
  const rollingDays = [];
  
  // 1. Generate the structure (Past -> Today)
  for (let i = 6; i >= 0; i--) {
    const pastDate = new Date();
    pastDate.setDate(today.getDate() - i); 
    
    // ✅ FIX: Use Local Time
    const dateStr = getLocalYYYYMMDD(pastDate); 
    const dayName = daysOfWeek[pastDate.getDay()];
    
    rollingDays.push({
      fullDate: dateStr,
      label: dayName, 
      value: 0
    });
  }

  const startStr = rollingDays[0].fullDate; // 6 days ago
  const endStr = rollingDays[6].fullDate;   // Today

  const colRef = collection(db, 'users', userId, 'daily_water_usage');
  const q = query(colRef, where('date', '>=', startStr), where('date', '<=', endStr));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    snapshot.forEach(doc => {
      const dbDate = doc.data().date;
      const amount = doc.data().liters;
      
      const targetDay = rollingDays.find(d => d.fullDate === dbDate);
      if (targetDay) {
        targetDay.value = amount;
      }
    });

    callback(rollingDays);
  });

  return unsubscribe;
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

// 6. REAL-TIME: Yearly Data (Rolling 12-Months)
export const subscribeToYearlyData = (userId, callback) => {
  if (!userId) return () => {};

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0 = Jan

  // Start from 1st of current month
  const startM = String(currentMonth + 1).padStart(2, '0');
  const startDate = `${currentYear}-${startM}-01`;

  const colRef = collection(db, 'users', userId, 'daily_water_usage');
  const q = query(colRef, where('date', '>=', startDate), orderBy('date', 'asc'));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const usageMap = {}; 

    snapshot.forEach(doc => {
      const data = doc.data();
      const key = data.date.substring(0, 7); // "2025-12"
      if (!usageMap[key]) usageMap[key] = 0;
      usageMap[key] += data.liters;
    });

    const rollingData = [];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    for (let i = 0; i < 12; i++) {
      const d = new Date(currentYear, currentMonth + i, 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      const mString = String(m + 1).padStart(2, '0');
      const key = `${y}-${mString}`; 
      
      rollingData.push({
        label: monthNames[m],
        value: usageMap[key] || 0
      });
    }

    callback(rollingData);
  });

  return unsubscribe;
};

// 8. REAL-TIME: Multi-Year Data
export const subscribeToMultiYearData = (userId, callback) => {
  if (!userId) return () => {};

  const colRef = collection(db, 'users', userId, 'daily_water_usage');
  const q = query(colRef, orderBy('date', 'asc')); 

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const yearlyTotals = {};

    snapshot.forEach(doc => {
      const data = doc.data();
      if (!data.date) return;

      const year = data.date.split('-')[0];
      const liters = Number(data.liters) || 0;

      if (!yearlyTotals[year]) yearlyTotals[year] = 0;
      yearlyTotals[year] += liters;
    });

    const data = Object.keys(yearlyTotals).map(year => ({
      label: year,
      value: yearlyTotals[year]
    }));

    callback(data);
  });

  return unsubscribe;
};
// 9. REAL-TIME: Listen ONLY to Today's Document (For the Daily Card)
export const subscribeToTodayUsage = (userId, callback) => {
  if (!userId) return () => {};

  const today = getLocalYYYYMMDD(new Date()); // Get "2025-12-04" (or current date)
  const docRef = doc(db, 'users', userId, 'daily_water_usage', today);

  const unsubscribe = onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      // If data exists for today, send the liters
      callback(docSnap.data().liters || 0);
    } else {
      // If no document exists yet for today, usage is 0
      callback(0);
    }
  });

  return unsubscribe;
};