"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import CharacterDisplay from "./CharacterDisplay";

interface CharacterVisualProps {
  userId: string;
}

export default function CharacterVisual({ userId }: CharacterVisualProps) {
  const [monthlyPoints, setMonthlyPoints] = useState(0);

  useEffect(() => {
    async function loadMonthlyPoints() {
      const supabase = createClient();
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
      }
    }

    loadMonthlyPoints();
    const interval = setInterval(loadMonthlyPoints, 5000);
    return () => clearInterval(interval);
  }, [userId]);

  return (
    <div>
      <h3 className="text-sm sm:text-base font-semibold text-white mb-2 text-center">Your Character</h3>
      <CharacterDisplay currentMonthPoints={monthlyPoints} userId={userId} />
    </div>
  );
}
