"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import StatHexagon from "./StatHexagon";

interface CharacterDisplayProps {
  currentMonthPoints: number;
  userId: string;
}

interface TierInfo {
  name: string;
  label: string;
  badgeColor: string;
  minPoints: number;
  maxPoints: number;
}

const tiers: TierInfo[] = [
  {
    name: "Peasant",
    label: "Peasant",
    badgeColor: "bg-gray-600 text-white",
    minPoints: 0,
    maxPoints: 499,
  },
  {
    name: "Squire",
    label: "Squire",
    badgeColor: "bg-blue-600 text-white",
    minPoints: 500,
    maxPoints: 999,
  },
  {
    name: "King",
    label: "King",
    badgeColor: "bg-yellow-500 text-black",
    minPoints: 1000,
    maxPoints: Infinity,
  },
];

export default function CharacterDisplay({ currentMonthPoints, userId }: CharacterDisplayProps) {
  const [stats, setStats] = useState({
    strength: 0,
    intelligence: 0,
    charisma: 0,
    willpower: 0,
  });
  const [level, setLevel] = useState(0);

  // Load character stats
  useEffect(() => {
    async function loadStats() {
      const supabase = createClient();
      const { data } = await supabase
        .from("character_stats")
        .select("strength, intelligence, charisma, willpower, total_points")
        .eq("user_id", userId)
        .single();

      if (data) {
        setStats({
          strength: data.strength || 0,
          intelligence: data.intelligence || 0,
          charisma: data.charisma || 0,
          willpower: data.willpower || 0,
        });
        // Level can never be negative - minimum is 1
        setLevel(Math.max(1, Math.floor((data.total_points || 0) / 100)));
      }
    }

    loadStats();
    const interval = setInterval(loadStats, 5000);
    return () => clearInterval(interval);
  }, [userId]);

  const getCurrentTier = (): TierInfo => {
    for (let i = tiers.length - 1; i >= 0; i--) {
      if (currentMonthPoints >= tiers[i].minPoints) {
        return tiers[i];
      }
    }
    return tiers[0];
  };

  const getNextTier = (): TierInfo | null => {
    const currentTier = getCurrentTier();
    const currentIndex = tiers.findIndex((t) => t.name === currentTier.name);
    if (currentIndex < tiers.length - 1) {
      return tiers[currentIndex + 1];
    }
    return null;
  };

  const getProgressToNextTier = () => {
    const currentTier = getCurrentTier();
    const nextTier = getNextTier();

    if (!nextTier) {
      return { current: currentMonthPoints - currentTier.minPoints, needed: 0, percentage: 100 };
    }

    const current = currentMonthPoints - currentTier.minPoints;
    const needed = nextTier.minPoints - currentTier.minPoints;
    const percentage = Math.min((current / needed) * 100, 100);

    return { current, needed, percentage };
  };

  const currentTier = getCurrentTier();
  const nextTier = getNextTier();
  const progress = getProgressToNextTier();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="bg-dark-card border border-dark-border rounded-2xl p-6 flex flex-col h-full"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="text-3xl sm:text-4xl font-semibold text-white mb-1">
            Level {level}
          </div>
          <div className="text-sm text-gray-400">
            Rank: {currentTier.label}
          </div>
        </div>
        
        {/* Tier Badge */}
        <div className={`px-3 py-1.5 rounded-full text-xs font-semibold ${currentTier.badgeColor}`}>
          RANK {currentTier.name.toUpperCase()}
        </div>
      </div>

      {/* Radar Chart - Centered and Larger */}
      <div className="flex-1 flex items-center justify-center my-6">
        <div className="w-full h-64 sm:h-80">
          <StatHexagon
            strength={stats.strength}
            intelligence={stats.intelligence}
            charisma={stats.charisma}
            willpower={stats.willpower}
          />
        </div>
      </div>

      {/* Footer - Progress Bar */}
      {nextTier ? (
        <div className="mt-auto">
          <div className="text-xs text-gray-400 mb-2">
            Next Rank in {progress.needed - progress.current} pts
          </div>
          <div className="w-full bg-dark-bg rounded-full h-2 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress.percentage}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
            />
          </div>
        </div>
      ) : (
        <div className="mt-auto text-xs text-yellow-400 text-center py-2">
          Max Rank Achieved! ⚡
        </div>
      )}
    </motion.div>
  );
}
