/**
 * The content department of VOICE-O-METER 3000.
 * 0% science, 100% comedy. Handle with care.
 */

export interface Verdict {
  /** minimum score (inclusive) that earns this verdict */
  min: number;
  title: string;
  emoji: string;
  subtitle: string;
  roast: string;
  color: string;
}

/** Ordered from most macho to least macho */
export const VERDICTS: Verdict[] = [
  {
    min: 86,
    title: "BARRY WHITE",
    emoji: "🎩",
    subtitle: "Certified Subwoofer Human",
    roast:
      "Whoa. Your voice is so deep it technically counts as a geological event. Scientists want to study you, whales want to befriend you, and every time you say \u201chello\u201d the furniture vibrates respectfully. Please announce our birthday party.",
    color: "#ef233c",
  },
  {
    min: 71,
    title: "ACTION HERO",
    emoji: "💪",
    subtitle: "Movie-Trailer Material",
    roast:
      "You could narrate the Super Bowl and grown adults would cry. Your voice has main-character energy — the kind that says \u201cIn a world\u2026\u201d and the world simply listens. Gym bros nod at you in the street.",
    color: "#ff8c42",
  },
  {
    min: 56,
    title: "SMOOTH OPERATOR",
    emoji: "🕺",
    subtitle: "Late-Night Radio Host Energy",
    roast:
      "Silky. Buttery. Slightly illegal in three states. Your voice could sell a timeshare to a fish and the fish would say thank you. You're not macho — you're smooth, and honestly that's more dangerous.",
    color: "#ffd60a",
  },
  {
    min: 45,
    title: "MYSTICAL ANDROGYNY",
    emoji: "🧙",
    subtitle: "The Voice Gods Are Confused",
    roast:
      "Your vocal cords refused to pick a side, and we respect the hustle. You are the mysterious stranger in every fantasy novel. Podcasters fear you — you fit every demographic at once. Unpredictable. Iconic. Slightly unhinged.",
    color: "#06d6a0",
  },
  {
    min: 31,
    title: "BUBBLY BRIGHT",
    emoji: "✨",
    subtitle: "Professional Enthusiasm Machine",
    roast:
      "Your voice is the human version of a sparkly emoji. Morning-show hosts fear your energy. You could read a tax document out loud and it would sound like breaking news. Dogs adore you. So do grandmas.",
    color: "#ff5db1",
  },
  {
    min: 16,
    title: "DISNEY PRINCESS",
    emoji: "👸",
    subtitle: "Royal Highness of High Notes",
    roast:
      "Every word you say is legally classified as a duet with birds. Glass is nervous around you. When you laugh, animated forest animals probably show up with a dress. Magical, radiant, occasionally ultrasonic.",
    color: "#ff2e88",
  },
  {
    min: 0,
    title: "MICKEY MOUSE",
    emoji: "🐭",
    subtitle: "Certified Chipmunk Royalty",
    roast:
      "Congratulations — parts of your voice are only audible to dogs and passing submarines. You could voice a cartoon mascot TODAY. Helium called; it wants your range. Adorable? Absolutely. Human pitch? Debatable.",
    color: "#c77dff",
  },
];

export function getVerdict(score: number): Verdict {
  return VERDICTS.find((v) => score >= v.min) ?? VERDICTS[VERDICTS.length - 1];
}

/** Messages that cycle while the "lab" pretends to work */
export const ANALYZING_MESSAGES = [
  "Measuring testosterone levels… jk, measuring pitch! 🎚️",
  "Consulting the Ancient Council of Voice Gods… 📜",
  "Applying extremely dubious mathematics… 🤓",
  "Notarizing your verdict with confetti ink… ✍️",
];

export const ANALYSIS_STEPS = [
  { label: "Audio captured", icon: "🎙️" },
  { label: "Pitch extracted", icon: "🎚️" },
  { label: "Dubious math applied", icon: "🧮" },
  { label: "Verdict notarized", icon: "📜" },
];

/** Rotating "tips" while the mic is live */
export const RECORDING_TIPS = [
  "Pro tip: mention your gym membership for +10% depth 🏋️",
  "Try holding \u201caaaahhh\u201d like a phone that's 1% charged 🔋",
  "Whispering is cheating. The Meter sees all. 👁️",
  "Fun fact: nervous voices go higher. Relax. Or don't. 😨",
  "Movie-trailer voice: \u201cIn a world where one voice rules them all\u2026\u201d 🎥",
  "Do NOT laugh. Laughing voids the fake warranty. 😤",
];

/** Fun facts by average pitch */
const HZ_FACTS: { max: number; fact: string }[] = [
  { max: 85, fact: "Your voice can start a lawnmower. Whales are fans. 🐋" },
  { max: 110, fact: "Official movie-trailer narrator territory. 🎬" },
  { max: 140, fact: "Standard-issue dude frequency. Factory certified. 🧔" },
  { max: 165, fact: "The smooth middle ground. Jazz-club approved. 😎" },
  { max: 200, fact: "Radio-friendly brightness. Podcasters envy you. 📻" },
  { max: 240, fact: "Royal highness of high notes. 🎭" },
  { max: 280, fact: "Opera-grade sparkle. Glass is nervous. 🥂" },
  { max: Infinity, fact: "Parts of your voice are only audible to dogs. 🐕" },
];

export function hzFact(hz: number): string {
  return (HZ_FACTS.find((f) => hz <= f.max) ?? HZ_FACTS[HZ_FACTS.length - 1]).fact;
}

/** Scrolling ticker phrases */
export const TICKER_PHRASES = [
  "🎉 VOICE-O-METER 3000 — certified 127% accurate*",
  "🎤 Find out: Barry White or Mickey Mouse?",
  "🔒 Your voice never leaves your browser. We can't even hear you.",
  "🏆 Challenge your friends. Destroy their confidence. For fun!",
  "🧪 Now with 300% more dubious mathematics",
  "*Results notarized by the Institute of Totally Real Science™",
];

/** Appeal rejections for the DISPUTE button */
export const APPEAL_REJECTIONS = [
  "⚖️ APPEAL REJECTED. The Meter never lies.",
  "😤 Denied. The Meter has 3,000 years of experience.",
  "🐸 Appeal denied. Try drinking more water.",
  "🚫 The Council of Voice Gods laughed at your appeal.",
  "🙅 Rejected. The algorithm is emotional right now.",
];

/** What the appeal button claims to do vs what it does */
export const HOW_IT_WORKS = [
  { icon: "🎙️", title: "Allow the mic", text: "One click. Your secret sounds are safe with your own browser." },
  { icon: "🗣️", title: "Say \u201cAaaahhh\u201d", text: "Or go full movie trailer: \u201cIn a world where one voice rules them all\u2026\u201d" },
  { icon: "🔥", title: "Get roasted", text: "Receive your official verdict. We mean verdict. Definitely verdict." },
];

/** Default contestant name if the input is left empty */
export const ANONYMOUS_NAME = "Anonymous Chicken 🐔";
