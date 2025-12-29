"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Lock, Sword, Shield, Trophy, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { getTodayDateString, calculateDailyBattleScore } from "@/lib/utils";

interface ArenaProps {
  userId: string;
}

export default function Arena({ userId }: ArenaProps) {
  const [combatPower, setCombatPower] = useState(0);
  const [level, setLevel] = useState(0);
  const [dailyBattleScore, setDailyBattleScore] = useState(0);
  const [stats, setStats] = useState({
    strength: 0,
    intelligence: 0,
    charisma: 0,
    willpower: 0,
  });
  const [timeRemaining, setTimeRemaining] = useState({
    days: 7,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    async function loadStats() {
      const supabase = createClient();
      const { data } = await supabase
        .from("character_stats")
        .select("strength, intelligence, charisma, willpower, total_points")
        .eq("user_id", userId)
        .single();

      if (data) {
        setStats(data);
        // Combat Power = (STR + INT + WIL) / 10
        setCombatPower(Math.floor((data.strength + data.intelligence + data.willpower) / 10));
        setLevel(Math.floor((data.total_points || 0) / 100));
      }

      // Load today's battle score
      const today = getTodayDateString();
      const { data: todayLogs } = await supabase
        .from("logs")
        .select("points, category")
        .eq("user_id", userId)
        .eq("log_date", today);

      if (todayLogs) {
        const battleScore = calculateDailyBattleScore(todayLogs);
        setDailyBattleScore(battleScore);
      }
    }

    loadStats();
    const interval = setInterval(loadStats, 5000);
    return () => clearInterval(interval);
  }, [userId]);

  useEffect(() => {
    // Countdown timer - 7 days from now
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 7);

    const updateTimer = () => {
      const now = new Date();
      const diff = targetDate.getTime() - now.getTime();

      if (diff > 0) {
        setTimeRemaining({
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((diff % (1000 * 60)) / 1000),
        });
      }
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);

    return () => clearInterval(timer);
  }, []);

  const canEnter = level >= 10;

  return (
    <div className="p-4 sm:p-6 min-h-screen flex flex-col items-center justify-center">
      {/* Locked Gate Icon */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="mb-6 sm:mb-8"
      >
        <div className="relative">
          <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl flex items-center justify-center border-2 border-gray-700 shadow-[0_0_30px_rgba(0,0,0,0.8),inset_0_0_20px_rgba(0,0,0,0.5)]">
            <Lock className="w-12 h-12 sm:w-16 sm:h-16 text-yellow-500" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-600/20 to-transparent rounded-2xl pointer-events-none" />
        </div>
      </motion.div>

      {/* Headline */}
      <motion.h1
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 text-center"
        style={{ textShadow: "0 0 20px rgba(255,255,255,0.3)" }}
      >
        PvP Battles Opening Soon
      </motion.h1>

      {/* Countdown Timer */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="bg-dark-card border border-yellow-500/30 rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 shadow-[0_0_20px_rgba(255,215,0,0.2)]"
      >
        <div className="text-center mb-2">
          <div className="text-xs sm:text-sm text-gray-400 mb-2">Arena Opens In</div>
          <div className="flex gap-2 sm:gap-4 justify-center">
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-yellow-400">{timeRemaining.days}</div>
              <div className="text-xs text-gray-500">Days</div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-yellow-400">{timeRemaining.hours}</div>
              <div className="text-xs text-gray-500">Hours</div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-yellow-400">{timeRemaining.minutes}</div>
              <div className="text-xs text-gray-500">Mins</div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-yellow-400">{timeRemaining.seconds}</div>
              <div className="text-xs text-gray-500">Secs</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Your Stats Card */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="bg-dark-card border border-dark-border rounded-2xl p-6 sm:p-8 mb-6 sm:mb-8 w-full max-w-md"
      >
        <div className="text-center mb-4">
          <div className="text-xs sm:text-sm text-gray-400 mb-2">Your Combat Power</div>
          <div className="text-4xl sm:text-5xl font-bold text-white mb-2" style={{ textShadow: "0 0 10px rgba(59,130,246,0.5)" }}>
            {combatPower}
          </div>
          <div className="text-xs sm:text-sm text-gray-500">
            (Strength + Intelligence + Willpower) / 10
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 sm:gap-4 mt-4">
          <div className="text-center p-2 sm:p-3 bg-dark-bg rounded-xl border border-dark-border">
            <div className="text-lg sm:text-xl font-bold text-red-400 mb-1">{stats.strength}</div>
            <div className="text-[10px] sm:text-xs text-gray-400">STR</div>
          </div>
          <div className="text-center p-2 sm:p-3 bg-dark-bg rounded-xl border border-dark-border">
            <div className="text-lg sm:text-xl font-bold text-blue-400 mb-1">{stats.intelligence}</div>
            <div className="text-[10px] sm:text-xs text-gray-400">INT</div>
          </div>
          <div className="text-center p-2 sm:p-3 bg-dark-bg rounded-xl border border-dark-border">
            <div className="text-lg sm:text-xl font-bold text-pink-400 mb-1">{stats.charisma}</div>
            <div className="text-[10px] sm:text-xs text-gray-400">CHA</div>
          </div>
          <div className="text-center p-2 sm:p-3 bg-dark-bg rounded-xl border border-dark-border">
            <div className="text-lg sm:text-xl font-bold text-purple-400 mb-1">{stats.willpower}</div>
            <div className="text-[10px] sm:text-xs text-gray-400">WIL</div>
          </div>
        </div>
      </motion.div>

      {/* Daily Battle Score */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="bg-dark-card border border-blue-500/30 rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 w-full max-w-md"
      >
        <div className="text-center mb-2">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Zap className="w-5 h-5 text-blue-400" />
            <div className="text-xs sm:text-sm text-gray-400">Today's Battle Score</div>
          </div>
          <div className="text-3xl sm:text-4xl font-bold text-blue-400 mb-2">
            {dailyBattleScore}
          </div>
          <div className="text-xs text-gray-500">
            This is your daily performance score
          </div>
        </div>
      </motion.div>

      {/* Battle System Explanation */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="bg-dark-card border border-dark-border rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 w-full max-w-2xl"
      >
        <div className="flex items-center gap-2 mb-4">
          <Sword className="w-5 h-5 text-yellow-400" />
          <h3 className="text-lg sm:text-xl font-semibold text-white">How Battles Work</h3>
        </div>
        <div className="space-y-3 text-sm sm:text-base text-gray-300">
          <div className="flex items-start gap-3">
            <Trophy className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-semibold text-white mb-1">Daily Performance Battles</div>
              <div className="text-gray-400">
                Each day, your performance is scored based on completed habits. Challenge friends to see who had the better day!
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-semibold text-white mb-1">Hidden Traits</div>
              <div className="text-gray-400">
                Your stats (STR, INT, CHA, WIL) are hidden. Only the battle outcome is revealed - win, lose, or tie.
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Zap className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-semibold text-white mb-1">Fair Competition</div>
              <div className="text-gray-400">
                Scoring is balanced: Workout (20), Reading (1/page, max 25), Connections (5/person, max 25), Sleep (25 optimal), Meditate (15), Diet (20).
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Call to Action */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.9 }}
        className={`text-center p-4 sm:p-6 rounded-2xl border border-dark-border ${
          canEnter
            ? "bg-green-500/10 border-green-500/30 text-green-400"
            : "bg-red-500/10 border-red-500/30 text-red-400"
        }`}
      >
        <div className="text-lg sm:text-xl font-semibold mb-2">
          {canEnter ? (
            <>
              <Shield className="w-5 h-5 sm:w-6 sm:h-6 inline mr-2" />
              You Are Ready!
            </>
          ) : (
            <>
              <Lock className="w-5 h-5 sm:w-6 sm:h-6 inline mr-2" />
              Level {level} / 10 Required
            </>
          )}
        </div>
        <p className="text-sm sm:text-base text-gray-300">
          {canEnter
            ? "Prepare your character. You meet the requirements to enter the Arena!"
            : "Prepare your character. Only Level 10+ users will be allowed to enter the Arena."}
        </p>
      </motion.div>
    </div>
  );
}
