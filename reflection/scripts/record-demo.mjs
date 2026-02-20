import { chromium } from 'playwright';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const APP_URL = 'https://3000-i3eavhsgjlo2z4gderbb6-70c9ea55.us1.manus.computer';

async function recordDemo() {
  console.log('🎬 Starting demo recording...');
  
  const browser = await chromium.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: '/home/ubuntu',
      size: { width: 1920, height: 1080 }
    }
  });
  
  const page = await context.newPage();
  
  try {
    // Scene 1: Chat Interface (30 seconds)
    console.log('Scene 1: Chat Interface');
    await page.goto(APP_URL);
    await page.waitForTimeout(2000);
    
    // Type message slowly
    await page.fill('input[placeholder*="Ask me"]', 'Give me a summary for today');
    await page.waitForTimeout(1000);
    await page.click('button[type="button"]:has-text("Send"), button:has(svg)');
    await page.waitForTimeout(3000);
    
    // Wait for redirect to feed
    await page.waitForURL('**/feed', { timeout: 5000 });
    await page.waitForTimeout(2000);
    
    // Scene 2: Inbox View (30 seconds)
    console.log('Scene 2: Inbox View');
    await page.waitForTimeout(3000);
    
    // Scroll through content
    await page.mouse.wheel(0, 300);
    await page.waitForTimeout(2000);
    await page.mouse.wheel(0, 300);
    await page.waitForTimeout(2000);
    
    // Mark one as read
    const readButton = page.locator('button:has(svg)').first();
    await readButton.click();
    await page.waitForTimeout(1500);
    
    // Scene 3: Magazine View (30 seconds)
    console.log('Scene 3: Magazine View');
    await page.click('text=Magazine');
    await page.waitForTimeout(3000);
    
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(2000);
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(2000);
    
    // Scene 4: Cards View (30 seconds)
    console.log('Scene 4: Cards View');
    await page.click('text=Cards');
    await page.waitForTimeout(3000);
    
    await page.mouse.wheel(0, 300);
    await page.waitForTimeout(2000);
    
    // Scene 5: Sources Page (30 seconds)
    console.log('Scene 5: Sources Page');
    await page.click('text=Manage Sources');
    await page.waitForTimeout(3000);
    
    await page.mouse.wheel(0, 200);
    await page.waitForTimeout(2000);
    
    // Scene 6: Back to Feed (20 seconds)
    console.log('Scene 6: Final Feed View');
    await page.goto(`${APP_URL}/feed`);
    await page.waitForTimeout(3000);
    
    await page.mouse.wheel(0, 300);
    await page.waitForTimeout(2000);
    
    console.log('✅ Recording complete!');
    
  } catch (error) {
    console.error('❌ Recording error:', error);
  } finally {
    await context.close();
    await browser.close();
  }
}

recordDemo();
