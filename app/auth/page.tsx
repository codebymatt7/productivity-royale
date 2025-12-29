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

  // Validate username: alphanumeric, underscores, hyphens only, no spaces
  const validateUsername = (username: string): string | null => {
    if (!username) return null;
    // Remove spaces and convert to lowercase
    const sanitized = username.trim().toLowerCase().replace(/\s+/g, "");
    // Check if it matches alphanumeric + underscores + hyphens
    if (!/^[a-z0-9_-]+$/.test(sanitized)) {
      return "Username can only contain letters, numbers, underscores, and hyphens";
    }
    // Check length
    if (sanitized.length < 3) {
      return "Username must be at least 3 characters";
    }
    if (sanitized.length > 20) {
      return "Username must be 20 characters or less";
    }
    return sanitized;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();

    if (isSignUp) {
      // Validate and sanitize username
      let finalUsername = username || email.split("@")[0];
      const validationResult = validateUsername(finalUsername);
      
      if (typeof validationResult === "string" && validationResult.startsWith("Username")) {
        // It's an error message
        setError(validationResult);
        setLoading(false);
        return;
      } else if (validationResult) {
        // It's a sanitized username
        finalUsername = validationResult;
      } else {
        // No username provided, use email prefix
        finalUsername = email.split("@")[0].toLowerCase().replace(/[^a-z0-9_-]/g, "");
        if (finalUsername.length < 3) {
          finalUsername = "hero" + Math.floor(Math.random() * 1000);
        }
      }

      // Check if username is already taken
      const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .eq("username", finalUsername)
        .maybeSingle();

      if (existingUser) {
        // Username taken, append random number
        finalUsername = finalUsername + Math.floor(Math.random() * 1000);
      }

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
        // Create user profile - use upsert to handle race conditions
        const { error: profileError } = await supabase
          .from("users")
          .upsert({
            id: data.user.id,
            username: finalUsername,
          }, {
            onConflict: 'id'
          });

        if (profileError) {
          console.error("Profile creation error:", profileError);
          // More helpful error message
          if (profileError.message.includes("row-level security") || profileError.message.includes("RLS")) {
            setError("Database configuration error. Please contact support or try again in a moment.");
          } else if (profileError.message.includes("unique") || profileError.message.includes("duplicate")) {
            // Username conflict, try with random suffix
            const fallbackUsername = finalUsername + Math.floor(Math.random() * 10000);
            const { error: retryError } = await supabase
              .from("users")
              .upsert({
                id: data.user.id,
                username: fallbackUsername,
              }, {
                onConflict: 'id'
              });
            if (retryError) {
              setError("Failed to create profile. Please try signing in instead.");
              setLoading(false);
              return;
            }
          } else {
            setError(profileError.message || "Failed to create profile. Please try again.");
          }
          if (profileError.message.includes("row-level security") || profileError.message.includes("RLS")) {
            setLoading(false);
            return;
          }
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

