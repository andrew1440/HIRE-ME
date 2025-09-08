const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const session = require('express-session');
const path = require('path');
const util = require('util');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: 'hire-me-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Set to true in production with HTTPS
}));

// Serve static files
app.use(express.static(path.join(__dirname)));

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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
app.post('/api/register', (req, res) => {
  const { name, email, password, phone, location } = req.body;

  // Check if user already exists
  db.get('SELECT email FROM users WHERE email = ?', [email], async (err, row) => {
    if (err) {
      return res.status(500).json({ message: 'Server error' });
    }
    if (row) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    db.run('INSERT INTO users (name, email, password, phone, location) VALUES (?, ?, ?, ?, ?)',
      [name, email, hashedPassword, phone, location], function(err) {
        if (err) {
          return res.status(500).json({ message: 'Server error' });
        }
        res.status(201).json({ message: 'User registered successfully' });
      });
  });
});

// User login
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  // Find user
  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err) {
      return res.status(500).json({ message: 'Server error' });
    }
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Create JWT token
    const token = jwt.sign({ userId: user.id }, 'hire-me-secret-key', { expiresIn: '1h' });

    req.session.userId = user.id;
    res.json({ message: 'Login successful', token, user: { name: user.name, email: user.email } });
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
app.post('/api/cart/add', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: 'Please login to add items to cart' });
  }

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
  req.session.destroy();
  res.json({ message: 'Logged out successfully' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});