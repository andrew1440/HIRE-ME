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
    document.getElementById('loginBtn').addEventListener('click', () => openModal('loginModal'));
    document.getElementById('registerBtn').addEventListener('click', () => openModal('registerModal'));

    // Forms
    document.getElementById('loginFormModal').addEventListener('submit', handleLogin);
    document.getElementById('registerFormModal').addEventListener('submit', handleRegister);
    document.getElementById('contactForm').addEventListener('submit', handleContact);

    // Buttons
    document.getElementById('getStartedBtn').addEventListener('click', () => scrollToSection('services'));
    document.getElementById('listServiceBtn').addEventListener('click', () => openModal('registerModal'));
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
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

function handleLogout() {
    localStorage.removeItem('token');
    currentUser = null;
    cart = [];
    updateAuthUI();
    updateCartUI();
    showToast('Logged out successfully', 'info');
}

function checkAuthStatus() {
    const token = localStorage.getItem('token');
    if (token) {
        // Verify token with server (simplified)
        currentUser = { name: 'User' }; // In real app, decode token
        updateAuthUI();
    }
}

// UI Update Functions
function updateAuthUI() {
    const userMenu = document.getElementById('userMenu');
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    if (currentUser) {
        userMenu.querySelector('.dropdown-toggle').innerHTML = `<i class="fas fa-user me-2"></i>${currentUser.name}`;
        loginBtn.style.display = 'none';
        registerBtn.style.display = 'none';
        logoutBtn.style.display = 'block';
    } else {
        userMenu.querySelector('.dropdown-toggle').innerHTML = '<i class="fas fa-user me-2"></i>Account';
        loginBtn.style.display = 'block';
        registerBtn.style.display = 'block';
        logoutBtn.style.display = 'none';
    }
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

function openCartModal() {
    updateCartDisplay();
    openModal('cartModal');
}

// Cart Functions
function addToCart(product) {
    cart.push(product);
    updateCartUI();
    showToast('Item added to cart!', 'success');
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartUI();
    updateCartDisplay();
}

function updateCartDisplay() {
    const cartItems = document.getElementById('cartItems');
    if (cart.length === 0) {
        cartItems.innerHTML = '<p class="text-center text-muted">Your cart is empty</p>';
        return;
    }

    cartItems.innerHTML = cart.map((item, index) => `
        <div class="cart-item d-flex align-items-center">
            <img src="${item.image || 'Img/Vehicle.jpeg'}" alt="${item.name}" class="me-3" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px;">
            <div class="flex-grow-1">
                <h6 class="mb-1">${item.name}</h6>
                <p class="mb-1 text-muted">KES ${item.price}/day</p>
            </div>
            <button class="btn btn-sm btn-outline-danger" onclick="removeFromCart(${index})">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
}

function handleCheckout() {
    if (!currentUser) {
        showToast('Please login to proceed with checkout', 'warning');
        closeModal('cartModal');
        openModal('loginModal');
        return;
    }

    if (cart.length === 0) {
        showToast('Your cart is empty', 'warning');
        return;
    }

    showToast('Checkout functionality coming soon!', 'info');
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

// Utility Functions
function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

function viewCategory(category) {
    showToast(`Viewing ${category} category - Feature coming soon!`, 'info');
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
