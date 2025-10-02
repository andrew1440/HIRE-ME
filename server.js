const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const session = require('express-session');
const path = require('path');
const util = require('util');
const validator = require('validator');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 3000;

// Security headers configuration
const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for now to avoid breaking existing functionality
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'hire-me-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false, // Don't save empty sessions
  rolling: true, // Reset expiration on activity
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true, // Prevent XSS access to cookies
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'strict' // CSRF protection
  }
}));

// Security headers
app.use(helmetConfig);

// Session validation middleware
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  // Check if session is expired
  if (req.session.cookie && req.session.cookie.expires && new Date() > new Date(req.session.cookie.expires)) {
    req.session.destroy();
    return res.status(401).json({ message: 'Session expired' });
  }

  next();
}

// Serve static files
app.use(express.static(path.join(__dirname)));

// Password strength validation function
function validatePasswordStrength(password) {
  const errors = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/(?=.*[a-z])/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/(?=.*[A-Z])/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/(?=.*\d)/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/(?=.*[@$!%*?&])/.test(password)) {
    errors.push('Password must contain at least one special character (@$!%*?&)');
  }

  if (/\s/.test(password)) {
    errors.push('Password must not contain spaces');
  }

  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

// Input validation function
function validateRegistrationInput(name, email, password, phone, location) {
  const errors = [];

  if (!name || name.trim().length < 2) {
    errors.push('Name must be at least 2 characters long');
  }

  if (!validator.isEmail(email)) {
    errors.push('Please provide a valid email address');
  }

  if (!validator.isMobilePhone(phone, 'en-KE')) {
    errors.push('Please provide a valid Kenyan phone number');
  }

  if (!location || location.trim() === '') {
    errors.push('Please select a location');
  }

  const passwordValidation = validatePasswordStrength(password);
  errors.push(...passwordValidation.errors);

  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

// Email configuration
const emailConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || 'your-email@gmail.com',
    pass: process.env.SMTP_PASS || 'your-app-password'
  }
};

// Create email transporter
const transporter = nodemailer.createTransport(emailConfig);

// Email service functions
async function sendVerificationEmail(email, name, verificationToken) {
  try {
    const verificationUrl = `${process.env.APP_URL || 'http://localhost:3000'}/verify-email.html?token=${verificationToken}`;

    const mailOptions = {
      from: `"HIRE-ME" <${emailConfig.auth.user}>`,
      to: email,
      subject: 'Verify Your HIRE-ME Account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;"><i class="fas fa-tools"></i> HIRE-ME</h1>
            <p style="margin: 10px 0 0 0;">Equipment & Service Rental Platform</p>
          </div>

          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px;">
            <h2 style="color: #1f2937; margin-bottom: 20px;">Welcome, ${name}!</h2>

            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
              Thank you for registering with HIRE-ME! To complete your registration and start renting equipment, please verify your email address.
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" style="background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
                Verify Email Address
              </a>
            </div>

            <p style="color: #6b7280; font-size: 14px; margin-bottom: 20px;">
              If the button doesn't work, you can also copy and paste this link into your browser:
            </p>

            <p style="background: #f3f4f6; padding: 15px; border-radius: 5px; word-break: break-all; font-size: 14px; color: #374151;">
              ${verificationUrl}
            </p>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

            <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">
              If you didn't create an account with HIRE-ME, please ignore this email.
            </p>

            <p style="color: #6b7280; font-size: 14px;">
              This verification link will expire in 24 hours.
            </p>
          </div>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`Verification email sent to ${email}: ${result.messageId}`);
    return true;
  } catch (error) {
    console.error('Error sending verification email:', error);
    return false;
  }
}

async function sendPasswordResetEmail(email, name, resetToken) {
  try {
    const resetUrl = `${process.env.APP_URL || 'http://localhost:3000'}/reset-password.html?token=${resetToken}`;

    const mailOptions = {
      from: `"HIRE-ME" <${emailConfig.auth.user}>`,
      to: email,
      subject: 'Reset Your HIRE-ME Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;"><i class="fas fa-tools"></i> HIRE-ME</h1>
            <p style="margin: 10px 0 0 0;">Equipment & Service Rental Platform</p>
          </div>

          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px;">
            <h2 style="color: #1f2937; margin-bottom: 20px;">Password Reset Request</h2>

            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
              Hi ${name}, we received a request to reset your HIRE-ME password. Click the button below to create a new password.
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
                Reset Password
              </a>
            </div>

            <p style="color: #6b7280; font-size: 14px; margin-bottom: 20px;">
              If the button doesn't work, you can also copy and paste this link into your browser:
            </p>

            <p style="background: #f3f4f6; padding: 15px; border-radius: 5px; word-break: break-all; font-size: 14px; color: #374151;">
              ${resetUrl}
            </p>

            <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 5px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #92400e; font-size: 14px;">
                <strong>Security Notice:</strong> This link will expire in 1 hour for your security.
              </p>
            </div>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

            <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">
              If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
            </p>
          </div>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent to ${email}: ${result.messageId}`);
    return true;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return false;
  }
}

// Rate limiting configuration
const createAccountLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    message: 'Too many accounts created from this IP, please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 login requests per windowMs
  message: {
    message: 'Too many login attempts from this IP, please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins against the limit
});

const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 password reset requests per hour
  message: {
    message: 'Too many password reset requests from this IP, please try again after 1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Account lockout helper functions
function isAccountLocked(lockedUntil) {
  if (!lockedUntil) return false;
  return new Date(lockedUntil) > new Date();
}

function calculateLockoutDuration(attempts) {
  // Progressive lockout: 15 minutes for 3-4 attempts, 1 hour for 5+ attempts
  if (attempts >= 5) return 60 * 60 * 1000; // 1 hour
  if (attempts >= 3) return 15 * 60 * 1000; // 15 minutes
  return 0; // No lockout for less than 3 attempts
}

// SQLite database setup
const db = new sqlite3.Database('./hire-me.db', (err) => {
  if (err) {
    console.error('SQLite connection error:', err.message);
  } else {
    console.log('Connected to SQLite database');
    // Create tables
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT UNIQUE,
      password TEXT,
      phone TEXT,
      location TEXT,
      email_verified BOOLEAN DEFAULT 0,
      verification_token TEXT,
      verification_expires DATETIME,
      password_reset_token TEXT,
      password_reset_expires DATETIME,
      login_attempts INTEGER DEFAULT 0,
      locked_until DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Create email verification tokens table
    db.run(`CREATE TABLE IF NOT EXISTS email_verifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      token TEXT UNIQUE,
      expires_at DATETIME,
      used BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )`);

    // Create password reset tokens table
    db.run(`CREATE TABLE IF NOT EXISTS password_resets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      token TEXT UNIQUE,
      expires_at DATETIME,
      used BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      description TEXT,
      price REAL,
      category TEXT,
      image TEXT,
      available BOOLEAN DEFAULT 1,
      location TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT,
      message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS cart (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      product_id INTEGER,
      quantity INTEGER DEFAULT 1,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id),
      FOREIGN KEY (product_id) REFERENCES products (id)
    )`);

    // Insert sample products if table is empty
    db.get('SELECT COUNT(*) as count FROM products', [], (err, row) => {
      if (err) {
        console.error('Error checking products:', err);
        return;
      }
      if (row.count === 0) {
        const sampleProducts = [
          ['Luxury SUV', 'Premium SUV perfect for family trips', 5000, 'vehicles', 'Img/Vehicle.jpeg', 'Nairobi'],
          ['Professional Sound System', 'Complete audio setup for events', 3000, 'audio', 'Img/sound3.jpeg', 'Nairobi'],
          ['Construction Tools Set', 'Complete toolkit for construction work', 1500, 'tools', 'Img/House.jpeg', 'Nairobi'],
          ['Mountain Bike', 'High-quality mountain bike for adventures', 2500, 'sports', 'Img/Bike1.jpeg', 'Nairobi'],
          ['Cheetah Print Dress', 'Elegant dress with unique design', 1800, 'fashion', 'Img/Cheetah.jpeg', 'Nairobi']
        ];

        sampleProducts.forEach(product => {
          db.run('INSERT INTO products (name, description, price, category, image, location) VALUES (?, ?, ?, ?, ?, ?)', product);
        });
        console.log('Sample products inserted');
      }
    });
  }
});

// Routes

// Serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// User registration
app.post('/api/register', createAccountLimiter, (req, res) => {
  const { name, email, password, phone, location } = req.body;

  // Validate input
  const validation = validateRegistrationInput(name, email, password, phone, location);
  if (!validation.isValid) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: validation.errors
    });
  }

  // Sanitize inputs
  const sanitizedName = validator.escape(name.trim());
  const sanitizedEmail = email.toLowerCase().trim();
  const sanitizedPhone = phone.trim();
  const sanitizedLocation = validator.escape(location.trim());

  // Check if user already exists
  db.get('SELECT email FROM users WHERE email = ?', [sanitizedEmail], async (err, row) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ message: 'Server error' });
    }
    if (row) {
      return res.status(400).json({ message: 'User already exists' });
    }

    try {
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12); // Increased rounds for better security

      // Generate verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Create new user
      db.run(`INSERT INTO users (name, email, password, phone, location, verification_token, verification_expires)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [sanitizedName, sanitizedEmail, hashedPassword, sanitizedPhone, sanitizedLocation, verificationToken, verificationExpires],
        function(err) {
          if (err) {
            console.error('Registration error:', err);
            return res.status(500).json({ message: 'Server error' });
          }

          const userId = this.lastID;

          // Store verification token in email_verifications table
          db.run(`INSERT INTO email_verifications (user_id, token, expires_at)
            VALUES (?, ?, ?)`, [userId, verificationToken, verificationExpires], async function(tokenErr) {
              if (tokenErr) {
                console.error('Error storing verification token:', tokenErr);
                // Continue anyway, user is created
              }

              // Send verification email
              const emailSent = await sendVerificationEmail(sanitizedEmail, sanitizedName, verificationToken);

              // Log successful registration (without password)
              console.log(`New user registered: ${sanitizedEmail} at ${new Date().toISOString()}`);

              res.status(201).json({
                message: 'User registered successfully. Please check your email for verification instructions.',
                userId: userId,
                emailSent: emailSent
              });
            });
        });
    } catch (hashError) {
      console.error('Password hashing error:', hashError);
      res.status(500).json({ message: 'Server error' });
    }
  });
});

// User login
app.post('/api/login', loginLimiter, (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  // Find user
  db.get('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()], async (err, user) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ message: 'Server error' });
    }
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check if account is locked
    if (isAccountLocked(user.locked_until)) {
      const remainingTime = Math.ceil((new Date(user.locked_until) - new Date()) / (1000 * 60));
      return res.status(423).json({
        message: `Account is temporarily locked due to too many failed login attempts. Try again in ${remainingTime} minutes.`
      });
    }

    // Check if email is verified
    if (!user.email_verified) {
      return res.status(403).json({
        message: 'Please verify your email address before logging in. Check your email for verification instructions.'
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      // Increment failed login attempts
      const newAttempts = (user.login_attempts || 0) + 1;
      const lockoutDuration = calculateLockoutDuration(newAttempts);
      const lockedUntil = lockoutDuration > 0 ? new Date(Date.now() + lockoutDuration) : null;

      // Update login attempts and lockout status
      db.run(`UPDATE users SET login_attempts = ?, locked_until = ?, updated_at = datetime('now')
        WHERE id = ?`, [newAttempts, lockedUntil, user.id], function(updateErr) {
          if (updateErr) {
            console.error('Error updating login attempts:', updateErr);
          }

          if (lockoutDuration > 0) {
            const lockTime = lockoutDuration >= 60 * 60 * 1000 ? '1 hour' : '15 minutes';
            console.log(`Account locked for user ${user.email} for ${lockTime}`);
          }
        });

      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Successful login - reset login attempts
    if (user.login_attempts > 0) {
      db.run(`UPDATE users SET login_attempts = 0, locked_until = NULL, updated_at = datetime('now')
        WHERE id = ?`, [user.id], function(resetErr) {
          if (resetErr) {
            console.error('Error resetting login attempts:', resetErr);
          }
        });
    }

    // Regenerate session for security
    req.session.regenerate((err) => {
      if (err) {
        console.error('Session regeneration error:', err);
        return res.status(500).json({ message: 'Server error' });
      }

      // Create JWT token
      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'hire-me-secret-key', { expiresIn: '1h' });

      req.session.userId = user.id;
      req.session.userEmail = user.email;
      console.log(`Successful login for user: ${user.email} at ${new Date().toISOString()}`);

      res.json({
        message: 'Login successful',
        token,
        user: {
          name: user.name,
          email: user.email,
          emailVerified: user.email_verified
        }
      });
    });
  });
});

// Get products
app.get('/api/products', (req, res) => {
  db.all('SELECT * FROM products WHERE available = 1', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ message: 'Server error' });
    }
    res.json(rows);
  });
});

// Get products by category
app.get('/api/products/category/:category', (req, res) => {
  const category = req.params.category;
  db.all('SELECT * FROM products WHERE category = ? AND available = 1', [category], (err, rows) => {
    if (err) {
      return res.status(500).json({ message: 'Server error' });
    }
    res.json(rows);
  });
});

// Add product (for admin)
app.post('/api/products', (req, res) => {
  const { name, description, price, category, image, location } = req.body;
  db.run('INSERT INTO products (name, description, price, category, image, location) VALUES (?, ?, ?, ?, ?, ?)',
    [name, description, price, category, image, location], function(err) {
      if (err) {
        return res.status(500).json({ message: 'Server error' });
      }
      res.status(201).json({ id: this.lastID, name, description, price, category, image, location });
    });
});

// Contact form submission
app.post('/api/contact', (req, res) => {
  const { name, email, message } = req.body;
  db.run('INSERT INTO contacts (name, email, message) VALUES (?, ?, ?)',
    [name, email, message], function(err) {
      if (err) {
        return res.status(500).json({ message: 'Server error' });
      }
      res.status(201).json({ message: 'Message sent successfully' });
    });
});

// Cart functionality
app.post('/api/cart/add', requireAuth, (req, res) => {

  const { productId, quantity = 1 } = req.body;
  const userId = req.session.userId;

  // Check if item already in cart
  db.get('SELECT * FROM cart WHERE user_id = ? AND product_id = ?', [userId, productId], (err, row) => {
    if (err) {
      return res.status(500).json({ message: 'Server error' });
    }

    if (row) {
      // Update quantity
      db.run('UPDATE cart SET quantity = quantity + ? WHERE user_id = ? AND product_id = ?',
        [quantity, userId, productId], function(err) {
          if (err) {
            return res.status(500).json({ message: 'Server error' });
          }
          res.json({ message: 'Item quantity updated in cart' });
        });
    } else {
      // Add new item
      db.run('INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)',
        [userId, productId, quantity], function(err) {
          if (err) {
            return res.status(500).json({ message: 'Server error' });
          }
          res.json({ message: 'Item added to cart' });
        });
    }
  });
});

app.get('/api/cart', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: 'Please login to view cart' });
  }

  const userId = req.session.userId;
  const query = `
    SELECT c.id, c.quantity, p.name, p.description, p.price, p.image, p.location
    FROM cart c
    JOIN products p ON c.product_id = p.id
    WHERE c.user_id = ?
  `;

  db.all(query, [userId], (err, rows) => {
    if (err) {
      return res.status(500).json({ message: 'Server error' });
    }
    res.json(rows);
  });
});

// Remove item from cart
app.delete('/api/cart/:id', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: 'Please login to remove items from cart' });
  }

  const cartId = req.params.id;
  const userId = req.session.userId;

  db.run('DELETE FROM cart WHERE id = ? AND user_id = ?', [cartId, userId], function(err) {
    if (err) {
      return res.status(500).json({ message: 'Server error' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ message: 'Item not found in cart' });
    }
    res.json({ message: 'Item removed from cart' });
  });
});

// Get user profile
app.get('/api/profile', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: 'Please login to view profile' });
  }

  const userId = req.session.userId;
  db.get('SELECT id, name, email, phone, location, created_at FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) {
      return res.status(500).json({ message: 'Server error' });
    }
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  });
});

// Logout
app.post('/api/logout', (req, res) => {
  const userEmail = req.session.userEmail;

  req.session.destroy((err) => {
    if (err) {
      console.error('Session destruction error:', err);
      return res.status(500).json({ message: 'Server error' });
    }

    console.log(`User logged out: ${userEmail} at ${new Date().toISOString()}`);
    res.json({ message: 'Logged out successfully' });
  });
});

// Email verification
app.get('/api/verify-email', async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ message: 'Verification token is required' });
  }

  try {
    // Find the verification token
    db.get(`SELECT ev.*, u.name, u.email FROM email_verifications ev
      JOIN users u ON ev.user_id = u.id
      WHERE ev.token = ? AND ev.used = 0 AND ev.expires_at > datetime('now')`,
      [token], (err, row) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ message: 'Server error' });
        }

        if (!row) {
          return res.status(400).json({
            message: 'Invalid or expired verification token'
          });
        }

        // Mark email as verified
        db.run(`UPDATE users SET email_verified = 1, verification_token = NULL, verification_expires = NULL
          WHERE id = ?`, [row.user_id], function(updateErr) {
            if (updateErr) {
              console.error('Error updating user verification status:', updateErr);
              return res.status(500).json({ message: 'Server error' });
            }

            // Mark token as used
            db.run(`UPDATE email_verifications SET used = 1 WHERE id = ?`,
              [row.id], function(tokenErr) {
                if (tokenErr) {
                  console.error('Error updating token status:', tokenErr);
                }

                console.log(`Email verified for user: ${row.email}`);
                res.json({
                  message: 'Email verified successfully! You can now login to your account.',
                  verified: true
                });
              });
          });
      });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Request password reset
app.post('/api/forgot-password', passwordResetLimiter, (req, res) => {
  const { email } = req.body;

  if (!email || !validator.isEmail(email)) {
    return res.status(400).json({ message: 'Please provide a valid email address' });
  }

  try {
    // Find user by email
    db.get('SELECT id, name, email FROM users WHERE email = ?', [email.toLowerCase().trim()], async (err, user) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ message: 'Server error' });
      }

      if (!user) {
        // Don't reveal if email exists or not for security
        return res.json({
          message: 'If an account with that email exists, a password reset link has been sent.'
        });
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Store reset token
      db.run(`INSERT INTO password_resets (user_id, token, expires_at)
        VALUES (?, ?, ?)`, [user.id, resetToken, resetExpires], async function(tokenErr) {
          if (tokenErr) {
            console.error('Error storing reset token:', tokenErr);
            return res.status(500).json({ message: 'Server error' });
          }

          // Send password reset email
          const emailSent = await sendPasswordResetEmail(user.email, user.name, resetToken);

          if (emailSent) {
            console.log(`Password reset email sent to: ${user.email}`);
            res.json({
              message: 'If an account with that email exists, a password reset link has been sent.'
            });
          } else {
            res.status(500).json({ message: 'Error sending email. Please try again later.' });
          }
        });
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reset password with token
app.post('/api/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token) {
    return res.status(400).json({ message: 'Reset token is required' });
  }

  // Validate new password
  const passwordValidation = validatePasswordStrength(newPassword);
  if (!passwordValidation.isValid) {
    return res.status(400).json({
      message: 'Password does not meet security requirements',
      errors: passwordValidation.errors
    });
  }

  try {
    // Find valid reset token
    db.get(`SELECT pr.*, u.id as user_id, u.email FROM password_resets pr
      JOIN users u ON pr.user_id = u.id
      WHERE pr.token = ? AND pr.used = 0 AND pr.expires_at > datetime('now')`,
      [token], async (err, row) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ message: 'Server error' });
        }

        if (!row) {
          return res.status(400).json({
            message: 'Invalid or expired reset token'
          });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        // Update user password and clear reset tokens
        db.run(`UPDATE users SET password = ?, password_reset_token = NULL, password_reset_expires = NULL,
          updated_at = datetime('now') WHERE id = ?`, [hashedPassword, row.user_id], function(updateErr) {
            if (updateErr) {
              console.error('Error updating password:', updateErr);
              return res.status(500).json({ message: 'Server error' });
            }

            // Mark reset token as used
            db.run(`UPDATE password_resets SET used = 1 WHERE id = ?`,
              [row.id], function(tokenErr) {
                if (tokenErr) {
                  console.error('Error updating reset token status:', tokenErr);
                }

                console.log(`Password reset successful for user: ${row.email}`);
                res.json({
                  message: 'Password reset successfully! You can now login with your new password.'
                });
              });
          });
      });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});