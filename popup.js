document.addEventListener('DOMContentLoaded', function() {
  const productsList = document.getElementById('products-list');
  const emptyState = document.getElementById('empty-state');
  const itemCount = document.getElementById('item-count');
  const totalAmount = document.getElementById('total-amount');
  const searchInput = document.getElementById('search-input');
  const clearSearch = document.getElementById('clear-search');
  const filterButtons = document.querySelectorAll('.filter-btn');
  const refreshBtn = document.getElementById('refresh-btn');
  
  let currentFilter = 'all';
  let currentSearch = '';
  let products = [];

  // Load products from storage
  loadProducts();

  // Set up event listeners
  searchInput.addEventListener('input', handleSearch);
  clearSearch.addEventListener('click', clearSearchInput);
  filterButtons.forEach(btn => btn.addEventListener('click', handleFilter));
  refreshBtn.addEventListener('click', loadProducts);

  function loadProducts() {
    chrome.storage.local.get(['trackedProducts'], function(result) {
      products = result.trackedProducts || [];
      renderProducts();
      updateSummary();
    });
  }

  function renderProducts() {
    productsList.innerHTML = '';
    
    if (products.length === 0) {
      emptyState.style.display = 'block';
      return;
    }
    
    emptyState.style.display = 'none';
    
    let filteredProducts = products;
    
    // Apply search filter
    if (currentSearch) {
      const searchTerm = currentSearch.toLowerCase();
      filteredProducts = filteredProducts.filter(product => 
        product.title.toLowerCase().includes(searchTerm)
      );
    }
    
    // Apply price change filter
    if (currentFilter === 'price-drop') {
      filteredProducts = filteredProducts.filter(product => 
        product.priceChange < 0
      );
    } else if (currentFilter === 'price-rise') {
      filteredProducts = filteredProducts.filter(product => 
        product.priceChange > 0
      );
    }
    
    filteredProducts.forEach(product => {
      const productElement = createProductElement(product);
      productsList.appendChild(productElement);
    });
  }

  function createProductElement(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    
    const priceChange = product.priceChange || 0;
    const changeClass = priceChange < 0 ? 'price-drop' : priceChange > 0 ? 'price-rise' : '';
    const changeIcon = priceChange < 0 ? '↘' : priceChange > 0 ? '↗' : '→';
    
    card.innerHTML = `
      <img src="${product.image}" alt="${product.title}" class="product-image" onerror="this.src='icons/default-product.png'">
      <div class="product-info">
        <h3 class="product-title">${product.title}</h3>
        <div class="product-price">₹${formatPrice(product.currentPrice)}</div>
        <div class="product-price-change ${changeClass}">
          ${changeIcon} ${priceChange !== 0 ? Math.abs(priceChange).toFixed(2) + '%' : 'No change'}
          ${product.hasAlert ? '<span class="price-alert-badge">Alert</span>' : ''}
        </div>
      </div>
      <div class="product-actions">
        <button class="remove-btn" data-id="${product.id}">×</button>
        <span class="product-site">${product.site}</span>
      </div>
    `;
    
    card.querySelector('.remove-btn').addEventListener('click', function() {
      removeProduct(product.id);
    });
    
    return card;
  }

  function removeProduct(productId) {
    products = products.filter(p => p.id !== productId);
    chrome.storage.local.set({ trackedProducts: products }, function() {
      renderProducts();
      updateSummary();
    });
  }

  function updateSummary() {
    itemCount.textContent = products.length;
    
    const total = products.reduce((sum, product) => {
      return sum + parseFloat(product.currentPrice);
    }, 0);
    
    totalAmount.textContent = formatPrice(total);
  }

  function handleSearch() {
    currentSearch = searchInput.value;
    renderProducts();
  }

  function clearSearchInput() {
    searchInput.value = '';
    currentSearch = '';
    renderProducts();
  }

  function handleFilter(e) {
    filterButtons.forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');
    currentFilter = e.target.dataset.filter;
    renderProducts();
  }

  function formatPrice(price) {
    return new Intl.NumberFormat('en-IN').format(price);
  }
});