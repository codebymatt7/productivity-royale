# LifeMaxxing Royale

A high-stakes personal development game where daily habits build a character, and missing them has consequences.

## Features

- **Daily Quest Board**: Log workouts, reading, clean eating, and meditation - but only for TODAY. No retroactive entries allowed.
- **Streak Check**: Miss a day? Lose 50 points automatically on login.
- **Weekly Ritual**: Face reality with screen time and spending calculations (unlocks on Sunday).
- **Character System**: Build Strength, Intelligence, Charisma, and Willpower stats.
- **Monthly Tiers**: Rags → Iron Gear → God Tier based on monthly points.
- **Arena (Coming Soon)**: Battle Power display ready for future PvP features.

## Tech Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS** (Dark Fantasy/Cyberpunk theme)
- **Supabase** (Auth + Database)
- **Framer Motion** (Animations)
- **Recharts** (Charts - ready for future use)
- **Lucide React** (Icons)

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the schema from `supabase/schema.sql`
3. Copy your project URL and anon key

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Schema

### Tables

- **users**: User profiles (extends Supabase auth.users)
- **character_stats**: 1-to-1 relationship with users, stores STR/INT/CHA/WIL stats
- **logs**: All activity logs with date tracking for strict daily validation

### Key Features

- Row Level Security (RLS) enabled on all tables
- Automatic stat updates via database triggers
- Date-based logging prevents retroactive entries

## Game Mechanics

### Daily Quests
- **Workout**: +20 STR
- **Read**: +15 INT
- **Eat Clean**: +10 CHA
- **Meditate**: +15 WIL

### Weekly Ritual
- Calculates 30-year compound interest loss on spending
- Extrapolates screen time to "years lost" over 80-year life
- Applies penalty points based on calculations

### Monthly Tiers
- **< 500 pts**: Rags (Peasant)
- **500-1500 pts**: Iron Gear (Warrior) - Cyan glow
- **1500+ pts**: God Tier (Glowing Aura) - Purple glow

## Future Features

- PvP Arena battles
- Leaderboards
- Character customization
- Achievement system
- Social features

## License

MIT

