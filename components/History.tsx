"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Dumbbell, BookOpen, Users, Brain, Apple, Moon, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
  { category: "sleep", icon: <Moon className="w-4 h-4" />, color: "text-indigo-400" },
];

export default function History({ userId }: HistoryProps) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

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
    // Parse the date string (YYYY-MM-DD) directly to avoid timezone issues
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day); // month is 0-indexed
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getHabitIcon = (category: string) => {
    return habitIcons.find((h) => h.category === category);
  };

  const toggleExpand = (date: string) => {
    const newExpanded = new Set(expandedDates);
    if (newExpanded.has(date)) {
      newExpanded.delete(date);
    } else {
      newExpanded.add(date);
    }
    setExpandedDates(newExpanded);
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
        <div className="space-y-2 sm:space-y-3">
          {entries.map((entry, index) => {
            const isExpanded = expandedDates.has(entry.date);
            const hasContent = entry.morning_intention || entry.evening_reflection || entry.habits.length > 0;

            return (
              <motion.div
                key={entry.date}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="bg-dark-card border border-dark-border rounded-xl sm:rounded-2xl overflow-hidden"
              >
                {/* Header - Always visible - Just date and points */}
                <button
                  onClick={() => toggleExpand(entry.date)}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between hover:bg-dark-bg/50 transition-colors"
                >
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    <div className="text-sm sm:text-base font-semibold text-white">
                      {formatDate(entry.date)}
                    </div>
                    {entry.dailyScore > 0 && (
                      <div className="px-2 py-0.5 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-full flex items-center justify-center">
                        <span className="text-xs font-semibold text-blue-400 leading-none">
                          {entry.dailyScore} pts
                        </span>
                      </div>
                    )}
                  </div>
                  {hasContent && (
                    <div className="ml-2 flex-shrink-0">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  )}
                </button>

                {/* Expandable Content */}
                <AnimatePresence>
                  {isExpanded && hasContent && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-3 sm:space-y-4 border-t border-dark-border pt-4">
                        {/* Journal Entries */}
                        {entry.morning_intention && (
                          <div>
                            <div className="text-xs sm:text-sm text-gray-400 mb-1.5">Daily Affirmation</div>
                            <div className="text-sm sm:text-base text-gray-300 bg-[#1a1f2e] rounded-xl p-3 font-mono border border-dark-border">
                              {entry.morning_intention}
                            </div>
                          </div>
                        )}
                        {entry.evening_reflection && (
                          <div>
                            <div className="text-xs sm:text-sm text-gray-400 mb-1.5">Evening Reflection</div>
                            <div className="text-sm sm:text-base text-gray-300 bg-[#1a1f2e] rounded-xl p-3 font-mono border border-dark-border">
                              {entry.evening_reflection}
                            </div>
                          </div>
                        )}
                        {/* All Habits */}
                        {entry.habits.length > 0 && (
                          <div>
                            <div className="text-xs sm:text-sm text-gray-400 mb-2">Habits Completed</div>
                            <div className="flex items-center gap-2 flex-wrap">
                              {entry.habits.map((habit, idx) => {
                                const habitIcon = getHabitIcon(habit);
                                if (!habitIcon) return null;
                                return (
                                  <div
                                    key={idx}
                                    className={`${habitIcon.color} bg-dark-bg rounded-lg p-2 border border-dark-border`}
                                    style={{ 
                                      boxShadow: `0 0 8px ${
                                        habitIcon.color === 'text-red-400' ? 'rgba(239,68,68,0.3)' : 
                                        habitIcon.color === 'text-blue-400' ? 'rgba(59,130,246,0.3)' : 
                                        habitIcon.color === 'text-green-400' ? 'rgba(16,185,129,0.3)' : 
                                        habitIcon.color === 'text-orange-400' ? 'rgba(249,115,22,0.3)' : 
                                        habitIcon.color === 'text-indigo-400' ? 'rgba(99,102,241,0.3)' :
                                        'rgba(168,85,247,0.3)'
                                      }` 
                                    }}
                                  >
                                    {habitIcon.icon}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
