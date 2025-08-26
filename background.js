// Background service worker for price checking and notifications
chrome.runtime.onInstalled.addListener(() => {
  console.log('PricePilot extension installed');
  
  // Set up initial storage
  chrome.storage.local.get(['trackedProducts'], (result) => {
    if (!result.trackedProducts) {
      chrome.storage.local.set({ trackedProducts: [] });
    }
  });
});

// Listen for alarms to check prices
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name.startsWith('priceCheck-')) {
    const productId = alarm.name.replace('priceCheck-', '');
    checkProductPrice(productId);
  }
});

// Check price for a specific product
async function checkProductPrice(productId) {
  chrome.storage.local.get(['trackedProducts'], async (result) => {
    const trackedProducts = result.trackedProducts || [];
    const productIndex = trackedProducts.findIndex(p => p.id === productId);
    
    if (productIndex === -1) return;
    
    const product = trackedProducts[productIndex];
    
    try {
      // Fetch the product page
      const response = await fetch(product.url);
      const text = await response.text();
      
      // Parse the HTML to extract current price
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'text/html');
      
      let currentPrice = 0;
      
      // Extract price based on site
      if (product.site === 'Amazon') {
        const priceElement = doc.querySelector('.a-price-whole') ||
                             doc.querySelector('.a-offscreen');
        if (priceElement) {
          const priceText = priceElement.textContent.replace(/[^\d.]/g, '');
          currentPrice = parseFloat(priceText) || product.currentPrice;
        }
      } else if (product.site === 'Flipkart') {
        const priceElement = doc.querySelector('div._30jeq3');
        if (priceElement) {
          const priceText = priceElement.textContent.replace(/[^\d.]/g, '');
          currentPrice = parseFloat(priceText) || product.currentPrice;
        }
      }
      
      // Calculate price change
      const previousPrice = product.currentPrice;
      const priceChange = ((currentPrice - previousPrice) / previousPrice) * 100;
      
      // Update product if price changed
      if (currentPrice !== previousPrice) {
        trackedProducts[productIndex].currentPrice = currentPrice;
        trackedProducts[productIndex].priceChange = priceChange;
        trackedProducts[productIndex].lastChecked = new Date().toISOString();
        
        // Save updated product
        chrome.storage.local.set({ trackedProducts });
        
        // Show notification for significant price changes
        if (Math.abs(priceChange) >= 5) {
          showPriceNotification(product, currentPrice, priceChange);
        }
      }
    } catch (error) {
      console.error('Error checking price:', error);
    }
  });
}

// Show desktop notification for price changes
function showPriceNotification(product, currentPrice, priceChange) {
  const isPriceDrop = priceChange < 0;
  const direction = isPriceDrop ? 'dropped' : 'increased';
  const absChange = Math.abs(priceChange).toFixed(1);
  
  const notificationOptions = {
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: `Price ${direction} on ${product.site}`,
    message: `${product.title} has ${direction} by ${absChange}%. Current price: ₹${formatPrice(currentPrice)}`,
    priority: 1
  };
  
  chrome.notifications.create(`priceAlert-${product.id}-${Date.now()}`, notificationOptions);
}

// Format price with Indian number format
function formatPrice(price) {
  return new Intl.NumberFormat('en-IN').format(price);
}

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'checkAllPrices') {
    checkAllPrices();
    sendResponse({ status: 'checking' });
  }
});

// Check all tracked products' prices
function checkAllPrices() {
  chrome.storage.local.get(['trackedProducts'], (result) => {
    const trackedProducts = result.trackedProducts || [];
    trackedProducts.forEach(product => {
      checkProductPrice(product.id);
    });
  });
}