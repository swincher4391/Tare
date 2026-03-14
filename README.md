# Tare

**Find the true weight.**

Tare (as in taring a scale — zeroing out the bowl to measure what's actually inside) is a lightweight, single-purpose PWA for tracking daily weight, computing 7-day rolling averages, respecting menstrual cycle windows, and surfacing checkpoint verdicts from the Evidence-Based Weight Loss Plan.

Where Mise strips the noise from recipes to give you just the recipe, Tare strips the noise from the scale to give you just the trend.

## What it does

- **Daily weigh-in** — one-tap entry, under 10 seconds
- **7-day rolling average** — most recent 7 valid entries (not calendar days), minimum 4 required
- **Cycle window exclusion** — days -5 through +3 of period start, with optional "log anyway"
- **Post-period comparison** — the hero metric: lowest 7-day average in the week after each period
- **Checkpoint verdicts** — automated Phase 1 (week 4) and Phase 2 (week 8) evaluations using exact plan language
- **Phase management** — automatic transitions with manual override

## What it is NOT

- NOT a food tracker or calorie counter
- NOT a fitness app
- NOT a medical tool

## Tech stack

| Component | Technology |
|-----------|------------|
| Framework | React 19 + TypeScript |
| Build | Vite |
| Local Storage | IndexedDB via Dexie.js |
| PWA | vite-plugin-pwa + Workbox |
| Charts | Recharts |
| Routing | react-router-dom |

No backend. No API keys. No accounts. Everything runs client-side.

## Getting started

```bash
npm install
npm run dev
```

## Building

```bash
npm run build
```

## Project structure

```
src/
  db/index.ts                  # Dexie database (weighIns, cycleMarkers, planConfig)
  utils/
    averages.ts                # Rolling average math, post-period averages
    cycleWindows.ts            # Cycle window exclusion logic
    checkpoints.ts             # Checkpoint verdict computation
  hooks/
    useWeighIns.ts             # CRUD + rolling average
    useCycleMarkers.ts         # CRUD + window exclusion + post-period averages
    usePlanConfig.ts           # Plan phase state + transitions
    useCheckpoint.ts           # Checkpoint verdict logic
  components/
    WeighInForm.tsx            # Weight input
    CycleWindowMessage.tsx     # Cycle window UI with "log anyway"
    RollingAverageChart.tsx    # 30-day chart (daily dots + average line)
    PostPeriodHero.tsx         # Hero metric display
    PhaseIndicator.tsx         # Phase / week / checkpoint countdown
    TargetsReminder.tsx        # Current phase targets
    CheckpointBanner.tsx       # Checkpoint notification banner
  screens/
    Dashboard.tsx              # Home screen
    CheckpointReview.tsx       # Checkpoint detail + phase transition
    History.tsx                # Weigh-in list (edit/delete)
    CycleLog.tsx               # Period start dates + cycle lengths
    Settings.tsx               # Plan config, export/import, reset
```

## Hosting

Vercel (free tier). Custom subdomain: `tare.swinch.dev`
