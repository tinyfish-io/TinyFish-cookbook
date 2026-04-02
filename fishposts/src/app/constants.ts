import type { ContentMode } from "@/lib/prompts";

export const FISH_LOGS = [
  "C:\\fishposts> deploy_fish.exe",
  "> deploying the fish...",
  "> swimming to target URL... \uD83E\uDD1D",
  "> page found \u2014 loading content...",
  "> reading the headline... \uD83D\uDC40",
  "> scanning body text...",
  "> analyzing page vibes...",
  "> extracting the key message...",
  "> pulling out the juicy parts...",
  '> "synergy" detected. yikes.',
  "> buzzword density: CRITICAL \u26A0\uFE0F",
  "> understanding the vibe...",
  "> swimming to imgflip now... \uD83C\uDFCA",
  "> browsing meme templates...",
  "> drake? distracted bf? hmm...",
  "> debating which template fits...",
  "> this one? no wait, THIS one!",
  "> template locked in \uD83D\uDD12",
  "> writing top text...",
  "> crafting bottom text...",
  "> applying impact font...",
  "> fine-tuning the punchline...",
  "> adjusting comedy levels... \uD83D\uDCC8",
  "> rendering final meme...",
  "> almost done \u2014 fish is tired \uD83D\uDE2E\u200D\uD83D\uDCA8",
];

export const STATUS_MESSAGES = [
  "Reading the page...",
  "Analyzing content...",
  "Finding the perfect template...",
  "Writing comedy gold...",
  "Almost there...",
];

export const EXAMPLE_URLS = [
  { label: "stripe.com", url: "https://stripe.com", icon: "\uD83D\uDCB3" },
  { label: "notion.so", url: "https://notion.so", icon: "\uD83D\uDCDD" },
  { label: "figma.com", url: "https://figma.com", icon: "\uD83C\uDFA8" },
  { label: "vercel.com", url: "https://vercel.com", icon: "\u25B2" },
  { label: "linear.app", url: "https://linear.app", icon: "\u26A1" },
  { label: "shopify.com", url: "https://shopify.com", icon: "\uD83D\uDECD\uFE0F" },
];

export const STEPS = [
  { num: "1", emoji: "\uD83D\uDD17", title: "Pick a mode", desc: "Click Start and choose your weapon." },
  { num: "2", emoji: "\uD83D\uDC1F", title: "Feed the fish", desc: "Drop a URL, paste a take, or let it roam." },
  { num: "3", emoji: "\uD83C\uDFA8", title: "Fish does its thing", desc: "Our AI literally browses the internet." },
  { num: "4", emoji: "\uD83D\uDC80", title: "Content drops", desc: "Memes, threads, dispatches \u2014 so specific it's scary." },
];

export const FISH_FACTS = [
  { emoji: "\uD83E\uDDE0", fact: "A goldfish has a longer attention span than the average internet user." },
  { emoji: "\uD83D\uDC21", fact: "Pufferfish contain enough toxin to kill 30 adults. They chose violence." },
  { emoji: "\uD83C\uDF0A", fact: "There are more fish in the sea than stars visible to the naked eye." },
  { emoji: "\uD83D\uDCA4", fact: "Some fish sleep with one eye open. Trust issues are real." },
  { emoji: "\uD83E\uDD88", fact: "Sharks have been around longer than trees. They\u2019re OG." },
  { emoji: "\uD83C\uDFA8", fact: "Clownfish can change gender. They\u2019re built different." },
  { emoji: "\uD83D\uDCAA", fact: "The mantis shrimp punches so hard it boils water around its fist." },
  { emoji: "\uD83D\uDC40", fact: "A seahorse can move its eyes independently. Multitasking king." },
  { emoji: "\u26A1", fact: "Electric eels can produce 860 volts. That\u2019s a weapon." },
  { emoji: "\uD83E\uDDD3", fact: "Some deep sea fish create their own light. Bioluminescent drip." },
  { emoji: "\uD83C\uDFC3", fact: "Sailfish can swim 68 mph. Faster than most people drive." },
  { emoji: "\uD83E\uDD14", fact: "Fish can recognize human faces. They\u2019re judging you right now." },
];

export const SPARKLE_CHARS = ["\u2726", "\u2727", "\u2605", "\u00B7", "\u22C6"];
export const NEON_COLORS = ["#FF00FF", "#00FFFF", "#FFFF00", "#00FF00"];

export const SPARKLE_BURST = Array.from({ length: 24 }, (_, i) => ({
  left: `${(i * 4.3 + 3) % 100}%`,
  char: SPARKLE_CHARS[i % SPARKLE_CHARS.length],
  color: NEON_COLORS[i % NEON_COLORS.length],
  delay: `${(i * 0.05).toFixed(2)}s`,
  duration: `${(1.2 + (i * 0.08) % 1).toFixed(2)}s`,
}));

export const MODE_FLAVOR: Record<ContentMode, { tagline: string; placeholder?: string; inputType: "url" | "text" | "none" }> = {
  site_roast: {
    tagline: "Paste a URL. The fish visits it. A meme appears.",
    placeholder: "https://your-favorite-website.com",
    inputType: "url",
  },
  trend_roast: {
    tagline: "The fish browses trending tech news and makes fun of whatever it finds.",
    inputType: "none",
  },
  quote_dunks: {
    tagline: "Paste a tweet, a LinkedIn post, a hot take. Get 3 devastating responses.",
    placeholder: "Paste a tweet, a LinkedIn post, a hot take...",
    inputType: "text",
  },
  fish_dispatches: {
    tagline: "The fish visits your URL and writes unhinged first-person dispatches.",
    placeholder: "https://where-should-the-fish-go.com",
    inputType: "url",
  },
  unhinged_threads: {
    tagline: "The fish researches a topic and writes a thread that escalates into chaos.",
    placeholder: "What topic should the fish go off about?",
    inputType: "text",
  },
  chaos_mode: {
    tagline: "Random template + random tone + your input = pure WTF.",
    placeholder: "Type literally anything...",
    inputType: "text",
  },
  corporate_bs: {
    tagline: "Paste corporate speak. The fish translates what it actually means.",
    placeholder: "Paste a corporate email, LinkedIn post, or press release...",
    inputType: "text",
  },
  plot_twist: {
    tagline: "Enter any statement. Get a meme with a devastating plot twist.",
    placeholder: "Type any normal statement...",
    inputType: "text",
  },
  excuse_gen: {
    tagline: "Describe the situation. Get a Win98 error message as your excuse.",
    placeholder: "What do you need an excuse for?",
    inputType: "text",
  },
};

export const MEME_MODES: ContentMode[] = [
  "site_roast",
  "trend_roast",
  "chaos_mode",
  "plot_twist",
];

export const TEXT_MODES: ContentMode[] = [
  "quote_dunks",
  "fish_dispatches",
  "unhinged_threads",
  "corporate_bs",
  "excuse_gen",
];

export const MODE_ORDER: ContentMode[] = [...MEME_MODES, ...TEXT_MODES];

export const MODE_DESC: Record<ContentMode, string> = {
  site_roast: "URL \u2192 meme",
  trend_roast: "trending news \u2192 meme",
  chaos_mode: "your text \u2192 random meme",
  plot_twist: "your text \u2192 plot twist meme",
  quote_dunks: "hot take \u2192 3 dunks",
  fish_dispatches: "URL \u2192 fish reviews the site",
  unhinged_threads: "topic \u2192 viral thread",
  corporate_bs: "corporate text \u2192 translation",
  excuse_gen: "situation \u2192 Win98 error excuse",
};

export const BIOS_LINES = [
  "FishPosts BIOS v98.0",
  "(C) 2024 FishPosts Inc.",
  "",
  "CPU: FishChip\u2122 4.20GHz",
  "640K Base Memory           OK",
  "Extended Memory: 42069K    OK",
  "",
  "Detecting Fish Hardware...",
  "Fish Accelerator Card     [OK]",
  "Meme Co-Processor         [OK]",
  "Sarcasm Module            [OK]",
  "Internet Explorer 4.0     [OK]",
  "Dial-Up Modem 56K         [OK]",
  "",
  "All systems operational.",
  "",
  "C:\\> LOADING FISHPOSTS.EXE...",
  "",
  "Starting Windows 98...",
];
