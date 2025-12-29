"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getTodayDateString, getYesterdayDateString } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface MissingHabitsCheckProps {
  userId: string;
  onPenaltyApplied: () => void;
}

export default function MissingHabitsCheck({ userId, onPenaltyApplied }: MissingHabitsCheckProps) {
  const [showModal, setShowModal] = useState(false);
  const [missingHabits, setMissingHabits] = useState<string[]>([]);
  const [totalPenalty, setTotalPenalty] = useState(0);

  useEffect(() => {
    async function checkMissingHabits() {
      const supabase = createClient();
      const yesterday = getYesterdayDateString();
      const today = getTodayDateString();

      // Use localStorage to track if we've checked today (persists across page reloads)
      const checkKey = `missingHabitsChecked_${userId}_${today}`;
      const hasCheckedToday = localStorage.getItem(checkKey);
      
      if (hasCheckedToday === "true") {
        return; // Already checked today
      }

      // Check if we already showed the modal today (no penalties to check anymore)
      // Just use localStorage check above

      // Check which habits were completed yesterday
      const { data: yesterdayLogs } = await supabase
        .from("logs")
        .select("category")
        .eq("user_id", userId)
        .eq("log_date", yesterday);

      const completedCategories = new Set(
        yesterdayLogs?.map((log) => log.category) || []
      );

      // Check if user opened the app at all yesterday (any log exists)
      const hasAnyLogs = yesterdayLogs && yesterdayLogs.length > 0;
      
      const requiredHabits = [
        { category: "workout", name: "Workout", penalty: -5 },
        { category: "meditation", name: "Meditate", penalty: -5 },
        { category: "diet", name: "Diet", penalty: -5 },
      ];

      const missing: string[] = [];
      let totalPenaltyAmount = 0;
      
      // Check which required habits were missing
      requiredHabits.forEach((habit) => {
        if (!completedCategories.has(habit.category)) {
          missing.push(habit.name);
          totalPenaltyAmount += habit.penalty; // -5 for each missing habit
        }
      });

      // Show motivational message if habits were missed (no penalties)
      if (missing.length > 0) {
        // No penalties - just show motivational message
        setMissingHabits(missing);
        setTotalPenalty(0); // No penalty points
        setShowModal(true);
        // Don't call onPenaltyApplied() since we're not applying penalties
        localStorage.setItem(checkKey, "true");
      } else {
        // No missing habits, mark as checked
        localStorage.setItem(checkKey, "true");
      }
    }

    // Only check if user has been around for at least one day
    // Skip check for brand new users (no logs yet)
    checkMissingHabits();
  }, [userId, onPenaltyApplied]);

  return (
    <AnimatePresence>
      {showModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={() => setShowModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-dark-card border-2 border-yellow-500/50 rounded-2xl p-6 sm:p-8 max-w-md mx-4 relative"
          >
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="text-center">
              <div className="text-4xl mb-4">💪</div>
              <h3 className="text-xl sm:text-2xl font-semibold text-yellow-400 mb-4">
                Yesterday's Missed Opportunities
              </h3>
              <p className="text-gray-300 mb-4 text-sm sm:text-base">
                You missed these habits yesterday:
              </p>
              <div className="mb-4 space-y-2">
                {missingHabits.map((habit, idx) => (
                  <div key={idx} className="text-yellow-300 font-medium">
                    • {habit}
                  </div>
                ))}
              </div>
              <p className="text-gray-400 mb-6 text-sm italic">
                While you rested, others outworked you. Time to get back in the game! 🔥
              </p>
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-2 bg-yellow-500/20 border border-yellow-500/50 text-yellow-400 font-semibold rounded-xl hover:bg-yellow-500/30 transition-colors"
              >
                Let's Go
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

