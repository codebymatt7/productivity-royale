"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getTodayDateString } from "@/lib/utils";
import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";

interface DailyProgressBarProps {
  userId: string;
}

const DAILY_GOAL = 200; // Stretch goal that allows for above-and-beyond days (networking events, heavy reading, etc.)

export default function DailyProgressBar({ userId }: DailyProgressBarProps) {
  const [todayPoints, setTodayPoints] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const today = getTodayDateString();

  useEffect(() => {
    async function loadTodayPoints() {
      const supabase = createClient();
      const { data } = await supabase
        .from("logs")
        .select("points, value")
        .eq("user_id", userId)
        .eq("log_date", today)
        .neq("category", "penalty")
        .neq("category", "weekly");

      if (data) {
        const total = data.reduce((sum, log) => sum + log.points, 0);
        setTodayPoints(total);
        setIsComplete(total >= DAILY_GOAL);
      }
    }

    loadTodayPoints();
    const interval = setInterval(loadTodayPoints, 2000);
    return () => clearInterval(interval);
  }, [userId, today]);

  // Calculate percentage, but allow it to go over 100% for above-and-beyond days
  const percentage = Math.min((todayPoints / DAILY_GOAL) * 100, 100);

  return (
    <div className="mb-4 sm:mb-6">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-gray-400">Daily Progress</div>
        <div className="text-sm font-semibold text-white">
          {todayPoints} / {DAILY_GOAL} pts
          {todayPoints > DAILY_GOAL && (
            <span className="ml-2 text-yellow-400">🔥 Above & Beyond!</span>
          )}
        </div>
      </div>
      <div className="relative w-full h-4 sm:h-5 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={`h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full ${
            isComplete ? "from-yellow-500 to-yellow-400" : ""
          }`}
        />
        {isComplete && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 border-2 border-yellow-400 rounded-full"
            style={{
              boxShadow: "0 0 20px rgba(250, 204, 21, 0.6)",
              animation: "pulse 2s infinite",
            }}
          />
        )}
        {/* Show overflow indicator if they exceed goal */}
        {todayPoints > DAILY_GOAL && (
          <div className="absolute right-0 top-0 bottom-0 w-1 bg-yellow-400/50" />
        )}
      </div>
      {isComplete && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 mt-2 text-yellow-400 text-sm"
        >
          <CheckCircle className="w-4 h-4" />
          <span className="font-semibold">Day Complete! 🎉</span>
        </motion.div>
      )}
    </div>
  );
}

