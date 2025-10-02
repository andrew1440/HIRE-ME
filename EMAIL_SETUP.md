# Email Service Configuration Guide

This guide explains how to configure email notifications for your HIRE-ME platform.

## Quick Start

1. **Copy the environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Configure your SMTP settings in `.env`:**
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   ```

3. **Restart your server:**
   ```bash
   npm start
   ```

## Supported Email Providers

### Gmail Setup

1. **Enable 2-Factor Authentication:**
   - Go to your Google Account settings
   - Enable 2-factor authentication

2. **Generate App Password:**
   - Go to Google Account → Security → App passwords
   - Generate a new app password for "Mail"
   - Use this 16-character password in your `.env` file

3. **Configure `.env`:**
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-16-character-app-password
   ```

### Outlook/Hotmail Setup

1. **Enable SMTP:**
   - Outlook.com: Settings → Mail → Sync email → SMTP
   - Hotmail.com: Settings → Mail → Sync email → SMTP

2. **Configure `.env`:**
   ```env
   SMTP_HOST=smtp-mail.outlook.com
   SMTP_PORT=587
   SMTP_USER=your-email@outlook.com
   SMTP_PASS=your-outlook-password
   ```

### Yahoo Mail Setup

1. **Generate App Password:**
   - Go to Yahoo Account → Security → App passwords
   - Generate password for "Mail"

2. **Configure `.env`:**
   ```env
   SMTP_HOST=smtp.mail.yahoo.com
   SMTP_PORT=587
   SMTP_USER=your-email@yahoo.com
   SMTP_PASS=your-yahoo-app-password
   ```

### Custom SMTP Server

For corporate email servers or other providers:

```env
SMTP_HOST=your-smtp-server.com
SMTP_PORT=587
SMTP_USER=your-username
SMTP_PASS=your-password
SMTP_SECURE=false
```

## Testing Email Configuration

### Method 1: Test Registration Email

1. Start your server
2. Visit `http://localhost:3000/register.html`
3. Create a new account
4. Check if you receive the verification email

### Method 2: Test Order Confirmation Email

1. Register and verify an account
2. Add items to cart and place an order
3. Check if you receive the order confirmation email

### Method 3: Manual Email Test

Create a simple test script to verify email functionality:

```javascript
// test-email.js
require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

async function testEmail() {
  try {
    const result = await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: 'test@example.com',
      subject: 'Test Email',
      html: '<h1>Email configuration successful!</h1>'
    });
    console.log('Email sent successfully:', result.messageId);
  } catch (error) {
    console.error('Email failed:', error);
  }
}

testEmail();
```

## Troubleshooting

### Common Issues

**"Authentication failed"**
- Check your email and password
- For Gmail: Use app password, not regular password
- Verify your email provider allows SMTP access

**"Connection timeout"**
- Check SMTP host and port settings
- Verify your firewall allows outbound connections
- Try different ports (587, 465, 25)

**"Certificate error"**
- Set `SMTP_SECURE=false` for self-signed certificates
- Use port 587 instead of 465

### Debug Mode

Enable debug mode in your `.env` file:

```env
NODE_ENV=development
```

This will show detailed SMTP communication logs.

## Email Templates

The system includes comprehensive HTML email templates for all user interactions:

### Core Templates

- **Account Verification**: Sent after user registration
- **Password Reset**: Sent when user requests password reset
- **Order Confirmation**: Sent after successful order placement
- **Order Status Updates**: Sent when order status changes

### Advanced Templates

- **Payment Failure Notifications**: Sent when payment processing fails
- **Order Cancellation Confirmations**: Sent when orders are cancelled
- **Inventory Shortage Alerts**: Sent when requested items are out of stock
- **Delivery Delay Notifications**: Sent when delivery schedules change
- **Account Suspension Notices**: Sent for security and policy violations

All templates are responsive, accessible, and include professional branding.

### Template Showcase

View all email templates in the interactive showcase:
```bash
# Open the template showcase in your browser
open email-templates-showcase.html
```

For detailed template documentation, see `EMAIL_TEMPLATES.md`.

## Security Best Practices

1. **Use App Passwords**: Never use your main email password
2. **Environment Variables**: Keep credentials in `.env` file, not in code
3. **HTTPS Only**: Use secure connections in production
4. **Rate Limiting**: The system includes built-in rate limiting for emails

## Production Deployment

For production deployment:

1. **Use secure SMTP settings:**
   ```env
   SMTP_SECURE=true
   SECURE_COOKIES=true
   ```

2. **Configure proper domain:**
   ```env
   APP_URL=https://your-domain.com
   ```

3. **Set up SPF/DKIM records** for better email deliverability

4. **Monitor email delivery** and handle bounce notifications

## Support

If you encounter issues:

1. Check the server logs for detailed error messages
2. Verify your SMTP settings with your email provider
3. Test with a simple email client using the same settings
4. Contact your email provider's support for SMTP access issues

## Advanced Email Functions

### Edge Case Email Templates

The system now includes specialized templates for handling exceptional scenarios:

#### Payment Failure Emails
```javascript
// Automatically sent when M-Pesa payments fail
sendPaymentFailureEmail(orderData, userEmail, userName, failureReason)
```

**When triggered:**
- M-Pesa payment rejection
- Insufficient funds
- Network timeout errors
- Invalid payment details

**Features:**
- Clear failure explanation
- Retry payment button
- Alternative payment options
- Support contact information

#### Order Cancellation Confirmations
```javascript
// Sent when customer or admin cancels an order
sendOrderCancellationEmail(orderData, userEmail, userName, cancellationReason)
```

**When triggered:**
- Customer requested cancellation
- Admin cancellation due to issues
- Payment timeout
- Inventory unavailability

**Features:**
- Cancellation confirmation
- Refund processing timeline
- Next steps for customer
- Alternative product suggestions

#### Inventory Shortage Alerts
```javascript
// Sent when requested items are unavailable
sendInventoryShortageEmail(productData, userEmail, userName)
```

**When triggered:**
- Out of stock products
- Discontinued items
- Temporary unavailability

**Features:**
- Stock status updates
- Alternative product recommendations
- Back-in-stock notifications
- Browse similar items button

#### Delivery Delay Notifications
```javascript
// Sent when delivery schedules change
sendDeliveryDelayEmail(orderData, userEmail, userName, delayReason, newDeliveryDate)
```

**When triggered:**
- Supplier delays
- Logistics issues
- Weather disruptions
- High demand periods

**Features:**
- New delivery date
- Delay explanation
- Order status reassurance
- Alternative delivery options

#### Account Suspension Notices
```javascript
// Sent for security and policy violations
sendAccountSuspensionEmail(userEmail, userName, suspensionReason, suspensionDuration)
```

**When triggered:**
- Multiple payment failures
- Policy violations
- Security concerns
- Administrative actions

**Features:**
- Clear suspension reason
- Duration and next steps
- Appeal process information
- Support contact details

## Template Customization

### Adding New Templates

To add new email templates:

1. **Create the email function** in `server.js`:
```javascript
async function sendCustomEmail(userEmail, userName, customData) {
  const mailOptions = {
    from: `"HIRE-ME" <${emailConfig.auth.user}>`,
    to: userEmail,
    subject: 'Custom Notification',
    html: `
      <!-- Your custom HTML template -->
    `
  };

  const result = await transporter.sendMail(mailOptions);
  return true;
}
```

2. **Add template to showcase** in `email-templates-showcase.html`

3. **Document in** `EMAIL_TEMPLATES.md`

### Modifying Existing Templates

All templates use consistent styling and can be customized by editing the HTML in the respective functions in `server.js`.

## Next Steps

Once email is configured:

1. ✅ Test user registration and verification
2. ✅ Test order placement and confirmation emails
3. ✅ Test password reset functionality
4. ✅ Test payment failure scenarios
5. ✅ Test edge case email templates
6. ✅ Monitor email delivery rates
7. ✅ Set up email analytics if needed
8. ✅ Customize templates for your brand

Your email notification system is now ready for production use! 🚀

## Files Reference

- **`EMAIL_SETUP.md`** - This configuration guide
- **`EMAIL_TEMPLATES.md`** - Detailed template documentation
- **`email-templates-showcase.html`** - Visual template showcase
- **`test-email.js`** - Email testing script
- **`server.js`** - Email functions implementation