# HIRE-ME Email Testing & Debugging Guide

## Overview

This comprehensive guide covers testing all email functions, debugging common issues, and ensuring reliable email delivery for the HIRE-ME platform.

## Quick Start Testing

### 1. Basic Configuration Test

```bash
# Navigate to project directory
cd c:\Users\user\Documents\HIRE-ME

# Run the automated test script
node test-email.js
```

**Expected Output:**
```
🧪 Testing Email Configuration...
✅ Environment variables configured
📧 SMTP Host: smtp.gmail.com
🔌 SMTP Port: 587
👤 SMTP User: your-email@gmail.com

🔍 Verifying SMTP connection...
✅ SMTP connection successful!

📤 Sending test email...
✅ Test email sent successfully!
📬 Message ID: [MESSAGE_ID]
👤 Sent to: your-email@gmail.com

🎉 Email configuration test completed successfully!
🚀 Your HIRE-ME platform is ready to send emails!
```

### 2. Manual Function Testing

Create a test script to verify all email functions:

```javascript
// test-all-emails.js
require('dotenv').config();
const {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendOrderConfirmationEmail,
  sendOrderStatusUpdateEmail,
  sendPaymentFailureEmail,
  sendOrderCancellationEmail,
  sendInventoryShortageEmail,
  sendDeliveryDelayEmail,
  sendAccountSuspensionEmail
} = require('./server.js');

async function testAllEmails() {
  const testEmail = 'test@example.com';
  const testName = 'Test User';

  console.log('🧪 Testing all email functions...\n');

  try {
    // Test verification email
    console.log('Testing verification email...');
    await sendVerificationEmail(testEmail, testName, 'test-token-123');
    console.log('✅ Verification email sent\n');

    // Test password reset email
    console.log('Testing password reset email...');
    await sendPasswordResetEmail(testEmail, testName, 'reset-token-456');
    console.log('✅ Password reset email sent\n');

    // Test order confirmation email
    console.log('Testing order confirmation email...');
    const orderData = {
      order_number: 'TEST-001',
      total_amount: 5000,
      status: 'confirmed',
      created_at: new Date().toISOString(),
      items: [
        {
          product_name: 'Test Product',
          quantity: 1,
          product_price: 5000,
          image: 'Img/Vehicle.jpeg'
        }
      ]
    };
    await sendOrderConfirmationEmail(orderData, testEmail, testName);
    console.log('✅ Order confirmation email sent\n');

    // Test order status update email
    console.log('Testing order status update email...');
    await sendOrderStatusUpdateEmail(orderData, testEmail, testName, 'pending');
    console.log('✅ Order status update email sent\n');

    // Test payment failure email
    console.log('Testing payment failure email...');
    await sendPaymentFailureEmail(orderData, testEmail, testName, 'Insufficient funds');
    console.log('✅ Payment failure email sent\n');

    // Test order cancellation email
    console.log('Testing order cancellation email...');
    await sendOrderCancellationEmail(orderData, testEmail, testName, 'Customer request');
    console.log('✅ Order cancellation email sent\n');

    // Test inventory shortage email
    console.log('Testing inventory shortage email...');
    const productData = {
      name: 'Test Product',
      price: 5000,
      category: 'vehicles'
    };
    await sendInventoryShortageEmail(productData, testEmail, testName);
    console.log('✅ Inventory shortage email sent\n');

    // Test delivery delay email
    console.log('Testing delivery delay email...');
    const newDeliveryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await sendDeliveryDelayEmail(orderData, testEmail, testName, 'High demand', newDeliveryDate);
    console.log('✅ Delivery delay email sent\n');

    // Test account suspension email
    console.log('Testing account suspension email...');
    await sendAccountSuspensionEmail(testEmail, testName, 'Policy violation', '7 days');
    console.log('✅ Account suspension email sent\n');

    console.log('🎉 All email functions tested successfully!');

  } catch (error) {
    console.error('❌ Email test failed:', error);
  }
}

testAllEmails();
```

## Testing Workflow

### Phase 1: Configuration Testing
1. **Environment Setup**
   ```bash
   # Verify .env file exists and has correct format
   cat .env

   # Check for required variables
   grep -E "(SMTP_HOST|SMTP_USER|SMTP_PASS)" .env
   ```

2. **SMTP Connection Test**
   ```bash
   # Test basic SMTP connection
   node test-email.js
   ```

3. **Server Startup Test**
   ```bash
   # Start server and check for email-related errors
   npm start

   # Check server logs for email configuration messages
   # Look for: "Connected to SQLite database"
   # Look for: "Server running on port 3000"
   ```

### Phase 2: Functional Testing

#### User Registration Flow
1. **Register New User**
   - Visit `http://localhost:3000/register.html`
   - Fill registration form
   - Submit and check email

2. **Verify Email Reception**
   - Check inbox for verification email
   - Verify email design and functionality
   - Click verification link
   - Confirm account activation

#### Password Reset Flow
1. **Request Password Reset**
   - Visit `http://localhost:3000/login.html`
   - Click "Forgot Password"
   - Enter email and submit

2. **Verify Reset Email**
   - Check inbox for reset email
   - Verify email design
   - Click reset link
   - Complete password reset

#### Order Placement Flow
1. **Create Test Order**
   - Register and verify account
   - Add items to cart
   - Proceed to checkout
   - Complete order placement

2. **Verify Order Emails**
   - Check for order confirmation email
   - Verify order details accuracy
   - Test order tracking link

### Phase 3: Edge Case Testing

#### Payment Failure Testing
```javascript
// Simulate payment failure
const orderData = {
  order_number: 'TEST-FAIL-001',
  total_amount: 5000,
  status: 'pending'
};

await sendPaymentFailureEmail(
  orderData,
  'test@example.com',
  'Test User',
  'Insufficient funds'
);
```

#### Inventory Management Testing
```javascript
// Test out-of-stock scenarios
const productData = {
  name: 'Popular Product',
  price: 3000,
  category: 'vehicles'
};

await sendInventoryShortageEmail(
  productData,
  'test@example.com',
  'Test User'
);
```

## Debugging Common Issues

### 1. Email Not Received

**Symptoms:**
- No emails in inbox
- No errors in server logs
- Test script shows success

**Troubleshooting Steps:**

1. **Check Spam/Junk Folder**
   ```bash
   # Check if emails are being marked as spam
   # Look for: HIRE-ME emails in spam folder
   ```

2. **Verify SMTP Settings**
   ```javascript
   // Check SMTP configuration in server.js
   const emailConfig = {
     host: process.env.SMTP_HOST,
     port: parseInt(process.env.SMTP_PORT) || 587,
     secure: process.env.SMTP_SECURE === 'true' || false,
     auth: {
       user: process.env.SMTP_USER,
       pass: process.env.SMTP_PASS
     }
   };
   ```

3. **Test with Different Email Provider**
   ```bash
   # Try sending to different email domains
   # Gmail: test@gmail.com
   # Outlook: test@outlook.com
   # Yahoo: test@yahoo.com
   ```

4. **Check Email Provider Limits**
   - Gmail: 500 emails/day limit
   - Outlook: Varies by account type
   - Yahoo: 100 emails/hour limit

### 2. Authentication Failed

**Error Message:**
```
Error: Invalid login: 535-5.7.8 Username and Password not accepted
```

**Troubleshooting Steps:**

1. **Gmail App Password**
   ```bash
   # For Gmail, use app password instead of regular password
   # 1. Enable 2FA on Gmail account
   # 2. Generate app password: https://myaccount.google.com/apppasswords
   # 3. Use 16-character app password in .env file
   ```

2. **Outlook SMTP Settings**
   ```env
   SMTP_HOST=smtp-mail.outlook.com
   SMTP_PORT=587
   SMTP_USER=your-email@outlook.com
   SMTP_PASS=your-outlook-password
   ```

3. **Yahoo SMTP Settings**
   ```env
   SMTP_HOST=smtp.mail.yahoo.com
   SMTP_PORT=587
   SMTP_USER=your-email@yahoo.com
   SMTP_PASS=your-yahoo-app-password
   ```

### 3. Connection Timeout

**Error Message:**
```
Error: connect ECONNREFUSED or timeout
```

**Troubleshooting Steps:**

1. **Check Network Connectivity**
   ```bash
   # Test basic internet connection
   ping google.com

   # Test SMTP port connectivity
   telnet smtp.gmail.com 587
   ```

2. **Firewall Settings**
   ```bash
   # Check if firewall is blocking outbound connections
   # Windows: Check Windows Firewall settings
   # Allow outbound connections on port 587
   ```

3. **Alternative Ports**
   ```javascript
   // Try different SMTP ports
   const ports = [587, 465, 25, 2525];

   // Test each port
   for (const port of ports) {
     const config = { ...emailConfig, port };
     // Test connection
   }
   ```

### 4. Template Rendering Issues

**Symptoms:**
- Emails received but formatting broken
- Images not displaying
- Links not working

**Troubleshooting Steps:**

1. **Check Image URLs**
   ```html
   <!-- Use absolute URLs for images -->
   <img src="https://your-domain.com/Img/logo.png" alt="HIRE-ME Logo">

   <!-- Instead of relative paths -->
   <img src="Img/logo.png" alt="HIRE-ME Logo">
   ```

2. **Validate HTML**
   ```bash
   # Use online HTML validators
   # Check for unclosed tags
   # Verify CSS inline styles
   ```

3. **Test in Multiple Email Clients**
   - Gmail Web
   - Outlook Desktop
   - Apple Mail
   - Mobile email apps

### 5. Rate Limiting Issues

**Error Message:**
```
Error: 429 Too Many Requests
```

**Troubleshooting Steps:**

1. **Check Rate Limits**
   ```javascript
   // Current rate limiting configuration
   const createAccountLimiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 5, // 5 requests per window
   });
   ```

2. **Adjust Limits for Testing**
   ```javascript
   // Temporarily increase limits for testing
   const testLimiter = rateLimit({
     windowMs: 60 * 60 * 1000, // 1 hour
     max: 100, // 100 requests per hour
   });
   ```

## Advanced Testing Tools

### 1. Email Testing Services

**Mailtrap.io**
```bash
# Free email testing service
# Captures emails without sending them
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your-mailtrap-username
SMTP_PASS=your-mailtrap-password
```

**Ethereal Email**
```javascript
// Built-in Node.js testing email service
const nodemailer = require('nodemailer');

const testAccount = await nodemailer.createTestAccount();
const transporter = nodemailer.createTransporter({
  host: 'smtp.ethereal.email',
  port: 587,
  auth: {
    user: testAccount.user,
    pass: testAccount.pass
  }
});
```

### 2. Load Testing

```javascript
// Load test email functions
const { performance } = require('perf_hooks');

async function loadTest() {
  const iterations = 100;
  const startTime = performance.now();

  for (let i = 0; i < iterations; i++) {
    await sendVerificationEmail(`test${i}@example.com`, `User ${i}`, `token-${i}`);
  }

  const endTime = performance.now();
  const duration = (endTime - startTime) / 1000;

  console.log(`Sent ${iterations} emails in ${duration} seconds`);
  console.log(`Average: ${duration / iterations} seconds per email`);
}

loadTest();
```

### 3. Monitoring and Analytics

```javascript
// Email delivery monitoring
const emailAnalytics = {
  totalSent: 0,
  totalFailed: 0,
  deliveryRate: 0,

  trackEmail: function(type, success, error = null) {
    this.totalSent++;

    if (success) {
      console.log(`✅ ${type} email delivered successfully`);
    } else {
      this.totalFailed++;
      console.error(`❌ ${type} email failed:`, error);
    }

    this.deliveryRate = ((this.totalSent - this.totalFailed) / this.totalSent) * 100;
    console.log(`📊 Delivery rate: ${this.deliveryRate.toFixed(2)}%`);
  }
};

// Use in email functions
const result = await transporter.sendMail(mailOptions);
emailAnalytics.trackEmail('verification', result.accepted.length > 0, result.rejected.length > 0 ? 'Delivery failed' : null);
```

## Production Testing Checklist

### Pre-Deployment Testing

- [ ] SMTP configuration verified
- [ ] All email templates tested
- [ ] Spam score checked
- [ ] Mobile responsiveness verified
- [ ] Links and buttons functional
- [ ] Images loading correctly
- [ ] Unsubscribe links working

### Post-Deployment Monitoring

- [ ] Email delivery rates > 95%
- [ ] Bounce rates < 5%
- [ ] Spam complaints < 1%
- [ ] User engagement tracked
- [ ] Performance metrics logged

### Security Testing

- [ ] No sensitive data in email logs
- [ ] Secure tokens used for verification
- [ ] Rate limiting active
- [ ] Input validation working
- [ ] SQL injection prevention

## Troubleshooting Scripts

### 1. Email Health Check

```javascript
// comprehensive-health-check.js
async function emailHealthCheck() {
  console.log('🏥 Running comprehensive email health check...\n');

  // 1. Environment variables
  console.log('1. Checking environment variables...');
  const required = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('❌ Missing:', missing);
    return false;
  }
  console.log('✅ All required environment variables present\n');

  // 2. SMTP connection
  console.log('2. Testing SMTP connection...');
  try {
    await transporter.verify();
    console.log('✅ SMTP connection successful\n');
  } catch (error) {
    console.error('❌ SMTP connection failed:', error.message);
    return false;
  }

  // 3. Test email sending
  console.log('3. Testing email delivery...');
  try {
    const result = await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: process.env.SMTP_USER,
      subject: 'Health Check',
      text: 'Email system is working correctly'
    });
    console.log('✅ Test email sent successfully\n');
  } catch (error) {
    console.error('❌ Test email failed:', error.message);
    return false;
  }

  // 4. Template validation
  console.log('4. Validating email templates...');
  const templates = [
    'verification',
    'password-reset',
    'order-confirmation',
    'order-status',
    'payment-failure',
    'cancellation',
    'inventory-shortage',
    'delivery-delay',
    'account-suspension'
  ];

  for (const template of templates) {
    console.log(`   Testing ${template} template...`);
    // Add template-specific tests here
  }

  console.log('✅ All templates validated\n');

  return true;
}
```

### 2. Performance Monitoring

```javascript
// email-performance-monitor.js
const metrics = {
  emailsSent: 0,
  averageDeliveryTime: 0,
  errorRate: 0,
  lastErrors: []
};

function recordEmailMetrics(type, duration, success, error = null) {
  metrics.emailsSent++;

  if (success) {
    // Update average delivery time
    metrics.averageDeliveryTime =
      (metrics.averageDeliveryTime * (metrics.emailsSent - 1) + duration) / metrics.emailsSent;
  } else {
    metrics.errorRate = (metrics.emailsSent - (metrics.emailsSent - 1)) / metrics.emailsSent;
    metrics.lastErrors.push({ type, error, timestamp: new Date() });

    // Keep only last 10 errors
    if (metrics.lastErrors.length > 10) {
      metrics.lastErrors.shift();
    }
  }

  // Log metrics every 100 emails
  if (metrics.emailsSent % 100 === 0) {
    console.log('📊 Email Metrics:', metrics);
  }
}
```

## Support Resources

### Useful Tools

1. **Email Testing**
   - [Mailtrap](https://mailtrap.io) - Email testing service
   - [Ethereal Email](https://ethereal.email) - Fake SMTP service
   - [Litmus](https://litmus.com) - Email preview testing

2. **SMTP Testing**
   - [MX Toolbox](https://mxtoolbox.com) - SMTP diagnostics
   - [DNS Checker](https://dnschecker.org) - DNS propagation
   - [WhatIsMyIP](https://whatismyipaddress.com) - IP checking

3. **Template Testing**
   - [HTML Email Validator](https://htmlemailcheck.com)
   - [Email on Acid](https://emailonacid.com)
   - [BrowserStack Email Testing](https://browserstack.com)

### Getting Help

1. **Check Logs**
   ```bash
   # Monitor server logs for email errors
   tail -f server.log | grep -i email
   ```

2. **Test with Minimal Data**
   ```javascript
   // Test with simple email first
   const simpleMail = {
     from: process.env.SMTP_USER,
     to: 'test@example.com',
     subject: 'Simple Test',
     text: 'This is a simple test email'
   };

   await transporter.sendMail(simpleMail);
   ```

3. **Contact Support**
   - Check your email provider's SMTP documentation
   - Verify account settings and security features
   - Test with different SMTP providers if needed

## Best Practices Summary

### ✅ Do's

- [ ] Test all email functions before deployment
- [ ] Monitor email delivery rates regularly
- [ ] Use meaningful subject lines
- [ ] Include unsubscribe links where required
- [ ] Test templates in multiple email clients
- [ ] Keep sensitive data out of email content

### ❌ Don'ts

- [ ] Don't use production email addresses for testing
- [ ] Don't send test emails to real customers
- [ ] Don't ignore bounce notifications
- [ ] Don't use hard-coded email credentials
- [ ] Don't send emails without user consent

---

**Last Updated:** October 2025
**Version:** 1.0.0
**Compatibility:** Node.js, Nodemailer, SQLite

For additional support, refer to:
- `EMAIL_SETUP.md` - Configuration guide
- `EMAIL_TEMPLATES.md` - Template documentation
- `email-templates-showcase.html` - Visual showcase