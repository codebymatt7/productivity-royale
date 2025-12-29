"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mail, User as UserIcon, Calendar, LogOut } from "lucide-react";
import Link from "next/link";

export default function ProfilePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [createdAt, setCreatedAt] = useState<string>("");
  const [isEditingDisplayName, setIsEditingDisplayName] = useState(false);
  const [savingDisplayName, setSavingDisplayName] = useState(false);
  const [stats, setStats] = useState({
    total_points: 0,
    strength: 0,
    intelligence: 0,
    charisma: 0,
    willpower: 0,
  });
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth");
  };

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth");
        return;
      }

      setUserId(user.id);
      setEmail(user.email || "");

      // Get user profile - use maybeSingle to handle missing rows gracefully
      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("username, created_at")
        .eq("id", user.id)
        .maybeSingle();

      if (profile) {
        setUsername(profile.username || "");
        if (profile.created_at) {
          setCreatedAt(new Date(profile.created_at).toLocaleDateString());
        }
      } else if (profileError) {
        console.error("Error loading profile:", profileError);
        // Create profile if it doesn't exist
        const { data: newProfile } = await supabase
          .from("users")
          .insert({
            id: user.id,
            username: user.email?.split("@")[0] || "Hero",
          })
          .select()
          .single();
        if (newProfile) {
          setUsername(newProfile.username);
          if (newProfile.created_at) {
            setCreatedAt(new Date(newProfile.created_at).toLocaleDateString());
          }
        }
      }

      // Get character stats - use maybeSingle to handle missing rows gracefully
      const { data: characterStats, error: statsError } = await supabase
        .from("character_stats")
        .select("total_points, strength, intelligence, charisma, willpower")
        .eq("user_id", user.id)
        .maybeSingle();

      if (characterStats) {
        setStats({
          total_points: characterStats.total_points || 0,
          strength: characterStats.strength || 0,
          intelligence: characterStats.intelligence || 0,
          charisma: characterStats.charisma || 0,
          willpower: characterStats.willpower || 0,
        });
      } else if (statsError) {
        console.error("Error loading stats:", statsError);
        // Create stats if they don't exist
        const { data: newStats } = await supabase
          .from("character_stats")
          .insert({ user_id: user.id })
          .select()
          .single();
        if (newStats) {
          setStats({
            total_points: newStats.total_points || 0,
            strength: newStats.strength || 0,
            intelligence: newStats.intelligence || 0,
            charisma: newStats.charisma || 0,
            willpower: newStats.willpower || 0,
          });
        }
      }

      setLoading(false);
    }

    loadProfile();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-gray-400 text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <div className="bg-dark-card border border-dark-border rounded-lg p-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-semibold text-white">Account Details</h1>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/30 rounded-lg transition-colors text-sm sm:text-base font-medium"
            >
              <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Log Out</span>
            </button>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-4 pb-6 border-b border-dark-border">
              <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center">
                <UserIcon className="w-8 h-8 text-blue-400" />
              </div>
              <div>
                <div className="text-xl font-semibold text-white">{username}</div>
                <div className="text-sm text-gray-400">Member since {createdAt}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm text-gray-400 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email
                </label>
                <div className="text-white">{email}</div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-400 flex items-center gap-2">
                  <UserIcon className="w-4 h-4" />
                  Username
                </label>
                <div className="text-white">{username}</div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-400 flex items-center gap-2">
                  <UserIcon className="w-4 h-4" />
                  Display Name <span className="text-xs text-gray-500">(shown on leaderboard)</span>
                </label>
                {isEditingDisplayName ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="flex-1 px-3 py-2 bg-dark-bg border border-dark-border rounded text-white focus:outline-none focus:border-blue-500"
                      placeholder="Your display name"
                      maxLength={30}
                      disabled={savingDisplayName}
                    />
                    <button
                      onClick={async () => {
                        setSavingDisplayName(true);
                        const supabase = createClient();
                        const { error } = await supabase
                          .from("users")
                          .update({ display_name: displayName.trim() || username })
                          .eq("id", userId);
                        if (error) {
                          alert("Failed to update display name: " + error.message);
                        } else {
                          setIsEditingDisplayName(false);
                        }
                        setSavingDisplayName(false);
                      }}
                      disabled={savingDisplayName}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {savingDisplayName ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingDisplayName(false);
                        // Reload original value
                        const supabase = createClient();
                        supabase
                          .from("users")
                          .select("display_name, username")
                          .eq("id", userId)
                          .single()
                          .then(({ data }) => {
                            if (data) {
                              setDisplayName(data.display_name || data.username || "");
                            }
                          });
                      }}
                      className="px-4 py-2 bg-dark-bg border border-dark-border text-gray-400 rounded hover:bg-dark-card transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="text-white">{displayName || username}</div>
                    <button
                      onClick={() => setIsEditingDisplayName(true)}
                      className="px-3 py-1 text-xs bg-dark-bg border border-dark-border text-gray-400 rounded hover:bg-dark-card transition-colors"
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-400 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Account Created
                </label>
                <div className="text-white">{createdAt}</div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-400">Total Points</label>
                <div className="text-2xl font-semibold text-blue-400">{Math.max(0, stats.total_points || 0)}</div>
              </div>
            </div>

            <div className="pt-6 border-t border-dark-border">
              <h2 className="text-xl font-semibold text-white mb-4">Character Stats</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-dark-bg border border-dark-border rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-red-400 mb-1">{stats.strength}</div>
                  <div className="text-xs text-gray-400">Strength</div>
                </div>
                <div className="bg-dark-bg border border-dark-border rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-400 mb-1">{stats.intelligence}</div>
                  <div className="text-xs text-gray-400">Intelligence</div>
                </div>
                <div className="bg-dark-bg border border-dark-border rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-400 mb-1">{stats.charisma}</div>
                  <div className="text-xs text-gray-400">Charisma</div>
                </div>
                <div className="bg-dark-bg border border-dark-border rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-purple-400 mb-1">{stats.willpower}</div>
                  <div className="text-xs text-gray-400">Willpower</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

