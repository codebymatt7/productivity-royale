"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getMonthlyTier } from "@/lib/utils";

interface CharacterHeaderProps {
  userId: string;
}

export default function CharacterHeader({ userId }: CharacterHeaderProps) {
  const [lifetimeLevel, setLifetimeLevel] = useState(0);
  const [monthlyPoints, setMonthlyPoints] = useState(0);
  const [monthlyTier, setMonthlyTier] = useState({ name: "Rags", description: "Peasant", glow: "" });

  useEffect(() => {
    async function loadStats() {
      const supabase = createClient();
      
      // Get lifetime total points
      const { data: stats } = await supabase
        .from("character_stats")
        .select("total_points")
        .eq("user_id", userId)
        .single();

      if (stats) {
        setLifetimeLevel(Math.floor(stats.total_points / 100)); // Level = points / 100
      }

      // Get monthly points
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const { data: logs } = await supabase
        .from("logs")
        .select("points")
        .eq("user_id", userId)
        .gte("created_at", firstDayOfMonth.toISOString());

      if (logs) {
        const total = logs.reduce((sum, log) => sum + log.points, 0);
        setMonthlyPoints(total);
        setMonthlyTier(getMonthlyTier(total));
      }
    }

    loadStats();
    
    // Refresh stats every 5 seconds to keep UI updated
    const interval = setInterval(loadStats, 5000);
    
    return () => clearInterval(interval);
  }, [userId]);

  return (
    <div className="flex justify-between items-center p-4 border-b border-dark-border">
      <div className="flex items-center gap-4">
        <div className="text-2xl font-serif">
          <span className="text-neon-cyan">Level </span>
          <span className="text-white font-bold">{lifetimeLevel}</span>
        </div>
      </div>
      <div className="text-right">
        <div className={`text-xl font-serif ${monthlyTier.glow}`}>
          {monthlyTier.name}
        </div>
        <div className="text-sm text-gray-400">{monthlyTier.description}</div>
        <div className="text-xs text-gray-500 mt-1">{monthlyPoints} pts this month</div>
      </div>
    </div>
  );
}

