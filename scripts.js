// Modern JavaScript for HIRE-ME Application

// Global variables
let currentUser = null;
let cart = [];

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    loadFeaturedProducts();
    setupEventListeners();
    checkAuthStatus();
});

// Initialize Application
function initializeApp() {
    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

// Setup Event Listeners
function setupEventListeners() {
    // Navigation
    document.getElementById('cartBtn').addEventListener('click', openCartModal);

    // Logout functionality
    document.getElementById('logoutBtn').addEventListener('click', function(e) {
        e.preventDefault();
        handleLogout();
    });

    // Forms
    document.getElementById('contactForm').addEventListener('submit', handleContact);

    // Buttons
    document.getElementById('getStartedBtn').addEventListener('click', () => scrollToSection('services'));
    document.getElementById('listServiceBtn').addEventListener('click', () => {
        // Redirect to register page instead of opening modal
        window.location.href = 'register.html';
    });
    document.getElementById('checkoutBtn').addEventListener('click', handleCheckout);

    // Close modals when clicking outside
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            const modals = document.querySelectorAll('.modal');
            modals.forEach(modal => {
                const bsModal = bootstrap.Modal.getInstance(modal);
                if (bsModal) bsModal.hide();
            });
        }
    });

    // Initialize dropdown functionality after DOM is loaded
    initializeDropdowns();
}

// Authentication Functions
async function handleLogin(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    // Show loading state
    submitBtn.innerHTML = '<span class="spinner me-2"></span>Logging in...';
    submitBtn.disabled = true;

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const result = await response.json();

        if (response.ok) {
            currentUser = result.user;
            // Store token for backward compatibility but use session-based auth
            localStorage.setItem('token', result.token);
            showToast('Login successful!', 'success');
            closeModal('loginModal');
            updateAuthUI();
            form.reset();
        } else {
            showToast(result.message, 'error');
        }
    } catch (error) {
        showToast('Login failed. Please try again.', 'error');
    } finally {
        submitBtn.innerHTML = 'Login';
        submitBtn.disabled = false;
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');

    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const phone = document.getElementById('registerPhone').value;
    const location = document.getElementById('registerLocation').value;
    const password = document.getElementById('registerPassword').value;

    // Show loading state
    submitBtn.innerHTML = '<span class="spinner me-2"></span>Registering...';
    submitBtn.disabled = true;

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, phone, location, password })
        });

        const result = await response.json();

        if (response.ok) {
            showToast('Registration successful! Please login.', 'success');
            closeModal('registerModal');
            openModal('loginModal');
            form.reset();
        } else {
            showToast(result.message, 'error');
        }
    } catch (error) {
        showToast('Registration failed. Please try again.', 'error');
    } finally {
        submitBtn.innerHTML = 'Register';
        submitBtn.disabled = false;
    }
}

async function handleContact(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');

    const name = document.getElementById('contactName').value;
    const email = document.getElementById('contactEmail').value;
    const message = document.getElementById('contactMessage').value;

    // Show loading state
    submitBtn.innerHTML = '<span class="spinner me-2"></span>Sending...';
    submitBtn.disabled = true;

    try {
        const response = await fetch('/api/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, message })
        });

        const result = await response.json();

        if (response.ok) {
            showToast('Message sent successfully!', 'success');
            form.reset();
        } else {
            showToast(result.message, 'error');
        }
    } catch (error) {
        showToast('Failed to send message. Please try again.', 'error');
    } finally {
        submitBtn.innerHTML = 'Send Message';
        submitBtn.disabled = false;
    }
}

async function handleLogout() {
  try {
    await fetch('/api/logout', {
      method: 'POST',
      credentials: 'same-origin'
    });
  } catch (error) {
    console.error('Logout error:', error);
  }

  // Clear both token and session data for compatibility
  localStorage.removeItem('token');
  currentUser = null;
  cart = [];
  updateAuthUI();
  updateCartUI();
  showToast('Logged out successfully', 'info');
}

async function checkAuthStatus() {
  try {
    const response = await fetch('/api/profile', {
      credentials: 'same-origin'
    });

    if (response.ok) {
      currentUser = await response.json();
      await loadCartFromServer();
    } else {
      currentUser = null;
    }
  } catch (error) {
    console.error('Auth check failed:', error);
    currentUser = null;
  }
  updateAuthUI();
}

// UI Update Functions
function updateAuthUI() {
    console.log('updateAuthUI called, currentUser:', currentUser);

    const userMenu = document.getElementById('userMenu');
    const guestSection = userMenu.querySelector('.guest-section');
    const userSection = userMenu.querySelector('.user-section');
    const userName = document.getElementById('userName');
    const userStatus = document.getElementById('userStatus');
    const userFullName = document.getElementById('userFullName');
    const userEmail = document.getElementById('userEmail');

    if (!userMenu) {
        console.error('userMenu element not found');
        return;
    }

    if (currentUser) {
        // Show authenticated user interface
        guestSection.style.display = 'none';
        userSection.style.display = 'block';

        // Update user information
        userName.textContent = currentUser.name;
        userStatus.textContent = 'Member';
        userFullName.textContent = currentUser.name;
        userEmail.textContent = currentUser.email;

        console.log('UI updated for logged-in user:', currentUser.name);
    } else {
        // Show guest interface
        guestSection.style.display = 'block';
        userSection.style.display = 'none';

        userName.textContent = 'Account';
        userStatus.textContent = 'Guest';

        console.log('UI updated for guest user');
    }
}

// Initialize dropdown functionality
function initializeDropdowns() {
    // Let Bootstrap handle dropdown functionality
    const dropdownElementList = [].slice.call(document.querySelectorAll('.dropdown-toggle'));
    const dropdownList = dropdownElementList.map(function (dropdownToggleEl) {
        return new bootstrap.Dropdown(dropdownToggleEl);
    });

    console.log('Dropdowns initialized:', dropdownList.length);

    // Ensure dropdowns have proper z-index
    const style = document.createElement('style');
    style.textContent = `
        .dropdown-menu {
            z-index: 9999 !important;
            position: absolute !important;
        }
        .navbar {
            z-index: 1000 !important;
        }
    `;
    document.head.appendChild(style);

    // Add click outside to close dropdowns
    document.addEventListener('click', function(event) {
        const dropdowns = document.querySelectorAll('.dropdown-menu.show');
        dropdowns.forEach(dropdown => {
            if (!dropdown.closest('.dropdown').contains(event.target)) {
                const bsDropdown = bootstrap.Dropdown.getInstance(dropdown.previousElementSibling);
                if (bsDropdown) bsDropdown.hide();
            }
        });
    });
}

function updateCartUI() {
    const cartCount = document.getElementById('cartCount');
    cartCount.textContent = cart.length;
}

// Modal Functions
function openModal(modalId) {
    const modal = new bootstrap.Modal(document.getElementById(modalId));
    modal.show();
}

function closeModal(modalId) {
    const modal = bootstrap.Modal.getInstance(document.getElementById(modalId));
    if (modal) modal.hide();
}

async function openCartModal() {
  await loadCartFromServer();
  openModal('cartModal');
}

// Cart Functions
async function addToCart(product) {
  if (!currentUser) {
    showToast('Please login to add items to cart', 'warning');
    openModal('loginModal');
    return;
  }

  try {
    const response = await fetch('/api/cart/add', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ productId: product.id, quantity: 1 })
    });

    let result;
    try {
        result = await response.json();
    } catch (parseError) {
        console.error('Error parsing response:', parseError);
        showToast('Failed to process server response. Please try again.', 'error');
        return;
    }

    if (response.ok) {
      await loadCartFromServer();
      showToast('Item added to cart!', 'success');
    } else {
      // Handle authentication errors specifically
      if (response.status === 401) {
        showToast('Please login to add items to cart', 'warning');
        openModal('loginModal');
      } else {
        showToast(result.message, 'error');
      }
    }
  } catch (error) {
    showToast('Failed to add item to cart', 'error');
  }
}

async function removeFromCart(cartId) {
  try {
    const response = await fetch(`/api/cart/${cartId}`, {
      method: 'DELETE',
      credentials: 'same-origin'
    });

    const result = await response.json();

    if (response.ok) {
      await loadCartFromServer();
      showToast('Item removed from cart!', 'success');
    } else {
      showToast(result.message, 'error');
    }
  } catch (error) {
    showToast('Failed to remove item from cart', 'error');
  }
}

// Load cart from server
async function loadCartFromServer() {
  if (!currentUser) {
    cart = [];
    updateCartUI();
    return;
  }

  try {
    const response = await fetch('/api/cart', {
      credentials: 'same-origin'
    });

    if (response.ok) {
      cart = await response.json();
    } else {
      // Handle authentication errors specifically
      if (response.status === 401) {
        // User is not authenticated, clear currentUser
        currentUser = null;
        updateAuthUI();
      }
      cart = [];
    }
  } catch (error) {
    console.error('Failed to load cart:', error);
    cart = [];
  }

  updateCartUI();
  updateCartDisplay();
}

function updateCartDisplay() {
  const cartItems = document.getElementById('cartItems');
  if (!cart || cart.length === 0) {
    cartItems.innerHTML = `
      <div class="text-center py-5">
        <i class="fas fa-shopping-cart fa-3x text-muted mb-3"></i>
        <h5 class="mb-3">Your cart is empty</h5>
        <p class="text-muted mb-4">Looks like you haven't added anything to your cart yet</p>
        <button class="btn btn-primary" data-bs-dismiss="modal" onclick="scrollToSection('services')">
          <i class="fas fa-search me-2"></i>Find Rentals
        </button>
      </div>
    `;
    document.getElementById('cartTotal').textContent = 'KES 0';
    return;
  }

  // Calculate total
  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  document.getElementById('cartTotal').textContent = `KES ${total}`;

  cartItems.innerHTML = cart.map((item) => `
    <div class="cart-item d-flex align-items-center border-bottom pb-3 mb-3">
      <img src="${item.image || 'Img/Vehicle.jpeg'}" alt="${item.name}" class="me-3" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px;">
      <div class="flex-grow-1">
        <h6 class="mb-1">${item.name}</h6>
        <p class="mb-1 text-muted small">${item.description}</p>
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <small class="text-muted">Quantity: ${item.quantity}</small>
          </div>
          <div class="text-end">
            <div class="fw-bold">KES ${item.price * item.quantity}</div>
            <small class="text-muted">KES ${item.price}/day</small>
          </div>
        </div>
      </div>
      <button class="btn btn-sm btn-outline-danger" onclick="removeFromCart(${item.id})">
        <i class="fas fa-trash"></i>
      </button>
    </div>
  `).join('');
}

function handleCheckout() {
    if (!currentUser) {
        showToast('Please login to proceed with checkout', 'warning');
        closeModal('cartModal');
        window.location.href = 'login.html';
        return;
    }

    if (cart.length === 0) {
        showToast('Your cart is empty', 'warning');
        return;
    }

    // Redirect to checkout page
    window.location.href = 'checkout.html';
}

// Enhanced dropdown menu functions
function viewProfile() {
    closeDropdown();
    if (!currentUser) {
        showToast('Please login to view your profile', 'warning');
        openModal('loginModal');
        return;
    }

    // Create profile modal
    showProfileModal();
}

function viewOrders() {
    closeDropdown();
    if (!currentUser) {
        showToast('Please login to view your orders', 'warning');
        openModal('loginModal');
        return;
    }

    // Redirect to orders page
    window.location.href = 'orders.html';
}

function viewFavorites() {
    closeDropdown();
    if (!currentUser) {
        showToast('Please login to view your favorites', 'warning');
        openModal('loginModal');
        return;
    }

    showToast('Favorites feature coming soon!', 'info');
}

function openSettings() {
    closeDropdown();
    if (!currentUser) {
        showToast('Please login to access settings', 'warning');
        openModal('loginModal');
        return;
    }

    showToast('Settings feature coming soon!', 'info');
}

function showProfileModal() {
    // Create a profile modal dynamically
    const profileModal = document.createElement('div');
    profileModal.className = 'modal fade';
    profileModal.id = 'profileModal';
    profileModal.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">My Profile</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <div class="text-center mb-4">
                        <div class="profile-avatar-large">
                            <i class="fas fa-user"></i>
                        </div>
                        <h4>${currentUser.name}</h4>
                        <p class="text-muted">${currentUser.email}</p>
                    </div>
                    <div class="profile-details">
                        <div class="row">
                            <div class="col-sm-6">
                                <strong>Name:</strong><br>
                                ${currentUser.name}
                            </div>
                            <div class="col-sm-6">
                                <strong>Email:</strong><br>
                                ${currentUser.email}
                            </div>
                        </div>
                        <div class="row mt-3">
                            <div class="col-sm-6">
                                <strong>Phone:</strong><br>
                                ${currentUser.phone || 'Not provided'}
                            </div>
                            <div class="col-sm-6">
                                <strong>Location:</strong><br>
                                ${currentUser.location || 'Not provided'}
                            </div>
                        </div>
                        <div class="row mt-3">
                            <div class="col-12">
                                <strong>Member Since:</strong><br>
                                ${new Date(currentUser.created_at).toLocaleDateString()}
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    <button type="button" class="btn btn-primary" onclick="editProfile()">Edit Profile</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(profileModal);
    const modal = new bootstrap.Modal(profileModal);
    modal.show();

    // Remove modal from DOM when hidden
    profileModal.addEventListener('hidden.bs.modal', () => {
        document.body.removeChild(profileModal);
    });
}

function editProfile() {
    showToast('Edit profile feature coming soon!', 'info');
}

// Product Functions
async function loadFeaturedProducts() {
    try {
        const response = await fetch('/api/products');
        const products = await response.json();

        if (products.length === 0) {
            // Load sample products if none in database
            loadSampleProducts();
            return;
        }

        displayProducts(products);
    } catch (error) {
        console.error('Failed to load products:', error);
        loadSampleProducts();
    }
}

function loadSampleProducts() {
    const sampleProducts = [
        {
            name: 'Luxury SUV',
            description: 'Premium SUV perfect for family trips',
            price: 5000,
            category: 'vehicles',
            image: 'Img/Vehicle.jpeg',
            location: 'Nairobi'
        },
        {
            name: 'Professional Sound System',
            description: 'Complete audio setup for events',
            price: 3000,
            category: 'audio',
            image: 'Img/sound3.jpeg',
            location: 'Nairobi'
        },
        {
            name: 'Construction Tools Set',
            description: 'Complete toolkit for construction work',
            price: 1500,
            category: 'tools',
            image: 'Img/House.jpeg',
            location: 'Nairobi'
        }
    ];

    displayProducts(sampleProducts);
}

function displayProducts(products) {
    const container = document.getElementById('featuredProducts');
    container.innerHTML = `
        <div class="row mb-3">
            <div class="col-12 d-flex justify-content-end">
                <button class="btn btn-outline-primary btn-sm me-2" onclick="toggleSelectAll()">
                    <i class="fas fa-check-square me-1"></i>Select All
                </button>
                <button class="btn btn-primary btn-sm" onclick="addSelectedToCart()">
                    <i class="fas fa-cart-plus me-1"></i>Add Selected (<span id="selectedCount">0</span>)
                </button>
            </div>
        </div>
        <div class="row g-4">${products.map(product => `
            <div class="col-md-4 mb-4">
                <div class="card product-card h-100 position-relative">
                    <input type="checkbox" class="product-checkbox position-absolute" style="top: 10px; right: 10px; width: 20px; height: 20px;" data-product='${JSON.stringify(product).replace(/'/g, "&#39;")}' onchange="updateSelectedCount()">
                    <img src="${product.image || 'Img/Vehicle.jpeg'}" class="card-img-top product-image" alt="${product.name}">
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title">${product.name}</h5>
                        <p class="card-text text-muted">${product.description}</p>
                        <div class="mt-auto">
                            <div class="d-flex justify-content-between align-items-center mb-3">
                                <span class="h5 text-primary fw-bold">KES ${product.price}</span>
                                <small class="text-muted">${product.location}</small>
                            </div>
                            <button class="btn btn-primary w-100" onclick="addToCart(${JSON.stringify(product).replace(/"/g, '"')})">
                                <i class="fas fa-cart-plus me-2"></i>Add to Cart
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('')}</div>
    `;
}

function viewCategory(category) {
    console.log('Viewing category:', category);
    // Fetch and display products by category
    fetchAndDisplayProductsByCategory(category);
}

// New function to fetch and display products by category
async function fetchAndDisplayProductsByCategory(category) {
    try {
        console.log('Fetching products for category:', category);
        // Show loading state
        showLoadingState();
        
        const response = await fetch(`/api/products/category/${category}`);
        console.log('Response status:', response.status);
        const products = await response.json();
        console.log('Products received:', products);
        
        if (products.length === 0) {
            showNoProductsMessage(category);
            return;
        }
        
        displayProductsByCategory(category, products);
    } catch (error) {
        console.error('Failed to load products by category:', error);
        showToast('Failed to load products. Please try again.', 'error');
    }
}

// Function to show loading state
function showLoadingState() {
    const productsSection = document.getElementById('products');
    productsSection.innerHTML = `
        <div class="container">
            <div class="text-center mb-5">
                <h2 class="display-5 fw-bold">Loading Products...</h2>
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>
        </div>
    `;
    
    // Scroll to products section
    productsSection.scrollIntoView({ behavior: 'smooth' });
}

// Function to show no products message
function showNoProductsMessage(category) {
    const productsSection = document.getElementById('products');
    const categoryName = getCategoryName(category);
    
    productsSection.innerHTML = `
        <div class="container">
            <div class="text-center mb-5">
                <h2 class="display-5 fw-bold">${categoryName}</h2>
                <p class="lead text-muted">No products available in this category yet.</p>
                <button class="btn btn-primary" onclick="loadFeaturedProducts()">View All Products</button>
            </div>
        </div>
    `;
    
    // Scroll to products section
    productsSection.scrollIntoView({ behavior: 'smooth' });
}

// Function to display products by category
function displayProductsByCategory(category, products) {
    const productsSection = document.getElementById('products');
    const categoryName = getCategoryName(category);
    
    productsSection.innerHTML = `
        <div class="container">
            <div class="text-center mb-5">
                <h2 class="display-5 fw-bold">${categoryName}</h2>
                <p class="lead text-muted">Browse our selection of ${categoryName.toLowerCase()}</p>
                <button class="btn btn-outline-primary" onclick="loadFeaturedProducts()">View All Products</button>
            </div>
            <div class="row mb-3">
                <div class="col-12 d-flex justify-content-end">
                    <button class="btn btn-outline-primary btn-sm me-2" onclick="toggleSelectAll()">
                        <i class="fas fa-check-square me-1"></i>Select All
                    </button>
                    <button class="btn btn-primary btn-sm" onclick="addSelectedToCart()">
                        <i class="fas fa-cart-plus me-1"></i>Add Selected (<span id="selectedCount">0</span>)
                    </button>
                </div>
            </div>
            <div class="row g-4" id="categoryProducts">
                <!-- Products will be loaded dynamically -->
            </div>
        </div>
    `;
    
    // Display the products
    const container = document.getElementById('categoryProducts');
    container.innerHTML = products.map(product => `
        <div class="col-md-4 mb-4">
            <div class="card product-card h-100 position-relative">
                <input type="checkbox" class="product-checkbox position-absolute" style="top: 10px; right: 10px; width: 20px; height: 20px;" data-product='${JSON.stringify(product).replace(/'/g, "&#39;")}' onchange="updateSelectedCount()">
                <img src="${product.image || 'Img/Vehicle.jpeg'}" class="card-img-top product-image" alt="${product.name}">
                <div class="card-body d-flex flex-column">
                    <h5 class="card-title">${product.name}</h5>
                    <p class="card-text text-muted">${product.description}</p>
                    <div class="mt-auto">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <span class="h5 text-primary fw-bold">KES ${product.price}</span>
                            <small class="text-muted">${product.location}</small>
                        </div>
                        <button class="btn btn-primary w-100" onclick="addToCart(${JSON.stringify(product).replace(/"/g, '&quot;')})">
                            <i class="fas fa-cart-plus me-2"></i>Add to Cart
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
    
    // Scroll to products section
    productsSection.scrollIntoView({ behavior: 'smooth' });
}

// Helper function to get category name
function getCategoryName(category) {
    const categoryNames = {
        'vehicles': 'Vehicle Rentals',
        'audio': 'Sound & Audio Equipment',
        'tools': 'Tools & Equipment',
        'sports': 'Sports Equipment',
        'fashion': 'Fashion Items'
    };
    
    return categoryNames[category] || category.charAt(0).toUpperCase() + category.slice(1);
}

// Multi-select functionality for products
function updateSelectedCount() {
    const checkboxes = document.querySelectorAll('.product-checkbox:checked');
    const count = checkboxes.length;
    const countElements = document.querySelectorAll('#selectedCount');
    countElements.forEach(element => {
        element.textContent = count;
    });
}

function toggleSelectAll() {
    const checkboxes = document.querySelectorAll('.product-checkbox');
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    
    checkboxes.forEach(cb => {
        cb.checked = !allChecked;
    });
    
    updateSelectedCount();
}

async function addSelectedToCart() {
    if (!currentUser) {
        showToast('Please login to add items to cart', 'warning');
        openModal('loginModal');
        return;
    }
    
    const selectedCheckboxes = document.querySelectorAll('.product-checkbox:checked');
    
    if (selectedCheckboxes.length === 0) {
        showToast('Please select at least one item to add to cart', 'warning');
        return;
    }
    
    // Prepare items array for bulk add
    const items = [];
    for (const checkbox of selectedCheckboxes) {
        try {
            const product = JSON.parse(checkbox.dataset.product);
            if (product && product.id) {
                items.push({ productId: product.id, quantity: 1 });
            } else {
                console.error('Invalid product data:', checkbox.dataset.product);
            }
        } catch (parseError) {
            console.error('Error parsing product data:', parseError, checkbox.dataset.product);
        }
    }
    
    if (items.length === 0) {
        showToast('No valid items to add to cart', 'warning');
        return;
    }
    
    try {
        const response = await fetch('/api/cart/add-multiple', {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ items })
        });
        
        let result;
        try {
            result = await response.json();
        } catch (parseError) {
            console.error('Error parsing response:', parseError);
            showToast('Failed to process server response. Please try again.', 'error');
            return;
        }
        
        if (response.ok) {
            // Refresh cart
            await loadCartFromServer();
            showToast(result.message, 'success');
        } else {
            // Handle authentication errors specifically
            if (response.status === 401) {
                showToast('Please login to add items to cart', 'warning');
                openModal('loginModal');
            } else {
                showToast(result.message || 'Failed to add items to cart', 'error');
            }
        }
    } catch (error) {
        console.error('Error adding items to cart:', error);
        showToast('Failed to add items to cart. Please try again.', 'error');
    }
    
    // Clear selections
    document.querySelectorAll('.product-checkbox:checked').forEach(cb => {
        cb.checked = false;
    });
    updateSelectedCount();
}

// Utility Functions
function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

// New function to show a feature coming soon modal
function showFeatureComingSoonModal(title, description) {
    // Create modal dynamically
    const modalId = 'featureComingSoonModal';
    
    // Remove existing modal if it exists
    const existingModal = document.getElementById(modalId);
    if (existingModal) {
        existingModal.remove();
    }
    
    const modalHTML = `
        <div class="modal fade" id="${modalId}" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title">
                            <i class="fas fa-tools me-2"></i>Feature Coming Soon
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body text-center py-5">
                        <div class="feature-icon mb-4">
                            <i class="fas fa-car text-primary" style="font-size: 4rem;"></i>
                        </div>
                        <h3 class="mb-3">${title}</h3>
                        <p class="text-muted mb-4">${description}</p>
                        <div class="alert alert-info text-start">
                            <h6><i class="fas fa-info-circle me-2"></i>What to expect:</h6>
                            <ul class="mb-0">
                                <li>Wide selection of quality vehicles</li>
                                <li>Competitive pricing</li>
                                <li>Easy booking process</li>
                                <li>24/7 customer support</li>
                            </ul>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        <button type="button" class="btn btn-primary" data-bs-dismiss="modal">
                            <i class="fas fa-bell me-2"></i>Notify Me
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById(modalId));
    modal.show();
    
    // Remove modal from DOM when hidden
    document.getElementById(modalId).addEventListener('hidden.bs.modal', function () {
        document.getElementById(modalId).remove();
    });
}

function showToast(message, type = 'info') {
    // Create toast container if it doesn't exist
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
        toastContainer.style.zIndex = '9999';
        document.body.appendChild(toastContainer);
    }

    const toastId = 'toast-' + Date.now();
    const toastHTML = `
        <div id="${toastId}" class="toast align-items-center text-white bg-${type === 'error' ? 'danger' : type} border-0" role="alert">
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    `;

    toastContainer.insertAdjacentHTML('beforeend', toastHTML);

    const toastElement = document.getElementById(toastId);
    const bsToast = new bootstrap.Toast(toastElement);
    bsToast.show();

    // Remove toast after it's hidden
    toastElement.addEventListener('hidden.bs.toast', () => {
        toastElement.remove();
    });
}

// Initialize animations on scroll
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('fade-in-up');
        }
    });
}, observerOptions);

// Observe elements for animation
document.querySelectorAll('.card, .hero-section .col-lg-6').forEach(el => {
    observer.observe(el);
});

// Handle browser back/forward buttons
window.addEventListener('popstate', function(event) {
    // Handle navigation state changes if needed
});

// Service Worker registration (for PWA features)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Register service worker for offline functionality (future enhancement)
    });
}

// Advanced Search Variables
let searchTimeout;
let currentSearchFilters = {};
let searchSuggestions = [];

// Advanced Search Functions
function handleSearchInput(event) {
    const query = event.target.value.trim();

    if (query.length >= 2) {
        // Debounce search suggestions
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            loadSearchSuggestions(query);
        }, 300);
    } else {
        hideSearchSuggestions();
    }
}

async function loadSearchSuggestions(query) {
    try {
        const response = await fetch(`/api/search/suggestions?q=${encodeURIComponent(query)}`);
        const data = await response.json();

        if (data.suggestions && data.suggestions.length > 0) {
            showSearchSuggestions(data.suggestions);
        } else {
            hideSearchSuggestions();
        }
    } catch (error) {
        console.error('Error loading search suggestions:', error);
        hideSearchSuggestions();
    }
}

function showSearchSuggestions(suggestions) {
    const container = document.getElementById('searchSuggestions');
    if (!container) return;

    container.innerHTML = '';

    suggestions.forEach(suggestion => {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.onclick = () => selectSuggestion(suggestion.text);

        item.innerHTML = `
            <div class="suggestion-text">${highlightMatch(suggestion.text, document.getElementById('searchInput').value)}</div>
            <div class="suggestion-type">${suggestion.type}</div>
        `;

        container.appendChild(item);
    });

    container.style.display = 'block';
}

function hideSearchSuggestions() {
    const container = document.getElementById('searchSuggestions');
    if (container) {
        container.style.display = 'none';
    }
}

function selectSuggestion(text) {
    document.getElementById('searchInput').value = text;
    hideSearchSuggestions();
    performAdvancedSearch();
}

function highlightMatch(text, query) {
    if (!query) return text;
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
}

function toggleAdvancedFilters() {
    const filters = document.getElementById('advancedFilters');
    const toggleBtn = document.getElementById('filterToggle');
    const toggleIcon = toggleBtn.querySelector('.toggle-icon');

    if (filters.style.display === 'none') {
        filters.style.display = 'block';
        toggleIcon.style.transform = 'rotate(180deg)';
        loadFilterOptions();
    } else {
        filters.style.display = 'none';
        toggleIcon.style.transform = 'rotate(0deg)';
    }
}

async function loadFilterOptions() {
    try {
        const response = await fetch('/api/products/filters');
        const filters = await response.json();

        // Populate category filter
        const categorySelect = document.getElementById('categoryFilter');
        categorySelect.innerHTML = '<option value="">All Categories</option>';
        filters.categories.forEach(category => {
            categorySelect.innerHTML += `<option value="${category}">${category}</option>`;
        });

        // Populate location filter
        const locationSelect = document.getElementById('locationFilter');
        locationSelect.innerHTML = '<option value="">All Locations</option>';
        filters.locations.forEach(location => {
            locationSelect.innerHTML += `<option value="${location}">${location}</option>`;
        });

        // Set price range defaults
        if (filters.priceRange) {
            document.getElementById('minPrice').placeholder = filters.priceRange.min;
            document.getElementById('maxPrice').placeholder = filters.priceRange.max;
        }

        // Populate features checkboxes
        const featuresContainer = document.getElementById('featuresFilter');
        featuresContainer.innerHTML = '';
        filters.features.forEach(feature => {
            const checkboxDiv = document.createElement('div');
            checkboxDiv.className = 'feature-checkbox';
            checkboxDiv.innerHTML = `
                <input type="checkbox" id="feature-${feature}" value="${feature}">
                <label for="feature-${feature}">${feature}</label>
            `;
            featuresContainer.appendChild(checkboxDiv);
        });

    } catch (error) {
        console.error('Error loading filter options:', error);
    }
}

function performAdvancedSearch() {
    const searchInput = document.getElementById('searchInput').value.trim();

    // Build search filters
    currentSearchFilters = {
        q: searchInput,
        category: document.getElementById('categoryFilter')?.value || '',
        location: document.getElementById('locationFilter')?.value || '',
        minPrice: document.getElementById('minPrice')?.value || '',
        maxPrice: document.getElementById('maxPrice')?.value || '',
        rating: document.getElementById('ratingFilter')?.value || '',
        condition: document.getElementById('conditionFilter')?.value || '',
        features: getSelectedFeatures(),
        sortBy: 'rating',
        sortOrder: 'desc',
        limit: 20,
        offset: 0
    };

    // Remove empty filters
    Object.keys(currentSearchFilters).forEach(key => {
        if (!currentSearchFilters[key] || currentSearchFilters[key] === '') {
            delete currentSearchFilters[key];
        }
    });

    loadProducts(currentSearchFilters);
    hideSearchSuggestions();
}

function getSelectedFeatures() {
    const checkboxes = document.querySelectorAll('#featuresFilter input[type="checkbox"]:checked');
    return Array.from(checkboxes).map(cb => cb.value);
}

function applyFilters() {
    performAdvancedSearch();
}

function clearFilters() {
    // Clear all filter inputs
    document.getElementById('searchInput').value = '';
    document.getElementById('categoryFilter').selectedIndex = 0;
    document.getElementById('locationFilter').selectedIndex = 0;
    document.getElementById('minPrice').value = '';
    document.getElementById('maxPrice').value = '';
    document.getElementById('ratingFilter').selectedIndex = 0;
    document.getElementById('conditionFilter').selectedIndex = 0;

    // Clear feature checkboxes
    const checkboxes = document.querySelectorAll('#featuresFilter input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = false);

    // Reset search filters
    currentSearchFilters = {};
    loadProducts();
}

// Enhanced product loading with search filters
async function loadProducts(searchFilters = {}) {
    try {
        // Show loading state
        const productsContainer = document.getElementById('featuredProducts');
        if (productsContainer) {
            productsContainer.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary" role="status"><span class="sr-only">Loading...</span></div></div>';
        }

        // Build query string
        const queryParams = new URLSearchParams(searchFilters);
        const url = Object.keys(searchFilters).length > 0 ? `/api/products/search?${queryParams}` : '/api/products';

        const response = await fetch(url);
        const products = await response.json();

        displayProducts(products.results || products);

        // Update search results info
        if (searchFilters.q || Object.keys(searchFilters).length > 1) {
            showSearchResultsInfo(products);
        }

    } catch (error) {
        console.error('Error loading products:', error);
        const productsContainer = document.getElementById('featuredProducts');
        if (productsContainer) {
            productsContainer.innerHTML = '<div class="alert alert-danger">Failed to load products. Please try again.</div>';
        }
    }
}

function showSearchResultsInfo(products) {
    const resultsInfo = document.createElement('div');
    resultsInfo.className = 'search-results-info alert alert-info';
    resultsInfo.innerHTML = `
        <i class="fas fa-search me-2"></i>
        Found ${products.total || products.length} results
        ${products.filters ? ` for "${products.filters.query || 'your search'}"` : ''}
        <button onclick="clearFilters()" class="btn btn-sm btn-outline-primary ms-2">Clear filters</button>
    `;

    const existingInfo = document.querySelector('.search-results-info');
    if (existingInfo) {
        existingInfo.remove();
    }

    const productsSection = document.getElementById('products');
    if (productsSection) {
        productsSection.insertBefore(resultsInfo, productsSection.firstChild);
    }
}

// Enhanced product display with ratings and features
function displayProducts(products) {
    const productsContainer = document.getElementById('featuredProducts');
    if (!productsContainer) return;

    if (!products || products.length === 0) {
        productsContainer.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="fas fa-search fa-3x text-muted mb-3"></i>
                <h4>No products found</h4>
                <p class="text-muted">Try adjusting your search criteria or browse all products.</p>
                <button onclick="clearFilters()" class="btn btn-primary">Browse All Products</button>
            </div>
        `;
        return;
    }

    productsContainer.innerHTML = products.map(product => `
        <div class="col-md-4 mb-4">
            <div class="card product-card h-100" onclick="viewProduct(${product.id})">
                <img src="${product.image}" class="card-img-top product-image" alt="${product.name}">
                <div class="card-body d-flex flex-column">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h5 class="card-title mb-0">${product.name}</h5>
                        <div class="rating-badge">
                            ${generateStarRating(product.rating || 0)}
                            <small class="text-muted">(${product.review_count || 0})</small>
                        </div>
                    </div>

                    <p class="card-text text-muted flex-grow-1">${product.description}</p>

                    <div class="product-meta mb-3">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <span class="badge bg-primary">${product.category}</span>
                            <span class="badge bg-secondary">${product.location}</span>
                        </div>

                        ${product.condition ? `<span class="badge bg-info">${product.condition}</span>` : ''}

                        ${product.features ? `
                            <div class="features-preview mt-2">
                                ${JSON.parse(product.features || '[]').slice(0, 3).map(feature =>
                                    `<small class="badge bg-light text-dark me-1">${feature}</small>`
                                ).join('')}
                                ${JSON.parse(product.features || '[]').length > 3 ? '<small class="text-muted">+more</small>' : ''}
                            </div>
                        ` : ''}
                    </div>

                    <div class="d-flex justify-content-between align-items-center mt-auto">
                        <div class="price">
                            <strong class="text-primary">KES ${product.price.toLocaleString()}</strong>
                        </div>
                        <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); addToCart(${JSON.stringify(product).replace(/"/g, '"')})">
                            <i class="fas fa-cart-plus me-1"></i>Add to Cart
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function generateStarRating(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return `
        <div class="star-rating">
            ${'★'.repeat(fullStars)}
            ${hasHalfStar ? '☆' : ''}
            ${'☆'.repeat(emptyStars)}
        </div>
    `;
}

// Click outside to close suggestions
document.addEventListener('click', function(event) {
    const searchContainer = document.querySelector('.search-input-group');
    const suggestions = document.getElementById('searchSuggestions');

    if (searchContainer && suggestions && !searchContainer.contains(event.target)) {
        hideSearchSuggestions();
    }
});
