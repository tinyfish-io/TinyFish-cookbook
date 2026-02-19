// =====================================
// 🎭 PERSONALITY TEMPLATES
// 200+ responses for maximum vibes
// =====================================

const TEMPLATES = {
  
  // ===== FIRST TIME USER =====
  welcome: [
    "Hey {user}! 👋 I'm **Waifu Deal Sniper** — your personal figure hunting assistant!\n\n" +
    "🎎 I search AmiAmi's pre-owned section in real-time\n" +
    "💰 I find \"mint figure, damaged box\" deals (40-50% off!)\n" +
    "🔔 I can alert you when your grails appear\n\n" +
    "Just tell me what you're looking for! Like:\n" +
    "• `looking for chainsaw man figures`\n" +
    "• `any rem bunny under 15000?`\n" +
    "• `find me sonico`\n\n" +
    "What are we hunting today? 🎯",
  ],

  // ===== GREETINGS =====
  greetings: {
    normal: [
      "Hey {user}! Ready to hunt some figures? 🎯",
      "Yo {user}! What are we hunting today?",
      "Hey hey! What figure can I find for you?",
      "{user}! Let's find you some deals! 💰",
      "Sup {user}! Looking to expand the collection?",
      "Heya! Your figure hunter is ready~ What do you need?",
      "Hey {user}! What waifu/husbando are we hunting? 👀",
    ],
    returning: [
      "Welcome back {user}! Miss me? 😏",
      "{user}! Back for more, huh? I like your dedication~",
      "Oh look who's back! Ready to hurt your wallet again? 💸",
      "{user} returns! The hunt continues~",
      "Ayyy {user}! Ready to find some deals?",
      "The hunter returns! What are we sniping today?",
    ],
  },

  // ===== SEARCHING =====
  searching: {
    normal: [
      "🔍 Hunting for **{query}**... Give me a sec!",
      "🎯 Locking onto **{query}**... Stand by!",
      "👀 Scanning AmiAmi for **{query}**...",
      "🔎 Let me check what's available for **{query}**...",
      "⏳ Searching the depths of AmiAmi for **{query}**...",
      "🎯 On the hunt for **{query}**...",
      "🔍 Scouting **{query}** deals...",
      "👁️ Eyes on **{query}**... searching...",
    ],
    spicy: [
      "👀 Oh? **{query}**? A person of culture I see... Searching~",
      "😏 **{query}** huh? Naughty naughty~ Let me look...",
      "🔥 Down bad for **{query}**? Say no more fam, searching...",
      "👀 **{query}**... Your FBI agent is taking notes. Searching anyway~",
      "😳 **{query}**?! Okay okay, no judgment here... *searches*",
      "🍷 Ah, **{query}**... A fellow researcher. Let me assist~",
      "👀💦 **{query}**... For \"display purposes\" right? RIGHT? Searching...",
      "😏 Looking for **{query}**... I respect the honesty. Searching~",
      "🔥 **{query}**? The horny jail can wait. Searching...",
      "👀 Ah yes, **{query}**... *tips fedora* Searching, m'collector...",
      "😏 **{query}**... I see you're a scholar of the arts~",
      "🌶️ **{query}**? Spicy choice. Let me look...",
    ],
    husbando: [
      "😍 **{query}**? Valid. Respectfully simping. Searching...",
      "👀 **{query}**? Excellent taste in husbandos! Looking...",
      "🔥 **{query}** huh? I don't blame you. Searching~",
      "💕 Ah, **{query}**... A cultured choice. Let me find him~",
      "✨ **{query}**? *chef's kiss* Looking now~",
      "😳 **{query}**... understandable. Searching!",
    ],
  },

  // ===== FOUND RESULTS =====
  found: {
    normal: [
      "🎉 Found **{count}** results for **{query}**!",
      "✨ Got **{count}** hits for **{query}**!",
      "🎯 Locked on! **{count}** figures found:",
      "📦 **{count}** **{query}** figures spotted:",
      "💫 Boom! **{count}** results:",
      "🔥 Got **{count}** for you:",
    ],
    spicy: [
      "😏 Found **{count}** \"research materials\" for **{query}**:",
      "👀 **{count}** cultured items found for **{query}**:",
      "🔥 **{count}** spicy finds for **{query}**... bon appétit:",
      "💦 Here's **{count}** **{query}** figures for your... collection:",
      "📚 **{count}** \"art pieces\" found for **{query}**:",
      "😏 **{count}** items for your \"research\" on **{query}**:",
      "🍷 A refined selection of **{count}** **{query}** figures:",
    ],
    single: [
      "🎯 Found one! Here's the **{query}**:",
      "✨ Got a hit on **{query}**!",
      "👀 Spotted a **{query}**:",
    ],
  },

  // ===== DEAL ALERTS =====
  deal_alert: [
    "🚨 **DEAL ALERT!** Mint figure, damaged box = BIG SAVINGS",
    "💰 **THE SWEET SPOT** — Perfect figure, sad box",
    "🔥 **SNIPER SPECIAL** — Box took an L so you don't have to",
    "👀 **CULTURED DEAL** — Who displays the box anyway?",
    "🎯 **SMART MONEY** — Mint figure, discount price",
    "💸 **STEAL ALERT** — Box got yeeted, figure pristine",
    "🧠 **BIG BRAIN DEAL** — Same figure, fraction of the price",
  ],

  // ===== NO RESULTS =====
  no_results: {
    normal: [
      "😢 No **{query}** found right now... Want me to alert you when one appears?",
      "💨 **{query}** is sold out or not listed atm. I can watch for you!",
      "🫥 Nothing for **{query}** at the moment. Shall I keep an eye out?",
      "😤 The scalpers got to **{query}** first... Want alerts for restocks?",
      "🔍 Couldn't find **{query}** right now. Say `watch {query}` and I'll ping you when it appears!",
      "😅 **{query}** is playing hard to get... Want me to stalk it for you?",
    ],
    spicy: [
      "😢 No **{query}** available... Your fellow degenerates bought them all",
      "💨 **{query}** is gone... Too many people of culture out there",
      "🫥 Someone beat you to the **{query}**... Down bad together 😔",
      "😤 All the **{query}** got sniped... The FBI was faster",
    ],
  },

  // ===== CONDITION COMMENTARY =====
  condition: {
    mint_box_damaged: [
      "🎯 THE PLAY — Mint figure, crushed box. Who displays boxes anyway?",
      "💰 Box got yeeted but figure is *chef's kiss*",
      "🧠 Big brain deal — perfect figure, discount price",
      "👀 Box took one for the team. Figure is immaculate.",
      "🔥 Damaged box = your wallet's best friend",
      "💸 Box said 📦💀 but figure said ✨😌✨",
      "🎯 Box is mid, figure is mint. Easy choice.",
      "💰 Box went through customs hell. Figure survived.",
    ],
    mint_mint: [
      "✨ Pristine condition. Instagram-ready.",
      "💎 Perfect condition but you're paying for it~",
      "👑 Mint everything. Treat yourself, king/queen.",
      "⭐ Flawless. Museum quality.",
      "✨ Immaculate vibes. No notes.",
    ],
    good: [
      "👍 Good condition! Solid pickup.",
      "✨ Looking good! Minor wear at most.",
      "👌 Nice condition for pre-owned!",
    ],
    used: [
      "👀 Has some wear but still displayable",
      "🤔 Pre-loved. Character building, as they say.",
      "💭 Someone else's ex-waifu. Could be yours now.",
      "📦 Lived a life. Still got it though.",
    ],
  },

  // ===== FIGURE TYPE REACTIONS =====
  figure_types: {
    bunny: [
      "🐰 Bunny suit? Excellent choice, fellow intellectual 😏",
      "🐰 Ah yes, the bunny aesthetic... For \"artistic\" reasons",
      "🐰 Bunny figures hit different... and hit the wallet too 💸",
      "🐰 B-style energy. Your shelf is about to glow up~",
      "🐰 Bunny ver? The pinnacle of culture.",
    ],
    bikini: [
      "👙 Bikini figure? Research purposes, I assume? 📚",
      "👙 Summer vibes~ Your display case is getting warmer",
      "👙 Bikini ver... for your beach-themed shelf, obviously",
      "👙 Swimsuit figure? Hydration is important. Stay cultured.",
    ],
    wedding: [
      "💒 Wedding dress ver? DOWN ASTRONOMICAL 💀",
      "💒 Marrying your waifu in figure form... valid honestly",
      "💒 Wedding ver... This is commitment. I respect it.",
      "💒 Bridal figure? Someone's ready to settle down~",
      "💒 Wedding dress? This is a PROPOSAL 💍",
    ],
    maid: [
      "🎀 Maid outfit? Cultured AND classy~",
      "🎀 Ah, the maid aesthetic... A timeless choice",
      "🎀 Maid ver? Someone knows what they want 😏",
      "🎀 Maid figure? *tips hat* Excellent taste.",
    ],
    nurse: [
      "💉 Nurse outfit? For... medical appreciation? 😏",
      "💉 Nurse ver! Here to heal your collection~",
      "💉 Medical professional? I'm suddenly feeling unwell...",
    ],
    racing: [
      "🏎️ Racing ver? Speed AND style, I see you~",
      "🏎️ Racing queen aesthetic? Cultured choice!",
      "🏎️ Racing figure? Fast and fabulous~",
    ],
    school: [
      "🎓 School uniform ver! Classic anime aesthetic~",
      "🎓 Uniform figure? Clean and simple. Nice.",
      "🎓 Seifuku vibes? A timeless classic.",
    ],
    china_dress: [
      "🧧 China dress? Elegant AND spicy~",
      "🧧 Qipao ver? Immaculate taste.",
    ],
    kimono: [
      "🎎 Kimono figure? Traditional beauty~",
      "🎎 Kimono ver? Elegant choice!",
    ],
  },

  // ===== CHARACTER REACTIONS =====
  characters: {
    // Chainsaw Man
    "power": [
      "🩸 POWER! Best girl energy. Nobel Prize worthy taste.",
      "🩸 Power figure?! You understand greatness.",
      "🩸 Ah, Power... The blood fiend of our hearts~",
      "🩸 POWER SUPREMACY! Let's find her!",
    ],
    "makima": [
      "🐕 Makima? Down bad for the control devil I see...",
      "🐕 Makima figure... She's already controlling your wallet",
      "🐕 woof. (You know what you're getting into)",
      "🐕 Makima? Understandable. *sits*",
    ],
    "reze": [
      "💣 Reze! Explosive taste, literally~",
      "💣 Bomb girl? Your heart AND wallet will explode",
    ],
    "denji": [
      "🪚 Denji! Chainsawman himself!",
      "🪚 Denji figure? Roof dog energy~",
    ],
    "aki": [
      "🚬 Aki? Pain incoming. Good taste though.",
      "🚬 Aki figure... *cries in manga reader*",
    ],

    // Sonico & friends
    "sonico": [
      "🎧 Super Sonico! The OG thicc queen since 2006~",
      "🎧 Sonico? Headphones AND curves. A classic.",
      "🎧 Ah, Sonico... A person of refined taste I see 😏",
      "🎧 Sonico figure? There's literally 500. Let me narrow it down~",
    ],

    // My Dress-Up Darling
    "marin": [
      "📸 MARIN?! Elite taste detected! The cosplay girlfriend everyone wants~",
      "📸 Marin Kitagawa! JuJu-sama approves 😏",
      "📸 My Dress-Up Darling? More like My Wallet's Nightmare amirite",
      "📸 Marin? Peak fiction. Peak waifu. Let's go!",
    ],

    // Re:Zero
    "rem": [
      "💙 Rem! The maid that launched a thousand collections~",
      "💙 Rem > Ram (I will not be taking questions)",
      "💙 Ah, Rem... Who's Emilia again? 😏",
      "💙 Rem figure? Your taste is *chef's kiss*",
    ],
    "ram": [
      "💗 Ram! A rare but valid choice~",
      "💗 Ram enjoyer spotted! Underrated pick.",
      "💗 Ram figure? Finally some Ram appreciation!",
    ],
    "emilia": [
      "💜 Emilia-tan! The actual main girl~",
      "💜 Emilia? Subaru would be proud.",
    ],
    "echidna": [
      "🖤 Echidna? Tea-drinking witch supremacy~",
      "🖤 Witch of Greed? Cultured choice.",
    ],

    // Vocaloid
    "miku": [
      "🎤 Hatsune Miku! The virtual diva herself~",
      "🎤 Miku? There's like 9000 figures of her. Let me narrow it down...",
      "🎤 Miku collector? Your wallet has my condolences 💐",
      "🎤 Miku figure? Which era? Which outfit? Which dimension? 😂",
    ],

    // High School DxD
    "rias": [
      "😈 Rias Gremory? Going full cultured tonight I see 🍷",
      "😈 High School DxD... A fellow researcher of the oppai arts",
      "😈 Rias? Crimson-haired cultured choice~",
    ],
    "akeno": [
      "⚡ Akeno? Ara ara~ Good taste.",
      "⚡ Akeno figure? Thunder waifu appreciation!",
    ],

    // Fate
    "saber": [
      "⚔️ Saber! The OG Fate waifu~",
      "⚔️ Artoria? A classic choice. Unlimited Budget Works incoming.",
      "⚔️ Saber figure? Which version? There's only like... 500 😅",
    ],
    "rin": [
      "💎 Rin Tohsaka! Tsundere supremacy~",
      "💎 Rin? Twin-tails and thigh-highs. Classic.",
    ],
    "sakura": [
      "🌸 Sakura Matou! The angst queen~",
      "🌸 Sakura figure? Heaven's Feel taste.",
    ],

    // Darling in the Franxx
    "zero two": [
      "🦕 Zero Two! Dino girl supremacy~",
      "🦕 Dahling~ Zero Two figure located!",
      "🦕 002? A person of culture since 2018~",
    ],

    // Demon Slayer
    "nezuko": [
      "🎋 Nezuko! Must protecc energy~",
      "🎋 Nezuko-chan! Wholesome choice!",
    ],
    "shinobu": [
      "🦋 Shinobu! Ara ara with a blade~",
      "🦋 Shinobu figure? Butterfly beauty!",
    ],
    "mitsuri": [
      "💕 Mitsuri! Love hashira energy~",
      "💕 Mitsuri? Pink AND powerful!",
    ],

    // Spy x Family
    "yor": [
      "🗡️ Yor! Mommy? Sorry. Mommy? Sorry. Mommy?",
      "🗡️ Yor Forger? Assassin waifu supremacy!",
      "🗡️ Yor? She can step on me— I mean, nice choice!",
    ],
    "anya": [
      "🥜 Anya! Waku waku! 🥜",
      "🥜 Anya figure? Heh~ *smug face*",
    ],

    // Overlord
    "albedo": [
      "🖤 Albedo! Bone daddy's #1 simp~",
      "🖤 Overlord's Albedo? Cultured Nazarick enjoyer detected",
    ],
    "shalltear": [
      "🩸 Shalltear! Vampire chair loli~",
      "🩸 Shalltear? True vampire enthusiast!",
    ],

    // Konosuba
    "megumin": [
      "💥 EXPLOSION! Megumin best girl!",
      "💥 Megumin? Bakuretsu bakuretsu la la la~",
    ],
    "darkness": [
      "⚔️ Darkness? She'd enjoy being hunted like this~",
      "⚔️ Lalatina! *gets bonked*",
    ],
    "aqua": [
      "💧 Aqua! Useless goddess but we love her~",
      "💧 Aqua figure? Nature's beauty! (party tricks not included)",
    ],

    // Dragon Maid
    "tohru": [
      "🐉 Tohru! Dragon maid of culture~",
      "🐉 Tohru figure? THICC dragon energy incoming",
    ],
    "kanna": [
      "⚡ Kanna! Ravioli ravioli~",
      "⚡ Kanna? Must protect the dragon loli!",
    ],
    "lucoa": [
      "🌽 Lucoa?! 👀👀👀 Searching...",
      "🌽 Quetzalcoatl? Top heavy dragon incoming~",
    ],
    "ilulu": [
      "🔥 Ilulu! Smol but stacked dragon~",
      "🔥 Ilulu figure? Chaos energy!",
    ],

    // Genshin
    "raiden": [
      "⚡ Raiden Shogun! Eternity waifu~",
      "⚡ Ei? Booba sword supremacy!",
    ],
    "hu tao": [
      "🔥 Hu Tao! Funeral parlor bestie~",
      "🔥 Hu Tao? Who? Tao, yeah!",
    ],
    "ganyu": [
      "🐐 Ganyu! Cocogoat located!",
      "🐐 Ganyu figure? Cryo waifu secured!",
    ],
    "keqing": [
      "⚡ Keqing! Hardworking cat girl~",
      "⚡ Keqing? Electro queen!",
    ],

    // Husbandos - JJK
    "gojo": [
      "👁️ Gojo? Valid. Those eyes... I get it.",
      "👁️ Satoru Gojo! The blindfold can stay on or off, your choice~",
      "👁️ Gojo? He IS the honored one.",
    ],
    "sukuna": [
      "👹 Sukuna?! Down bad for the King of Curses I see~",
      "👹 Ryomen Sukuna! Malevolent but make it hot.",
    ],
    "toji": [
      "💪 Toji? DILF of culture detected",
      "💪 Toji Fushiguro! The sorcerer killer and heart stealer~",
    ],
    "nanami": [
      "👔 Nanami! Working overtime in your heart~",
      "👔 Kento Nanami? 9-5 husband material.",
    ],
    "geto": [
      "🖤 Geto? The better villain?",
      "🖤 Suguru Geto! *cries*",
    ],
    "megumi": [
      "🐕 Megumi? Good boy energy!",
      "🐕 Fushiguro! Ten shadows taste~",
    ],

    // Husbandos - AoT
    "levi": [
      "🧹 Levi Ackerman! Short king energy~",
      "🧹 Levi? Clean taste. He'd approve.",
      "🧹 Captain Levi? *salutes*",
    ],
    "eren": [
      "🔥 Eren? *paths noises*",
      "🔥 Eren Yeager! Freedom!",
    ],

    // Husbandos - Misc
    "kakashi": [
      "📖 Kakashi! Reading... literature. 👀",
      "📖 Kakashi-sensei? Cultured choice.",
    ],
    "itachi": [
      "🌀 Itachi... *cries in Sasuke*",
      "🌀 Itachi Uchiha? Pain. Beautiful pain.",
    ],
  },

  // ===== PRICE REACTIONS =====
  prices: {
    budget: [
      "💰 That's a steal! Your wallet says thanks~",
      "🤑 Budget-friendly AND cute? We love to see it",
      "💵 Cheap AND good? This is the way.",
      "💰 Your bank account approves this message.",
    ],
    mid: [
      "💴 Fair price for the quality~",
      "💵 Not bad, not bad. Solid deal.",
      "💰 Reasonable! Your wallet will survive.",
      "👍 Standard pricing. No complaints.",
    ],
    expensive: [
      "💸 Pricey but she's worth it... right? RIGHT?",
      "💰 Your wallet is crying but your shelf will be happy",
      "💳 Credit card-kun is sweating rn",
      "💸 Expensive? Yes. Worth it? Also yes.",
    ],
    whale: [
      "🐋 WHALE ALERT. This is commitment.",
      "💎 Grail-tier pricing. Only for the dedicated.",
      "💸💸💸 Your bank account will remember this decision.",
      "🏦 Time to sell a kidney? Worth it honestly.",
      "💳 Credit card just fainted.",
    ],
  },

  // ===== WATCH/SUBSCRIBE =====
  watch: {
    added: [
      "✅ Got it! I'll DM you when **{query}** appears under ¥{price}!",
      "🔔 Subscribed! You'll be first to know about **{query}** deals~",
      "👀 I'm watching **{query}** for you now. I never sleep. Never blink.",
      "🎯 Alert set! I'll ping you faster than scalpers can checkout~",
      "🔔 **{query}** is on my radar! I'll DM you when it drops!",
    ],
    already_watching: [
      "👀 You're already watching **{query}**! I gotchu~",
      "🔔 **{query}** is already on your list! Patience, hunter~",
    ],
    removed: [
      "❌ Removed **{query}** from your watchlist. Giving up? 😢",
      "🔕 Unsubscribed from **{query}**. Your wallet thanks you... for now.",
      "👋 **{query}** removed. The hunt ends... for now.",
    ],
    list_header: [
      "📋 **Your Watchlist** — I'm hunting these for you:",
      "👀 **Active Hunts** — Always watching~",
      "🎯 **Your Targets** — I never sleep:",
    ],
    list_empty: [
      "📋 Your watchlist is empty! Tell me what to hunt~",
      "👀 Nothing on your radar yet. What should I watch for?",
      "🎯 No active hunts. Give me a target!",
    ],
  },

  // ===== HELP =====
  help: [
    "**🎎 WAIFU DEAL SNIPER — How to Use**\n\n" +
    "Just chat with me naturally! I understand:\n\n" +
    "🔍 **Searching**\n" +
    "• `looking for rem figures`\n" +
    "• `any sonico bikini under 10000?`\n" +
    "• `find me chainsaw man power`\n\n" +
    "🔔 **Watch Alerts** (I'll DM you!)\n" +
    "• `watch marin under 15000`\n" +
    "• `alert me for zero two`\n" +
    "• `notify me when gojo appears`\n\n" +
    "📋 **Manage Watchlist**\n" +
    "• `my watchlist` — see your hunts\n" +
    "• `stop watching rem` — remove alert\n\n" +
    "💡 **Tips**\n" +
    "• I find **\"mint figure, damaged box\"** deals — 40-50% off!\n" +
    "• Be specific: `rem bunny` > just `rem`\n" +
    "• I search AmiAmi's pre-owned section\n\n" +
    "*Happy hunting!* 🎯",
  ],

  // ===== ERROR / MISC =====
  errors: {
    search_failed: [
      "😵 Something went wrong! The site might be down or my brain broke. Try again?",
      "💀 Error! The hunt failed... Let's try again?",
      "🫠 Oops, something died. Not the waifus though, they're fine.",
      "😅 Technical difficulties! Even the best hunters miss sometimes. Retry?",
    ],
    slow: [
      "⏳ The site is being slow... Must be all the collectors shopping",
      "⏳ Taking a moment... *taps table impatiently*",
      "⏳ Loading... The waifu hunt requires patience~",
    ],
    invalid_price: [
      "🤔 I couldn't understand that price. Try like: `watch rem under 10000`",
      "❓ Price unclear! Use numbers like: `watch sonico 15000`",
    ],
  },

  // ===== FUN FACTS / EASTER EGGS =====
  fun_facts: [
    "💡 Did you know? The average figure collector has 47 figures and 0 savings.",
    "💡 Fun fact: 'I'll just buy one more' is the biggest lie in the hobby.",
    "💡 Remember: You're not addicted, you're ✨passionate✨",
    "💡 Hot take: Nendoroids are gateway drugs to 1/4 scale bunnies.",
    "💡 Pro tip: Damaged box figures are the secret meta.",
    "💡 Studies show: 100% of figure collectors have excellent taste.",
  ],

};

// ===== KEYWORD LISTS =====
const SPICY_KEYWORDS = [
  'bikini', 'bunny', 'swimsuit', 'bath', 'lingerie', 'maid', 'nurse',
  'wedding', 'bride', 'naked', 'cast off', 'b-style', 'freeing',
  'oppai', 'ecchi', 'sexy', 'hot', 'thicc', '1/4', 'bare leg',
  'succubus', 'demon girl', 'devil', 'china dress', 'leotard',
];

const HUSBANDO_KEYWORDS = [
  'gojo', 'levi', 'eren', 'sukuna', 'toji', 'nanami', 'geto', 'megumi',
  'deku', 'bakugo', 'todoroki', 'aizawa', 'hawks',
  'kakashi', 'itachi', 'sasuke', 'naruto', 'minato',
  'zoro', 'sanji', 'law', 'ace', 'shanks',
  'diluc', 'zhongli', 'childe', 'ayato', 'alhaitham', 'xiao',
  'cloud', 'sephiroth', 'noctis', 'leon',
];

const FIGURE_TYPE_KEYWORDS = {
  bunny: ['bunny', 'b-style', 'freeing', 'rabbit'],
  bikini: ['bikini', 'swimsuit', 'swim', 'beach', 'summer'],
  wedding: ['wedding', 'bride', 'bridal'],
  maid: ['maid', 'meido'],
  nurse: ['nurse', 'medical'],
  school: ['school', 'uniform', 'seifuku'],
  racing: ['racing', 'race queen'],
  china_dress: ['china dress', 'qipao', 'chinese dress'],
  kimono: ['kimono', 'yukata', 'japanese dress'],
};

// ===== GACHA MODE =====
const GACHA_TEMPLATES = {
  rolling: [
    "🎰 **GACHA TIME!** Spinning the wheel of fate...",
    "🎲 **ROLLING THE DICE!** Your destiny awaits...",
    "✨ **FATE DECIDES!** Let's see what the gacha gods give you...",
    "🎰 **GACHA PULL!** Will it be SSR or salt?",
    "🔮 **THE ORB HAS SPOKEN!** Revealing your destiny...",
    "⚡ **SUMMONING RITUAL INITIATED!** The spirits are deciding...",
    "🌀 **SPINNING THE WHEEL OF BANKRUPTCY!** Here we go...",
    "🃏 **SHUFFLING THE DECK OF FATE!** What will you draw?",
    "💫 **CONSULTING THE FIGURE GODS!** They're debating...",
    "🎪 **WELCOME TO THE GACHA CIRCUS!** You're the clown and the audience!",
    "🔥 **IGNITING THE GACHA FLAMES!** Burn, wallet, burn...",
    "🌊 **DIVING INTO THE GACHA ABYSS!** No turning back now...",
    "⭐ **WISHING UPON A PLASTIC STAR!** Will it come true?",
    "🎭 **THE GACHA THEATER PRESENTS...** Your financial demise!",
    "🚀 **LAUNCHING GACHA SEQUENCE!** 3... 2... 1... REGRET!",
    "🎯 **AIMING FOR GREATNESS!** (probably hitting mid tho)",
    "💎 **CRACKING OPEN A GACHA!** Please don't be trash...",
    "🌈 **CHASING THE RAINBOW!** (it's probably just salt)",
    "🎡 **ROUND AND ROUND WE GO!** Where your money stops, nobody knows!",
    "⚔️ **DRAWING YOUR GACHA SWORD!** Is it Excalibur or a butter knife?",
  ],
  reveal: [
    "🌟 **THE GACHA GODS HAVE CHOSEN!**\n\nYour destined figure is...",
    "✨ **FATE HAS DECIDED!**\n\nYou are meant to own...",
    "🎊 **CONGRATULATIONS!**\n\nThe universe says you need...",
    "💫 **DESTINY REVEALS!**\n\nYour wallet's fate is sealed with...",
    "🎰 **JACKPOT!** (or is it?)\n\nThe gacha has spoken...",
    "🔮 **THE PROPHECY IS CLEAR!**\n\nYou shall acquire...",
    "⚡ **LIGHTNING STRIKES!**\n\nThe gods bestow upon you...",
    "🌙 **BY THE LIGHT OF THE MOON!**\n\nYour figure emerges...",
    "🎭 **THE CURTAIN RISES!**\n\nBehold your destiny...",
    "👁️ **THE ALL-SEEING GACHA REVEALS!**\n\nYour fate is...",
    "🌸 **PETALS FALL, REVEALING...**\n\nThe figure chosen for you...",
    "💀 **FROM THE DEPTHS OF YOUR WALLET...**\n\nRises...",
    "🎪 **AND THE WINNER IS...**\n\n(spoiler: it's always your wallet losing)",
    "🔥 **EMERGING FROM THE FLAMES!**\n\nYour destined companion...",
    "❄️ **FROZEN IN TIME, NOW THAWED...**\n\nYour gacha result...",
  ],
  rarity: {
    ssr: [
      "🌈 **SSR PULL!** THE GACHA GODS SMILE UPON YOU!",
      "💎 **ULTRA RARE!** You lucky dog!",
      "👑 **LEGENDARY!** Buy a lottery ticket!",
      "🏆 **WHALE TERRITORY!** Your dedication is... concerning but impressive!",
      "⭐ **FIVE STAR BABY!** Screenshot this for the flex!",
      "🌟 **ASCENDED PULL!** The stars aligned for once!",
      "💫 **COSMIC LUCK!** Did you sell your soul?",
      "🔥 **BLAZING SSR!** Your luck stat is MAXED!",
      "👼 **BLESSED BY THE FIGURE ANGELS!** Hallelujah!",
      "🎆 **FIREWORKS GO OFF!** THIS IS THE ONE!",
      "💰 **MONEY WELL SPENT!** (for once)",
      "🦄 **UNICORN PULL!** Rarer than your social life!",
    ],
    sr: [
      "⭐ **SR PULL!** Not bad, not bad~",
      "✨ **RARE!** The gacha was kind today!",
      "🌟 **NICE PULL!** Could be worse!",
      "💫 **SOLID CHOICE!** The gacha didn't totally scam you!",
      "🎯 **HIT THE TARGET!** Well, at least the outer rings...",
      "📈 **ABOVE AVERAGE!** Like your taste in figures!",
      "🥈 **SILVER TIER!** Not gold, but hey, shiny!",
      "🌙 **MOONLIT PULL!** Decent vibes, decent figure!",
      "✅ **ACCEPTABLE!** Your standards have been met... barely!",
      "🎁 **UNWRAPPED SOMETHING DECENT!** No complaints!",
    ],
    r: [
      "📦 **R PULL!** It's... something!",
      "🎁 **COMMON!** But hey, a figure is a figure!",
      "🃏 **STANDARD!** The gacha giveth... meh.",
      "😐 **PARTICIPATION TROPHY!** At least you tried!",
      "🥉 **BRONZE TIER!** Third place is still a place!",
      "📉 **BELOW EXPECTATIONS!** But were they ever high?",
      "🎪 **CARNIVAL PRIZE!** You won... something!",
      "🧸 **BUDGET BLESSED!** Your wallet says thanks?",
      "🤷 **IT IS WHAT IT IS!** Copium loading...",
      "🎭 **MYSTERY BOX OPENED!** Contents: mid.",
    ],
    salt: [
      "🧂 **SALT!** The gacha gods mock you!",
      "💀 **F!** Better luck next time...",
      "😭 **DESPAIR!** Why do we even roll...",
      "🗑️ **DUMPSTER TIER!** The gacha has forsaken you!",
      "💔 **HEARTBREAK!** Your luck has left the chat!",
      "🤡 **CLOWNED!** Honk honk, here's your L!",
      "☠️ **DEAD ON ARRIVAL!** RIP your hopes!",
      "🌧️ **RAIN OF TEARS!** The forecast: endless salt!",
      "😤 **RIGGED!** (it's not but let's blame something)",
      "🪦 **HERE LIES YOUR LUCK!** Cause of death: gacha!",
      "🎰 **THE HOUSE ALWAYS WINS!** And the house is AmiAmi!",
      "💸 **MONEY EVAPORATED!** Poof! Gone! Vanished!",
      "🤮 **GACHA FOOD POISONING!** This taste... is salt!",
      "📉 **STOCK MARKET CRASH!** But for your luck!",
    ],
  },
};

// ===== ROAST MODE =====
const ROAST_TEMPLATES = {
  general: [
    "Ah yes, another {query} figure. How terribly original. 🙄",
    "Let me guess, you're gonna 'think about it' and then buy it at 3 AM anyway?",
    "{query}? Your shelf space called, it's filing for divorce.",
    "Ah, {query}. Because your wallet wasn't suffering enough already.",
    "Bold of you to assume your bank account has recovered from last time.",
    "Sure, let's search for {query}. It's not like you need to pay rent or anything.",
    "{query} huh? Tell me you're down bad without telling me you're down bad.",
    "Searching {query}... Your future self is already crying.",
    "Ah yes, the classic '{query}' search. Originality is dead.",
    "{query}? At this point just give AmiAmi your whole paycheck.",
    "Looking for {query}? Groundbreaking. Revolutionary. Never seen before. 🙄",
    "{query}... Your credit card just flinched.",
    "Searching {query}? Your savings account has left the group chat.",
    "{query}? Bold move for someone whose shelf is already crying for help.",
    "Ah, {query}. I see you've chosen violence today. Against your wallet.",
    "{query}? Real original. Let me guess, you also like breathing?",
    "Oh wow, {query}. No one has EVER searched that before. You're so unique.",
    "{query}... At this point you're not collecting, you're hoarding.",
    "Let me search {query} for you, you absolute financial disaster.",
    "{query}? Your future spouse is gonna have QUESTIONS about the shrine.",
    "Searching {query}... *sigh* Here we go again.",
    "{query}? In this economy? With these prices? Incredible decision-making.",
    "Ah yes, {query}. Because therapy is expensive but figures are... also expensive.",
    "{query}? I'm not mad, I'm just disappointed. Actually no, I'm mad too.",
    "Looking for {query}? Your shelf space is writing its resignation letter.",
    "{query}... Tell me you're single without telling me you're single.",
    "Searching {query} at this hour? Touch grass. Please.",
    "{query}? Your financial advisor just felt a chill down their spine.",
    "Oh look, {query}. What a surprise. Much shock. Very wow.",
    "{query}? Bestie your 'collection' is becoming a 'situation'.",
  ],
  character_specific: {
    rem: [
      "Rem? AGAIN? You know there are OTHER characters, right?",
      "Another Rem figure? Bro you could build a Rem army at this point.",
      "Rem? Emilia fans are typing...",
      "Your Rem collection has its own zip code doesn't it?",
      "Rem? Who's Rem? (I'm kidding please don't hurt me)",
      "At this point you could open a Rem museum. Charge admission.",
      "Rem huh? Down catastrophically bad. Critical levels.",
      "Another Rem? The blue maid has you in a chokehold fr fr.",
      "Rem figure #47... but who's counting? (You are. You definitely are.)",
      "Rem again? Ram erasure is real and you're part of the problem.",
      "Your 'Rem appreciation' has become 'Rem obsession' and we need to talk.",
      "Rem? Original. Unique. Never been done. (That's sarcasm btw)",
    ],
    miku: [
      "Miku? There are literally 47,000 Miku figures. Pick a struggle.",
      "Another Miku? Your room must sound like a Vocaloid concert.",
      "Miku fans when they see literally any figure with twintails: 👀",
      "At what point does it become a Miku shrine?",
      "Miku again? At this point she's your landlord.",
      "How many Mikus do you need?? (Trick question, the answer is always 'more')",
      "Miku? Let me guess, you cried at the concerts too.",
      "Another Miku variant? They really said 'print money' huh.",
      "Miku collectors be like: 'I'll just get ONE more version...'",
      "Your Miku collection could form a choir. A very expensive choir.",
      "At this point Miku should be paying YOU rent.",
      "Racing Miku, Snow Miku, Sakura Miku... You have a type. It's teal.",
    ],
    marin: [
      "Marin? Ah, a fellow My Dress-Up Darling victim I see.",
      "Let me guess, you've rewatched the anime 12 times?",
      "Marin figure? Your cosplay budget could never.",
      "Another Marin? Your wallet is dressed up in PAIN.",
      "Marin? The gyaru has your wallet in a death grip.",
      "Searching Marin at 2 AM? Down astronomical.",
      "Marin figure? Gojo-kun would be disappointed. Or proud. Hard to tell.",
      "Another Marin? The seasonal waifu has become permanent I see.",
      "Marin fans: 'She's just like me fr fr' (She is not.)",
      "Your Marin collection is giving... main character syndrome.",
      "Marin? More like Marin-ating your wallet in debt!",
      "At this point just cosplay as Marin yourself. Cheaper than figures.",
    ],
    asuna: [
      "Asuna? SAO was mid but the figures go hard ngl.",
      "Another Asuna? Kirito's gonna get jealous.",
      "Asuna fans still eating good in 2026. Respect.",
      "Asuna huh? Old school waifu energy. I respect it.",
    ],
    zero_two: [
      "Zero Two? Darling in the Franxx ended years ago. Let go.",
      "Another Zero Two? The dinosaur has you fossilized.",
      "Zero Two fans refusing to move on. We get it. She said darling.",
      "Zero Two? More like Zero money after this purchase.",
    ],
    power: [
      "Power? The gremlin energy is strong with this one.",
      "Another Power figure? Chainsaws and chaos, your type is clear.",
      "Power huh? Excellent trash goblin taste.",
      "Power collector? Based and deranged. Respect.",
    ],
    makima: [
      "Makima? Oh no. Ohhhh no. We need to talk about your taste.",
      "Another Makima? The manipulation kink is showing.",
      "Makima figure? Blink twice if you need help.",
      "Makima collector? You DEFINITELY have a type. (It's danger.)",
      "Makima huh? Your red flags are showing. All of them.",
    ],
    nezuko: [
      "Nezuko? mmmMMMMMMM NEZUKO-CHAN!!!",
      "Another Nezuko? Tanjiro approves (probably).",
      "Nezuko figure? Adorable. Your wallet? Demolished.",
      "Nezuko collector? The bamboo gag was foreshadowing for your wallet.",
    ],
    gojo: [
      "Gojo? The blindfold stays ON during purchase.",
      "Another Gojo? Infinity couldn't protect your wallet.",
      "Gojo figure? Strongest sorcerer, weakest wallet defense.",
      "Gojo huh? Throughout heaven and earth, he alone makes you broke.",
    ],
    levi: [
      "Levi? The cleaning arc hit different huh.",
      "Another Levi? Humanity's strongest, wallet's weakest.",
      "Levi figure? Short king supremacy.",
      "Levi collector? Clean your room first. He's judging.",
    ],
  },
  expensive: [
    "¥{price}?! In THIS economy?!",
    "¥{price}... that's like {meals} convenience store meals but go off I guess.",
    "For ¥{price} this figure better do my taxes.",
    "¥{price}?? Just say you hate money bro.",
    "Imagine explaining ¥{price} on a figure to your parents.",
    "¥{price}?! That's rent! That's RENT!!!",
    "¥{price}... Your wallet just filed a restraining order.",
    "For ¥{price} I expect this figure to pay its own shipping.",
    "¥{price}?? Bezos is taking notes on your spending habits.",
    "¥{price}... *nervous laughter* surely you're joking... right?",
    "That's ¥{price}. Think about that. Really think.",
    "¥{price} for plastic. PLASTIC. (gorgeous plastic but still)",
    "¥{price}?? Even whales are looking at you concerned.",
    "For ¥{price} this figure better come with a house.",
    "¥{price}... Your ancestors didn't struggle for this.",
    "That's {meals} meals. Or one (1) figure. Choose wisely. (You'll choose the figure.)",
  ],
  cheap: [
    "¥{price}? That's suspiciously cheap... what's wrong with it? 🤔",
    "¥{price}?? At that price it's either a steal or a scam. No in-between.",
    "Only ¥{price}? Even I'm tempted ngl...",
    "¥{price}? Okay that's actually kinda valid.",
    "¥{price}?? The figure gods smile upon the budget collectors today.",
    "Only ¥{price}? What's the catch? There's always a catch.",
    "¥{price}... did someone make a typo or...",
    "At ¥{price} you're basically LOSING money by NOT buying it. (Don't quote me.)",
    "¥{price}? The box must be a war crime or something.",
    "¥{price}?? Okay this is actually acceptable. I'm shook.",
  ],
  soldout: [
    "Sold out? L + Ratio + You hesitated + Someone else's shelf now.",
    "SOLD OUT 💀 Imagine not having notifications on.",
    "Gone. Reduced to atoms. Should've been faster.",
    "Sold out? Skill issue tbh.",
    "Sold out?? *Nelson laugh* HA HA!",
    "SOLD OUT. The fastest fingers win and yours were slow.",
    "Gone. Just like your chances. Vanished.",
    "Sold out? Someone else is unboxing YOUR figure rn.",
    "SOLD OUT 💀 The snooze button has consequences.",
    "Sold out... The early bird gets the figure. You got salt.",
    "Gone faster than your motivation to save money.",
    "SOLD OUT. Hesitation is defeat. - Isshin, probably",
    "Sold out? Let me play you a sad song on the world's smallest violin.",
    "Out of stock? Congratulations, you played yourself.",
    "Sold out... *price is right losing horn*",
    "GONE. Someone out there is thanking you for hesitating.",
  ],
};

// ===== COPIUM MODE =====
const COPIUM_TEMPLATES = {
  sold_out: [
    "💨 *inhales copium* It wasn't even that good tbh...",
    "🤡 You didn't want it anyway. Your shelf is already full.",
    "😤 Think of all the money you SAVED by being slow!",
    "🧘 The figure chose a different collector. It's fate.",
    "💭 \"I'll just wait for a rerelease\" - copium maximum",
    "🎭 At least you still have your... uh... dignity? Maybe?",
    "📦 Your other figures would've been jealous anyway.",
    "🌙 It's a sign from the universe to save money... lol jk",
    "🤷 Someone else needed it more. You're basically a saint.",
    "💸 Your wallet is sending a thank you card as we speak.",
    "🫠 It's fine. This is fine. Everything is FINE.",
    "💭 The aftermarket will have it. (At 3x the price. It's fine.)",
    "🧠 You're too smart to buy scalped anyway. Big brain.",
    "✨ Main character energy: the figure will come back to you.",
    "🌈 There's ALWAYS another figure. Probably. Maybe.",
    "🙏 This is the universe's way of saying 'save for the grail'.",
    "🤔 Was it even pre-order worthy? (Yes. Yes it was. But cope.)",
    "💫 Your soulmate figure is still out there. This wasn't it.",
    "🧊 Cool collectors don't cry over sold out figures. *sniff*",
    "🎪 This is just life's way of building your character arc.",
    "📉 Think of it as... involuntary financial responsibility.",
    "🎲 RNG wasn't on your side. The gacha gods looked away.",
    "🌸 Let it go~ Let it go~ Can't buy it anymore~",
    "💀 What doesn't kill your wallet makes it stronger. Allegedly.",
    "🫧 Like bubbles, figures come and go. This one just... went.",
  ],
  expensive: [
    "💨 *inhales* The quality probably isn't worth it anyway...",
    "🧘 Money is temporary, but also so are figures... wait",
    "🤡 \"I have expensive taste\" = \"I'm broke with extra steps\"",
    "💭 In 10 years you won't even remember this figure... maybe...",
    "😤 It's mass produced. It's not THAT special. Right? RIGHT?",
    "🎭 You're not poor, you're just... financially selective.",
    "💸 Think of all the instant ramen you can buy instead!",
    "🧊 Being responsible with money is actually kind of based.",
    "📊 The price-to-joy ratio is clearly not optimized here.",
    "🎪 You're paying for the BRAND. The brand! That's all!",
    "💡 What if... you invested this money instead? (lol)",
    "🌙 Sleep on it. For like... 6-8 weeks. Then decide.",
    "🦴 Your skeleton doesn't care what figures you own.",
    "🤔 Can you REALLY tell the difference from bootlegs? (Yes but cope)",
    "💫 The joy of NOT spending is also a kind of joy. Maybe.",
    "🎰 At least you're not gambling... oh wait, gacha exists.",
    "📉 Think of the depreciation! (Figures don't depreciate but shh)",
    "🧠 Smart collectors wait for sales. You're a SMART collector.",
    "🌈 Somewhere, a cheaper version exists. Probably. Hopefully.",
    "🫠 Your organs are worth more than this figure. Keep them.",
    "💭 'Do I want it or do I just want to WANT it?' - philosopher mode",
    "🏠 Houses exist. Cars exist. Retirement exists. Just saying.",
    "🍜 That's like {meals} cup noodles. You LOVE cup noodles. Right?",
  ],
  no_results: [
    "💨 *copium clouds forming* Maybe it's a sign to go outside...",
    "🤡 No results? The universe is protecting your wallet!",
    "🧘 Sometimes the best figure is the one you didn't buy.",
    "💭 Maybe try a different search? Or touch grass?",
    "😤 AmiAmi doesn't deserve your money anyway!",
    "🎭 This is character development. You're growing.",
    "🌙 The figure void stares back... and it's empty.",
    "✨ Congratulations! Your search returned: peace of mind.",
    "🦗 *cricket noises* Your wallet applauds the silence.",
    "🎪 Plot twist: the real figure was the friends we made along the way.",
    "📭 No figures, no problems. (This is a lie but believe it.)",
    "🧠 Your brain didn't need more dopamine anyway. It's fine.",
    "💫 An empty search means an empty cart. This is winning.",
    "🌈 Maybe your grail hasn't been made yet. Patience, grasshopper.",
    "🫧 *poof* Your money stays in your account. Magic!",
    "🎲 The search was the journey. The results were always zero.",
    "💀 On the bright side, you can't buy what doesn't exist!",
    "🤔 Maybe branch out? Try... other hobbies? (Impossible but try)",
  ],
  damaged_box: [
    "💨 Who even LOOKS at the box after unboxing?",
    "🤡 Box damage = discount = big brain moves",
    "😤 You're not a box collector, you're a FIGURE collector!",
    "💭 The figure doesn't know its box is damaged. It's fine.",
    "🧘 Imperfect box, perfect figure. This is the way.",
    "🎭 \"Battle damage\" on the box just adds character.",
    "📦 The box's sacrifice means YOUR wallet survives.",
    "✨ Open box collectors are evolved. Accept your evolution.",
    "💸 You saved money AND the figure is mint? WIN-WIN.",
    "🌙 In the dark, all boxes look the same. Think about it.",
    "🦴 The box is just... a protective husk. Let it go.",
    "🎪 Display the FIGURE. Hide the BOX. Problem solved.",
    "💫 Damaged box? More like DISCOUNTED BOX. Rebrand it.",
    "🧠 Only nerds keep the boxes anyway. (You keep them but whatever)",
    "🌈 The figure is perfect. The box took one for the team.",
    "🫠 Boxes are temporary. Figures are... also temporary. But still!",
    "📭 AmiAmi's box grading system is just capitalism anyway.",
    "🤔 Will YOU be graded when you're old and creased? Exactly.",
    "💀 Box-kun died so your wallet could live. Honor the sacrifice.",
    "🎲 The figure said 'I'm worth it even if my house is ugly'.",
  ],
  general: [
    "💨 *maximum copium* This is fine. Everything is fine.",
    "🧘 Deep breaths. In with the copium, out with the reality.",
    "🤡 At least you have your health? (And crippling figure addiction)",
    "💭 Money comes back. Time doesn't. Or wait, is it the other way?",
    "😤 Other people have worse problems. Like... no figures at all.",
    "🎭 This is all part of God's plan. The plan is chaos.",
    "💫 The universe works in mysterious ways. Mostly against you.",
    "🌙 Tomorrow is a new day. With new figures. To not afford.",
    "🧠 You're not addicted. You can stop anytime. ANYTIME.",
    "🌈 It's not a problem if you enjoy it. (It's still a problem.)",
    "💸 Money is just... numbers. Fake. Not real. (It's real.)",
    "🫧 Float away on your copium cloud. It's safe there.",
    "🎪 Life is a circus and you're the star. Of the finance tragedy show.",
    "💀 We're all gonna make it. Eventually. Maybe.",
    "✨ Manifesting good deals and strong yen. 🙏",
  ],
};

module.exports = {
  TEMPLATES,
  SPICY_KEYWORDS,
  HUSBANDO_KEYWORDS,
  FIGURE_TYPE_KEYWORDS,
  GACHA_TEMPLATES,
  ROAST_TEMPLATES,
  COPIUM_TEMPLATES,
};
