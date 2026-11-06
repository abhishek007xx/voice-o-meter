# 🎙️ Voice-O-Meter

A real-time voice pitch analyzer, macho score meter, and fun audio evaluation web app built with Next.js, React, Tailwind CSS, Framer Motion, and the Web Audio API.

## ✨ Features
- **Real-Time Pitch Detection**: Uses autocorrelation algorithms to detect pitch frequency (Hz) directly in the browser.
- **Dynamic Gauge & Waveform**: Interactive animated visualizers powered by Framer Motion.
- **Verdict & Analysis**: Evaluates voice characteristics and assigns verdicts and achievements.
- **Client-Side Processing**: Microphone data is analyzed directly on the client device.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ or Bun
- npm / pnpm / bun

### Installation

```bash
# Clone the repository
git clone https://github.com/abhishek007xx/voice-o-meter.git
cd voice-o-meter

# Install dependencies
npm install
# or
bun install

# Run the development server
npm run dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🌐 Deploy on Vercel

1. Push your changes to GitHub (already configured on `main`).
2. Go to [Vercel](https://vercel.com/) and click **"Add New Project"**.
3. Import the repository **`abhishek007xx/voice-o-meter`**.
4. Framework Preset will automatically detect **Next.js**.
5. Click **"Deploy"**.

## 🛠️ Tech Stack
- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) & [shadcn/ui](https://ui.shadcn.com/)
- **Animation**: [Framer Motion](https://www.framer.com/motion/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Audio Analysis**: Web Audio API (Autocorrelation)
