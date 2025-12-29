"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { getTodayDateString } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Dumbbell, BookOpen, Users, Brain, Moon, Check, Plus, Minus, Apple } from "lucide-react";
import ConfettiParticles from "./ConfettiParticles";
import { playCoinSound } from "@/lib/sounds";
import DailyProgressBar from "./DailyProgressBar";

interface DailyQuestProps {
  userId: string;
}

interface Quest {
  name: string;
  icon: React.ReactNode;
  category: string;
  points: number;
  stat: string;
  color: string;
  goal: string;
  type: "binary" | "number" | "sleep";
}

const quests: Quest[] = [
  // STR: Physical strength from workouts (penalty if not done)
  { name: "Workout", icon: <Dumbbell />, category: "workout", points: 20, stat: "STR", color: "blue", goal: "1 hour workout", type: "binary" },
  
  // INT: Mental growth from reading (positive only, no cap, low return)
  { name: "Read", icon: <BookOpen />, category: "reading", points: 0, stat: "INT", color: "cyan", goal: "Pages read", type: "number" },
  
  // CHA: Social connections (no cap, medium return per person)
  { name: "Connections", icon: <Users />, category: "social", points: 0, stat: "CHA", color: "green", goal: "People met", type: "number" },
  
  // WIL: Discipline and self-control
  { name: "Sleep", icon: <Moon />, category: "sleep", points: 0, stat: "WIL", color: "indigo", goal: "Hours slept", type: "sleep" },
  { name: "Meditate", icon: <Brain />, category: "meditation", points: 10, stat: "WIL", color: "purple", goal: "Meditation", type: "binary" },
  { name: "Diet", icon: <Apple />, category: "diet", points: 20, stat: "WIL", color: "orange", goal: "All natural foods today", type: "binary" },
];

export default function DailyQuest({ userId }: DailyQuestProps) {
  const [todayCompleted, setTodayCompleted] = useState<Set<string>>(new Set());
  const [values, setValues] = useState<Map<string, number>>(new Map());
  const [animating, setAnimating] = useState<string | null>(null);
  const [confettiTrigger, setConfettiTrigger] = useState<string | null>(null);
  const [today, setToday] = useState(getTodayDateString());
  const [dailyAffirmation, setDailyAffirmation] = useState<string>("");
  const isDeletingRef = useRef(false); // Use ref to prevent useEffect from overwriting during delete (refs don't trigger re-renders)
  const recentlyDeletedRef = useRef<Set<string>>(new Set()); // Track recently deleted categories

  useEffect(() => {
    const checkDate = () => {
      const currentToday = getTodayDateString();
      // Only update if the new date is different AND not in the past
      // Compare dates to ensure we never go backwards
      if (currentToday !== today) {
        // Parse dates to compare
        const currentDate = new Date(currentToday + 'T00:00:00');
        const storedDate = new Date(today + 'T00:00:00');
        
        // Only update if current date is >= stored date (never go backwards)
        if (currentDate >= storedDate) {
          setToday(currentToday);
          setTodayCompleted(new Set());
          setValues(new Map());
        }
      }
    };

    checkDate();
    const interval = setInterval(checkDate, 60000);

    async function loadTodayLogs() {
      const supabase = createClient();
      
      // Load daily affirmation (handle case where table might not exist)
      try {
        const { data: journalData, error: journalError } = await supabase
          .from("journal_logs")
          .select("morning_intention")
          .eq("user_id", userId)
          .eq("date", today)
          .maybeSingle();
        
        if (journalError && !journalError.message.includes("does not exist")) {
          console.error("Error loading journal:", journalError);
        }
        
        if (journalData?.morning_intention) {
          setDailyAffirmation(journalData.morning_intention);
        } else {
          setDailyAffirmation("");
        }
      } catch (e) {
        // Table might not exist yet, just continue without affirmation
        console.error("Journal table not available:", e);
        setDailyAffirmation("");
      }
      
      // Load habit logs (skip if we're in the middle of deleting to prevent overwriting state)
      if (!isDeletingRef.current) {
        const { data } = await supabase
          .from("logs")
          .select("category, value, points")
          .eq("user_id", userId)
          .eq("log_date", today);

        if (data) {
          const todaySet = new Set<string>();
          const valuesMap = new Map<string, number>();
          
          data.forEach((log) => {
            // Skip categories that were recently deleted (prevent race condition)
            if (!recentlyDeletedRef.current.has(log.category)) {
              todaySet.add(log.category);
              
              // Convert to number, default to 8 for sleep, 0 for others
              const numValue = Number(log.value);
              if (log.category === "sleep") {
                // Sleep defaults to 8 if no value or 0
                valuesMap.set(log.category, (numValue > 0 && !isNaN(numValue)) ? numValue : 8);
              } else {
                valuesMap.set(log.category, numValue || 0);
              }
            }
          });
          
          // Only update state if we have data (don't overwrite with empty if we're deleting)
          if (todaySet.size > 0 || data.length === 0) {
            setTodayCompleted(todaySet);
            setValues(valuesMap);
          }
        } else {
          // No data found - only clear if we're not deleting
          if (recentlyDeletedRef.current.size === 0) {
            setTodayCompleted(new Set());
            setValues(new Map());
          }
        }
      }
    }

    loadTodayLogs();

    return () => clearInterval(interval);
  }, [userId, today]); // Don't include isDeleting ref - it doesn't need to trigger re-renders

  const calculatePoints = (quest: Quest, value: number): number => {
    if (quest.type === "binary") {
      return quest.points;
    } else if (quest.type === "number") {
      if (quest.category === "reading") {
        // Positive only, no cap, low return: 0.5 points per page
        return Math.floor(value * 0.5);
      } else if (quest.category === "social") {
        // No cap, medium return: 6 points per person
        return value * 6;
      }
    } else if (quest.type === "sleep") {
      // Tiered sleep scoring:
      // 8 hours = Optimal (30 pts)
      // 9 hours = Better (35 pts)
      // 7 hours = Slight gain (10 pts) or no effect (0 pts) - let's do slight gain
      // 10-11 hours = Tapering (15 pts, then 10 pts)
      // 12+ hours = Tapering more (5 pts)
      // <7 hours = Tiered penalties (greater as it goes down)
      if (value === 8) {
        return 30; // Optimal
      } else if (value === 9) {
        return 35; // Better
      } else if (value === 7) {
        return 10; // Slight gain
      } else if (value === 10) {
        return 15; // Tapering
      } else if (value === 11) {
        return 10; // Tapering more
      } else if (value >= 12) {
        return 5; // Tapering significantly
      } else if (value >= 6 && value < 7) {
        return -5; // Small penalty
      } else if (value >= 5 && value < 6) {
        return -15; // Medium penalty
      } else if (value >= 4 && value < 5) {
        return -25; // Large penalty
      } else if (value < 4) {
        return -40; // Severe penalty
      }
    }
    return 0;
  };

  const handleSubmit = async (quest: Quest, value?: number) => {
    const inputValue = value !== undefined ? value : (quest.type === "binary" ? 1 : (values.get(quest.category) || 0));
    
    if (quest.type !== "binary" && inputValue <= 0) {
      alert(`Please enter a valid ${quest.goal.toLowerCase()}.`);
      return;
    }

    const points = calculatePoints(quest, inputValue);
    const isCompleted = todayCompleted.has(quest.category);

    // Allow uncompleting for all types (binary, number, sleep)
    if (isCompleted) {
      console.log("Uncompleting habit:", quest.category, "for date:", today);
      
      // Set ref flag to prevent useEffect from overwriting our state
      isDeletingRef.current = true;
      recentlyDeletedRef.current.add(quest.category);
      
      // Toggle off - delete the log and subtract points
      const supabase = createClient();
      
      // First, find the log to delete
      const { data: logs, error: fetchError } = await supabase
        .from("logs")
        .select("id, points, value")
        .eq("user_id", userId)
        .eq("category", quest.category)
        .eq("log_date", today)
        .limit(1);
      
      if (fetchError) {
        console.error("Error fetching log to delete:", fetchError);
        alert(`Failed to uncomplete habit: ${fetchError.message}`);
        isDeletingRef.current = false;
        recentlyDeletedRef.current.delete(quest.category);
        return;
      }
      
      if (!logs || logs.length === 0) {
        console.warn("No log found to delete, but state says completed. Clearing state.");
        // Log not found, but state says completed - clear the state anyway
        const newTodayCompleted = new Set(todayCompleted);
        newTodayCompleted.delete(quest.category);
        setTodayCompleted(newTodayCompleted);
        
        if (quest.type !== "binary") {
          const newValues = new Map(values);
          if (quest.type === "sleep") {
            newValues.set(quest.category, 8);
          } else {
            newValues.set(quest.category, 0);
          }
          setValues(newValues);
        }
        isDeletingRef.current = false;
        recentlyDeletedRef.current.delete(quest.category);
        return;
      }
      
      const logToDelete = logs[0];
      console.log("Deleting log:", logToDelete.id, "Category:", quest.category, "Points:", logToDelete.points);
      
      // Delete the log (trigger will handle point subtraction)
      const { data: deletedData, error: deleteError } = await supabase
        .from("logs")
        .delete()
        .eq("id", logToDelete.id)
        .select(); // Return deleted row to verify
      
      if (deleteError) {
        console.error("Error deleting log:", deleteError);
        alert(`Failed to uncomplete habit: ${deleteError.message}`);
        isDeletingRef.current = false;
        recentlyDeletedRef.current.delete(quest.category);
        return;
      }
      
      // Verify the delete actually worked
      if (!deletedData || deletedData.length === 0) {
        console.error("Delete returned no data - log may not have been deleted");
        alert("Failed to uncomplete habit: Delete operation returned no data. Please try again.");
        isDeletingRef.current = false;
        recentlyDeletedRef.current.delete(quest.category);
        return;
      }
      
      console.log("Log deleted successfully:", deletedData);
      
      // Double-check by querying if the log still exists
      const { data: verifyDelete } = await supabase
        .from("logs")
        .select("id")
        .eq("id", logToDelete.id)
        .maybeSingle();
      
      if (verifyDelete) {
        console.error("WARNING: Log still exists after delete! This may be an RLS issue.");
        alert("Delete may have failed. Please refresh the page and try again.");
        isDeletingRef.current = false;
        recentlyDeletedRef.current.delete(quest.category);
        return;
      }
      
      console.log("Delete verified - log no longer exists in database");
      
      // Update local state immediately (optimistic update) - DON'T reload from DB
      const newTodayCompleted = new Set(todayCompleted);
      newTodayCompleted.delete(quest.category);
      setTodayCompleted(newTodayCompleted);
      
      // Clear the value for number/sleep inputs
      if (quest.type !== "binary") {
        const newValues = new Map(values);
        if (quest.type === "sleep") {
          newValues.set(quest.category, 8);
        } else {
          newValues.set(quest.category, 0);
        }
        setValues(newValues);
      }
      
      // Clear the flag after a delay (don't reload from DB - trust the delete worked)
      setTimeout(() => {
        isDeletingRef.current = false;
        // Keep it in recentlyDeleted for a bit longer to prevent accidental reload
        setTimeout(() => {
          recentlyDeletedRef.current.delete(quest.category);
        }, 2000);
      }, 500);
      
      return;
    }

    const supabase = createClient();
    const currentToday = getTodayDateString();
    
    // Ensure user exists in users table (create if needed)
    const { data: userCheck, error: userCheckError } = await supabase
      .from("users")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (!userCheck && !userCheckError) {
      // User doesn't exist, try to create it
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error: createError } = await supabase.from("users").insert({
          id: user.id,
          username: user.email?.split("@")[0] || "Hero",
        });
        
        if (createError && !createError.message.includes("duplicate")) {
          console.error("Error creating user profile:", createError);
          alert("Failed to create user profile. Please refresh the page.");
          return;
        }
      } else {
        alert("Please log in again.");
        return;
      }
    }
    
    // Check if log already exists
    const { data: existingLog } = await supabase
      .from("logs")
      .select("id")
      .eq("user_id", userId)
      .eq("category", quest.category)
      .eq("log_date", currentToday)
      .maybeSingle();

    let error;
    if (existingLog) {
      // Update existing log
      const { error: updateError } = await supabase
        .from("logs")
        .update({
          activity_name: quest.name,
          points: points,
          value: quest.type === "sleep" ? parseFloat(inputValue.toString()) : Math.floor(Number(inputValue)),
        })
        .eq("id", existingLog.id);

      error = updateError;
    } else {
      // Insert new log
      const { error: insertError } = await supabase
        .from("logs")
        .insert({
          user_id: userId,
          activity_name: quest.name,
          points: points,
          category: quest.category,
          log_date: currentToday,
          value: quest.type === "sleep" ? parseFloat(inputValue.toString()) : Math.floor(Number(inputValue)),
        });

      error = insertError;
    }

    if (error) {
      console.error("Error logging quest:", error);
      alert(`Failed to save: ${error.message}. Please try again.`);
      return;
    }

    // Play sound and trigger confetti
    if (points > 0) {
      playCoinSound();
      setConfettiTrigger(quest.category);
    }

    const newTodayCompleted = new Set(todayCompleted);
    newTodayCompleted.add(quest.category);
    setTodayCompleted(newTodayCompleted);
    
    const newValues = new Map(values);
    newValues.set(quest.category, inputValue);
    setValues(newValues);
    
    setAnimating(quest.category);

    setTimeout(() => {
      setAnimating(null);
      setConfettiTrigger(null);
    }, 1000);
  };

  const getColorClasses = (color: string, isCompleted: boolean) => {
    if (isCompleted) {
      switch (color) {
        case "blue": return "bg-gradient-to-br from-blue-500 to-blue-600";
        case "cyan": return "bg-gradient-to-br from-cyan-500 to-cyan-600";
        case "green": return "bg-gradient-to-br from-green-500 to-green-600";
        case "purple": return "bg-gradient-to-br from-purple-500 to-purple-600";
        case "indigo": return "bg-gradient-to-br from-indigo-500 to-indigo-600";
        case "orange": return "bg-gradient-to-br from-orange-500 to-orange-600";
        default: return "bg-gradient-to-br from-blue-500 to-blue-600";
      }
    }
    return "bg-dark-card hover:bg-[#293548] border border-dark-border";
  };

  const getStatusColor = (quest: Quest, value: number) => {
    if (quest.type === "sleep") {
      if (value === 8 || value === 9) return "text-green-400";
      if (value === 7) return "text-blue-400";
      if (value >= 10 && value <= 11) return "text-yellow-400";
      if (value >= 12) return "text-gray-400";
      if (value < 7) return "text-red-400";
      return "text-gray-400";
    }
    return "text-gray-400";
  };

  // Format today's date for display
  const formatDisplayDate = (dateString: string): string => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-semibold text-white">Daily Habits</h2>
        <div className="text-sm sm:text-base text-gray-400 font-medium">
          {formatDisplayDate(today)}
        </div>
      </div>
      
      {/* Daily Affirmation Display */}
      {dailyAffirmation && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 sm:p-4 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-xl"
        >
          <div className="text-xs sm:text-sm text-blue-300 mb-1 font-medium">Today&apos;s Affirmation</div>
          <div className="text-sm sm:text-base text-white italic">&quot;{dailyAffirmation}&quot;</div>
        </motion.div>
      )}
      
      {/* Daily Progress Bar */}
      <DailyProgressBar userId={userId} />
      
      {/* Row 1: Binary habits (Workout, Meditate, Diet) - 3 columns */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-3">
        {quests.filter(q => q.type === "binary").map((quest) => {
          const isCompleted = todayCompleted.has(quest.category);
          const isAnimating = animating === quest.category;
          const isConfetti = confettiTrigger === quest.category;

          return (
            <motion.div
              key={quest.category}
              whileHover={!isCompleted ? { scale: 1.02, y: -2 } : {}}
              className={`rounded-xl p-2 sm:p-2.5 flex flex-col transition-all relative overflow-hidden min-h-[100px] ${
                getColorClasses(quest.color, isCompleted)
              }`}
            >
              {isConfetti && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <ConfettiParticles trigger={true} color={quest.color} />
                </div>
              )}

              {/* Icon and Title */}
              <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                <div className={`${isCompleted ? "text-white" : "text-gray-400"} text-sm sm:text-base`}>
                  {quest.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-[10px] sm:text-xs font-semibold ${isCompleted ? "text-white" : "text-white"} truncate`}>
                    {quest.name}
                  </div>
                </div>
              </div>

              {/* Binary Button */}
              <motion.button
                onClick={() => handleSubmit(quest)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                animate={
                  isAnimating && !isCompleted
                    ? { scale: [0.9, 1.1, 1] }
                    : {}
                }
                className={`mt-auto py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-semibold transition-all ${
                  isCompleted
                    ? "bg-white/20 text-white"
                    : "bg-white/10 hover:bg-white/20 text-white"
                }`}
              >
                {isCompleted ? (
                  <div className="flex items-center justify-center gap-1">
                    <Check className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span>Completed</span>
                  </div>
                ) : (
                  "Complete"
                )}
              </motion.button>
            </motion.div>
          );
        })}
      </div>

      {/* Row 2: Number inputs (Read, Connections) - 2 columns */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-3">
        {quests.filter(q => q.type === "number").map((quest) => {
          const isCompleted = todayCompleted.has(quest.category);
          const currentValue = values.get(quest.category) || 0;
          const isAnimating = animating === quest.category;
          const isConfetti = confettiTrigger === quest.category;
          const points = calculatePoints(quest, currentValue);

          return (
            <motion.div
              key={quest.category}
              whileHover={!isCompleted ? { scale: 1.02, y: -2 } : {}}
              className={`rounded-xl p-2.5 sm:p-3 flex flex-col transition-all relative overflow-hidden min-h-[120px] ${
                getColorClasses(quest.color, isCompleted)
              }`}
            >
              {isConfetti && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <ConfettiParticles trigger={true} color={quest.color} />
                </div>
              )}

              {/* Icon and Title */}
              <div className="flex items-center gap-2 mb-2">
                <div className={`${isCompleted ? "text-white" : "text-gray-400"} text-base sm:text-lg`}>
                  {quest.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-xs sm:text-sm font-semibold ${isCompleted ? "text-white" : "text-white"} truncate`}>
                    {quest.name}
                  </div>
                  <div className={`text-[10px] sm:text-xs ${isCompleted ? "text-white/80" : "text-gray-400"} line-clamp-1`}>
                    {quest.goal}
                  </div>
                </div>
              </div>

              {/* Number Input Section */}
              {isCompleted ? (
                <div className="mt-auto space-y-2">
                  <div className="text-center">
                    <div className="text-lg font-bold text-white mb-1">
                      {currentValue} {quest.category === "reading" ? "Pages" : "People"}
                    </div>
                  </div>
                  <motion.button
                    onClick={() => handleSubmit(quest, currentValue)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 text-white"
                  >
                    <Check className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span>Completed</span>
                  </motion.button>
                </div>
              ) : (
                <div className="mt-auto space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        const newValue = Math.max(0, currentValue - 1);
                        setValues(new Map(values).set(quest.category, newValue));
                      }}
                      className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors flex-shrink-0"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <div className="flex-1 text-center">
                      {currentValue > 0 ? (
                        <div className="text-lg font-bold text-white">{currentValue}</div>
                      ) : (
                        <div className="text-sm text-white/40">
                          {quest.category === "reading" ? "Pages" : "People"}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        const newValue = currentValue + 1;
                        setValues(new Map(values).set(quest.category, newValue));
                      }}
                      className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors flex-shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <motion.button
                    onClick={() => handleSubmit(quest, currentValue)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={currentValue <= 0}
                    className={`w-full py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                      currentValue > 0
                        ? "bg-white/20 hover:bg-white/30 text-white"
                        : "bg-white/5 text-white/40 cursor-not-allowed"
                    }`}
                  >
                    <Check className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span>Save</span>
                  </motion.button>
                </div>
              )}
            </motion.div>
            );
          })}
      </div>

      {/* Row 3: Sleep - Full width */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4">
        {quests.filter(q => q.type === "sleep").map((quest) => {
          const isCompleted = todayCompleted.has(quest.category);
          const currentValue = values.get(quest.category) || 0;
          const isAnimating = animating === quest.category;
          const isConfetti = confettiTrigger === quest.category;
          const points = calculatePoints(quest, currentValue);

          return (
            <motion.div
              key={quest.category}
              whileHover={!isCompleted ? { scale: 1.02, y: -2 } : {}}
              className={`rounded-xl p-2.5 sm:p-3 flex flex-col transition-all relative overflow-hidden min-h-[120px] ${
                getColorClasses(quest.color, isCompleted)
              }`}
            >
              {isConfetti && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <ConfettiParticles trigger={true} color={quest.color} />
                </div>
              )}

              {/* Icon and Title */}
              <div className="flex items-center gap-2 mb-2">
                <div className={`${isCompleted ? "text-white" : "text-gray-400"} text-base sm:text-lg`}>
                  {quest.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-xs sm:text-sm font-semibold ${isCompleted ? "text-white" : "text-white"} truncate`}>
                    {quest.name}
                  </div>
                  <div className={`text-[10px] sm:text-xs ${isCompleted ? "text-white/80" : "text-gray-400"} line-clamp-1`}>
                    {quest.goal}
                  </div>
                </div>
              </div>

              {/* Sleep Input */}
              {isCompleted ? (
                <div className="mt-auto space-y-2">
                  <div className="text-center">
                    <div className="text-lg font-bold text-white mb-1">
                      {currentValue || 8} Hours
                    </div>
                  </div>
                  <motion.button
                    onClick={() => handleSubmit(quest, currentValue || 8)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 text-white"
                  >
                    <Check className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span>Completed</span>
                  </motion.button>
                </div>
              ) : (
                <div className="mt-auto space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        const newValue = Math.max(0, (currentValue || 8) - 0.5);
                        setValues(new Map(values).set(quest.category, newValue));
                      }}
                      className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors flex-shrink-0"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      value={currentValue > 0 ? currentValue : ""}
                      onChange={(e) => {
                        const val = e.target.value === "" ? 8 : parseFloat(e.target.value);
                        if (!isNaN(val) && val >= 0 && val <= 24) {
                          setValues(new Map(values).set(quest.category, val));
                        }
                      }}
                      className="flex-1 px-2 py-1.5 bg-transparent border-b-2 border-white/20 focus:border-white/50 text-white text-center text-sm font-semibold focus:outline-none transition-colors"
                      placeholder="8"
                      min="0"
                      max="24"
                      step="0.5"
                    />
                    <button
                      onClick={() => {
                        const newValue = (currentValue || 8) + 0.5;
                        setValues(new Map(values).set(quest.category, newValue));
                      }}
                      className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors flex-shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  {currentValue > 0 && (
                    <div className={`text-[10px] sm:text-xs text-center font-medium ${getStatusColor(quest, currentValue)}`}>
                      {currentValue === 8
                        ? "✓ Optimal Sleep (+30 pts)"
                        : currentValue === 9
                        ? "✓✓ Better Sleep (+35 pts)"
                        : currentValue === 7
                        ? "✓ Slight Gain (+10 pts)"
                        : currentValue === 10
                        ? "Tapering (+15 pts)"
                        : currentValue === 11
                        ? "Tapering (+10 pts)"
                        : currentValue >= 12
                        ? "Tapering (+5 pts)"
                        : currentValue >= 6 && currentValue < 7
                        ? "⚠ Small Penalty (-5 pts)"
                        : currentValue >= 5 && currentValue < 6
                        ? "⚠ Medium Penalty (-15 pts)"
                        : currentValue >= 4 && currentValue < 5
                        ? "⚠ Large Penalty (-25 pts)"
                        : currentValue < 4
                        ? "⚠ Severe Penalty (-40 pts)"
                        : ""}
                    </div>
                  )}
                  <motion.button
                    onClick={() => handleSubmit(quest, currentValue || 8)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={currentValue <= 0}
                    className={`w-full py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                      currentValue > 0
                        ? "bg-white/20 hover:bg-white/30 text-white"
                        : "bg-white/5 text-white/40 cursor-not-allowed"
                    }`}
                  >
                    <Check className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span>Save</span>
                  </motion.button>
                </div>
              )}

                <AnimatePresence>
                  {isAnimating && !isCompleted && (
                    <motion.div
                      initial={{ opacity: 1, y: 0, scale: 1 }}
                      animate={{ opacity: 0, y: -20, scale: 1.2 }}
                      exit={{ opacity: 0 }}
                      className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10"
                    >
                      <div className="text-white font-bold text-lg">
                        +{points}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
      </div>
    </div>
  );
}
