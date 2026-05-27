import { drizzle } from 'drizzle-orm/mysql2';
import { contentSources, contentItems } from '../drizzle/schema.js';

const db = drizzle(process.env.DATABASE_URL);

const demoSources = [
  {
    userId: 1,
    type: 'linkedin',
    name: 'Sam Altman',
    url: 'https://www.linkedin.com/in/sam-altman/',
    isActive: 1
  },
  {
    userId: 1,
    type: 'x',
    name: 'Elon Musk',
    url: 'https://x.com/elonmusk',
    isActive: 1
  },
  {
    userId: 1,
    type: 'linkedin',
    name: 'Satya Nadella',
    url: 'https://www.linkedin.com/in/satyanadella/',
    isActive: 1
  },
  {
    userId: 1,
    type: 'x',
    name: 'Paul Graham',
    url: 'https://x.com/paulg',
    isActive: 1
  },
  {
    userId: 1,
    type: 'rss',
    name: 'TechCrunch',
    url: 'https://techcrunch.com/feed/',
    isActive: 1
  },
  {
    userId: 1,
    type: 'blog',
    name: 'Y Combinator Blog',
    url: 'https://www.ycombinator.com/blog',
    isActive: 1
  }
];

const demoContent = [
  {
    userId: 1,
    sourceId: 1,
    title: 'Excited to announce OpenAI\'s latest breakthrough in reasoning models',
    url: 'https://www.linkedin.com/posts/sam-altman_ai-openai-innovation-activity-123456',
    content: 'Today we\'re launching our most capable reasoning model yet. The improvements in complex problem-solving are remarkable, and I\'m excited to see what developers build with it.',
    summary: 'Sam Altman announces OpenAI\'s new reasoning model with significant improvements in complex problem-solving capabilities.',
    category: 'Tech',
    relevanceScore: 95,
    author: 'Sam Altman',
    publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    isRead: 0,
    isSaved: 0
  },
  {
    userId: 1,
    sourceId: 2,
    title: 'Starship flight test successful - Mars here we come',
    url: 'https://x.com/elonmusk/status/123456789',
    content: 'Starship completed its orbital flight test successfully. This brings us one step closer to making life multiplanetary. Incredible work by the SpaceX team.',
    summary: 'Elon Musk celebrates successful Starship orbital flight test, marking progress toward Mars missions.',
    category: 'Tech',
    relevanceScore: 92,
    author: 'Elon Musk',
    publishedAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
    isRead: 0,
    isSaved: 1
  },
  {
    userId: 1,
    sourceId: 3,
    title: 'The future of work is hybrid - lessons from Microsoft',
    url: 'https://www.linkedin.com/posts/satyanadella_futureofwork-microsoft-activity-789012',
    content: 'After years of hybrid work at Microsoft, we\'ve learned that flexibility and trust are key. Our productivity has never been higher, and employee satisfaction continues to grow.',
    summary: 'Satya Nadella shares Microsoft\'s hybrid work insights, emphasizing flexibility and trust as drivers of productivity.',
    category: 'Business',
    relevanceScore: 88,
    author: 'Satya Nadella',
    publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
    isRead: 0,
    isSaved: 0
  },
  {
    userId: 1,
    sourceId: 4,
    title: 'The best startups solve problems founders have personally experienced',
    url: 'https://x.com/paulg/status/987654321',
    content: 'Pattern I keep seeing: the most successful YC companies are solving problems the founders encountered themselves. Personal experience gives you an unfair advantage in understanding the problem deeply.',
    summary: 'Paul Graham observes that successful startups often solve problems founders experienced personally, giving them deeper problem understanding.',
    category: 'Business',
    relevanceScore: 90,
    author: 'Paul Graham',
    publishedAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
    isRead: 1,
    isSaved: 0
  },
  {
    userId: 1,
    sourceId: 5,
    title: 'AI startup raises $100M Series B to revolutionize healthcare diagnostics',
    url: 'https://techcrunch.com/2026/02/15/ai-healthcare-funding/',
    content: 'HealthAI, a San Francisco-based startup using AI for early disease detection, announced a $100M Series B led by Sequoia Capital. The company\'s diagnostic accuracy now surpasses traditional methods in multiple areas.',
    summary: 'HealthAI secures $100M Series B funding for AI-powered healthcare diagnostics with accuracy exceeding traditional methods.',
    category: 'Health',
    relevanceScore: 85,
    author: 'TechCrunch Staff',
    publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
    isRead: 0,
    isSaved: 0
  },
  {
    userId: 1,
    sourceId: 6,
    title: 'YC W26 Demo Day: Top 10 companies to watch',
    url: 'https://www.ycombinator.com/blog/w26-demo-day-highlights',
    content: 'This batch featured exceptional companies across AI infrastructure, climate tech, and healthcare. Here are the 10 startups that stood out with innovative solutions to massive problems.',
    summary: 'Y Combinator highlights 10 standout companies from W26 Demo Day across AI, climate tech, and healthcare sectors.',
    category: 'Business',
    relevanceScore: 87,
    author: 'YC Team',
    publishedAt: new Date(Date.now() - 18 * 60 * 60 * 1000), // 18 hours ago
    isRead: 0,
    isSaved: 1
  },
  {
    userId: 1,
    sourceId: 1,
    title: 'Reflecting on 10 years since founding OpenAI',
    url: 'https://www.linkedin.com/posts/sam-altman_openai-anniversary-activity-456789',
    content: 'A decade ago, we started OpenAI with a mission to ensure AGI benefits all of humanity. The journey has been incredible, and we\'re just getting started.',
    summary: 'Sam Altman reflects on OpenAI\'s 10-year journey and reaffirms commitment to beneficial AGI development.',
    category: 'Tech',
    relevanceScore: 91,
    author: 'Sam Altman',
    publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    isRead: 1,
    isSaved: 0
  },
  {
    userId: 1,
    sourceId: 2,
    title: 'Tesla FSD Beta now available in Europe',
    url: 'https://x.com/elonmusk/status/111222333',
    content: 'Full Self-Driving Beta is rolling out across Europe starting today. The system has driven over 1 billion miles in the US with continuous improvements.',
    summary: 'Elon Musk announces Tesla FSD Beta expansion to Europe after 1 billion miles driven in the US.',
    category: 'Tech',
    relevanceScore: 86,
    author: 'Elon Musk',
    publishedAt: new Date(Date.now() - 15 * 60 * 60 * 1000), // 15 hours ago
    isRead: 0,
    isSaved: 0
  },
  {
    userId: 1,
    sourceId: 3,
    title: 'AI Copilot adoption reaches 1 million developers',
    url: 'https://www.linkedin.com/posts/satyanadella_github-copilot-milestone-activity-654321',
    content: 'Thrilled to share that GitHub Copilot has reached 1 million paid subscribers. Developers are writing code 55% faster on average. This is just the beginning of AI-assisted development.',
    summary: 'Satya Nadella celebrates GitHub Copilot reaching 1 million subscribers with 55% productivity gains for developers.',
    category: 'Tech',
    relevanceScore: 89,
    author: 'Satya Nadella',
    publishedAt: new Date(Date.now() - 20 * 60 * 60 * 1000), // 20 hours ago
    isRead: 0,
    isSaved: 1
  },
  {
    userId: 1,
    sourceId: 4,
    title: 'Why you should start small and focused',
    url: 'https://x.com/paulg/status/444555666',
    content: 'Most successful startups started by doing one thing exceptionally well for a small group of users. Don\'t try to boil the ocean. Find your beachhead and dominate it.',
    summary: 'Paul Graham advises startups to focus on excelling at one thing for a small user group before expanding.',
    category: 'Business',
    relevanceScore: 84,
    author: 'Paul Graham',
    publishedAt: new Date(Date.now() - 30 * 60 * 60 * 1000), // 30 hours ago
    isRead: 1,
    isSaved: 0
  }
];

async function seed() {
  console.log('🌱 Seeding demo data...');
  
  try {
    // Insert sources and get their IDs
    console.log('Adding demo sources...');
    const sourceIds = [];
    for (const source of demoSources) {
      const result = await db.insert(contentSources).values(source);
      sourceIds.push(Number(result[0].insertId));
    }
    console.log(`✅ Added ${demoSources.length} sources`);
    
    // Update content items with actual source IDs
    const updatedContent = demoContent.map(item => ({
      ...item,
      sourceId: sourceIds[item.sourceId - 1] // Map to actual DB IDs
    }));
    
    // Insert content
    console.log('Adding demo content...');
    for (const item of updatedContent) {
      await db.insert(contentItems).values(item);
    }
    console.log(`✅ Added ${demoContent.length} content items`);
    
    console.log('🎉 Demo data seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

seed();
