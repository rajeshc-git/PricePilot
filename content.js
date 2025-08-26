// Content script to extract product info from e-commerce sites
(function() {
  'use strict';
  
  // Check if we're on a product page
  if (isProductPage()) {
    injectAddButton();
  }
  
  function isProductPage() {
    const path = window.location.pathname;
    const hostname = window.location.hostname;
    
    // Amazon product page detection
    if (hostname.includes('amazon.in') && path.includes('/dp/')) {
      return true;
    }
    
    // Flipkart product page detection
    if (hostname.includes('flipkart.com') && path.includes('/p/')) {
      return true;
    }
    
    // Add detection for other Indian e-commerce sites
    // Myntra, Nykaa, Ajio, etc.
    
    return false;
  }
  
  function injectAddButton() {
    // Create and style the "Add to PricePilot" button
    const button = document.createElement('button');
    button.innerHTML = '➕ Track Price';
    button.style.position = 'fixed';
    button.style.bottom = '20px';
    button.style.right = '20px';
    button.style.zIndex = '10000';
    button.style.padding = '12px 16px';
    button.style.background = 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.borderRadius = '24px';
    button.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
    button.style.cursor = 'pointer';
    button.style.fontWeight = 'bold';
    button.style.fontSize = '14px';
    button.style.transition = 'all 0.3s ease';
    
    button.addEventListener('mouseenter', () => {
      button.style.transform = 'translateY(-2px)';
      button.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.25)';
    });
    
    button.addEventListener('mouseleave', () => {
      button.style.transform = 'translateY(0)';
      button.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
    });
    
    button.addEventListener('click', addProductToTracker);
    
    document.body.appendChild(button);
  }
  
  function addProductToTracker() {
    const productInfo = extractProductInfo();
    
    if (!productInfo.title || !productInfo.currentPrice) {
      alert('Could not extract product information. Please try again.');
      return;
    }
    
    // Get existing products from storage
    chrome.storage.local.get(['trackedProducts'], function(result) {
      const trackedProducts = result.trackedProducts || [];
      
      // Check if product is already tracked
      const existingIndex = trackedProducts.findIndex(p => p.url === productInfo.url);
      
      if (existingIndex !== -1) {
        if (confirm('This product is already being tracked. Update instead?')) {
          trackedProducts[existingIndex] = productInfo;
        } else {
          return;
        }
      } else {
        trackedProducts.push(productInfo);
      }
      
      // Save updated list
      chrome.storage.local.set({ trackedProducts: trackedProducts }, function() {
        alert('Product added to PricePilot!');
        
        // Create alarm for price checking
        chrome.alarms.create(`priceCheck-${productInfo.id}`, {
          periodInMinutes: 60 // Check every hour
        });
      });
    });
  }
  
  function extractProductInfo() {
    const hostname = window.location.hostname;
    let productInfo = {
      id: generateId(),
      url: window.location.href,
      title: '',
      image: '',
      currentPrice: 0,
      originalPrice: 0,
      priceChange: 0,
      site: getSiteName(hostname),
      dateAdded: new Date().toISOString()
    };
    
    if (hostname.includes('amazon.in')) {
      extractAmazonInfo(productInfo);
    } else if (hostname.includes('flipkart.com')) {
      extractFlipkartInfo(productInfo);
    } else if (hostname.includes('myntra.com')) {
      extractMyntraInfo(productInfo);
    }
    // Add extractors for other sites
    
    return productInfo;
  }
  
  function extractAmazonInfo(productInfo) {
    // Extract title
    const titleElement = document.getElementById('productTitle') || 
                         document.querySelector('h1.a-size-large');
    if (titleElement) {
      productInfo.title = titleElement.textContent.trim();
    }
    
    // Extract price
    const priceElement = document.querySelector('.a-price-whole') ||
                         document.querySelector('.a-offscreen') ||
                         document.querySelector('[data-a-color="price"] span');
    if (priceElement) {
      const priceText = priceElement.textContent.replace(/[^\d.]/g, '');
      productInfo.currentPrice = parseFloat(priceText) || 0;
      productInfo.originalPrice = productInfo.currentPrice;
    }
    
    // Extract image
    const imageElement = document.getElementById('landingImage') ||
                         document.querySelector('.a-dynamic-image');
    if (imageElement) {
      productInfo.image = imageElement.src;
    }
  }
  
  function extractFlipkartInfo(productInfo) {
    // Extract title
    const titleElement = document.querySelector('span.B_NuCI') ||
                         document.querySelector('h1');
    if (titleElement) {
      productInfo.title = titleElement.textContent.trim();
    }
    
    // Extract price
    const priceElement = document.querySelector('div._30jeq3') ||
                         document.querySelector('div._16Jk6d');
    if (priceElement) {
      const priceText = priceElement.textContent.replace(/[^\d.]/g, '');
      productInfo.currentPrice = parseFloat(priceText) || 0;
      productInfo.originalPrice = productInfo.currentPrice;
    }
    
    // Extract image
    const imageElement = document.querySelector('img._396cs4') ||
                         document.querySelector('img.q6DClP');
    if (imageElement) {
      productInfo.image = imageElement.src;
    }
  }
  
  function extractMyntraInfo(productInfo) {
    // Implementation for Myntra
  }
  
  function getSiteName(hostname) {
    if (hostname.includes('amazon')) return 'Amazon';
    if (hostname.includes('flipkart')) return 'Flipkart';
    if (hostname.includes('myntra')) return 'Myntra';
    if (hostname.includes('nykaa')) return 'Nykaa';
    if (hostname.includes('ajio')) return 'Ajio';
    return hostname;
  }
  
  function generateId() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
})();