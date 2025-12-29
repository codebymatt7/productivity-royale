"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Dumbbell, BookOpen, Users, Brain, Apple, Moon } from "lucide-react";
import { motion } from "framer-motion";

interface HistoryProps {
  userId: string;
}

interface HistoryEntry {
  date: string;
  morning_intention: string | null;
  evening_reflection: string | null;
  habits: string[];
  dailyScore: number;
}

interface HabitIcon {
  category: string;
  icon: React.ReactNode;
  color: string;
}

const habitIcons: HabitIcon[] = [
  { category: "workout", icon: <Dumbbell className="w-4 h-4" />, color: "text-red-400" },
  { category: "reading", icon: <BookOpen className="w-4 h-4" />, color: "text-blue-400" },
  { category: "social", icon: <Users className="w-4 h-4" />, color: "text-green-400" },
  { category: "meditation", icon: <Brain className="w-4 h-4" />, color: "text-purple-400" },
  { category: "diet", icon: <Apple className="w-4 h-4" />, color: "text-orange-400" },
  { category: "sleep", icon: <Moon className="w-4 h-4" />, color: "text-purple-400" },
];

export default function History({ userId }: HistoryProps) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      const supabase = createClient();
      
      // Load journal entries
      const { data: journals } = await supabase
        .from("journal_logs")
        .select("date, morning_intention, evening_reflection")
        .eq("user_id", userId)
        .order("date", { ascending: false })
        .limit(30);

      // Load habit logs for the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: logs } = await supabase
        .from("logs")
        .select("category, log_date, points")
        .eq("user_id", userId)
        .gte("log_date", thirtyDaysAgo.toISOString().split('T')[0])
        .neq("category", "weekly")
        .neq("category", "penalty")
        .order("log_date", { ascending: false });

      // Get unique dates from both journals and logs
      const journalDates = new Set(journals?.map((j) => j.date) || []);
      const logDates = new Set(logs?.map((l) => l.log_date) || []);
      const allDates = Array.from(new Set([...journalDates, ...logDates]))
        .sort()
        .reverse()
        .slice(0, 30);

      // Build history entries
      const historyEntries: HistoryEntry[] = allDates.map((date) => {
        const journal = journals?.find((j) => j.date === date);
        const dayLogs = logs?.filter((log) => log.log_date === date) || [];
        const habits = dayLogs.map((log) => log.category);
        const dailyScore = dayLogs.reduce((sum, log) => sum + log.points, 0);

        return {
          date,
          morning_intention: journal?.morning_intention || null,
          evening_reflection: journal?.evening_reflection || null,
          habits,
          dailyScore,
        };
      });

      setEntries(historyEntries);
      setLoading(false);
    }

    loadHistory();
  }, [userId]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getHabitIcon = (category: string) => {
    return habitIcons.find((h) => h.category === category);
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="text-gray-400 text-center py-8">Loading history...</div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <h2 className="text-xl sm:text-2xl font-semibold mb-6 text-white">History</h2>
      
      {entries.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-sm">No history yet. Start completing habits and journaling!</div>
        </div>
      ) : (
        <div className="space-y-4">
          {entries.map((entry, index) => (
            <motion.div
              key={entry.date}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-dark-card border border-dark-border rounded-2xl p-4 sm:p-6"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="text-base sm:text-lg font-semibold text-white mb-1">
                    {formatDate(entry.date)}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* Stats Gained Icons */}
                  {entry.habits.length > 0 && (
                    <div className="flex items-center gap-2">
                      {entry.habits.map((habit, idx) => {
                        const habitIcon = getHabitIcon(habit);
                        if (!habitIcon) return null;
                        return (
                          <div
                            key={idx}
                            className={`${habitIcon.color} bg-dark-bg rounded-lg p-1.5 border border-dark-border`}
                            style={{ 
                              boxShadow: `0 0 8px ${
                                habitIcon.color === 'text-red-400' ? 'rgba(239,68,68,0.3)' : 
                                habitIcon.color === 'text-blue-400' ? 'rgba(59,130,246,0.3)' : 
                                habitIcon.color === 'text-green-400' ? 'rgba(16,185,129,0.3)' : 
                                habitIcon.color === 'text-orange-400' ? 'rgba(249,115,22,0.3)' : 
                                'rgba(168,85,247,0.3)'
                              }` 
                            }}
                          >
                            {habitIcon.icon}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {/* Daily Score Badge */}
                  {entry.dailyScore > 0 && (
                    <div className="px-3 py-1.5 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-full">
                      <span className="text-xs sm:text-sm font-semibold text-blue-400">
                        {entry.dailyScore} pts
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Content */}
              {(entry.morning_intention || entry.evening_reflection) ? (
                <div className="space-y-3">
                  {entry.morning_intention && (
                    <div>
                      <div className="text-xs text-gray-400 mb-1.5">Daily Affirmation</div>
                      <div className="text-sm text-gray-300 bg-[#1a1f2e] rounded-xl p-3 font-mono border border-dark-border">
                        {entry.morning_intention}
                      </div>
                    </div>
                  )}
                  {entry.evening_reflection && (
                    <div>
                      <div className="text-xs text-gray-400 mb-1.5">Evening Reflection</div>
                      <div className="text-sm text-gray-300 bg-[#1a1f2e] rounded-xl p-3 font-mono border border-dark-border">
                        {entry.evening_reflection}
                      </div>
                    </div>
                  )}
                </div>
              ) : entry.habits.length === 0 ? (
                <div className="text-sm text-gray-500 italic">No activity recorded for this day</div>
              ) : null}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
