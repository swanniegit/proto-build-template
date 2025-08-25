import { chromium } from 'playwright';

async function debugScrollBehavior() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Navigate to the multi-agent page
    await page.goto('http://localhost:5173/multi-agent');
    
    // Wait for page to load
    await page.waitForTimeout(2000);
    
    // Find the right panel scroll container
    const scrollContainer = await page.locator('div[ref="agentResponsesScrollRef"]').first();
    
    // Check if scroll container exists
    const scrollContainerExists = await scrollContainer.count() > 0;
    console.log('Scroll container exists:', scrollContainerExists);
    
    if (!scrollContainerExists) {
      // Find by className instead
      const altScrollContainer = await page.locator('.overflow-y-auto').nth(1); // Right panel
      const altExists = await altScrollContainer.count() > 0;
      console.log('Alternative scroll container exists:', altExists);
      
      if (altExists) {
        const styles = await altScrollContainer.evaluate(el => {
          const computed = window.getComputedStyle(el);
          return {
            overflowY: computed.overflowY,
            height: computed.height,
            maxHeight: computed.maxHeight,
            scrollHeight: el.scrollHeight,
            clientHeight: el.clientHeight,
            canScroll: el.scrollHeight > el.clientHeight
          };
        });
        console.log('Scroll container styles:', styles);
      }
    }
    
    // Check all elements with overflow-y auto
    const allScrollable = await page.locator('[style*="overflow-y: auto"], [style*="overflowY: auto"], .overflow-y-auto').all();
    console.log('Found scrollable elements:', allScrollable.length);
    
    for (let i = 0; i < allScrollable.length; i++) {
      const element = allScrollable[i];
      const info = await element.evaluate((el, index) => {
        const computed = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        
        // Check for blocking elements
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const elementAtPoint = document.elementFromPoint(centerX, centerY);
        
        return {
          index: index,
          className: el.className,
          style: el.getAttribute('style'),
          overflowY: computed.overflowY,
          height: computed.height,
          maxHeight: computed.maxHeight,
          scrollHeight: el.scrollHeight,
          clientHeight: el.clientHeight,
          canScroll: el.scrollHeight > el.clientHeight,
          rect: { width: rect.width, height: rect.height },
          pointerEvents: computed.pointerEvents,
          zIndex: computed.zIndex,
          position: computed.position,
          elementAtCenterPoint: elementAtPoint ? elementAtPoint.tagName + '.' + elementAtPoint.className : 'none',
          isElementAtPointSelf: elementAtPoint === el
        };
      }, i);
      console.log(`Element ${i}:`, info);
    }
    
    // Check for any absolutely positioned overlays
    const overlays = await page.locator('div[style*="position: absolute"], div[style*="position: fixed"], .absolute, .fixed').all();
    console.log(`Found ${overlays.length} potential overlay elements`);
    
    for (let i = 0; i < Math.min(overlays.length, 5); i++) {
      const overlay = overlays[i];
      const overlayInfo = await overlay.evaluate(el => {
        const computed = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return {
          className: el.className,
          position: computed.position,
          zIndex: computed.zIndex,
          pointerEvents: computed.pointerEvents,
          rect: { width: rect.width, height: rect.height, top: rect.top, left: rect.left }
        };
      });
      console.log(`Overlay ${i}:`, overlayInfo);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

debugScrollBehavior();