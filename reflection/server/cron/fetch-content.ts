/**
 * Vercel Cron Job: Fetch content from all sources
 * Runs every 15 minutes
 */
import type { Request, Response } from 'express';

export default async function handler(req: Request, res: Response) {
  // Verify the request is from Vercel Cron
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { fetchUserContent } = await import('../jobs');
    
    // Fetch content for default user (ID: 1) since app is public
    await fetchUserContent(1);
    
    return res.status(200).json({ 
      success: true, 
      message: 'Content fetched successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Cron] Content fetch failed:', error);
    return res.status(500).json({ 
      error: 'Content fetch failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
