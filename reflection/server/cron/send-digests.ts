/**
 * Vercel Cron Job: Send daily digests
 * Runs every hour and checks if it's time to send digest
 */
import type { Request, Response } from 'express';

export default async function handler(req: Request, res: Response) {
  // Verify the request is from Vercel Cron
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { getUserPreferences } = await import('../db');
    const { notifyOwner } = await import('../_core/notification');
    
    // Get user preferences for default user (ID: 1)
    const preferences = await getUserPreferences(1);
    
    if (!preferences || !preferences.enableDigest) {
      return res.status(200).json({ 
        success: true, 
        message: 'Digest disabled',
        timestamp: new Date().toISOString()
      });
    }
    
    // Check if current hour matches digest time
    const now = new Date();
    const currentHour = now.getHours();
    const digestTime = preferences.digestTime || '08:00';
    const [digestHour] = digestTime.split(':').map(Number);
    
    if (currentHour !== digestHour) {
      return res.status(200).json({ 
        success: true, 
        message: `Not digest time yet (current: ${currentHour}:00, digest: ${digestHour}:00)`,
        timestamp: new Date().toISOString()
      });
    }
    
    // Get unread content from the last 24 hours
    const { getUserContent } = await import('../db');
    const content = await getUserContent(1, 50, 0);
    const unreadContent = content.filter(item => !item.isRead);
    
    if (unreadContent.length === 0) {
      return res.status(200).json({ 
        success: true, 
        message: 'No unread content for digest',
        timestamp: new Date().toISOString()
      });
    }
    
    // Format digest content
    const digestContent = unreadContent
      .slice(0, 10) // Top 10 articles
      .map((item, index) => 
        `${index + 1}. **${item.title}**\n   ${item.summary}\n   ${item.url}\n`
      )
      .join('\n');
    
    // Send notification
    await notifyOwner({
      title: `📰 Daily Digest - ${unreadContent.length} unread articles`,
      content: `Here are your top articles for today:\n\n${digestContent}\n\nView all in Reflection: ${process.env.VITE_APP_URL || 'https://your-app.manus.space'}`
    });
    
    return res.status(200).json({ 
      success: true, 
      message: `Digest sent with ${unreadContent.length} articles`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Cron] Digest send failed:', error);
    return res.status(500).json({ 
      error: 'Digest send failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
