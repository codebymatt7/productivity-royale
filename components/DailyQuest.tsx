"use client";

import { useState, useEffect } from "react";
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
  { name: "Sleep", icon: <Moon />, category: "sleep", points: 0, stat: "WIL", color: "purple", goal: "Hours slept", type: "sleep" },
  { name: "Meditate", icon: <Brain />, category: "meditation", points: 10, stat: "WIL", color: "purple", goal: "Meditation", type: "binary" },
  { name: "Diet", icon: <Apple />, category: "diet", points: 20, stat: "WIL", color: "orange", goal: "All natural foods today", type: "binary" },
];

export default function DailyQuest({ userId }: DailyQuestProps) {
  const [todayCompleted, setTodayCompleted] = useState<Set<string>>(new Set());
  const [values, setValues] = useState<Map<string, number>>(new Map());
  const [animating, setAnimating] = useState<string | null>(null);
  const [confettiTrigger, setConfettiTrigger] = useState<string | null>(null);
  const [today, setToday] = useState(getTodayDateString());

  useEffect(() => {
    const checkDate = () => {
      const currentToday = getTodayDateString();
      if (currentToday !== today) {
        setToday(currentToday);
        setTodayCompleted(new Set());
        setValues(new Map());
      }
    };

    checkDate();
    const interval = setInterval(checkDate, 60000);

    async function loadTodayLogs() {
      const supabase = createClient();
      const { data } = await supabase
        .from("logs")
        .select("category, value, points")
        .eq("user_id", userId)
        .eq("log_date", today);

      if (data) {
        const todaySet = new Set(data.map((log) => log.category));
        setTodayCompleted(todaySet);
        
        const valuesMap = new Map<string, number>();
        data.forEach((log) => {
          valuesMap.set(log.category, log.value || 0);
        });
        setValues(valuesMap);
      }
    }

    loadTodayLogs();

    return () => clearInterval(interval);
  }, [userId, today]);

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

    if (isCompleted && quest.type === "binary") {
      // Toggle off for binary
      const newTodayCompleted = new Set(todayCompleted);
      newTodayCompleted.delete(quest.category);
      setTodayCompleted(newTodayCompleted);
      
      const supabase = createClient();
      const { data: logs } = await supabase
        .from("logs")
        .select("id")
        .eq("user_id", userId)
        .eq("category", quest.category)
        .eq("log_date", today)
        .limit(1);
      
      if (logs && logs[0]) {
        await supabase.from("logs").delete().eq("id", logs[0].id);
      }
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
          value: inputValue,
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
          value: inputValue,
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

  return (
    <div className="p-4 sm:p-6">
      <h2 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6 text-white">Daily Habits</h2>
      
      {/* Daily Progress Bar */}
      <DailyProgressBar userId={userId} />
      
      {/* 2-Column Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {quests.map((quest) => {
          const isCompleted = todayCompleted.has(quest.category);
          const currentValue = values.get(quest.category) || 0;
          const isAnimating = animating === quest.category;
          const isConfetti = confettiTrigger === quest.category;
          const points = calculatePoints(quest, currentValue);

          return (
            <motion.div
              key={quest.category}
              whileHover={!isCompleted ? { scale: 1.02, y: -2 } : {}}
              className={`rounded-2xl p-4 sm:p-6 flex flex-col transition-all relative overflow-hidden ${
                getColorClasses(quest.color, isCompleted)
              }`}
            >
              {isConfetti && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <ConfettiParticles trigger={true} color={quest.color} />
                </div>
              )}

              {/* Icon and Title */}
              <div className="flex items-center gap-3 mb-4">
                <div className={`${isCompleted ? "text-white" : "text-gray-400"} text-xl sm:text-2xl`}>
                  {quest.icon}
                </div>
                <div>
                  <div className={`text-base sm:text-lg font-semibold ${isCompleted ? "text-white" : "text-white"}`}>
                    {quest.name}
                  </div>
                  <div className={`text-xs sm:text-sm ${isCompleted ? "text-white/80" : "text-gray-400"}`}>
                    {quest.goal}
                  </div>
                </div>
              </div>

              {/* Input Section */}
              {quest.type === "binary" ? (
                <motion.button
                  onClick={() => handleSubmit(quest)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  animate={
                    isAnimating && !isCompleted
                      ? { scale: [0.9, 1.1, 1] }
                      : {}
                  }
                  className={`mt-auto py-3 rounded-xl font-semibold transition-all ${
                    isCompleted
                      ? "bg-white/20 text-white"
                      : "bg-white/10 hover:bg-white/20 text-white"
                  }`}
                >
                  {isCompleted ? (
                    <div className="flex items-center justify-center gap-2">
                      <Check className="w-5 h-5" />
                      <span>Completed</span>
                    </div>
                  ) : (
                    "Complete"
                  )}
                </motion.button>
              ) : quest.type === "number" ? (
                <div className="mt-auto space-y-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const newValue = Math.max(0, currentValue - 1);
                        setValues(new Map(values).set(quest.category, newValue));
                      }}
                      className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      value={currentValue}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setValues(new Map(values).set(quest.category, val));
                      }}
                      className="flex-1 px-3 py-2 bg-transparent border-b-2 border-white/20 focus:border-white/50 text-white text-center text-lg font-semibold focus:outline-none transition-colors"
                      placeholder="0"
                      min="0"
                    />
                    <button
                      onClick={() => {
                        const newValue = currentValue + 1;
                        setValues(new Map(values).set(quest.category, newValue));
                      }}
                      className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  {currentValue > 0 && (
                    <div className="text-xs text-white/80 text-center">
                      Total {quest.category === "reading" ? "Pages" : "People"}: {currentValue}
                      <div className="text-blue-400 mt-1">
                        {quest.category === "reading"
                          ? `+${Math.floor(currentValue * 0.5)} pts (0.5/pt, no cap)`
                          : `+${currentValue * 6} pts (6/pt, no cap)`}
                      </div>
                    </div>
                  )}
                  <motion.button
                    onClick={() => handleSubmit(quest, currentValue)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={currentValue <= 0}
                    className={`w-full py-2.5 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                      currentValue > 0
                        ? "bg-white/20 hover:bg-white/30 text-white"
                        : "bg-white/5 text-white/40 cursor-not-allowed"
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    <span>Save</span>
                  </motion.button>
                </div>
              ) : quest.type === "sleep" ? (
                <div className="mt-auto space-y-3">
                  <input
                    type="number"
                    value={currentValue || ""}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setValues(new Map(values).set(quest.category, val));
                    }}
                    className="w-full px-3 py-2 bg-transparent border-b-2 border-white/20 focus:border-white/50 text-white text-center text-lg font-semibold focus:outline-none transition-colors"
                    placeholder="Hours"
                    min="0"
                    max="24"
                    step="0.5"
                  />
                  {currentValue > 0 && (
                    <div className={`text-xs text-center font-medium ${getStatusColor(quest, currentValue)}`}>
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
                    onClick={() => handleSubmit(quest, currentValue)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={currentValue <= 0}
                    className={`w-full py-2.5 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                      currentValue > 0
                        ? "bg-white/20 hover:bg-white/30 text-white"
                        : "bg-white/5 text-white/40 cursor-not-allowed"
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    <span>Save</span>
                  </motion.button>
                </div>
              ) : null}

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
