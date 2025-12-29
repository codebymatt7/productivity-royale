"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { getTodayDateString } from "@/lib/utils";
import { motion } from "framer-motion";
import { Save, Lock } from "lucide-react";

interface DailyChronicleProps {
  userId: string;
}

export default function DailyChronicle({ userId }: DailyChronicleProps) {
  const [affirmation, setAffirmation] = useState("");
  const [eveningReflection, setEveningReflection] = useState("");
  const [affirmationSaved, setAffirmationSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const today = getTodayDateString();

  useEffect(() => {
    // Load existing journal entry for today only
    async function loadJournal() {
      const supabase = createClient();
      const { data } = await supabase
        .from("journal_logs")
        .select("morning_intention, evening_reflection")
        .eq("user_id", userId)
        .eq("date", today)
        .single();

      if (data) {
        const hasAffirmation = data.morning_intention && data.morning_intention.trim() !== "";
        setAffirmation(data.morning_intention || "");
        setAffirmationSaved(hasAffirmation);
        setEveningReflection(data.evening_reflection || "");
      }
    }

    loadJournal();
  }, [userId, today]);

  const handleSaveAffirmation = async () => {
    if (!affirmation.trim()) {
      return;
    }

    setIsSaving(true);
    const supabase = createClient();

    // Ensure user exists (create if needed)
    const { data: userCheck } = await supabase
      .from("users")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (!userCheck) {
      // Try to create user profile
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error: createError } = await supabase.from("users").insert({
          id: user.id,
          username: user.email?.split("@")[0] || "Hero",
        });
        if (createError && !createError.message.includes("duplicate")) {
          console.error("Error creating user:", createError);
        }
      }
    }

    // Check if entry exists
    const { data: existingEntry } = await supabase
      .from("journal_logs")
      .select("id")
      .eq("user_id", userId)
      .eq("date", today)
      .maybeSingle();

    let error;
    if (existingEntry) {
      const { error: updateError } = await supabase
        .from("journal_logs")
        .update({ morning_intention: affirmation })
        .eq("id", existingEntry.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from("journal_logs")
        .insert({
          user_id: userId,
          date: today,
          morning_intention: affirmation,
        });
      error = insertError;
    }

    if (error) {
      console.error("Error saving affirmation:", error);
      alert(`Failed to save: ${error.message}. Please try again.`);
      setIsSaving(false);
      return;
    }

    setAffirmationSaved(true);
    setSaved(true);
    setIsSaving(false);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSaveReflection = async () => {
    if (!eveningReflection.trim()) {
      return;
    }

    setIsSaving(true);
    const supabase = createClient();

    // Ensure user exists (create if needed)
    const { data: userCheck } = await supabase
      .from("users")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (!userCheck) {
      // Try to create user profile
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error: createError } = await supabase.from("users").insert({
          id: user.id,
          username: user.email?.split("@")[0] || "Hero",
        });
        if (createError && !createError.message.includes("duplicate")) {
          console.error("Error creating user:", createError);
        }
      }
    }

    // Check if entry exists
    const { data: existingEntry } = await supabase
      .from("journal_logs")
      .select("id")
      .eq("user_id", userId)
      .eq("date", today)
      .maybeSingle();

    let error;
    if (existingEntry) {
      const { error: updateError } = await supabase
        .from("journal_logs")
        .update({ evening_reflection: eveningReflection })
        .eq("id", existingEntry.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from("journal_logs")
        .insert({
          user_id: userId,
          date: today,
          evening_reflection: eveningReflection,
        });
      error = insertError;
    }

    if (error) {
      console.error("Error saving reflection:", error);
      alert(`Failed to save: ${error.message}. Please try again.`);
      setIsSaving(false);
      return;
    }

    setSaved(true);
    setIsSaving(false);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-dark-card border border-dark-border rounded-2xl p-4 sm:p-6 mt-4 sm:mt-6"
    >
      <h3 className="text-base sm:text-lg font-semibold text-white mb-4">Daily Chronicle</h3>
      
      <div className="space-y-6">
        {/* Daily Affirmation - Always shown first */}
        <div>
          <label className="block text-xs sm:text-sm text-gray-400 mb-2">
            Daily Affirmation
          </label>
          <textarea
            value={affirmation}
            onChange={(e) => setAffirmation(e.target.value)}
            placeholder="What is your main quest today?"
            disabled={affirmationSaved}
            className="w-full h-32 sm:h-40 px-4 py-3 bg-[#1a1f2e] border border-dark-border rounded-xl text-white font-mono text-sm focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              fontFamily: "'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace",
            }}
          />
          {!affirmationSaved && (
            <motion.button
              onClick={handleSaveAffirmation}
              disabled={isSaving || saved || !affirmation.trim()}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="mt-3 w-full py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saved ? (
                <>
                  <span>Saved ✓</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? "Saving..." : "Save Affirmation"}</span>
                </>
              )}
            </motion.button>
          )}
          {affirmationSaved && (
            <div className="mt-3 flex items-center gap-2 text-xs text-green-400">
              <span>✓ Affirmation saved</span>
            </div>
          )}
        </div>

        {/* Evening Reflection - Only shown after affirmation is saved */}
        {affirmationSaved ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <label className="block text-xs sm:text-sm text-gray-400 mb-2">
              How did you battle today?
            </label>
            <textarea
              value={eveningReflection}
              onChange={(e) => setEveningReflection(e.target.value)}
              placeholder="Reflect on your day..."
              className="w-full h-32 sm:h-40 px-4 py-3 bg-[#1a1f2e] border border-dark-border rounded-xl text-white font-mono text-sm focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
              style={{
                fontFamily: "'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace",
              }}
            />
            <motion.button
              onClick={handleSaveReflection}
              disabled={isSaving || saved || !eveningReflection.trim()}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="mt-3 w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saved ? (
                <>
                  <span>Saved ✓</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? "Saving..." : "Save Reflection"}</span>
                </>
              )}
            </motion.button>
          </motion.div>
        ) : (
          <div className="opacity-50 border border-dark-border rounded-xl p-4 bg-[#1a1f2e]/30">
            <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500">
              <Lock className="w-4 h-4" />
              <span>Complete your daily affirmation to unlock reflection</span>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

