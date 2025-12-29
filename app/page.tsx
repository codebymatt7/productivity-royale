"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import DailyQuest from "@/components/DailyQuest";
import WeeklyRitual from "@/components/WeeklyRitual";
import Arena from "@/components/Arena";
import History from "@/components/History";
import DailyChronicle from "@/components/DailyChronicle";
import StreakCheck from "@/components/StreakCheck";
import MissingHabitsCheck from "@/components/MissingHabitsCheck";
import CharacterVisual from "@/components/CharacterVisual";
import Leaderboard from "@/components/Leaderboard";
import { LogOut, Settings } from "lucide-react";
import Link from "next/link";

export default function Home() {
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string>("");
  const [lifetimeLevel, setLifetimeLevel] = useState(0);
  const [activeTab, setActiveTab] = useState<"daily" | "weekly" | "arena" | "history">("daily");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth");
        return;
      }

      setUserId(user.id);

      // Ensure user profile exists - use maybeSingle to handle missing rows gracefully
      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("username")
        .eq("id", user.id)
        .maybeSingle();

      if (profile) {
        setUsername(profile.username);
      } else {
        // Create user profile if it doesn't exist
        const sanitizedUsername = (user.email?.split("@")[0] || "Hero").toLowerCase().replace(/[^a-z0-9_-]/g, "");
        const finalUsername = sanitizedUsername.length >= 3 ? sanitizedUsername : "hero" + Math.floor(Math.random() * 1000);
        
        const { data: newProfile, error: insertError } = await supabase
          .from("users")
          .insert({
            id: user.id,
            username: finalUsername,
          })
          .select()
          .maybeSingle();

        if (insertError && !insertError.message.includes("duplicate") && !insertError.message.includes("unique")) {
          console.error("Error creating user profile:", insertError);
        }

        if (newProfile) {
          setUsername(newProfile.username);
        } else if (!insertError || insertError.message.includes("duplicate") || insertError.message.includes("unique")) {
          // If no error or duplicate error, try to fetch it (might have been created by trigger or already exists)
          const { data: fetchedProfile } = await supabase
            .from("users")
            .select("username")
            .eq("id", user.id)
            .maybeSingle();
          if (fetchedProfile) {
            setUsername(fetchedProfile.username);
          }
        }
      }

      // Ensure character_stats exists - use maybeSingle to handle missing rows gracefully
      const { data: existingStats } = await supabase
        .from("character_stats")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!existingStats) {
        const { error: statsError } = await supabase.from("character_stats").insert({
          user_id: user.id,
        });
        if (statsError && !statsError.message.includes("duplicate") && !statsError.message.includes("unique")) {
          console.error("Error creating character stats:", statsError);
        }
      }

      const { data: stats } = await supabase
        .from("character_stats")
        .select("total_points")
        .eq("user_id", user.id)
        .maybeSingle();

      if (stats) {
        // Level can never be negative - minimum is 1
        setLifetimeLevel(Math.max(1, Math.floor((stats.total_points || 0) / 100)));
      }

      setLoading(false);
    }

    checkAuth();
    
    const interval = setInterval(async () => {
      if (userId) {
        const supabase = createClient();
        const { data: stats } = await supabase
          .from("character_stats")
          .select("total_points")
          .eq("user_id", userId)
          .maybeSingle();
        if (stats) {
          // Level can never be negative - minimum is 1
          setLifetimeLevel(Math.max(1, Math.floor((stats.total_points || 0) / 100)));
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [router, userId]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-gray-400 text-xl">Loading...</div>
      </div>
    );
  }

  if (!userId) {
    return null;
  }

  return (
    <div className="min-h-screen bg-dark-bg">
      <StreakCheck userId={userId} onPenaltyApplied={() => {}} />
      <MissingHabitsCheck userId={userId} onPenaltyApplied={() => {}} />
      
      {/* Top Bar - Compact */}
      <div className="border-b border-dark-border bg-dark-card/50">
        <div className="flex justify-between items-center px-2 sm:px-4 py-2">
          <div className="text-xs sm:text-sm text-gray-500">
            Level <span className="text-blue-400 font-semibold text-base sm:text-lg">{lifetimeLevel}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Link
              href="/profile"
              className="text-gray-400 hover:text-white text-xs sm:text-sm transition-colors"
            >
              <Settings className="w-3 h-3 sm:w-4 sm:h-4" />
            </Link>
            <button
              onClick={handleLogout}
              className="px-2 py-1 bg-dark-bg border border-dark-border text-gray-400 hover:text-white rounded text-xs sm:text-sm transition-colors"
            >
              <LogOut className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>
        
        {/* Tabs - Compact */}
        <div className="flex gap-0.5 px-2 sm:px-4">
          <button
            onClick={() => setActiveTab("daily")}
            className={`px-2 sm:px-4 py-1.5 text-xs sm:text-sm font-medium transition-colors ${
              activeTab === "daily"
                ? "text-blue-400 border-b-2 border-blue-400"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            Daily
          </button>
          <button
            onClick={() => setActiveTab("weekly")}
            className={`px-2 sm:px-4 py-1.5 text-xs sm:text-sm font-medium transition-colors ${
              activeTab === "weekly"
                ? "text-green-400 border-b-2 border-green-400"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            Weekly
          </button>
          <button
            onClick={() => setActiveTab("arena")}
            className={`px-2 sm:px-4 py-1.5 text-xs sm:text-sm font-medium transition-colors ${
              activeTab === "arena"
                ? "text-purple-400 border-b-2 border-purple-400"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            Arena
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-2 sm:px-4 py-1.5 text-xs sm:text-sm font-medium transition-colors ${
              activeTab === "history"
                ? "text-cyan-400 border-b-2 border-cyan-400"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            History
          </button>
        </div>
      </div>

      {/* Main Content - 2 Column Grid */}
      <main className="max-w-7xl mx-auto px-2 sm:px-4 py-2 sm:py-4">
        {activeTab === "daily" ? (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-8">
            {/* Left Column - Daily Habits (60% on desktop, full width on mobile) */}
            <div className="lg:col-span-3 space-y-4 sm:space-y-6">
              <DailyQuest userId={userId} />
              <DailyChronicle userId={userId} />
            </div>

            {/* Right Column - Character & Leaderboard (40% on desktop, full width on mobile) */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-6">
              <CharacterVisual userId={userId} />
              <Leaderboard />
            </div>
          </div>
        ) : (
          /* Other tabs - Full width */
          <div>
            {activeTab === "weekly" && <WeeklyRitual userId={userId} />}
            {activeTab === "arena" && <Arena userId={userId} />}
            {activeTab === "history" && <History userId={userId} />}
          </div>
        )}
      </main>
    </div>
  );
}
