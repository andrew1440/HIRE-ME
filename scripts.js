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
    // We'll handle login/register through dedicated pages, but keep the logout listener
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
    await fetch('/api/logout', { method: 'POST' });
  } catch (error) {
    console.error('Logout error:', error);
  }

  localStorage.removeItem('token');
  currentUser = null;
  cart = [];
  updateAuthUI();
  updateCartUI();
  showToast('Logged out successfully', 'info');
}

async function checkAuthStatus() {
  const token = localStorage.getItem('token');
  if (token) {
    try {
      const response = await fetch('/api/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        currentUser = await response.json();
        await loadCartFromServer();
      } else {
        localStorage.removeItem('token');
        currentUser = null;
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('token');
      currentUser = null;
    }
    updateAuthUI();
  }
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

// Enhanced dropdown toggle with better functionality
function toggleDropdown() {
    const dropdownMenu = document.querySelector('#userMenu .dropdown-menu');
    const dropdownButton = document.getElementById('userDropdown');

    if (dropdownMenu && dropdownButton) {
        const isVisible = dropdownMenu.classList.contains('show');
        console.log('Dropdown toggle called, currently visible:', isVisible);

        if (isVisible) {
            closeDropdown();
        } else {
            openDropdown();
        }
    } else {
        console.error('Dropdown elements not found');
    }
}

function openDropdown() {
    const dropdownMenu = document.querySelector('#userMenu .dropdown-menu');
    const dropdownButton = document.getElementById('userDropdown');

    // Hide other dropdowns first
    document.querySelectorAll('.dropdown-menu').forEach(menu => {
        menu.classList.remove('show');
    });

    // Show this dropdown
    dropdownMenu.classList.add('show');
    dropdownButton.setAttribute('aria-expanded', 'true');

    // Focus management
    setTimeout(() => {
        const firstItem = dropdownMenu.querySelector('.dropdown-item');
        if (firstItem) firstItem.focus();
    }, 100);
}

function closeDropdown() {
    const dropdownMenu = document.querySelector('#userMenu .dropdown-menu');
    const dropdownButton = document.getElementById('userDropdown');

    dropdownMenu.classList.remove('show');
    dropdownButton.setAttribute('aria-expanded', 'false');
    dropdownButton.focus();
}

// Close dropdown when clicking outside
document.addEventListener('click', function(event) {
    const dropdown = document.getElementById('userMenu');
    const dropdownMenu = document.querySelector('#userMenu .dropdown-menu');

    if (dropdown && dropdownMenu && !dropdown.contains(event.target)) {
        closeDropdown();
    }
});

// Keyboard navigation for dropdown
document.addEventListener('keydown', function(event) {
    const dropdownMenu = document.querySelector('#userMenu .dropdown-menu');
    const dropdownButton = document.getElementById('userDropdown');

    if (dropdownMenu && dropdownMenu.classList.contains('show')) {
        const items = dropdownMenu.querySelectorAll('.dropdown-item');
        const currentIndex = Array.from(items).findIndex(item => item === document.activeElement);

        switch (event.key) {
            case 'Escape':
                event.preventDefault();
                closeDropdown();
                break;
            case 'ArrowDown':
                event.preventDefault();
                const nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
                items[nextIndex].focus();
                break;
            case 'ArrowUp':
                event.preventDefault();
                const prevIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
                items[prevIndex].focus();
                break;
            case 'Enter':
                event.preventDefault();
                if (document.activeElement.classList.contains('dropdown-item')) {
                    document.activeElement.click();
                }
                break;
        }
    } else if (event.key === 'ArrowDown' && document.activeElement === dropdownButton) {
        event.preventDefault();
        openDropdown();
    }
});

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
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ productId: product.id, quantity: 1 })
    });

    const result = await response.json();

    if (response.ok) {
      await loadCartFromServer();
      showToast('Item added to cart!', 'success');
    } else {
      showToast(result.message, 'error');
    }
  } catch (error) {
    showToast('Failed to add item to cart', 'error');
  }
}

async function removeFromCart(cartId) {
  try {
    const response = await fetch(`/api/cart/${cartId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
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
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (response.ok) {
      cart = await response.json();
    } else {
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

    showToast('Orders feature coming soon!', 'info');
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
    container.innerHTML = products.map(product => `
        <div class="col-md-4 mb-4">
            <div class="card product-card h-100">
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
    `).join('');
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
            <div class="row g-4" id="categoryProducts">
                <!-- Products will be loaded dynamically -->
            </div>
        </div>
    `;
    
    // Display the products
    const container = document.getElementById('categoryProducts');
    container.innerHTML = products.map(product => `
        <div class="col-md-4 mb-4">
            <div class="card product-card h-100">
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
