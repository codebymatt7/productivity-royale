"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getTodayDateString } from "@/lib/utils";
import { getYesterdayDateString } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface StreakCheckProps {
  userId: string;
  onPenaltyApplied: () => void;
}

export default function StreakCheck({ userId, onPenaltyApplied }: StreakCheckProps) {
  const [showModal, setShowModal] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    async function checkStreak() {
      if (hasChecked) return;

      const supabase = createClient();
      const yesterday = getYesterdayDateString();

      // Check if there's any log for yesterday
      const { data } = await supabase
        .from("logs")
        .select("id")
        .eq("user_id", userId)
        .eq("log_date", yesterday)
        .limit(1);

      // If no logs for yesterday, show motivational message (no penalty)
      if (!data || data.length === 0) {
        // Check if we already showed the modal today
        const today = getTodayDateString();
        const checkKey = `streakCheckShown_${userId}_${today}`;
        const hasShownToday = localStorage.getItem(checkKey);
        
        if (!hasShownToday) {
          // No penalty - just show motivational message
          setShowModal(true);
          localStorage.setItem(checkKey, "true");
          // Don't call onPenaltyApplied() since we're not applying penalties
        }
      }

      setHasChecked(true);
    }

    checkStreak();
  }, [userId, hasChecked, onPenaltyApplied]);

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
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X />
            </button>
            <div className="text-center">
              <div className="text-4xl mb-4">💪</div>
              <h3 className="text-2xl font-semibold text-yellow-400 mb-4">
                You Slept on Your Potential
              </h3>
              <p className="text-gray-300 mb-6">
                You missed your daily quests yesterday. While you rested, others outworked you. Time to get back in the game! 🔥
              </p>
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-2 bg-yellow-500/20 border border-yellow-500/50 text-yellow-400 font-semibold rounded-xl hover:bg-yellow-500/30 transition-colors"
              >
                Let&apos;s Go
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

