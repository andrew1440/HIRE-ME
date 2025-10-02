# HIRE-ME System Architecture Documentation

## System Overview

HIRE-ME is a full-stack equipment and service rental platform built with Node.js, Express.js, and SQLite. The application provides a complete rental marketplace where users can browse, rent equipment, and manage their orders across multiple categories including vehicles, audio equipment, tools, and more.

## Technology Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js v5.1.0
- **Database**: SQLite3 with better-sqlite3
- **Authentication**: JWT (jsonwebtoken) + bcryptjs for password hashing
- **Session Management**: express-session
- **CORS**: cors middleware for cross-origin requests

### Frontend
- **HTML5**: Semantic markup with responsive design
- **CSS**: Bootstrap 5.3.0 + custom styles
- **JavaScript**: Vanilla ES6+ JavaScript
- **Icons**: Font Awesome 6.4.0
- **Typography**: Inter font family

### Development Dependencies
- **bcryptjs**: Password hashing (v3.0.2)
- **body-parser**: Request body parsing (v2.2.0)
- **cors**: Cross-origin resource sharing (v2.8.5)

## System Architecture

### High-Level Architecture
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Client-side   │    │   Express.js     │    │   SQLite        │
│   HTML/CSS/JS   │◄──►│   Server         │◄──►│   Database      │
│                 │    │                  │    │                 │
│ • index.html    │    │ • Authentication │    │ • users         │
│ • login.html    │    │ • Product API    │    │ • products      │
│ • register.html │    │ • Cart API       │    │ • contacts      │
│ • orders.html   │    │ • Contact API    │    │ • cart          │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Database Schema

#### Users Table
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  email TEXT UNIQUE,
  password TEXT,
  phone TEXT,
  location TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

#### Products Table
```sql
CREATE TABLE products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  description TEXT,
  price REAL,
  category TEXT,
  image TEXT,
  available BOOLEAN DEFAULT 1,
  location TEXT
)
```

#### Cart Table
```sql
CREATE TABLE cart (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  product_id INTEGER,
  quantity INTEGER DEFAULT 1,
  added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id),
  FOREIGN KEY (product_id) REFERENCES products (id)
)
```

#### Contacts Table
```sql
CREATE TABLE contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  email TEXT,
  message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

## API Endpoints

### Authentication Routes
- `POST /api/register` - User registration
- `POST /api/login` - User login
- `POST /api/logout` - User logout
- `GET /api/profile` - Get user profile (protected)

### Product Routes
- `GET /api/products` - Get all available products
- `GET /api/products/category/:category` - Get products by category
- `POST /api/products` - Add new product (admin)

### Cart Routes
- `POST /api/cart/add` - Add item to cart (protected)
- `GET /api/cart` - Get user's cart items (protected)
- `DELETE /api/cart/:id` - Remove item from cart (protected)

### Contact Routes
- `POST /api/contact` - Submit contact form

## User Journey Flows

### 1. Guest User Journey
```
Guest User → Landing Page → Browse Products → Login/Register → Authenticated User
```

### 2. Registration Flow
```
Visit /register.html → Fill Form → Submit → API Call → Database → Success → Redirect to Login
    ↓
Validation → Password Hash → JWT Token → Session → Response
```

### 3. Login Flow
```
Visit /login.html → Enter Credentials → Submit → API Call → Verify Password → Success → Redirect
    ↓
Email/Password → Database Query → bcrypt.compare() → JWT Token → Session → index.html
```

### 4. Product Browsing Flow
```
User → Category Selection → API Call → Product List → Display → Add to Cart
    ↓
GET /api/products/category/:category → JSON Response → Render HTML → POST /api/cart/add
```

### 5. Cart Management Flow
```
View Cart → Modify Quantities → Remove Items → Checkout → Order Confirmation
    ↓
GET /api/cart → Update/Delete → POST Order → Email Confirmation → Order History
```

## Security Implementation

### Authentication Security
- **Password Hashing**: bcryptjs with salt rounds of 10
- **JWT Tokens**: Used for API authentication with 1-hour expiration
- **Session Management**: Server-side sessions with secure cookie settings
- **Input Validation**: Basic validation on registration/login forms

### API Security
- **CORS Configuration**: Properly configured for cross-origin requests
- **Session-based Authorization**: Cart and profile endpoints require active session
- **Input Sanitization**: Basic sanitization of user inputs

## File Structure

```
HIRE-ME/
├── server.js              # Main Express server
├── package.json           # Dependencies and scripts
├── index.html             # Main landing page
├── login.html             # Login page
├── register.html          # Registration page
├── orders.html            # Order history page
├── checkout.html          # Checkout process
├── confirmation.html      # Order confirmation
├── scripts.js             # Client-side JavaScript
├── styles.css             # Custom CSS styles
├── hire-me.db             # SQLite database
├── Img/                   # Image assets
│   ├── Vehicle.jpeg
│   ├── sound3.jpeg
│   ├── House.jpeg
│   └── ...
└── README.md              # Documentation
```

## Deployment Architecture

### Development Environment
- **Local Server**: Node.js development server on port 3000
- **Database**: Local SQLite file (hire-me.db)
- **Static Files**: Served directly by Express server

### Production Considerations
- **HTTPS**: SSL/TLS encryption for secure communication
- **Environment Variables**: Secure storage of JWT secrets
- **Database**: Consider PostgreSQL for production scalability
- **Static File Serving**: Use CDN or reverse proxy for better performance

## Scalability Considerations

### Current Limitations
- SQLite database may not scale well for high traffic
- File-based image storage not suitable for production
- No caching layer implemented
- Single server deployment

### Recommended Improvements
- **Database**: Migrate to PostgreSQL for better concurrency
- **Image Storage**: Use cloud storage (AWS S3, Cloudinary)
- **Caching**: Implement Redis for session storage and API caching
- **Load Balancing**: Add horizontal scaling capability
- **CDN**: Use CDN for static asset delivery

## Performance Optimizations

### Current Features
- **Responsive Design**: Mobile-first approach with Bootstrap
- **Client-side Rendering**: Fast initial page loads
- **Database Indexing**: Primary keys on all tables
- **Session Management**: Efficient server-side sessions

### Potential Enhancements
- **Image Optimization**: Implement lazy loading and compression
- **API Response Caching**: Cache frequently accessed data
- **Database Query Optimization**: Add indexes on frequently queried columns
- **Frontend Bundling**: Minify CSS and JavaScript files

## Error Handling

### Current Implementation
- **Database Errors**: Basic error logging and user-friendly messages
- **API Errors**: Proper HTTP status codes and error messages
- **Client-side Errors**: Form validation and user feedback
- **Server Errors**: Generic error responses to prevent information leakage

### Monitoring Recommendations
- **Logging**: Implement structured logging with Winston
- **Error Tracking**: Add error tracking service (Sentry)
- **Health Checks**: API endpoints for monitoring server health
- **Performance Monitoring**: Track response times and database queries

This architecture provides a solid foundation for an equipment rental platform with room for growth and enhancement.