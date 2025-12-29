"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  getActiveWeek,
  getWeekRangeString,
  getWeekSundayString,
  getNextSunday,
  getWeekSunday,
  getWeekSaturday,
} from "@/lib/utils";
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Lock, Clock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, LineChart, Line } from "recharts";
import { motion } from "framer-motion";

interface WeeklyRitualProps {
  userId: string;
}

export default function WeeklyRitual({ userId }: WeeklyRitualProps) {
  const [screenTime, setScreenTime] = useState("");
  const [spending, setSpending] = useState("");
  const [selectedWeek, setSelectedWeek] = useState<Date>(new Date());
  const [isLocked, setIsLocked] = useState(false);
  const [isCurrentWeek, setIsCurrentWeek] = useState(false);
  const [showSpendingHelp, setShowSpendingHelp] = useState(false);
  const [showScreenTimeHelp, setShowScreenTimeHelp] = useState(false);
  const [historicalChartData, setHistoricalChartData] = useState<any[]>([]);
  const [timeUntilSunday, setTimeUntilSunday] = useState("");
  const [hasSubmittedThisWeek, setHasSubmittedThisWeek] = useState(false);
  const [countdownTime, setCountdownTime] = useState("");
  const [originalScreenTime, setOriginalScreenTime] = useState("");
  const [originalSpending, setOriginalSpending] = useState("");

  useEffect(() => {
    // Initialize with active week
    const activeWeek = getActiveWeek();
    setSelectedWeek(activeWeek.weekStart);
    setIsLocked(activeWeek.isLocked);
    setIsCurrentWeek(activeWeek.isCurrentWeek);

    // Update countdown timer
    const updateTimer = () => {
      const nextSunday = getNextSunday();
      const now = new Date();
      const diff = nextSunday.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeUntilSunday("Available now");
        setCountdownTime("Available now");
        return;
      }
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      const timerString = `${days}d ${hours}h ${minutes}m ${seconds}s`;
      setTimeUntilSunday(timerString);
      setCountdownTime(timerString);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000); // Update every second

    return () => clearInterval(interval);
  }, []);

  // Update countdown when selected week changes
  useEffect(() => {
    const updateTimer = () => {
      const today = new Date();
      const currentWeekSunday = getWeekSunday(today);
      const selectedWeekSunday = getWeekSunday(selectedWeek);
      const isCurrentWeek = selectedWeekSunday.getTime() === currentWeekSunday.getTime();
      const isFutureWeek = selectedWeekSunday.getTime() > currentWeekSunday.getTime();
      
      if (isFutureWeek) {
        // Future week - countdown to that week's Sunday
        const diff = selectedWeekSunday.getTime() - today.getTime();
        if (diff <= 0) {
          setCountdownTime("Available now");
          return;
        }
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setCountdownTime(`${days}d ${hours}h ${minutes}m ${seconds}s`);
      } else if (isCurrentWeek && hasSubmittedThisWeek) {
        // Current week, already submitted - countdown to next Sunday
        const nextSunday = getNextSunday();
        const diff = nextSunday.getTime() - today.getTime();
        if (diff <= 0) {
          setCountdownTime("Available now");
          return;
        }
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setCountdownTime(`${days}d ${hours}h ${minutes}m ${seconds}s`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [selectedWeek, hasSubmittedThisWeek]);

  const loadWeekData = useCallback(async () => {
    const weekSunday = getWeekSundayString(selectedWeek);
    const supabase = createClient();
    
    // Find weekly log for this week - use exact date match
    const { data: logs } = await supabase
      .from("logs")
      .select("activity_name, points")
      .eq("user_id", userId)
      .eq("category", "weekly")
      .eq("log_date", weekSunday) // Use exact date match for consistency
      .order("log_date", { ascending: false })
      .limit(1);

    if (logs && logs.length > 0) {
      try {
        const weeklyData = JSON.parse(logs[0].activity_name);
        const screenTimeStr = weeklyData.screen_time?.toString() || "";
        const spendingStr = weeklyData.spending?.toString() || "";
        setScreenTime(screenTimeStr);
        setSpending(spendingStr);
        setOriginalScreenTime(screenTimeStr);
        setOriginalSpending(spendingStr);
        setHasSubmittedThisWeek(true);
      } catch (e) {
        console.error("Error parsing weekly data:", e);
      }
    } else {
      // Reset to defaults if no data
      setScreenTime("");
      setSpending("");
      setOriginalScreenTime("");
      setOriginalSpending("");
      setHasSubmittedThisWeek(false);
    }
    
    // Load historical data for charts
    await loadHistoricalData();
  }, [selectedWeek, userId]);

  const loadHistoricalData = useCallback(async () => {
    const supabase = createClient();
    
    // Load all weekly logs for historical chart
    const { data: allLogs } = await supabase
      .from("logs")
      .select("activity_name, log_date, created_at")
      .eq("user_id", userId)
      .eq("category", "weekly")
      .order("log_date", { ascending: true });

    if (allLogs && allLogs.length > 0) {
      // Group by log_date to handle duplicates (take the most recent entry per week)
      const weekMap = new Map<string, { week: string; screenTime: number; spending: number; log_date: string; created_at: string }>();
      
      allLogs.forEach((log) => {
        try {
          const weeklyData = JSON.parse(log.activity_name);
          const weekDate = new Date(log.log_date);
          const weekKey = log.log_date; // Use log_date as unique key (Sunday of the week)
          
          // If we already have an entry for this week, keep the one with the latest created_at
          const existing = weekMap.get(weekKey);
          if (!existing || (log.created_at && existing.created_at < log.created_at)) {
            weekMap.set(weekKey, {
              week: weekDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
              screenTime: weeklyData.screen_time || 0,
              spending: weeklyData.spending || 0,
              log_date: log.log_date,
              created_at: log.created_at || "",
            });
          }
        } catch (e) {
          console.error("Error parsing weekly data:", e);
        }
      });
      
      // Convert map to array and sort by original log_date (not the formatted string)
      const historicalData = Array.from(weekMap.values())
        .map(({ week, screenTime, spending }) => ({ week, screenTime, spending }))
        .sort((a, b) => {
          // Get the original dates from the map for sorting
          const entryA = Array.from(weekMap.values()).find(e => e.week === a.week);
          const entryB = Array.from(weekMap.values()).find(e => e.week === b.week);
          if (!entryA || !entryB) return 0;
          return new Date(entryA.log_date).getTime() - new Date(entryB.log_date).getTime();
        });

      setHistoricalChartData(historicalData);
    } else {
      setHistoricalChartData([]);
    }
  }, [userId]);

  useEffect(() => {
    // Load data for selected week
    loadWeekData();
  }, [loadWeekData]);

  // Load historical data on mount
  useEffect(() => {
    loadHistoricalData();
  }, [loadHistoricalData]);

  const navigateWeek = (direction: "prev" | "next" | "current") => {
    let newWeek: Date;
    const today = new Date();
    const currentWeekSunday = getWeekSunday(today);
    
    if (direction === "current") {
      const activeWeek = getActiveWeek();
      newWeek = activeWeek.weekStart;
      setIsLocked(activeWeek.isLocked);
      setIsCurrentWeek(activeWeek.isCurrentWeek);
    } else {
      newWeek = new Date(selectedWeek);
      if (direction === "prev") {
        newWeek.setDate(selectedWeek.getDate() - 7);
      } else if (direction === "next") {
        // Allow going forward but stop at current week
        newWeek.setDate(selectedWeek.getDate() + 7);
        const newWeekSunday = getWeekSunday(newWeek);
        
        // Prevent navigating to future weeks
        if (newWeekSunday.getTime() > currentWeekSunday.getTime()) {
          return;
        }
        
        newWeek = newWeekSunday;
      } else {
        return;
      }
      
      const newWeekSunday = getWeekSunday(newWeek);
      
      // Prevent navigating to future weeks
      if (newWeekSunday.getTime() > currentWeekSunday.getTime()) {
        return;
      }
      
      // Check if it's the current week
      const isCurrent = newWeekSunday.getTime() === currentWeekSunday.getTime();
      const todayDayOfWeek = today.getDay();
      
      setIsCurrentWeek(isCurrent);
      setIsLocked(isCurrent && todayDayOfWeek !== 0);
      newWeek = newWeekSunday;
    }
    
    setSelectedWeek(newWeek);
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLocked) {
      alert("This week is locked. Come back on Sunday to complete your weekly ritual.");
      return;
    }

    // Check if values have changed (allow resubmission if changed)
    const valuesChanged = screenTime !== originalScreenTime || spending !== originalSpending;
    
    // Only prevent duplicate submission for current week if values haven't changed
    if (hasSubmittedThisWeek && isOnCurrentWeek && !valuesChanged) {
      alert("You have already submitted your weekly ritual for this week. Change the values to resubmit.");
      return;
    }

    const screenTimeNum = parseFloat(screenTime);
    const spendingNum = parseFloat(spending);

    if (isNaN(screenTimeNum) || isNaN(spendingNum) || screenTimeNum < 0 || spendingNum < 0) {
      alert("Please enter valid numbers.");
      return;
    }

    // No longer calculating or showing impact charts

    // Screen time scoring: Baseline 3 hours
    // 2 hours = good (gives points)
    // Below 3 = plus points, above 3 = minus points
    let screenTimePoints = 0;
    if (screenTimeNum <= 2) {
      // Excellent - 2 hours or less
      screenTimePoints = 15;
    } else if (screenTimeNum < 3) {
      // Good - between 2 and 3 hours
      screenTimePoints = 10;
    } else if (screenTimeNum <= 4) {
      // Slightly over baseline
      screenTimePoints = -5;
    } else if (screenTimeNum <= 6) {
      // Moderate overuse
      screenTimePoints = -15;
    } else {
      // Heavy overuse
      screenTimePoints = -25;
    }

    // Spending: Very little impact (minimal points, almost neutral)
    const spendingPoints = Math.floor(spendingNum / 5000); // 1 point per $5000, very minimal

    // Total: Good screen time gives points, bad screen time takes points
    // Spending has minimal impact
    const totalPoints = screenTimePoints - spendingPoints;

    const supabase = createClient();
    const weekSunday = getWeekSundayString(selectedWeek);
    
    // Ensure user exists (create if needed)
    const { data: userCheck } = await supabase
      .from("users")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (!userCheck) {
      // Try to create user profile
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error: createError } = await supabase.from("users").insert({
          id: user.id,
          username: user.email?.split("@")[0] || "Hero",
        });
        if (createError && !createError.message.includes("duplicate")) {
          console.error("Error creating user:", createError);
        }
      }
    }
    
    const weeklyData = JSON.stringify({
      screen_time: screenTimeNum,
      spending: spendingNum,
      week_start: weekSunday,
    });
    
    // Always delete existing weekly log for this week if it exists (allow editing/resubmission)
    // Use exact date match instead of range to be more precise
    const { data: existingLogs, error: fetchError } = await supabase
      .from("logs")
      .select("id")
      .eq("user_id", userId)
      .eq("category", "weekly")
      .eq("log_date", weekSunday); // Use exact date match

    if (fetchError) {
      console.error("Error fetching existing logs:", fetchError);
    }

    if (existingLogs && existingLogs.length > 0) {
      // Delete all existing logs for this week
      for (const log of existingLogs) {
        const { error: deleteError } = await supabase
          .from("logs")
          .delete()
          .eq("id", log.id);
        
        if (deleteError) {
          console.error("Error deleting existing log:", deleteError);
        }
      }
    }

    // Insert new log (use upsert to handle race conditions)
    const { error: insertError } = await supabase
      .from("logs")
      .insert({
        user_id: userId,
        activity_name: weeklyData,
        points: totalPoints,
        category: "weekly",
        log_date: weekSunday, // Store with week's Sunday date
      });

    if (insertError) {
      console.error("Error logging weekly ritual:", insertError);
      alert(`Failed to submit: ${insertError.message}. Please try again.`);
      return;
    }
    
    console.log("Weekly ritual saved successfully:", { weekSunday, screenTimeNum, spendingNum });

    // Impact charts removed
    
    setHasSubmittedThisWeek(true);
    setOriginalScreenTime(screenTime);
    setOriginalSpending(spending);
    
    // Reload data to show the submitted state (with a delay to ensure DB update completes)
    setTimeout(async () => {
      await loadWeekData();
      // Also reload historical data to update charts
      await loadHistoricalData();
    }, 1000);
  };


  const weekRange = getWeekRangeString(selectedWeek);
  const today = new Date();
  const currentWeekSunday = getWeekSunday(today);
  const selectedWeekSunday = getWeekSunday(selectedWeek);
  const canGoNext = selectedWeekSunday.getTime() < currentWeekSunday.getTime();
  const isOnCurrentWeek = selectedWeekSunday.getTime() === currentWeekSunday.getTime();

  return (
    <div className="p-4 sm:p-6">
      {/* Week Navigation */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <button
          onClick={() => navigateWeek("prev")}
          className="p-2 hover:bg-dark-card rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-400" />
        </button>
        
        <div className="flex-1 text-center">
          <h2 className="text-xl sm:text-2xl font-semibold mb-2 text-white">Weekly Ritual</h2>
          <div className="text-2xl sm:text-4xl font-bold text-white mb-1">
            {weekRange}
          </div>
          {!isOnCurrentWeek && (
            <button
              onClick={() => navigateWeek("current")}
              className="mt-2 px-3 py-1 text-xs sm:text-sm bg-blue-500/20 border border-blue-500/50 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
            >
              Go to Current Week
            </button>
          )}
        </div>
        
        <button
          onClick={() => navigateWeek("next")}
          disabled={!canGoNext}
          className={`p-2 rounded-lg transition-colors ${
            canGoNext
              ? "hover:bg-dark-card text-gray-400"
              : "opacity-30 cursor-not-allowed text-gray-400"
          }`}
          title={canGoNext ? "Next week" : "Cannot navigate to future weeks"}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Form Section or Countdown */}
        <div className="bg-dark-card border border-dark-border rounded-2xl p-4 sm:p-6">
          {/* Future week - show only timer */}
          {!isOnCurrentWeek && selectedWeekSunday.getTime() > currentWeekSunday.getTime() ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-6"
            >
              <div className="text-4xl mb-4">⏰</div>
              <h3 className="text-xl sm:text-2xl font-semibold text-white mb-2">
                Future Week
              </h3>
              <p className="text-gray-400 mb-6">
                This week hasn&apos;t started yet.
              </p>
              <div className="bg-dark-bg border border-dark-border rounded-xl p-6">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-blue-400" />
                  <span className="text-sm text-gray-400">Time until this check-in:</span>
                </div>
                <div className="text-3xl sm:text-4xl font-bold text-blue-400 font-mono">
                  {countdownTime || timeUntilSunday || "Calculating..."}
                </div>
              </div>
            </motion.div>
          ) : hasSubmittedThisWeek ? (
            // Show submitted state with ability to edit/delete
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-6"
            >
              <div className="text-4xl mb-4">✅</div>
              <h3 className="text-xl sm:text-2xl font-semibold text-white mb-2">
                Weekly Ritual Complete
              </h3>
              <p className="text-gray-400 mb-4">
                Screen Time: {screenTime} hrs/day • Spending: ${spending}
              </p>
              {isOnCurrentWeek && (
                <div className="bg-dark-bg border border-dark-border rounded-xl p-6 mb-4">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Clock className="w-5 h-5 text-blue-400" />
                    <span className="text-sm text-gray-400">Next ritual available in:</span>
                  </div>
                  <div className="text-3xl sm:text-4xl font-bold text-blue-400 font-mono">
                    {countdownTime || timeUntilSunday}
                  </div>
                </div>
              )}
              <button
                onClick={async () => {
                  // Delete the weekly ritual entry
                  const supabase = createClient();
                  const weekSunday = getWeekSundayString(selectedWeek);
                  
                  const { data: logs } = await supabase
                    .from("logs")
                    .select("id")
                    .eq("user_id", userId)
                    .eq("category", "weekly")
                    .eq("log_date", weekSunday)
                    .limit(1);
                  
                  if (logs && logs.length > 0) {
                    const { error } = await supabase
                      .from("logs")
                      .delete()
                      .eq("id", logs[0].id);
                    
                    if (error) {
                      alert(`Failed to delete: ${error.message}`);
                    } else {
                      // Reload data
                      await loadWeekData();
                    }
                  }
                }}
                className="px-4 py-2 bg-red-600/20 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-600/30 transition-colors text-sm"
              >
                Delete Entry
              </button>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                Screen Time (Hours/Day)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={screenTime}
                onChange={(e) => {
                  setScreenTime(e.target.value);
                }}
                disabled={isLocked}
                className="w-full px-4 py-2 bg-dark-bg border border-dark-border rounded text-white focus:outline-none focus:border-blue-500 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="e.g., 6.5"
                required={!isLocked}
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                Total Spending ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={spending}
                onChange={(e) => {
                  setSpending(e.target.value);
                }}
                disabled={isLocked}
                className="w-full px-4 py-2 bg-dark-bg border border-dark-border rounded text-white focus:outline-none focus:border-blue-500 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="e.g., 150.00"
                required={!isLocked}
              />
              <button
                type="button"
                onClick={() => setShowSpendingHelp(!showSpendingHelp)}
                className="mt-2 text-xs sm:text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                How do I track spending?
                {showSpendingHelp ? <ChevronUp className="w-3 h-3 sm:w-4 sm:h-4" /> : <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4" />}
              </button>
              {showSpendingHelp && (
                <div className="mt-2 p-3 bg-dark-bg border border-dark-border rounded text-xs sm:text-sm text-gray-300">
                  <p className="mb-2 font-medium">Track spending with Rocket Money:</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs">
                    <li>Download Rocket Money app</li>
                    <li>Link your credit cards and bank accounts</li>
                    <li>View your weekly spending report</li>
                    <li>Enter the total amount here</li>
                  </ol>
                </div>
              )}
            </div>
            <div>
              <button
                type="button"
                onClick={() => setShowScreenTimeHelp(!showScreenTimeHelp)}
                className="text-xs sm:text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                How do I track screen time?
                {showScreenTimeHelp ? <ChevronUp className="w-3 h-3 sm:w-4 sm:h-4" /> : <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4" />}
              </button>
              {showScreenTimeHelp && (
                <div className="mt-2 p-3 bg-dark-bg border border-dark-border rounded text-xs sm:text-sm text-gray-300">
                  <p className="mb-2 font-medium">Track screen time on iPhone:</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs">
                    <li>Open Settings app</li>
                    <li>Tap &quot;Screen Time&quot;</li>
                    <li>View your daily average or weekly report</li>
                    <li>Enter the hours per day here</li>
                  </ol>
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={isLocked}
              className="w-full py-3 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              {isLocked ? (
                <span className="flex items-center justify-center gap-2">
                  <Lock className="w-4 h-4" />
                  Locked
                </span>
              ) : (
                "Submit"
              )}
            </button>
          </form>
          )}
        </div>

        {/* Charts Section */}
        <div className="space-y-4 sm:space-y-6">
          {/* Historical Charts */}
          <div className="bg-dark-card border border-dark-border rounded-2xl p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Screen Time History</h3>
            {historicalChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={historicalChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="week" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', color: '#fff' }}
                    formatter={(value: any) => `${value.toFixed(1)} hrs/day`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="screenTime" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    dot={{ fill: '#ef4444', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-gray-500 text-sm">
                No historical data yet
              </div>
            )}
          </div>

          <div className="bg-dark-card border border-dark-border rounded-2xl p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Spending History</h3>
            {historicalChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={historicalChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="week" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', color: '#fff' }}
                    formatter={(value: any) => `$${value.toFixed(2)}`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="spending" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={{ fill: '#10b981', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-gray-500 text-sm">
                No historical data yet
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
