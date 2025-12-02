import { useWaterNotifications } from '../hooks/useWaterNotifications'; // Adjust path if needed
import { fetchWeeklyData, fetchAnalyticsSummary } from '../services/waterUsageService'; // Import the new file
import React, { useState, useEffect } from "react";
import { logDailyUsage } from '../services/waterUsageService';
import { subscribeToWeeklyData, subscribeToAnalyticsSummary } from '../services/waterUsageService';
import {
  Dimensions,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,    // <--- Add this
  StatusBar,
} from "react-native";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Svg, { Path } from "react-native-svg";

// --- Firebase Imports ---
import { auth, realtimeDb } from "../../firebaseConfig";
import { ref, onValue, off } from "firebase/database";

// // Helper function to handle logout
// const handleLogout = () => {
//   auth.signOut().catch((error) => console.error("Logout Error:", error));
// };


// --- TypeScript Interfaces ---
interface GraphDataPoint {
  label: string;
  value: number;
}

interface BarGraphProps {
  data: GraphDataPoint[];
  color: string;
  yAxisLabels: string[];
  title?: string;
  isScrollable?: boolean;
  showLegend?: string;
  timeRange?: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  chipBgColor?: string;
  chipTextColor?: string;
  showTimeRangeToggle?: boolean;
  onMonthPress?: () => void;
  onYearPress?: () => void;
  isMonth?: boolean;
}

interface AnalyticsGraphProps {
  data: GraphDataPoint[];
  timeRange: string;
  color: string;
  yAxisLabels: string[];
}

interface FilterCyclesCardProps {
  currentCycles: number;
  maxCycles: number;
  color: string;
}

// --- Sub-Components ---

const BarGraph = ({
  data,
  color,
  yAxisLabels,
  title,
  isScrollable,
  showLegend,
  timeRange,
  iconName,
  iconColor,
  chipBgColor,
  chipTextColor,
  showTimeRangeToggle,
  onMonthPress,
  onYearPress,
  isMonth,
}: BarGraphProps) => {
  if (!data || data.length === 0) {
    return (
      <View style={styles.barGraphContainer}>
        {title && <Text style={styles.barGraphTitle}>{title}</Text>}
        <Text style={{ textAlign: "center", padding: 20, color: "#666" }}>
          No data available
        </Text>
      </View>
    );
  }

  const maxValue = Math.max(...data.map((item) => item.value));
  const scaleMax = maxValue > 0 ? maxValue : 1;

  const barContent = data.map((item, index) => (
    <View
      key={index}
      style={[
        styles.barWrapper,
        !isScrollable && { flex: 1, marginHorizontal: 4 },
      ]}
    >
      <View style={styles.bar}>
        <View style={styles.barTrack} />
        <View
          style={[
            styles.barFill,
            {
              height: `${(item.value / scaleMax) * 100}%`,
              backgroundColor: color,
            },
          ]}
        />
      </View>
      <Text style={styles.xAxisLabel}>{item.label}</Text>
    </View>
  ));

  return (
    <View style={styles.barGraphContainer}>
      {iconName ? (
        <View style={styles.analyticsHeader}>
          <View
            style={[
              styles.analyticsTitleChip,
              { backgroundColor: chipBgColor },
            ]}
          >
            <Ionicons name={iconName} size={18} color={iconColor} />
            <Text style={[styles.analyticsTitle, { color: chipTextColor }]}>
              {title}
            </Text>
          </View>
          {showTimeRangeToggle ? (
            <View style={styles.timeRangeSelectorInGraph}>
              <TouchableOpacity onPress={onMonthPress}>
                <Text
                  style={[
                    styles.timeRangeText,
                    isMonth && styles.activeTimeRange,
                  ]}
                >
                  Month
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onYearPress}>
                <Text
                  style={[
                    styles.timeRangeText,
                    !isMonth && styles.activeTimeRange,
                  ]}
                >
                  Year
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.analyticsTimeRange}>{timeRange}</Text>
          )}
        </View>
      ) : (
        <Text style={styles.barGraphTitle}>{title}</Text>
      )}

      <View style={styles.graph}>
        <View style={styles.yAxis}>
          {yAxisLabels.map((label, i) => (
            <Text key={i} style={styles.yAxisLabel}>
              {label}
            </Text>
          ))}
        </View>
        {isScrollable ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={true}
            style={{ flex: 1 }}
          >
            <View style={styles.barsContainer}>{barContent}</View>
          </ScrollView>
        ) : (
          <View
            style={[styles.barsContainer, { justifyContent: "space-around" }]}
          >
            {barContent}
          </View>
        )}
      </View>
      {showLegend && (
        <View style={styles.legend}>
          <View style={[styles.legendDot, { backgroundColor: color }]} />
          <Text style={styles.legendText}>{showLegend}</Text>
        </View>
      )}
    </View>
  );
};

const AnalyticsGraph = ({
  data,
  timeRange,
  color,
  yAxisLabels,
}: AnalyticsGraphProps) => {
  if (!data || data.length === 0) return null;

  const maxValue = Math.max(...data.map((item) => item.value));
  const scaleMax = maxValue > 0 ? maxValue : 1;

  return (
    <View style={styles.barGraphContainer}>
      <View style={styles.analyticsHeader}>
        <View style={styles.analyticsTitleChip}>
          <MaterialCommunityIcons
            name="currency-usd"
            size={18}
            color="#3B6EF6"
          />
          <Text style={styles.analyticsTitle}>Money Saved</Text>
        </View>
        <Text style={styles.analyticsTimeRange}>{timeRange}</Text>
      </View>
      <View style={styles.graph}>
        <View style={styles.yAxis}>
          {yAxisLabels.map((label, i) => (
            <Text key={i} style={styles.yAxisLabel}>
              {label}
            </Text>
          ))}
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={true}
          style={{ flex: 1 }}
        >
          <View style={styles.barsContainer}>
            {data.map((item, index) => (
              <View key={index} style={styles.barWrapper}>
                <View style={[styles.bar, { width: 14 }]}>
                  <View style={styles.barTrack} />
                  <View
                    style={[
                      styles.barFill,
                      {
                        height: `${(item.value / scaleMax) * 100}%`,
                        backgroundColor: color,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.xAxisLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
      <View style={styles.legend}>
        <View style={[styles.legendDot, { backgroundColor: color }]} />
        <Text style={styles.legendText}>Total Saved</Text>
      </View>
    </View>
  );
};

const FilterCyclesCard = ({
  currentCycles,
  maxCycles,
  color,
}: FilterCyclesCardProps) => {
  return (
    <View style={[styles.filterCard, { backgroundColor: color }]}>
      <View style={styles.filterTextContainer}>
        <Ionicons name="refresh-circle-outline" size={24} color="#fff" />
        <Text style={styles.filterTitle}>Filter Cycles</Text>
      </View>
      <View style={styles.filterCountContainer}>
        <Text style={styles.filterCount}>{currentCycles}</Text>
        <Text style={styles.filterMax}>/ {maxCycles}</Text>
      </View>
    </View>
  );
};

const AnalyticsTabContent = () => {
  const [timeRange, setTimeRange] = useState("Month");

  // Placeholder Data
  const moneySavedMonthlyData = [
    { label: "Jan", value: 5200 },
    { label: "Feb", value: 5800 },
    { label: "Mar", value: 4800 },
    { label: "Apr", value: 5500 },
  ];
  const moneySavedYearlyData = [
    { label: "2024", value: 0 },
    { label: "2025", value: 4000 },
  ];
  const waterUsageMonthlyData = [
    { label: "Jan", value: 4.1 },
    { label: "Feb", value: 4.7 },
  ];
  const waterUsageYearlyData = [{ label: "2025", value: 4.2 }];

  const isMonth = timeRange === "Month";
  const analyticsChartData = isMonth
    ? moneySavedMonthlyData
    : moneySavedYearlyData;
  const waterUsageChartData = isMonth
    ? waterUsageMonthlyData
    : waterUsageYearlyData;

  return (
    <ScrollView contentContainerStyle={styles.dashboardContainer}>
      <View style={styles.topControlsContainer}>
        <FilterCyclesCard currentCycles={30} maxCycles={300} color="#3B6EF6" />
        <View style={styles.timeRangeSelector}>
          <TouchableOpacity onPress={() => setTimeRange("Month")}>
            <Text
              style={[styles.timeRangeText, isMonth && styles.activeTimeRange]}
            >
              Month
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setTimeRange("Year")}>
            <Text
              style={[styles.timeRangeText, !isMonth && styles.activeTimeRange]}
            >
              Year
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <AnalyticsGraph
        data={analyticsChartData}
        timeRange={isMonth ? "Monthly" : "Yearly"}
        color="#7ACE7D"
        yAxisLabels={["6k", "4k", "2k", ""]}
      />

      <BarGraph
        title="Water Usage Stats"
        data={waterUsageChartData}
        color="#3B6EF6"
        yAxisLabels={["5L", "3L", "1L", ""]}
        isScrollable={true}
        showLegend="Total Usage"
        timeRange={isMonth ? "Monthly" : "Yearly"}
        iconName="water-outline"
        iconColor="#3B6EF6"
        chipBgColor="#E8EAF6"
        chipTextColor="#3B6EF6"
        showTimeRangeToggle={false}
        onMonthPress={undefined}
        onYearPress={undefined}
        isMonth={undefined}
      />
    </ScrollView>
  );
};

// --- MAIN HOMESCREEN COMPONENT ---

const HomeScreen = () => {
  const router = useRouter();
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState("Dashboard");

  const [weeklyData, setWeeklyData] = useState([]); 
  
  interface AnalyticsData {
  totalLiters: string;
  moneySaved: string;
}

useEffect(() => {
    const userId = auth.currentUser?.uid;
    
    if (userId) {
      console.log("🟢 Starting Real-Time Analytics Stream...");

      // A. Subscribe to Weekly Graph Updates
      const unsubWeekly = subscribeToWeeklyData(userId, (newData) => {
        setWeeklyData(newData);
      });

      // B. Subscribe to Total Stats Updates
      const unsubSummary = subscribeToAnalyticsSummary(userId, (newStats) => {
        setAnalytics(newStats);
      });

      // CLEANUP: Stop listening when we leave the screen (prevents memory leaks)
      return () => {
        console.log("🔴 Closing Analytics Stream...");
        unsubWeekly();
        unsubSummary();
      };
    }
  }, []);

// 👇 Initialize with STRINGS ('0'), not numbers (0)
const [analytics, setAnalytics] = useState<AnalyticsData>({ 
  totalLiters: '0', 
  moneySaved: '0' 
});

  const handleLogout = async () => {
    try {
      await auth.signOut();
      console.log("User signed out!");
      // Force navigation back to Login
      router.replace("/Screens/LoginScreen"); 
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  // Real-time sensor state
  const [sensorData, setSensorData] = useState({
    ph: 0,
    turbidity: 0,
    temperature: 0,
    waterLevel: 0,
    flowRate: 0,
    dailyUsage: 0,
  });
  
  useEffect(() => {
    const userId = auth.currentUser?.uid;
    console.log("🚀 Fetching data for User ID:", userId);

    if (!userId) {
      console.log("⚠️ No user logged in. Cannot fetch data.");
      return;
    }

    const dbPath = `users/${userId}/SensorValue`;
    console.log("🔗 Connecting to Firebase Path:", dbPath);

    const sensorsRef = ref(realtimeDb, dbPath);
    console.log("📍 Reference created:", sensorsRef.toString());

    // Start listener
    const unsubscribe = onValue(
      sensorsRef,
      (snapshot) => {
        console.log("📡 Snapshot exists:", snapshot.exists());
        const data = snapshot.val();

        console.log("🔥 Firebase Data Received:", data);

        if (data) {
          setSensorData({
            ph: Number(data.ph) || 0,
            turbidity: Number(data.turbidity) || 0,
            temperature: Number(data.temperature) || 0,
            waterLevel: Number(data.waterLevel) || 0,
            flowRate: Number(data.flowRate) || 0,
            dailyUsage: Number(data.dailyUsage) || 0,
          });
        } else {
          console.log("⚠️ No data found at this path.");
        }
      },
      (error) => {
        console.error("❌ Firebase Error:", error);
      }
    );

    // ✅ DON'T call unsubscribe() here!
    // Just return it for cleanup

    return () => {
      console.log("🧹 Listener unsubscribed.");
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const loadAnalytics = async () => {
      const userId = auth.currentUser?.uid;
      
      if (userId) {
        console.log("📊 Fetching Graph Data...");
        
        // A. Get Graph Data
        const graphData = await fetchWeeklyData(userId);
        setWeeklyData(graphData);

        // B. Get Totals
        const summary = await fetchAnalyticsSummary(userId);
        setAnalytics(summary);
      }
    };

    loadAnalytics(); // Call the function
  }, []); // [] means run once when app opens

// 3. THE SMART LOGIC (OUTSIDE useEffect)
  // 🟢 CORRECT: Calling the hook at the top level.
  // It runs automatically every time setSensorData updates the state.
  const { isSafe } = useWaterNotifications(sensorData);

  const currentStatus = {
    title: isSafe ? "Water Is Safe" : "Water Is Not Safe",
    temp: `${sensorData.temperature.toFixed(1)}°c`,
    bgColor: isSafe ? "#3B6EF6" : "#D9534F",
    circleColor: isSafe ? "#7ACE7D" : "#FFCDD2",
    icon: isSafe ? (
      <Ionicons name="leaf" size={50} color="#fff" />
    ) : (
      <Feather name="alert-circle" size={50} color="#fff" />
    ),
    values: {
      ph: sensorData.ph.toFixed(1),
      // tds: "145ppm", // Static for now
      turbidity: `${sensorData.turbidity.toFixed(1)}NTU`,
    },
    valueBg: isSafe ? "#7ACE7D" : "#FFCDD2",
  };

  const userProfileImage = "https://placehold.co/200x200/E0E7FF/3B6EF6?text=MA";

  const weeklyUsage = [
    { label: "Sun", value: 4.1 },
    { label: "Mon", value: 4.7 },
    { label: "Tue", value: 5.0 },
    { label: "Wed", value: 4.1 },
    { label: "Thu", value: 4.4 },
    { label: "Fri", value: 4.4 },
    { label: "Sat", value: 3.1 },
  ];

  const screenWidth = Dimensions.get("window").width;
  const cardWidth = screenWidth - 32;
  // Ensure water level is bounded 0-100 for animation
  const safeWaterLevel = Math.min(Math.max(sensorData.waterLevel, 0), 100);
  const waveHeight = 230 - (safeWaterLevel / 100) * 230;

  // A. Calculate Filter Health (Assuming Filter lasts for 2000 Liters)
  const MAX_FILTER_LIFE = 2000;
  const totalUsed = parseFloat(analytics.totalLiters || '0'); // Convert string '15.5' to number 15.5
  const healthPercentage = Math.max(0, 100 - ((totalUsed / MAX_FILTER_LIFE) * 100)).toFixed(0);

  // B. Get "Today's Usage" from the Weekly Graph Data
  // We look for a bar in the graph that matches today's date (e.g., "12-02")
  const todayLabel = new Date().toISOString().split('T')[0].slice(5); 
  const todayData = weeklyData.find(item => item.label === todayLabel);
  const todayLiters = todayData ? todayData.value : 0;

  return (
    <SafeAreaView style={styles.page}>
      <StatusBar
        barStyle="dark-content" // Makes the Time/Battery icons BLACK
        backgroundColor="transparent" // Lets the white page background show through
        translucent={true} // Tells Android to let the app draw behind the bar
      />
      <View style={styles.headerContainer}>
        <TouchableOpacity
          style={styles.profileSection}
          onPress={() => router.push("./ProfileScreen")}
        >
          <Image
            source={{ uri: userProfileImage }}
            style={styles.profileImage}
          />
          <View style={{ marginLeft: 10 }}>
            <Text style={styles.greeting}>Good Afternoon</Text>
            <Text style={styles.username}>Michael Angelo</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.rightIcons}>
          <TouchableOpacity onPress={handleLogout} style={{ marginRight: 15 }}>
            <MaterialCommunityIcons name="logout" size={28} color="black" />
          </TouchableOpacity>

          <View>
            <TouchableOpacity onPress={() => setShowDropdown(!showDropdown)}>
              <Feather name="bell" size={28} color="black" />
            </TouchableOpacity>

            {showDropdown && (
              <View style={styles.dropdown}>
                <Text style={styles.dropdownItem}>There's no Notification</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <View style={styles.navContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "Dashboard" && {
              backgroundColor: "#3B6EF6",
              borderRadius: 20,
            },
          ]}
          onPress={() => setActiveTab("Dashboard")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "Dashboard" && styles.activeText,
            ]}
          >
            Dashboard
          </Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "Analytics" && {
              backgroundColor: "#7ACE7D",
              borderRadius: 20,
            },
          ]}
          onPress={() => setActiveTab("Analytics")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "Analytics" && styles.activeText,
            ]}
          >
            Analytics
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === "Dashboard" && (
        <ScrollView contentContainerStyle={styles.dashboardContainer}>
          <View
            style={[
              styles.card,
              { borderColor: currentStatus.bgColor, borderWidth: 1 },
            ]}
          >
            <View style={styles.waveContainer}>
              <Svg height="230" width={cardWidth}>
                <Path
                  d={`M0 ${waveHeight} Q${cardWidth / 4} ${waveHeight - 30}, ${
                    cardWidth / 2
                  } ${waveHeight} T${cardWidth} ${waveHeight} V230 H0 Z`}
                  fill={currentStatus.bgColor}
                />
              </Svg>
            </View>

            <View style={styles.topRow}>
              <View>
                <Text style={styles.title}>{currentStatus.title}</Text>
                <Text style={styles.subtitle}>
                  Current Tank Level: {safeWaterLevel}%
                </Text>
              </View>
              <Text style={styles.temp}>
                {currentStatus.temp}{" "}
                <Feather name="thermometer" size={18} color="#333" />
              </Text>
            </View>

            <View
              style={[
                styles.circle,
                { backgroundColor: currentStatus.circleColor },
              ]}
            >
              {currentStatus.icon}
            </View>

            <View style={styles.bottomRow}>
              <View style={styles.valueBoxWrapper}>
                <View
                  style={[
                    styles.valueBox,
                    { backgroundColor: currentStatus.valueBg },
                  ]}
                >
                  <Text style={styles.valueText}>
                    {currentStatus.values.ph}
                  </Text>
                </View>
                <View style={styles.valueLabelBox}>
                  <Text style={styles.label}>ph Level</Text>
                </View>
              </View>

              {/* Note: Removed TDS */}
              {/* <View style={styles.valueBoxWrapper}>
                <View
                  style={[
                    styles.valueBox,
                    { backgroundColor: currentStatus.valueBg },
                  ]}
                >
                  <Text style={styles.valueText}>
                    {currentStatus.values.tds}
                  </Text>
                </View>
                <View style={styles.valueLabelBox}>
                  <Text style={styles.label}>TDS</Text>
                </View>
              </View> */}

              <View style={styles.valueBoxWrapper}>
                <View
                  style={[
                    styles.valueBox,
                    { backgroundColor: currentStatus.valueBg },
                  ]}
                >
                  <Text style={styles.valueText}>
                    {currentStatus.values.turbidity}
                  </Text>
                </View>
                <View style={styles.valueLabelBox}>
                  <Text style={styles.label}>Turbidity</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.detailsGrid}>
            <View style={styles.gridRow}>
              <View style={[styles.detailCard, { width: "58%", backgroundColor: currentStatus.bgColor }]}>
                <Ionicons name="water-outline" size={24} color="#fff" />
                  <Text style={styles.detailValue}>
                    {todayLiters.toFixed(1)} L
                    </Text>
                    <Text style={styles.detailLabel}>Daily Water Usage</Text>
                  </View>

              {/* <View
                style={[
                  styles.detailCard,
                  { width: "58%", backgroundColor: currentStatus.bgColor },
                ]}
                > */}
                {/* Note: Must be "Daily Water Usage" */}
                {/* <Ionicons name="water-outline" size={24} color="#fff" />
                <Text style={styles.detailValue}>
                  {sensorData.flowRate} L/min
                </Text>
                <Text style={styles.detailLabel}>Water Flow Rate</Text>
                </View> */}
                
              <View
                style={[
                  styles.detailCard,
                  { width: "40%", backgroundColor: currentStatus.bgColor },
                ]}
              >
                <MaterialCommunityIcons
                  name="currency-php"
                  size={24}
                  color="#fff"
                />
                <Text style={styles.detailValue}>
  ₱{analytics.moneySaved}
</Text>
<Text style={styles.detailLabel}>Total Saved</Text>
              </View>
            </View>
            <View style={styles.gridRow}>
              <View
                style={[
                  styles.detailCard,
                  { width: "35%", backgroundColor: currentStatus.bgColor },
                ]}
              >
                <Ionicons name="heart-outline" size={24} color="#fff" />
                <Text style={styles.detailValue}>
                            {healthPercentage}%
                  </Text>
                <Text style={styles.detailLabel}>Filter Health</Text>
              </View>

              {/* Note: You can ignore this  */}
              {/* Uncessasry na guro cuz of physical battery incator */}
              {/* <View
                style={[
                  styles.detailCard,
                  { width: "63%", backgroundColor: currentStatus.bgColor },
                ]}
              >
                <Ionicons name="battery-full-outline" size={24} color="#fff" />
                <Text style={styles.detailValue}>100%</Text>
                <Text style={styles.detailLabel}>Battery Percentage</Text>
              </View> */}
            </View>
          </View>

          <BarGraph
            title="Weekly Water Usage"
            data={weeklyUsage}
            color={currentStatus.bgColor}
            yAxisLabels={["5L", "4L", "3L", "2L", "1L", ""]}
            isScrollable={false}
            showLegend={undefined}
            timeRange={undefined}
            iconName={undefined}
            iconColor={undefined}
            chipBgColor={undefined}
            chipTextColor={undefined}
            showTimeRangeToggle={undefined}
            onMonthPress={undefined}
            onYearPress={undefined}
            isMonth={undefined}
          />
        </ScrollView>
      )}

      {activeTab === "Analytics" && <AnalyticsTabContent />}

      {/* 🛑 TEMP DEBUG BUTTON - DELETE BEFORE FINAL DEMO */}
<TouchableOpacity
  style={{
    backgroundColor: 'orange',
    padding: 15,
    margin: 20,
    borderRadius: 10,
    alignItems: 'center'
  }}
  onPress={async () => {
    const uid = auth.currentUser?.uid;
    if (uid) {
      // Simulate adding 15.5 Liters right now
      await logDailyUsage(uid, 15.5);
      alert('Simulated 15.5L Usage!');
      // Note: You might need to reload the app to see the graph update
      // unless you add a refresh trigger.
    }
  }}
>
  <Text style={{ fontWeight: 'bold' }}>🧪 SIMULATE FLOW (15L)</Text>
</TouchableOpacity>

    </SafeAreaView>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#fff",
    // If Android, push down by the status bar height. If iOS, do nothing (0).
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  greeting: {
    fontSize: 14,
    color: "gray",
  },
  username: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000",
  },
  rightIcons: {
    flexDirection: "row",
    alignItems: "center",
  },
  dropdown: {
    position: "absolute",
    top: 35,
    right: 0,
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 8,
    elevation: 5,
    minWidth: 180,
    zIndex: 10,
  },
  dropdownItem: {
    paddingVertical: 6,
    fontSize: 14,
    color: "#333",
  },
  timeRangeSelectorInGraph: {
    flexDirection: "row",
    gap: 16,
  },
  navContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 5,
    marginBottom: 10,
    backgroundColor: "#fff",
    paddingBottom: 5,
  },
  tab: {
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  tabText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
  activeText: {
    color: "#fff",
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: "#ccc",
    marginHorizontal: 10,
  },
  dashboardContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  card: {
    height: 230,
    borderRadius: 20,
    padding: 16,
    overflow: "hidden",
    backgroundColor: "#fff",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: 16,
    position: "relative",
  },
  waveContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 0,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  title: {
    fontSize: 25,
    fontWeight: "bold",
    color: "#000",
  },
  subtitle: {
    fontSize: 13,
    color: "#555",
    marginTop: 2,
  },
  temp: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  circle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    position: "absolute",
    top: "45%",
    right: 20,
    marginTop: -40,
    zIndex: 2,
  },
  bottomRow: {
    position: "absolute",
    bottom: 12,
    left: 16,
    flexDirection: "row",
    alignItems: "flex-end",
    zIndex: 1,
  },
  valueBoxWrapper: {
    marginRight: 8,
    alignItems: "center",
  },
  valueBox: {
    paddingHorizontal: 0,
    paddingVertical: 4,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 75,
  },
  valueLabelBox: {
    backgroundColor: "#1E3A8A",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    width: "100%",
    alignItems: "center",
  },
  valueText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  label: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "600",
  },
  detailsGrid: {
    marginTop: 0,
  },
  gridRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  detailCard: {
    borderRadius: 16,
    padding: 16,
    minHeight: 100,
    justifyContent: "space-between",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  detailValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginTop: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: "#E0E0E0",
  },
  barGraphContainer: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    marginTop: 6,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  barGraphTitle: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 16,
  },
  graph: {
    flexDirection: "row",
    height: 150,
  },
  yAxis: {
    justifyContent: "space-between",
    paddingRight: 8,
    paddingTop: 6,
    paddingBottom: 20,
  },
  yAxisLabel: {
    fontSize: 12,
    color: "#666",
  },
  barsContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    borderLeftWidth: 1,
    borderLeftColor: "#E0E0E0",
    paddingLeft: 8,
    height: "100%",
    paddingTop: 12,
  },
  barWrapper: {
    alignItems: "center",
    justifyContent: "flex-end",
    marginHorizontal: 10,
  },
  bar: {
    width: 20,
    height: "90%",
    borderRadius: 10,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  barTrack: {
    position: "absolute",
    width: "100%",
    height: "100%",
    backgroundColor: "#E0E0E0",
  },
  barFill: {
    width: "100%",
    position: "absolute",
    bottom: 0,
  },
  xAxisLabel: {
    marginTop: 4,
    fontSize: 12,
    color: "#333",
  },
  analyticsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  analyticsTitleChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8EAF6",
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  analyticsTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 6,
    color: "#3B6EF6",
  },
  analyticsTimeRange: {
    fontSize: 16,
    fontWeight: "500",
    color: "#555",
  },
  topControlsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    gap: 16,
  },
  timeRangeSelector: {
    flexDirection: "row",
    gap: 16,
  },
  timeRangeText: {
    fontSize: 16,
    color: "#888",
    fontWeight: "600",
  },
  activeTimeRange: {
    color: "#3B6EF6",
    borderBottomWidth: 2,
    borderBottomColor: "#3B6EF6",
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  legendText: {
    fontSize: 14,
    color: "#555",
  },
  filterCard: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 16,
    padding: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  filterTextContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  filterTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginLeft: 8,
  },
  filterCountContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  filterCount: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  filterMax: {
    fontSize: 14,
    color: "#E0E0E0",
    marginLeft: 2,
  },
});
