# HIRE-ME Email Templates Documentation

## Overview

The HIRE-ME platform includes a comprehensive email notification system with beautiful, responsive HTML templates. All templates are designed with modern UI principles and include proper branding.

## Template Categories

### 1. Account Management Templates

#### Account Verification Email
**Function:** `sendVerificationEmail(email, name, verificationToken)`

**Trigger:** User registration completion

**Purpose:** Verify user email address and activate account

**Features:**
- Professional welcome message
- One-click verification button
- Fallback text link for accessibility
- 24-hour expiration notice
- Security notice for non-registered users

**Template Preview:**
```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="margin: 0; font-size: 28px;"><i class="fas fa-tools"></i> HIRE-ME</h1>
    <p style="margin: 10px 0 0 0;">Equipment & Service Rental Platform</p>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px;">
    <h2 style="color: #1f2937; margin-bottom: 20px;">Welcome, [User Name]!</h2>

    <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
      Thank you for registering with HIRE-ME! To complete your registration and start renting equipment, please verify your email address.
    </p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="[VERIFICATION_URL]" style="background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
        Verify Email Address
      </a>
    </div>

    <p style="color: #6b7280; font-size: 14px; margin-bottom: 20px;">
      If the button doesn't work, you can also copy and paste this link into your browser:
    </p>

    <p style="background: #f3f4f6; padding: 15px; border-radius: 5px; word-break: break-all; font-size: 14px; color: #374151;">
      [VERIFICATION_URL]
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
```

#### Password Reset Email
**Function:** `sendPasswordResetEmail(email, name, resetToken)`

**Trigger:** User requests password reset

**Purpose:** Allow users to securely reset their password

**Features:**
- Clear password reset instructions
- One-click reset button
- Fallback text link
- 1-hour expiration for security
- Security notice for unauthorized requests

### 2. Order Management Templates

#### Order Confirmation Email
**Function:** `sendOrderConfirmationEmail(orderData, userEmail, userName)`

**Trigger:** Successful order placement

**Purpose:** Confirm order details and provide next steps

**Features:**
- Complete order summary with items
- Order number and date
- Total amount and payment method
- Itemized product list with images
- Payment instructions for M-Pesa
- Order tracking link
- Customer support notice

**Template Preview:**
```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="margin: 0; font-size: 28px;"><i class="fas fa-tools"></i> HIRE-ME</h1>
    <p style="margin: 10px 0 0 0;">Equipment & Service Rental Platform</p>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px;">
    <h2 style="color: #1f2937; margin-bottom: 20px;">Order Confirmed!</h2>

    <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
      Hi [User Name], thank you for your order! We've received your order and are preparing it for shipment.
    </p>

    <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="color: #1f2937; margin-bottom: 15px; font-size: 18px;">Order Details</h3>
      <p><strong>Order Number:</strong> [ORDER_NUMBER]</p>
      <p><strong>Order Date:</strong> [ORDER_DATE]</p>
      <p><strong>Total Amount:</strong> [TOTAL_AMOUNT]</p>
      <p><strong>Payment Method:</strong> [PAYMENT_METHOD]</p>
      <p><strong>Status:</strong> <span style="color: #059669; font-weight: 600;">[STATUS]</span></p>
    </div>

    <h3 style="color: #1f2937; margin-bottom: 15px;">Order Items</h3>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
      <thead>
        <tr style="background: #f3f4f6;">
          <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e5e7eb;">Item</th>
          <th style="padding: 10px; text-align: center; border-bottom: 2px solid #e5e7eb;">Qty</th>
          <th style="padding: 10px; text-align: right; border-bottom: 2px solid #e5e7eb;">Price</th>
          <th style="padding: 10px; text-align: right; border-bottom: 2px solid #e5e7eb;">Total</th>
        </tr>
      </thead>
      <tbody>
        <!-- Dynamic order items -->
        <tr style="background: #f8fafc; font-weight: 600;">
          <td colspan="3" style="padding: 15px; text-align: right;">Total Amount:</td>
          <td style="padding: 15px; text-align: right; color: #2563eb;">[TOTAL_AMOUNT]</td>
        </tr>
      </tbody>
    </table>

    <!-- M-Pesa payment instructions (if applicable) -->
    <div style="background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h4 style="color: #0ea5e9; margin-bottom: 15px;">
        <i class="fas fa-mobile-alt me-2"></i>Complete Your Payment
      </h4>
      <p style="margin-bottom: 10px;"><strong>Pay Bill Number:</strong> 174379</p>
      <p style="margin-bottom: 10px;"><strong>Account Number:</strong> [ORDER_NUMBER]</p>
      <p style="margin-bottom: 0;"><strong>Amount:</strong> [TOTAL_AMOUNT]</p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="[TRACKING_URL]" style="background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
        Track Your Order
      </a>
    </div>
  </div>
</div>
```

#### Order Status Update Email
**Function:** `sendOrderStatusUpdateEmail(orderData, userEmail, userName, oldStatus)`

**Trigger:** Order status changes (confirmed, processing, shipped, delivered)

**Purpose:** Keep customers informed of order progress

**Features:**
- Dynamic status messages based on current status
- Color-coded status indicators
- Order information summary
- Direct link to order details
- Professional status-specific messaging

**Status Types:**
- **Confirmed:** Payment verified, order confirmed
- **Processing:** Order being prepared for shipment
- **Shipped:** Order dispatched for delivery
- **Delivered:** Order successfully delivered

### 3. Additional Email Templates (Recommended)

The following templates are recommended for comprehensive customer communication:

#### Welcome Email (New User Onboarding)
```html
<!-- Template for first-time users -->
<div style="background: #f8fafc; padding: 40px 20px; min-height: 100vh;">
  <div style="max-width: 600px; margin: 0 auto;">
    <div style="background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
      <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 40px; text-align: center;">
        <h1 style="margin: 0; font-size: 32px; font-weight: 700;">Welcome to HIRE-ME!</h1>
        <p style="margin: 15px 0 0 0; font-size: 18px; opacity: 0.9;">Your Equipment Rental Journey Starts Here</p>
      </div>

      <div style="padding: 40px;">
        <h2 style="color: #1f2937; margin-bottom: 25px; text-align: center;">Getting Started Guide</h2>

        <div style="display: grid; gap: 25px;">
          <div style="text-align: center; padding: 25px; background: #f8fafc; border-radius: 8px;">
            <div style="font-size: 48px; margin-bottom: 15px;">🔍</div>
            <h3 style="color: #2563eb; margin-bottom: 10px;">Browse Equipment</h3>
            <p style="color: #6b7280; margin: 0;">Explore our wide range of vehicles, tools, and equipment</p>
          </div>

          <div style="text-align: center; padding: 25px; background: #f8fafc; border-radius: 8px;">
            <div style="font-size: 48px; margin-bottom: 15px;">📋</div>
            <h3 style="color: #2563eb; margin-bottom: 10px;">Place Orders</h3>
            <p style="color: #6b7280; margin: 0;">Add items to cart and checkout with M-Pesa</p>
          </div>

          <div style="text-align: center; padding: 25px; background: #f8fafc; border-radius: 8px;">
            <div style="font-size: 48px; margin-bottom: 15px;">🚚</div>
            <h3 style="color: #2563eb; margin-bottom: 10px;">Track Delivery</h3>
            <p style="color: #6b7280; margin: 0;">Monitor your order status in real-time</p>
          </div>
        </div>

        <div style="text-align: center; margin: 40px 0;">
          <a href="[APP_URL]/products" style="background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 16px;">
            Start Browsing Equipment
          </a>
        </div>
      </div>
    </div>
  </div>
</div>
```

#### Payment Reminder Email
```html
<!-- Template for pending payments -->
<div style="background: #fff7ed; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    <div style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 30px; text-align: center;">
      <h1 style="margin: 0; font-size: 28px;">⏰ Payment Reminder</h1>
      <p style="margin: 10px 0 0 0;">Complete your order payment</p>
    </div>

    <div style="padding: 30px;">
      <h2 style="color: #1f2937; margin-bottom: 20px;">Hi [User Name],</h2>

      <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
        We noticed you have a pending order that needs payment completion. Don't miss out on your reserved equipment!
      </p>

      <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 25px 0;">
        <h3 style="color: #92400e; margin-bottom: 15px;">Order Details</h3>
        <p style="margin-bottom: 8px;"><strong>Order Number:</strong> [ORDER_NUMBER]</p>
        <p style="margin-bottom: 8px;"><strong>Amount Due:</strong> [AMOUNT]</p>
        <p style="margin-bottom: 0;"><strong>Expires:</strong> [EXPIRY_TIME]</p>
      </div>

      <div style="background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; padding: 20px; margin: 25px 0;">
        <h4 style="color: #0ea5e9; margin-bottom: 15px;">💳 Payment Instructions</h4>
        <p style="margin-bottom: 10px;"><strong>Pay Bill:</strong> 174379</p>
        <p style="margin-bottom: 10px;"><strong>Account:</strong> [ORDER_NUMBER]</p>
        <p style="margin-bottom: 0;"><strong>Amount:</strong> [AMOUNT]</p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="[PAYMENT_URL]" style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600;">
          Complete Payment Now
        </a>
      </div>
    </div>
  </div>
</div>
```

#### Promotional Email Template
```html
<!-- Template for marketing campaigns -->
<div style="background: #f8fafc; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    <div style="background: linear-gradient(135deg, #ec4899, #db2777); color: white; padding: 40px; text-align: center;">
      <h1 style="margin: 0; font-size: 32px; font-weight: 700;">🎉 Special Offer!</h1>
      <p style="margin: 15px 0 0 0; font-size: 18px; opacity: 0.9;">Limited Time Discount on Premium Equipment</p>
    </div>

    <div style="padding: 40px;">
      <h2 style="color: #1f2937; margin-bottom: 25px; text-align: center;">Don't Miss Out!</h2>

      <div style="display: grid; gap: 20px; margin-bottom: 30px;">
        <div style="border: 2px solid #e5e7eb; border-radius: 8px; padding: 20px; text-align: center;">
          <div style="font-size: 36px; margin-bottom: 10px;">🚗</div>
          <h3 style="color: #2563eb; margin-bottom: 10px;">Luxury Vehicles</h3>
          <p style="color: #6b7280; margin-bottom: 15px;">Premium SUVs and cars</p>
          <p style="font-size: 24px; font-weight: 700; color: #dc2626; margin: 0;">30% OFF</p>
        </div>

        <div style="border: 2px solid #e5e7eb; border-radius: 8px; padding: 20px; text-align: center;">
          <div style="font-size: 36px; margin-bottom: 10px;">🔧</div>
          <h3 style="color: #2563eb; margin-bottom: 10px;">Professional Tools</h3>
          <p style="color: #6b7280; margin-bottom: 15px;">Construction & workshop equipment</p>
          <p style="font-size: 24px; font-weight: 700; color: #dc2626; margin: 0;">25% OFF</p>
        </div>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="[PROMO_URL]" style="background: linear-gradient(135deg, #ec4899, #db2777); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Shop Now & Save
        </a>
      </div>

      <p style="color: #6b7280; font-size: 14px; text-align: center; margin-top: 30px;">
        *Offer valid while stocks last. Terms and conditions apply.
      </p>
    </div>
  </div>
</div>
```

## Template Customization Guide

### 1. Color Scheme
All templates use a consistent color palette:
- **Primary:** `#2563eb` (Blue)
- **Secondary:** `#1d4ed8` (Dark Blue)
- **Success:** `#10b981` (Green)
- **Warning:** `#f59e0b` (Orange)
- **Danger:** `#dc2626` (Red)

### 2. Typography
- **Font Family:** `Arial, sans-serif` (fallback to system fonts)
- **Headings:** 24-32px, semi-bold weight
- **Body Text:** 14-16px, normal weight
- **Line Height:** 1.6 for optimal readability

### 3. Responsive Design
All templates are mobile-responsive with:
- Maximum width: 600px
- Padding: 20px on mobile, 30px on desktop
- Touch-friendly button sizes (minimum 44px)
- Optimized image sizes

### 4. Accessibility Features
- High contrast ratios for text readability
- Alt text for all images
- Semantic HTML structure
- Keyboard navigation support
- Screen reader friendly content

## Implementation Functions

### Core Email Functions in `server.js`:

```javascript
// Account Management
async function sendVerificationEmail(email, name, verificationToken)
async function sendPasswordResetEmail(email, name, resetToken)

// Order Management
async function sendOrderConfirmationEmail(orderData, userEmail, userName)
async function sendOrderStatusUpdateEmail(orderData, userEmail, userName, oldStatus)

// Helper Functions
function formatCurrency(amount) // Formats amount in Kenyan Shillings
function formatDate(dateString) // Formats date for display
```

## Testing Email Templates

### 1. Using the Test Script
```bash
node test-email.js
```

### 2. Manual Testing Functions
```javascript
// Test all email functions
const { sendVerificationEmail, sendPasswordResetEmail, sendOrderConfirmationEmail, sendOrderStatusUpdateEmail } = require('./server.js');

// Example usage
await sendOrderConfirmationEmail(orderData, 'user@example.com', 'John Doe');
```

## Best Practices

### 1. Template Management
- Keep templates in separate files for maintainability
- Use template engines for dynamic content
- Implement A/B testing for email performance

### 2. Performance Optimization
- Optimize images (compress and resize)
- Minimize CSS for faster loading
- Use inline styles for better email client compatibility

### 3. Deliverability
- Implement proper SPF/DKIM records
- Monitor bounce rates and complaints
- Maintain clean email lists
- Use clear unsubscribe links

## Troubleshooting

### Common Issues

**"Email not received"**
- Check spam/junk folder
- Verify SMTP configuration
- Check email provider limits

**"Images not displaying"**
- Use absolute URLs for images
- Host images on reliable CDN
- Provide alt text alternatives

**"Template looks broken"**
- Test in multiple email clients
- Use email-safe CSS properties
- Avoid complex layouts

## Next Steps

1. ✅ Review existing email templates
2. ⏳ Customize templates for your brand
3. ⏳ Set up email analytics tracking
4. ⏳ Implement A/B testing for templates
5. ⏳ Create seasonal/promotional templates

## Support

For template customization help or technical issues:
1. Check the troubleshooting section above
2. Review server logs for detailed error messages
3. Test with different email providers
4. Contact your email service provider support

---

**Last Updated:** October 2025
**Version:** 1.0.0
**Compatibility:** Node.js, Nodemailer, SQLite