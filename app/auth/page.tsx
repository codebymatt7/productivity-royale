"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        router.push("/");
      }
    }
    checkAuth();
  }, [router]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();

    if (isSignUp) {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      if (data.user) {
        // Create user profile
        const { error: profileError } = await supabase.from("users").insert({
          id: data.user.id,
          username: username || email.split("@")[0],
        });

        if (profileError) {
          console.error("Profile creation error:", profileError);
          setError(profileError.message || "Failed to create profile");
          setLoading(false);
          return;
        }

        // Initialize character stats
        const { error: statsError } = await supabase.from("character_stats").insert({
          user_id: data.user.id,
        });

        if (statsError) {
          console.error("Stats creation error:", statsError);
          // Don't fail if stats already exist
        }

        // Check if email confirmation is required
        if (data.user.email_confirmed_at) {
          router.push("/");
        } else {
          router.push("/verify");
        }
      } else {
        setError("Account created but user data not available. Check Supabase settings.");
        setLoading(false);
      }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      router.push("/");
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
      <div className="bg-dark-card border border-dark-border rounded-lg p-8 max-w-md w-full">
        <h1 className="text-4xl font-semibold mb-2 text-white text-center">LifeMaxxing Royale</h1>
        <p className="text-gray-400 text-center mb-8">Life RPG</p>

        <form onSubmit={handleAuth} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 bg-dark-bg border border-dark-border rounded text-white focus:outline-none focus:border-gray-500"
                placeholder="Choose your hero name"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-dark-bg border border-dark-border rounded text-white focus:outline-none focus:border-neon-cyan"
              placeholder="your@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-dark-bg border border-dark-border rounded text-white focus:outline-none focus:border-neon-cyan"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center p-3 bg-red-900/20 border border-red-500 rounded">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-white text-black font-semibold rounded hover:bg-gray-100 transition-all disabled:opacity-50"
          >
            {loading
              ? "Loading..."
              : isSignUp
              ? "Begin Your Journey"
              : "Enter the Arena"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError("");
            }}
            className="text-gray-400 hover:text-white text-sm transition-colors"
          >
            {isSignUp
              ? "Already have an account? Sign in"
              : "New hero? Create an account"}
          </button>
        </div>
      </div>
    </div>
  );
}

