import { db } from '../../firebaseConfig';
import { collection, query, where, getDocs, doc, setDoc, getDoc, serverTimestamp, onSnapshot, orderBy  } from 'firebase/firestore';

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
// 4. REAL-TIME LISTENER: Rolling Weekly Data (Start Today, show Days)
export const subscribeToWeeklyData = (userId, callback) => {
  if (!userId) return () => {};

  const today = new Date();
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  
  // We want a rolling window: Today + Next 6 Days
  const rollingDays = [];
  
  // 1. Generate the empty structure first (so the graph always has 7 bars)
  for (let i = 0; i < 7; i++) {
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + i);
    
    const dateStr = futureDate.toISOString().split('T')[0]; // "2025-12-02"
    const dayName = daysOfWeek[futureDate.getDay()];        // "Tue"
    
    rollingDays.push({
      fullDate: dateStr,
      label: dayName, 
      value: 0
    });
  }

  // 2. Query Database
  const startStr = rollingDays[0].fullDate; // Today
  const endStr = rollingDays[6].fullDate;   // 6 days from now

  const colRef = collection(db, 'users', userId, 'daily_water_usage');
  const q = query(colRef, where('date', '>=', startStr), where('date', '<=', endStr));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    // 3. Fill in the actual values
    snapshot.forEach(doc => {
      const dbDate = doc.data().date;
      const amount = doc.data().liters;
      
      // Find the day in our rolling list and update it
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

// 7. REAL-TIME: Rolling 12-Months (Starts from Current Month)
export const subscribeToYearlyData = (userId, callback) => {
  if (!userId) return () => {};

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0 = Jan, 11 = Dec

  // 1. Calculate Start Date (1st of this month)
  // e.g., "2025-12-01"
  const startY = currentYear;
  const startM = String(currentMonth + 1).padStart(2, '0');
  const startDate = `${startY}-${startM}-01`;

  // 2. Calculate End Date (1 year from now)
  // We just query everything after start date. 
  // We will filter/limit to 12 bars in the logic below.
  const colRef = collection(db, 'users', userId, 'daily_water_usage');
  const q = query(colRef, where('date', '>=', startDate), orderBy('date', 'asc'));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const usageMap = {}; // Helper to store sums: { "2025-12": 50, "2026-01": 20 }

    snapshot.forEach(doc => {
      const data = doc.data();
      // data.date is "2025-12-02" -> Key "2025-12"
      const key = data.date.substring(0, 7); 
      
      if (!usageMap[key]) usageMap[key] = 0;
      usageMap[key] += data.liters;
    });

    // 3. Generate the 12 Bars (Rolling Forward)
    const rollingData = [];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    for (let i = 0; i < 12; i++) {
      // Calculate future date
      const d = new Date(currentYear, currentMonth + i, 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      const mString = String(m + 1).padStart(2, '0');
      
      const key = `${y}-${mString}`; // "2025-12", "2026-01"
      
      rollingData.push({
        label: monthNames[m], // "Dec", "Jan", "Feb"
        value: usageMap[key] || 0 // Usage or 0 if empty
      });
    }

    callback(rollingData);
  });

  return unsubscribe;
};
// 8. REAL-TIME: Multi-Year Data (Safe Version)
export const subscribeToMultiYearData = (userId, callback) => {
  if (!userId) return () => {};

  const colRef = collection(db, 'users', userId, 'daily_water_usage');
  const q = query(colRef, orderBy('date', 'asc')); 

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const yearlyTotals = {};

    snapshot.forEach(doc => {
      const data = doc.data();
      
      // 🛡️ SAFETY CHECK: If date or liters is missing, skip this document
      if (!data.date || typeof data.date !== 'string') {
        console.warn(`⚠️ Skipping bad document: ${doc.id}`);
        return; 
      }

      const year = data.date.split('-')[0]; // Safe to split now
      const liters = Number(data.liters) || 0; // Ensure it's a number

      if (!yearlyTotals[year]) {
        yearlyTotals[year] = 0;
      }
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