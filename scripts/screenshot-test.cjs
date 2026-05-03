const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1400, height: 900 });

  // Test insights page
  console.log('Testing insights page...');
  await page.goto('http://localhost:5173/insights', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('#insights-root', { timeout: 10000 });
  await page.evaluate(() => {
    const headings = document.querySelectorAll('h2');
    for (const h of headings) {
      if (h.textContent.includes('AGI Definition Space')) {
        h.scrollIntoView({ behavior: 'instant', block: 'start' });
        break;
      }
    }
  });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'deployment/images/test-insights.png' });
  console.log('Insights page screenshot saved');

  // Test map page beliefs view
  console.log('Testing map page beliefs view...');
  await page.goto('http://localhost:5173/map', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Dismiss onboarding overlay if present by clicking "Got it" button
  const dismissBtn = await page.$('.onboarding-dismiss');
  if (dismissBtn) {
    await dismissBtn.click();
    console.log('Dismissed onboarding overlay');
    await page.waitForTimeout(500);
  }

  // Click the Beliefs tab
  const beliefsBtn = await page.$('button.mode-btn:has-text("Beliefs")');
  if (beliefsBtn) {
    await beliefsBtn.click();
    console.log('Clicked Beliefs tab');
    await page.waitForTimeout(3000);
  } else {
    console.log('Beliefs button not found');
  }

  await page.screenshot({ path: 'deployment/images/test-map-beliefs.png' });
  console.log('Map beliefs page screenshot saved');

  await browser.close();
  console.log('Done!');
})();
