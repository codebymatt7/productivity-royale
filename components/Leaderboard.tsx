"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ArrowUp, ArrowDown } from "lucide-react";

interface LeaderboardEntry {
  username: string;
  total_points: number;
  rank: number;
  level: number;
  tier: "King" | "Squire" | "Peasant";
  rankChange: "up" | "down" | "same";
  isCurrentUser?: boolean;
}

// Dummy data
const dummyUsers: Omit<LeaderboardEntry, "rank">[] = [
  { username: "Chad Thundercock", total_points: 25000, level: 52, tier: "King", rankChange: "up" },
  { username: "Goggins", total_points: 18000, level: 48, tier: "Squire", rankChange: "same" },
  { username: "The Grinder", total_points: 12000, level: 35, tier: "Squire", rankChange: "up" },
  { username: "Iron Will", total_points: 8500, level: 28, tier: "Squire", rankChange: "down" },
  { username: "The Slacker", total_points: 100, level: 2, tier: "Peasant", rankChange: "same" },
];

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserEntry, setCurrentUserEntry] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLeaderboard() {
      const supabase = createClient();
      
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }

      // Get all users first
      const { data: allUsers, error: usersError } = await supabase
        .from("users")
        .select("id, username, display_name")
        .limit(50);
      
      if (usersError) {
        console.error("Error loading users:", usersError);
      }
      
      // Get all character_stats
      const { data: allStats, error: statsError } = await supabase
        .from("character_stats")
        .select("user_id, total_points")
        .limit(50);
      
      if (statsError) {
        console.error("Error loading stats:", statsError);
      }
      
      // Create a map of user_id -> stats for quick lookup
      const statsMap = new Map();
      if (allStats) {
        allStats.forEach(stat => {
          statsMap.set(stat.user_id, stat.total_points ?? 0);
        });
      }
      
      // Combine users with their stats (default to 0 if no stats)
      const combinedStats: any[] = [];
      if (allUsers) {
        allUsers.forEach(user => {
          combinedStats.push({
            user_id: user.id,
            total_points: statsMap.get(user.id) ?? 0,
            users: {
              id: user.id,
              username: user.username,
              display_name: user.display_name
            }
          });
        });
      }
      
      // Sort by total_points descending
      combinedStats.sort((a, b) => (b.total_points ?? 0) - (a.total_points ?? 0));
      
      const stats = combinedStats;

      // Debug: Log what we got
      if (stats) {
        console.log("Leaderboard stats loaded:", stats.length, "users");
        stats.forEach((stat) => {
          console.log(`User ${stat.user_id}: ${stat.total_points} points`);
        });
      }

      const realEntries: LeaderboardEntry[] = [];
      if (stats && stats.length > 0) {
        // Build entries - include ALL users, even with 0 points
        stats.forEach((stat, index) => {
          // Use the actual total_points, but ensure it's not negative
          const totalPoints = Math.max(0, stat.total_points ?? 0);
          const level = Math.max(1, Math.floor(totalPoints / 100));
          let tier: "King" | "Squire" | "Peasant" = "Peasant";
          if (totalPoints >= 1000) tier = "King";
          else if (totalPoints >= 500) tier = "Squire";

          const userData = stat.users as any;
          const displayName = userData?.display_name || userData?.username || "Unknown";

          const entry: LeaderboardEntry = {
            username: displayName,
            total_points: totalPoints,
            rank: index + 1,
            level,
            tier,
            rankChange: index < 2 ? "up" : index === 2 ? "same" : "down",
            isCurrentUser: stat.user_id === user?.id,
          };

          if (stat.user_id === user?.id) {
            setCurrentUserEntry(entry);
          } else {
            realEntries.push(entry);
          }
        });
      } else {
        // If no stats found, try to get current user's stats separately
        if (user) {
          const { data: userStats } = await supabase
            .from("character_stats")
            .select("total_points")
            .eq("user_id", user.id)
            .maybeSingle();
          
          if (userStats) {
            const totalPoints = Math.max(0, userStats.total_points ?? 0);
            const level = Math.max(1, Math.floor(totalPoints / 100));
            let tier: "King" | "Squire" | "Peasant" = "Peasant";
            if (totalPoints >= 1000) tier = "King";
            else if (totalPoints >= 500) tier = "Squire";
            
            const { data: userProfile } = await supabase
              .from("users")
              .select("display_name, username")
              .eq("id", user.id)
              .maybeSingle();
            
            const displayName = userProfile?.display_name || userProfile?.username || "You";
            
            setCurrentUserEntry({
              username: displayName,
              total_points: totalPoints,
              rank: 999,
              level,
              tier,
              rankChange: "same",
              isCurrentUser: true,
            });
          }
        }
      }

      // Combine real entries with current user entry if not already included
      let allRealEntries = [...realEntries];
      
      // If current user entry exists and isn't in the list, add it
      if (currentUserEntry && !allRealEntries.some(e => e.isCurrentUser)) {
        allRealEntries.push(currentUserEntry);
      }
      
      // Sort by points (descending) and assign ranks
      const sortedEntries = allRealEntries
        .sort((a, b) => b.total_points - a.total_points)
        .map((entry, index) => ({
          ...entry,
          rank: index + 1,
        }));
      
      // Show top 10 real users (remove dummy users)
      setEntries(sortedEntries.slice(0, 10));
      setLoading(false);
    }

    loadLeaderboard();
    const interval = setInterval(loadLeaderboard, 3000); // Update every 3 seconds for live updates
    return () => clearInterval(interval);
  }, []);

  const getTierRingColor = (tier: string) => {
    switch (tier) {
      case "King": return "ring-yellow-500/50";
      case "Squire": return "ring-gray-400/50";
      case "Peasant": return "ring-gray-600/50";
      default: return "ring-gray-600/50";
    }
  };

  if (loading) {
    return (
      <div className="bg-dark-card border border-dark-border rounded-2xl p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-white mb-3">Leaderboard</h3>
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="bg-dark-card border border-dark-border rounded-2xl p-4 sm:p-6">
      <h3 className="text-base sm:text-lg font-semibold text-white mb-4">Leaderboard</h3>
      <div className="space-y-2">
        {entries.map((entry) => (
          <div
            key={entry.rank}
            className={`flex items-center justify-between p-3 rounded-xl transition-all ${
              entry.isCurrentUser
                ? "bg-blue-500/10 border border-blue-500/30"
                : entry.rank === 1
                ? "bg-yellow-500/10 border border-yellow-500/30"
                : entry.rank <= 3
                ? "bg-white/5"
                : "bg-transparent"
            }`}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold relative ${
                entry.rank === 1
                  ? "bg-yellow-500 text-black"
                  : entry.rank === 2
                  ? "bg-gray-400 text-black"
                  : entry.rank === 3
                  ? "bg-orange-600 text-white"
                  : "bg-gray-700 text-gray-300"
              }`}>
                {entry.rank}
                {/* Avatar Ring */}
                <div className={`absolute inset-0 rounded-full ring-2 ${getTierRingColor(entry.tier)}`} />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm truncate ${
                    entry.isCurrentUser ? "text-blue-400 font-semibold" : "text-white"
                  }`}>
                    {entry.username}
                  </span>
                  {entry.rankChange === "up" && (
                    <ArrowUp className="w-3 h-3 text-green-400 flex-shrink-0" />
                  )}
                  {entry.rankChange === "down" && (
                    <ArrowDown className="w-3 h-3 text-red-400 flex-shrink-0" />
                  )}
                </div>
                <div className="text-xs text-gray-400">Lv.{entry.level} • {entry.tier}</div>
              </div>
            </div>
            <span className="text-sm text-gray-400 flex-shrink-0 ml-3">
              {entry.total_points.toLocaleString()}
            </span>
          </div>
        ))}

        {/* Current User (if not in top 10) */}
        {currentUserEntry && !entries.some((e) => e.isCurrentUser) && (
          <div className="mt-3 pt-3 border-t border-dark-border">
            <div className="flex items-center justify-between p-3 rounded-xl bg-blue-500/10 border border-blue-500/30">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold bg-blue-500 text-white relative">
                  {currentUserEntry.rank}
                  <div className={`absolute inset-0 rounded-full ring-2 ${getTierRingColor(currentUserEntry.tier)}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-blue-400 font-semibold truncate">
                      {currentUserEntry.username} (You)
                    </span>
                  </div>
                  <div className="text-xs text-gray-400">Lv.{currentUserEntry.level} • {currentUserEntry.tier}</div>
                </div>
              </div>
              <span className="text-sm text-gray-400 flex-shrink-0 ml-3">
                {currentUserEntry.total_points.toLocaleString()}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
