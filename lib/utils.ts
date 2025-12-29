import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getTodayDateString(): string {
  const today = new Date()
  return today.toISOString().split('T')[0]
}

export function getYesterdayDateString(): string {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return yesterday.toISOString().split('T')[0]
}

export function isToday(dateString: string): boolean {
  return dateString === getTodayDateString()
}

export function calculateWealthDestroyed(spending: number): number {
  // 30-year compound interest at 10% (S&P 500 average)
  const years = 30
  const rate = 0.10
  const futureValue = spending * Math.pow(1 + rate, years)
  return futureValue - spending
}

export function calculateLifeWasted(hoursPerDay: number): number {
  // Extrapolate to years lost over 80-year life
  const hoursPerYear = hoursPerDay * 365
  const totalHours = hoursPerYear * 80
  const yearsLost = totalHours / (365 * 24)
  return yearsLost
}

export function getDayOfWeek(dateString: string): number {
  const date = new Date(dateString);
  return date.getDay(); // 0 = Sunday, 6 = Saturday
}

export function getMonthlyTier(points: number): { name: string; description: string; glow: string } {
  if (points < 500) {
    return { name: "Rags", description: "Peasant", glow: "" }
  } else if (points < 1500) {
    return { name: "Iron Gear", description: "Warrior", glow: "glow-cyan" }
  } else {
    return { name: "God Tier", description: "Glowing Aura", glow: "glow-purple" }
  }
}

export function getCharacterLevel(monthlyPoints: number): number {
  // Character visual progression based on monthly points
  if (monthlyPoints < 100) return 0; // Weak
  if (monthlyPoints < 300) return 1; // Getting stronger
  if (monthlyPoints < 500) return 2; // Strong
  if (monthlyPoints < 1000) return 3; // Very strong
  if (monthlyPoints < 1500) return 4; // Powerful
  return 5; // Decked out
}

/**
 * Calculate daily battle score for Arena PvP
 * This is the score used to compare daily performance between users
 * Formula: Sum of all daily points (excluding penalties)
 * 
 * Tiered Scoring System:
 * - STR (Strength): Workout = 20 pts (penalty -15 if missed)
 * - INT (Intelligence): Reading = 0.5 pts/page (no cap, positive only)
 * - CHA (Charisma): Connections = 6 pts/person (no cap, medium return)
 * - WIL (Willpower): 
 *   - Sleep: 8h = 30 pts (optimal), 9h = 35 pts (better), 7h = 10 pts, 
 *     10h = 15 pts, 11h = 10 pts, 12+ = 5 pts, <7h = tiered penalties
 *   - Meditate = 10 pts (penalty -10 if missed)
 *   - Diet = 20 pts (penalty -15 if missed)
 * 
 * Perfect Day Potential: Variable (no caps on reading/connections)
 * Daily Goal: 200 points (stretch goal to allow for above-and-beyond days)
 */
export function calculateDailyBattleScore(dailyLogs: Array<{ points: number; category: string }>): number {
  // Sum all points from daily logs, excluding penalties
  return dailyLogs
    .filter(log => log.category !== "penalty" && log.category !== "weekly")
    .reduce((sum, log) => sum + log.points, 0);
}

/**
 * Compare two daily battle scores and determine winner
 * Returns: 1 if score1 wins, -1 if score2 wins, 0 if tie
 */
export function compareBattleScores(score1: number, score2: number): number {
  if (score1 > score2) return 1;
  if (score1 < score2) return -1;
  return 0;
}

/**
 * Get the Sunday date for a given week (weeks start on Sunday)
 */
export function getWeekSunday(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday, 6 = Saturday
  const diff = d.getDate() - day; // Subtract days to get to Sunday
  const sunday = new Date(d.setDate(diff));
  sunday.setHours(0, 0, 0, 0);
  return sunday;
}

/**
 * Get the Saturday date for a given week
 */
export function getWeekSaturday(date: Date = new Date()): Date {
  const sunday = getWeekSunday(date);
  const saturday = new Date(sunday);
  saturday.setDate(sunday.getDate() + 6);
  saturday.setHours(23, 59, 59, 999);
  return saturday;
}

/**
 * Get week range string (e.g., "Dec 1 - Dec 7, 2024")
 */
export function getWeekRangeString(date: Date = new Date()): string {
  const sunday = getWeekSunday(date);
  const saturday = getWeekSaturday(date);
  
  const formatDate = (d: Date) => {
    return d.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  };
  
  return `${formatDate(sunday)} - ${formatDate(saturday)}`;
}

/**
 * Get the week that should be shown (previous week if it's Sunday, otherwise locked)
 */
export function getActiveWeek(): { weekStart: Date; weekEnd: Date; isLocked: boolean; isCurrentWeek: boolean } {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday
  
  // If it's Sunday, show previous week (last week)
  if (dayOfWeek === 0) {
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 7);
    return {
      weekStart: getWeekSunday(lastWeek),
      weekEnd: getWeekSaturday(lastWeek),
      isLocked: false,
      isCurrentWeek: false,
    };
  }
  
  // Otherwise, show current week but it's locked
  return {
    weekStart: getWeekSunday(today),
    weekEnd: getWeekSaturday(today),
    isLocked: true,
    isCurrentWeek: true,
  };
}

/**
 * Get date string for a week's Sunday (for database queries)
 */
export function getWeekSundayString(date: Date = new Date()): string {
  return getWeekSunday(date).toISOString().split('T')[0];
}

/**
 * Get next Sunday date
 */
export function getNextSunday(): Date {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
  const nextSunday = new Date(today);
  nextSunday.setDate(today.getDate() + daysUntilSunday);
  nextSunday.setHours(0, 0, 0, 0);
  return nextSunday;
}

