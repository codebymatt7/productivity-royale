"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  calculateWealthDestroyed, 
  calculateLifeWasted,
  getActiveWeek,
  getWeekRangeString,
  getWeekSundayString,
  getNextSunday,
  getWeekSunday,
  getWeekSaturday,
} from "@/lib/utils";
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Lock, Clock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
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
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showSpendingHelp, setShowSpendingHelp] = useState(false);
  const [showScreenTimeHelp, setShowScreenTimeHelp] = useState(false);
  const [lifeChartData, setLifeChartData] = useState<any[]>([]);
  const [wealthChartData, setWealthChartData] = useState<any[]>([]);
  const [timeUntilSunday, setTimeUntilSunday] = useState("");
  const [hasSubmittedThisWeek, setHasSubmittedThisWeek] = useState(false);
  const [countdownTime, setCountdownTime] = useState("");

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

  const loadWeekData = useCallback(async () => {
    const weekSunday = getWeekSundayString(selectedWeek);
    const supabase = createClient();
    
    // Find weekly log for this week
    const { data: logs } = await supabase
      .from("logs")
      .select("activity_name, points")
      .eq("user_id", userId)
      .eq("category", "weekly")
      .gte("log_date", weekSunday)
      .lte("log_date", getWeekSaturday(selectedWeek).toISOString().split('T')[0])
      .order("log_date", { ascending: false })
      .limit(1);

    if (logs && logs.length > 0) {
      try {
        const weeklyData = JSON.parse(logs[0].activity_name);
        setScreenTime(weeklyData.screen_time?.toString() || "");
        setSpending(weeklyData.spending?.toString() || "");
        setHasSubmittedThisWeek(true);
        
        if (weeklyData.screen_time) {
          setLifeChartData(calculateLifeChart(weeklyData.screen_time));
        }
        if (weeklyData.spending) {
          setWealthChartData(calculateWealthChart(weeklyData.spending));
        }
      } catch (e) {
        console.error("Error parsing weekly data:", e);
      }
    } else {
      // Reset to defaults if no data
      setScreenTime("");
      setSpending("");
      setLifeChartData([]);
      setWealthChartData([]);
      setHasSubmittedThisWeek(false);
    }
  }, [selectedWeek, userId]);

  useEffect(() => {
    // Load data for selected week
    loadWeekData();
  }, [loadWeekData]);

  const navigateWeek = (direction: "prev" | "next" | "current") => {
    let newWeek: Date;
    
    if (direction === "current") {
      const activeWeek = getActiveWeek();
      newWeek = activeWeek.weekStart;
      setIsLocked(activeWeek.isLocked);
      setIsCurrentWeek(activeWeek.isCurrentWeek);
    } else {
      newWeek = new Date(selectedWeek);
      if (direction === "prev") {
        newWeek.setDate(selectedWeek.getDate() - 7);
      } else {
        newWeek.setDate(selectedWeek.getDate() + 7);
      }
      
      const newWeekSunday = getWeekSunday(newWeek);
      const today = new Date();
      const todayWeek = getWeekSunday(today);
      
      // Check if it's the current week
      const isCurrent = newWeekSunday.getTime() === todayWeek.getTime();
      const todayDayOfWeek = today.getDay();
      
      setIsCurrentWeek(isCurrent);
      setIsLocked(isCurrent && todayDayOfWeek !== 0);
      newWeek = newWeekSunday;
    }
    
    setSelectedWeek(newWeek);
  };

  const calculateLifeChart = (hoursPerDay: number) => {
    const totalYears = 60;
    const sleepAndWork = 40;
    const phoneUsage = (hoursPerDay * 365 * 60) / (365 * 24);
    const freeTime = Math.max(0, totalYears - sleepAndWork - phoneUsage);

    return [{
      name: "Your Life",
      "Sleep & Work": sleepAndWork,
      "Time Sent to the Void": phoneUsage,
      "Free Time Left": freeTime,
    }];
  };

  const calculateWealthChart = (weeklySpending: number) => {
    const years = 20;
    const data = [];
    let cashSpent = 0;
    let investmentValue = 0;
    const annualSpending = weeklySpending * 52;
    const rate = 0.08;

    for (let year = 0; year <= years; year++) {
      cashSpent += annualSpending;
      if (year > 0) {
        investmentValue = investmentValue * (1 + rate) + annualSpending;
      }
      data.push({
        year: `Year ${year}`,
        "Cash Spent": cashSpent,
        "Investment Potential": investmentValue,
      });
    }

    return data;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLocked) {
      alert("This week is locked. Come back on Sunday to complete your weekly ritual.");
      return;
    }

    const screenTimeNum = parseFloat(screenTime);
    const spendingNum = parseFloat(spending);

    if (isNaN(screenTimeNum) || isNaN(spendingNum) || screenTimeNum < 0 || spendingNum < 0) {
      alert("Please enter valid numbers.");
      return;
    }

    setLifeChartData(calculateLifeChart(screenTimeNum));
    setWealthChartData(calculateWealthChart(spendingNum));

    const wealthDestroyed = calculateWealthDestroyed(spendingNum);
    const lifeWasted = calculateLifeWasted(screenTimeNum);

    const wealthPenalty = Math.floor(wealthDestroyed / 100);
    const lifePenalty = Math.floor(lifeWasted * 10);
    const totalPenalty = -(wealthPenalty + lifePenalty);

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
      wealth_destroyed: wealthDestroyed,
      life_wasted: lifeWasted,
      week_start: weekSunday,
    });
    
    // Delete existing weekly log for this week if it exists
    const { data: existingLogs } = await supabase
      .from("logs")
      .select("id")
      .eq("user_id", userId)
      .eq("category", "weekly")
      .gte("log_date", weekSunday)
      .lte("log_date", getWeekSaturday(selectedWeek).toISOString().split('T')[0]);

    if (existingLogs && existingLogs.length > 0) {
      for (const log of existingLogs) {
        await supabase.from("logs").delete().eq("id", log.id);
      }
    }
    
    const { error } = await supabase.from("logs").insert({
      user_id: userId,
      activity_name: weeklyData,
      points: totalPenalty,
      category: "weekly",
      log_date: weekSunday, // Store with week's Sunday date
    });

    if (error) {
      console.error("Error logging weekly ritual:", error);
      alert(`Failed to submit: ${error.message}. Please try again.`);
      return;
    }

    setIsSubmitted(true);
    setHasSubmittedThisWeek(true);
    
    // Reload data to show the submitted state
    loadWeekData();
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      if (payload[0].dataKey === "Investment Potential") {
        const cashSpent = payload.find((p: any) => p.dataKey === "Cash Spent")?.value || 0;
        const investmentValue = payload.find((p: any) => p.dataKey === "Investment Potential")?.value || 0;
        const difference = investmentValue - cashSpent;
        return (
          <div className="bg-dark-card border border-dark-border rounded p-2 text-white text-xs">
            <p>You spent ${cashSpent.toFixed(0)}, but you cost your future self ${difference.toFixed(0)}.</p>
          </div>
        );
      }
    }
    return null;
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
          {isLocked && isCurrentWeek && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center gap-2 mt-2 text-yellow-400"
            >
              <Lock className="w-4 h-4" />
              <span className="text-sm sm:text-base">Come back Sunday to check in</span>
              {timeUntilSunday && (
                <span className="text-xs sm:text-sm text-gray-400 ml-2">
                  ({timeUntilSunday})
                </span>
              )}
            </motion.div>
          )}
        </div>
        
        <button
          onClick={() => navigateWeek("next")}
          disabled={!canGoNext}
          className="p-2 hover:bg-dark-card rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Form Section or Countdown */}
        <div className="bg-dark-card border border-dark-border rounded-2xl p-4 sm:p-6">
          {hasSubmittedThisWeek && isOnCurrentWeek ? (
            // Show countdown timer after submission
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-6"
            >
              <div className="text-4xl mb-4">✅</div>
              <h3 className="text-xl sm:text-2xl font-semibold text-white mb-2">
                Weekly Ritual Complete
              </h3>
              <p className="text-gray-400 mb-6">
                You&apos;ve completed your weekly check-in for this week.
              </p>
              <div className="bg-dark-bg border border-dark-border rounded-xl p-6">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-blue-400" />
                  <span className="text-sm text-gray-400">Next ritual available in:</span>
                </div>
                <div className="text-3xl sm:text-4xl font-bold text-blue-400 font-mono">
                  {countdownTime || timeUntilSunday}
                </div>
                <p className="text-xs text-gray-500 mt-4">
                  Come back on Sunday to complete your next weekly ritual
                </p>
              </div>
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
                  if (e.target.value) {
                    setLifeChartData(calculateLifeChart(parseFloat(e.target.value) || 0));
                  }
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
                  if (e.target.value) {
                    setWealthChartData(calculateWealthChart(parseFloat(e.target.value) || 0));
                  }
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
              disabled={isSubmitted || isLocked}
              className="w-full py-3 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              {isLocked ? (
                <span className="flex items-center justify-center gap-2">
                  <Lock className="w-4 h-4" />
                  Locked
                </span>
              ) : isSubmitted ? (
                "Submitted ✓"
              ) : (
                "Face Reality"
              )}
            </button>
          </form>
          )}
        </div>

        {/* Charts Section */}
        <div className="space-y-4 sm:space-y-6">
          {/* Life Chart */}
          <div className="bg-dark-card border border-dark-border rounded-2xl p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">The Life You Are Losing</h3>
            {lifeChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={lifeChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis type="number" domain={[0, 60]} stroke="#9CA3AF" />
                  <YAxis dataKey="name" type="category" stroke="#9CA3AF" width={80} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', color: '#fff' }}
                    formatter={(value: any) => `${value.toFixed(1)} years`}
                  />
                  <Bar dataKey="Sleep & Work" stackId="a" fill="#10b981" />
                  <Bar dataKey="Time Sent to the Void" stackId="a" fill="#ef4444" />
                  <Bar dataKey="Free Time Left" stackId="a" fill="#fbbf24" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-gray-500 text-sm">
                Enter screen time to see visualization
              </div>
            )}
          </div>

          {/* Wealth Chart */}
          <div className="bg-dark-card border border-dark-border rounded-2xl p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">The Wealth You Burned</h3>
            {wealthChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={wealthChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="year" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="Cash Spent" 
                    stackId="1" 
                    stroke="#ef4444" 
                    fill="#ef4444" 
                    fillOpacity={0.6}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="Investment Potential" 
                    stackId="2" 
                    stroke="#10b981" 
                    fill="#10b981" 
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-gray-500 text-sm">
                Enter spending to see visualization
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
