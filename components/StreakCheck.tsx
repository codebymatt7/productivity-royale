"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
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

      // If no logs for yesterday, apply penalty
      if (!data || data.length === 0) {
        // Check if we already applied penalty today
        const today = new Date().toISOString().split('T')[0];
        const { data: penaltyCheck } = await supabase
          .from("logs")
          .select("id")
          .eq("user_id", userId)
          .eq("category", "penalty")
          .eq("log_date", today)
          .limit(1);

        if (!penaltyCheck || penaltyCheck.length === 0) {
          // Apply -50 point penalty
          const { error } = await supabase.from("logs").insert({
            user_id: userId,
            activity_name: "Slept on your potential",
            points: -50,
            category: "penalty",
            log_date: today,
          });

          if (!error) {
            setShowModal(true);
            onPenaltyApplied();
          }
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
            className="bg-dark-card border-2 border-neon-pink rounded-lg p-8 max-w-md mx-4 relative"
          >
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X />
            </button>
            <div className="text-center">
              <div className="text-4xl mb-4">💀</div>
              <h3 className="text-2xl font-serif text-neon-pink mb-4 glow-pink">
                You Slept on Your Potential
              </h3>
              <p className="text-gray-300 mb-6">
                You missed your daily quests yesterday. The opportunity is lost forever.
              </p>
              <div className="text-3xl font-bold text-red-500 mb-4">-50 pts</div>
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-2 bg-neon-pink text-black font-bold rounded hover:bg-opacity-80"
              >
                Accept the Loss
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

