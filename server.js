require('dotenv').config();

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
const axios = require('axios');

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
  secret: process.env.SESSION_SECRET || 'hire-me-secret-key-change-in-production-minimum-32-characters',
  resave: false,
  saveUninitialized: false, // Don't save empty sessions
  rolling: true, // Reset expiration on activity
  cookie: {
    secure: process.env.SECURE_COOKIES === 'true' || process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true, // Prevent XSS access to cookies
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax' // CSRF protection
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
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true' || false,
  auth: {
    user: process.env.SMTP_USER || 'your-email@gmail.com',
    pass: process.env.SMTP_PASS || 'your-app-password'
  },
  // Enable debug mode in development
  debug: process.env.NODE_ENV === 'development',
  logger: process.env.NODE_ENV === 'development'
};

// Create email transporter
const transporter = nodemailer.createTransport(emailConfig);

// M-Pesa configuration
const mpesaConfig = {
  consumerKey: process.env.MPESA_CONSUMER_KEY,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET,
  shortcode: process.env.MPESA_SHORTCODE || '174379', // Default sandbox shortcode
  passkey: process.env.MPESA_PASSKEY,
  baseUrl: process.env.MPESA_ENV === 'production'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke',
  callbackUrl: process.env.MPESA_CALLBACK_URL || `${process.env.APP_URL || 'http://localhost:3000'}/api/mpesa/callback`
};

// M-Pesa API functions
async function getMpesaAccessToken() {
  try {
    const auth = Buffer.from(`${mpesaConfig.consumerKey}:${mpesaConfig.consumerSecret}`).toString('base64');

    const response = await axios.get(`${mpesaConfig.baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: {
        'Authorization': `Basic ${auth}`
      }
    });

    return response.data.access_token;
  } catch (error) {
    console.error('Error getting M-Pesa access token:', error.response?.data || error.message);
    throw new Error('Failed to get M-Pesa access token');
  }
}

async function initiateMpesaSTKPush(phoneNumber, amount, accountReference, transactionDesc) {
  try {
    const accessToken = await getMpesaAccessToken();
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
    const password = Buffer.from(`${mpesaConfig.shortcode}${mpesaConfig.passkey}${timestamp}`).toString('base64');

    const stkPushData = {
      BusinessShortCode: mpesaConfig.shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.round(amount),
      PartyA: phoneNumber,
      PartyB: mpesaConfig.shortcode,
      PhoneNumber: phoneNumber,
      CallBackURL: mpesaConfig.callbackUrl,
      AccountReference: accountReference,
      TransactionDesc: transactionDesc
    };

    const response = await axios.post(`${mpesaConfig.baseUrl}/mpesa/stkpush/v1/processrequest`,
      stkPushData,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      success: true,
      responseCode: response.data.ResponseCode,
      checkoutRequestId: response.data.CheckoutRequestID,
      responseDescription: response.data.CustomerMessage
    };
  } catch (error) {
    console.error('Error initiating M-Pesa STK Push:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.CustomerMessage || 'Payment initiation failed'
    };
  }
}

async function queryMpesaPayment(checkoutRequestId) {
  try {
    const accessToken = await getMpesaAccessToken();
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
    const password = Buffer.from(`${mpesaConfig.shortcode}${mpesaConfig.passkey}${timestamp}`).toString('base64');

    const queryData = {
      BusinessShortCode: mpesaConfig.shortcode,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId
    };

    const response = await axios.post(`${mpesaConfig.baseUrl}/mpesa/stkpushquery/v1/query`,
      queryData,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      success: true,
      resultCode: response.data.ResultCode,
      resultDesc: response.data.ResultDesc,
      callbackMetadata: response.data.CallbackMetadata
    };
  } catch (error) {
    console.error('Error querying M-Pesa payment:', error.response?.data || error.message);
    return {
      success: false,
      error: 'Payment query failed'
    };
  }
}

// Email notification functions for orders
async function sendOrderConfirmationEmail(orderData, userEmail, userName) {
  try {
    const orderItems = orderData.items || [];
    const itemsHtml = orderItems.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">
          <img src="${item.image || 'Img/Vehicle.jpeg'}" alt="${item.product_name}"
               style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; margin-right: 10px;">
          ${item.product_name}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(item.product_price)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">${formatCurrency(item.product_price * item.quantity)}</td>
      </tr>
    `).join('');

    const mailOptions = {
      from: `"HIRE-ME" <${emailConfig.auth.user}>`,
      to: userEmail,
      subject: `Order Confirmation - ${orderData.order_number}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;"><i class="fas fa-tools"></i> HIRE-ME</h1>
            <p style="margin: 10px 0 0 0;">Equipment & Service Rental Platform</p>
          </div>

          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px;">
            <h2 style="color: #1f2937; margin-bottom: 20px;">Order Confirmed!</h2>

            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
              Hi ${userName}, thank you for your order! We've received your order and are preparing it for shipment.
            </p>

            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #1f2937; margin-bottom: 15px; font-size: 18px;">Order Details</h3>
              <p><strong>Order Number:</strong> ${orderData.order_number}</p>
              <p><strong>Order Date:</strong> ${formatDate(orderData.created_at)}</p>
              <p><strong>Total Amount:</strong> ${formatCurrency(orderData.total_amount)}</p>
              <p><strong>Payment Method:</strong> ${orderData.payment_method || 'M-Pesa'}</p>
              <p><strong>Status:</strong> <span style="color: #059669; font-weight: 600;">${orderData.status.charAt(0).toUpperCase() + orderData.status.slice(1)}</span></p>
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
                ${itemsHtml}
                <tr style="background: #f8fafc; font-weight: 600;">
                  <td colspan="3" style="padding: 15px; text-align: right;">Total Amount:</td>
                  <td style="padding: 15px; text-align: right; color: #2563eb;">${formatCurrency(orderData.total_amount)}</td>
                </tr>
              </tbody>
            </table>

            ${orderData.payment_method === 'mpesa' && orderData.payment_status === 'pending' ? `
              <div style="background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h4 style="color: #0ea5e9; margin-bottom: 15px;">
                  <i class="fas fa-mobile-alt me-2"></i>Complete Your Payment
                </h4>
                <p style="margin-bottom: 10px;"><strong>Pay Bill Number:</strong> 174379</p>
                <p style="margin-bottom: 10px;"><strong>Account Number:</strong> ${orderData.order_number}</p>
                <p style="margin-bottom: 0;"><strong>Amount:</strong> ${formatCurrency(orderData.total_amount)}</p>
              </div>
            ` : ''}

            <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 5px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #92400e; font-size: 14px;">
                <strong>Need Help?</strong> Contact our support team if you have any questions about your order.
              </p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.APP_URL || 'http://localhost:3000'}/confirmation.html?orderId=${orderData.id}"
                 style="background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
                Track Your Order
              </a>
            </div>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

            <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">
              Thank you for choosing HIRE-ME! We appreciate your business.
            </p>
          </div>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`Order confirmation email sent to ${userEmail}: ${result.messageId}`);
    return true;
  } catch (error) {
    console.error('Error sending order confirmation email:', error);
    return false;
  }
}

async function sendOrderStatusUpdateEmail(orderData, userEmail, userName, oldStatus) {
  try {
    const statusMessages = {
      'confirmed': {
        title: 'Order Confirmed',
        message: 'Great news! Your payment has been verified and your order is now confirmed.',
        color: '#2563eb'
      },
      'processing': {
        title: 'Order Processing',
        message: 'Your order is now being processed. We\'re preparing your items for shipment.',
        color: '#8b4513'
      },
      'shipped': {
        title: 'Order Shipped',
        message: 'Your order has been shipped! You should receive it within the next few days.',
        color: '#059669'
      },
      'delivered': {
        title: 'Order Delivered',
        message: 'Your order has been delivered successfully! Thank you for choosing HIRE-ME.',
        color: '#4b5563'
      }
    };

    const statusInfo = statusMessages[orderData.status];
    if (!statusInfo) return false;

    const mailOptions = {
      from: `"HIRE-ME" <${emailConfig.auth.user}>`,
      to: userEmail,
      subject: `Order Update - ${orderData.order_number} (${statusInfo.title})`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;"><i class="fas fa-tools"></i> HIRE-ME</h1>
            <p style="margin: 10px 0 0 0;">Equipment & Service Rental Platform</p>
          </div>

          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h2 style="color: ${statusInfo.color}; margin-bottom: 10px;">${statusInfo.title}</h2>
              <p style="color: #4b5563; font-size: 16px; margin-bottom: 0;">${statusInfo.message}</p>
            </div>

            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #1f2937; margin-bottom: 15px; font-size: 18px;">Order Information</h3>
              <p><strong>Order Number:</strong> ${orderData.order_number}</p>
              <p><strong>Status:</strong> <span style="color: ${statusInfo.color}; font-weight: 600;">${orderData.status.charAt(0).toUpperCase() + orderData.status.slice(1)}</span></p>
              <p><strong>Total Amount:</strong> ${formatCurrency(orderData.total_amount)}</p>
              <p><strong>Last Updated:</strong> ${formatDate(orderData.updated_at)}</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.APP_URL || 'http://localhost:3000'}/confirmation.html?orderId=${orderData.id}"
                 style="background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
                View Order Details
              </a>
            </div>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

            <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">
              You're receiving this email because you placed an order with HIRE-ME.
              You can manage your notification preferences in your account settings.
            </p>
          </div>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`Order status update email sent to ${userEmail}: ${result.messageId}`);
    return true;
  } catch (error) {
    console.error('Error sending order status update email:', error);
    return false;
  }
}

// Helper function to format currency in emails
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES'
  }).format(amount);
}

// Helper function to format date in emails
function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-KE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Additional email templates for edge cases

// Payment failure notification
async function sendPaymentFailureEmail(orderData, userEmail, userName, failureReason) {
  try {
    const mailOptions = {
      from: `"HIRE-ME" <${emailConfig.auth.user}>`,
      to: userEmail,
      subject: `Payment Failed - ${orderData.order_number}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;"><i class="fas fa-exclamation-triangle"></i> Payment Failed</h1>
            <p style="margin: 10px 0 0 0;">Action Required</p>
          </div>

          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px;">
            <h2 style="color: #1f2937; margin-bottom: 20px;">Hi ${userName},</h2>

            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
              We were unable to process your payment for order <strong>${orderData.order_number}</strong>.
            </p>

            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin: 25px 0;">
              <h3 style="color: #dc2626; margin-bottom: 15px; font-size: 18px;">Payment Details</h3>
              <p style="margin-bottom: 8px;"><strong>Order Number:</strong> ${orderData.order_number}</p>
              <p style="margin-bottom: 8px;"><strong>Amount:</strong> ${formatCurrency(orderData.total_amount)}</p>
              <p style="margin-bottom: 8px;"><strong>Reason:</strong> ${failureReason}</p>
              <p style="margin-bottom: 0;"><strong>Date:</strong> ${formatDate(new Date().toISOString())}</p>
            </div>

            <div style="background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; padding: 20px; margin: 25px 0;">
              <h4 style="color: #0ea5e9; margin-bottom: 15px;">💳 Retry Payment</h4>
              <p style="margin-bottom: 10px;"><strong>Pay Bill:</strong> 174379</p>
              <p style="margin-bottom: 10px;"><strong>Account:</strong> ${orderData.order_number}</p>
              <p style="margin-bottom: 0;"><strong>Amount:</strong> ${formatCurrency(orderData.total_amount)}</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.APP_URL || 'http://localhost:3000'}/checkout.html?retry=true&orderId=${orderData.id}"
                 style="background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
                Retry Payment
              </a>
            </div>

            <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 5px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #92400e; font-size: 14px;">
                <strong>Need Help?</strong> Contact our support team if you need assistance with your payment.
              </p>
            </div>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

            <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">
              If you have any questions about this payment failure, please don't hesitate to contact us.
            </p>
          </div>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`Payment failure email sent to ${userEmail}: ${result.messageId}`);
    return true;
  } catch (error) {
    console.error('Error sending payment failure email:', error);
    return false;
  }
}

// Order cancellation confirmation
async function sendOrderCancellationEmail(orderData, userEmail, userName, cancellationReason) {
  try {
    const mailOptions = {
      from: `"HIRE-ME" <${emailConfig.auth.user}>`,
      to: userEmail,
      subject: `Order Cancelled - ${orderData.order_number}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #6b7280, #4b5563); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;"><i class="fas fa-times-circle"></i> Order Cancelled</h1>
            <p style="margin: 10px 0 0 0;">Confirmation</p>
          </div>

          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px;">
            <h2 style="color: #1f2937; margin-bottom: 20px;">Hi ${userName},</h2>

            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
              Your order <strong>${orderData.order_number}</strong> has been cancelled as requested.
            </p>

            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #1f2937; margin-bottom: 15px; font-size: 18px;">Order Summary</h3>
              <p><strong>Order Number:</strong> ${orderData.order_number}</p>
              <p><strong>Cancellation Date:</strong> ${formatDate(new Date().toISOString())}</p>
              <p><strong>Reason:</strong> ${cancellationReason || 'Customer requested'}</p>
              <p><strong>Refund Status:</strong> <span style="color: #059669; font-weight: 600;">Processing</span></p>
            </div>

            <div style="background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; padding: 20px; margin: 25px 0;">
              <h4 style="color: #0ea5e9; margin-bottom: 15px;">📋 What happens next?</h4>
              <ul style="color: #0c4a6e; margin: 0; padding-left: 20px;">
                <li>Refund will be processed within 3-5 business days</li>
                <li>You'll receive a confirmation email once refund is processed</li>
                <li>Items have been released back to inventory</li>
              </ul>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.APP_URL || 'http://localhost:3000'}/products"
                 style="background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
                Browse More Equipment
              </a>
            </div>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

            <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">
              If you didn't request this cancellation or have questions, please contact our support team immediately.
            </p>
          </div>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`Order cancellation email sent to ${userEmail}: ${result.messageId}`);
    return true;
  } catch (error) {
    console.error('Error sending order cancellation email:', error);
    return false;
  }
}

// Inventory shortage notification
async function sendInventoryShortageEmail(productData, userEmail, userName) {
  try {
    const mailOptions = {
      from: `"HIRE-ME" <${emailConfig.auth.user}>`,
      to: userEmail,
      subject: `Out of Stock Alert - ${productData.name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;"><i class="fas fa-exclamation-triangle"></i> Out of Stock</h1>
            <p style="margin: 10px 0 0 0;">Item Currently Unavailable</p>
          </div>

          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px;">
            <h2 style="color: #1f2937; margin-bottom: 20px;">Hi ${userName},</h2>

            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
              We're sorry to inform you that the item you're interested in is currently out of stock.
            </p>

            <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 20px; margin: 25px 0;">
              <h3 style="color: #9a3412; margin-bottom: 15px; font-size: 18px;">Item Details</h3>
              <p style="margin-bottom: 8px;"><strong>Product:</strong> ${productData.name}</p>
              <p style="margin-bottom: 8px;"><strong>Price:</strong> ${formatCurrency(productData.price)}</p>
              <p style="margin-bottom: 0;"><strong>Category:</strong> ${productData.category}</p>
            </div>

            <div style="background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; padding: 20px; margin: 25px 0;">
              <h4 style="color: #0ea5e9; margin-bottom: 15px;">🔄 What can you do?</h4>
              <ul style="color: #0c4a6e; margin: 0; padding-left: 20px;">
                <li>We'll notify you as soon as this item is back in stock</li>
                <li>Browse similar items in the same category</li>
                <li>Contact us for alternative recommendations</li>
              </ul>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.APP_URL || 'http://localhost:3000'}/products?category=${productData.category}"
                 style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
                Browse Similar Items
              </a>
            </div>

            <div style="text-align: center; margin: 15px 0;">
              <a href="${process.env.APP_URL || 'http://localhost:3000'}/contact.html"
                 style="background: linear-gradient(135deg, #6b7280, #4b5563); color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-size: 14px;">
                Contact Support
              </a>
            </div>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

            <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">
              We're constantly updating our inventory. Thank you for your patience!
            </p>
          </div>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`Inventory shortage email sent to ${userEmail}: ${result.messageId}`);
    return true;
  } catch (error) {
    console.error('Error sending inventory shortage email:', error);
    return false;
  }
}

// Delivery delay notification
async function sendDeliveryDelayEmail(orderData, userEmail, userName, delayReason, newDeliveryDate) {
  try {
    const mailOptions = {
      from: `"HIRE-ME" <${emailConfig.auth.user}>`,
      to: userEmail,
      subject: `Delivery Update - ${orderData.order_number}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #8b4513, #a16207); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;"><i class="fas fa-clock"></i> Delivery Update</h1>
            <p style="margin: 10px 0 0 0;">Important Information</p>
          </div>

          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px;">
            <h2 style="color: #1f2937; margin-bottom: 20px;">Hi ${userName},</h2>

            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
              We want to inform you about a slight delay with your order <strong>${orderData.order_number}</strong>.
            </p>

            <div style="background: #fef7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 20px; margin: 25px 0;">
              <h3 style="color: #9a3412; margin-bottom: 15px; font-size: 18px;">Delivery Update</h3>
              <p style="margin-bottom: 8px;"><strong>Order Number:</strong> ${orderData.order_number}</p>
              <p style="margin-bottom: 8px;"><strong>Original Delivery:</strong> ${formatDate(orderData.created_at)}</p>
              <p style="margin-bottom: 8px;"><strong>New Delivery Date:</strong> <span style="color: #059669; font-weight: 600;">${formatDate(newDeliveryDate)}</span></p>
              <p style="margin-bottom: 0;"><strong>Reason:</strong> ${delayReason}</p>
            </div>

            <div style="background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; padding: 20px; margin: 25px 0;">
              <h4 style="color: #0ea5e9; margin-bottom: 15px;">📦 What this means</h4>
              <ul style="color: #0c4a6e; margin: 0; padding-left: 20px;">
                <li>Your order is confirmed and being processed</li>
                <li>Items are reserved for you</li>
                <li>New delivery date: ${formatDate(newDeliveryDate)}</li>
                <li>You'll receive tracking updates</li>
              </ul>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.APP_URL || 'http://localhost:3000'}/confirmation.html?orderId=${orderData.id}"
                 style="background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
                Track Your Order
              </a>
            </div>

            <div style="background: #f3f4f6; border-radius: 5px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #374151; font-size: 14px;">
                <strong>Need to reschedule?</strong> Contact us if you need to change your delivery date or have special requirements.
              </p>
            </div>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

            <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">
              We apologize for any inconvenience this may cause. Thank you for your understanding.
            </p>
          </div>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`Delivery delay email sent to ${userEmail}: ${result.messageId}`);
    return true;
  } catch (error) {
    console.error('Error sending delivery delay email:', error);
    return false;
  }
}

// Account suspension notification
async function sendAccountSuspensionEmail(userEmail, userName, suspensionReason, suspensionDuration) {
  try {
    const mailOptions = {
      from: `"HIRE-ME" <${emailConfig.auth.user}>`,
      to: userEmail,
      subject: 'Account Suspension Notice - HIRE-ME',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;"><i class="fas fa-user-lock"></i> Account Suspension</h1>
            <p style="margin: 10px 0 0 0;">Important Notice</p>
          </div>

          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px;">
            <h2 style="color: #1f2937; margin-bottom: 20px;">Dear ${userName},</h2>

            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
              This is to inform you that your HIRE-ME account has been temporarily suspended.
            </p>

            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin: 25px 0;">
              <h3 style="color: #dc2626; margin-bottom: 15px; font-size: 18px;">Suspension Details</h3>
              <p style="margin-bottom: 8px;"><strong>Reason:</strong> ${suspensionReason}</p>
              <p style="margin-bottom: 8px;"><strong>Duration:</strong> ${suspensionDuration}</p>
              <p style="margin-bottom: 8px;"><strong>Suspended On:</strong> ${formatDate(new Date().toISOString())}</p>
              <p style="margin-bottom: 0;"><strong>Status:</strong> <span style="color: #dc2626; font-weight: 600;">Account Access Restricted</span></p>
            </div>

            <div style="background: #fffbeb; border: 1px solid #fbbf24; border-radius: 8px; padding: 20px; margin: 25px 0;">
              <h4 style="color: #d97706; margin-bottom: 15px;">⚠️ What this means</h4>
              <ul style="color: #92400e; margin: 0; padding-left: 20px;">
                <li>You cannot place new orders during suspension</li>
                <li>Existing orders will be processed normally</li>
                <li>You can contact support for urgent matters</li>
                <li>Account will be automatically restored after suspension period</li>
              </ul>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.APP_URL || 'http://localhost:3000'}/contact.html"
                 style="background: linear-gradient(135deg, #6b7280, #4b5563); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
                Contact Support
              </a>
            </div>

            <div style="background: #f3f4f6; border-radius: 5px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #374151; font-size: 14px;">
                <strong>Appeal Process:</strong> If you believe this suspension is in error, please contact our support team with detailed explanation.
              </p>
            </div>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

            <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">
              This suspension is in accordance with our Terms of Service. Thank you for your understanding.
            </p>
          </div>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`Account suspension email sent to ${userEmail}: ${result.messageId}`);
    return true;
  } catch (error) {
    console.error('Error sending account suspension email:', error);
    return false;
  }
}

// Email service functions
async function sendVerificationEmail(email, name, verificationToken) {
  try {
    const baseUrl = process.env.APP_URL || 'http://localhost:3000';
    const verificationUrl = `${baseUrl}/verify-email.html?token=${verificationToken}`;

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
    const baseUrl = process.env.APP_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/reset-password.html?token=${resetToken}`;

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

    db.run(`CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      order_number TEXT UNIQUE,
      status TEXT DEFAULT 'pending',
      total_amount REAL,
      payment_method TEXT,
      payment_status TEXT DEFAULT 'pending',
      payment_reference TEXT,
      shipping_address TEXT,
      contact_phone TEXT,
      contact_email TEXT,
      order_notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER,
      product_id INTEGER,
      product_name TEXT,
      product_price REAL,
      quantity INTEGER,
      subtotal REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders (id),
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
      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'hire-me-secret-key-change-in-production', { expiresIn: '1h' });

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

// Order Management Endpoints

// Create new order from cart
app.post('/api/orders', requireAuth, async (req, res) => {
  const userId = req.session.userId;
  const { paymentMethod, shippingAddress, contactPhone, contactEmail, orderNotes } = req.body;

  if (!paymentMethod || !shippingAddress || !contactPhone || !contactEmail) {
    return res.status(400).json({ message: 'Missing required order information' });
  }

  try {
    // Get user's cart items
    const cartQuery = `
      SELECT c.quantity, p.name, p.price, p.image, p.location
      FROM cart c
      JOIN products p ON c.product_id = p.id
      WHERE c.user_id = ?
    `;

    db.all(cartQuery, [userId], (err, cartItems) => {
      if (err) {
        console.error('Error fetching cart:', err);
        return res.status(500).json({ message: 'Server error' });
      }

      if (cartItems.length === 0) {
        return res.status(400).json({ message: 'Cart is empty' });
      }

      // Calculate total
      const totalAmount = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      // Generate order number
      const orderNumber = 'ORD-' + Date.now() + Math.random().toString(36).substr(2, 4).toUpperCase();

      // Create order
      db.run(`INSERT INTO orders (user_id, order_number, total_amount, payment_method, payment_status,
        shipping_address, contact_phone, contact_email, order_notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, orderNumber, totalAmount, paymentMethod, 'pending', shippingAddress,
         contactPhone, contactEmail, orderNotes || ''],
        function(err) {
          if (err) {
            console.error('Error creating order:', err);
            return res.status(500).json({ message: 'Server error' });
          }

          const orderId = this.lastID;

          // Add order items and clear cart
          const insertPromises = cartItems.map(item => {
            return new Promise((resolve, reject) => {
              const subtotal = item.price * item.quantity;
              db.run(`INSERT INTO order_items (order_id, product_id, product_name, product_price, quantity, subtotal)
                VALUES (?, ?, ?, ?, ?, ?)`,
                [orderId, item.product_id || null, item.name, item.price, item.quantity, subtotal],
                function(err) {
                  if (err) reject(err);
                  else resolve();
                });
            });
          });

          // Clear cart after adding items
          Promise.all(insertPromises).then(() => {
            db.run('DELETE FROM cart WHERE user_id = ?', [userId], (cartErr) => {
              if (cartErr) {
                console.error('Error clearing cart:', cartErr);
              }

              console.log(`Order created: ${orderNumber} for user ${userId}`);

              // Send order confirmation email
              setTimeout(async () => {
                try {
                  const userQuery = 'SELECT name, email FROM users WHERE id = ?';
                  db.get(userQuery, [userId], async (err, user) => {
                    if (!err && user) {
                      const orderWithItems = {
                        ...order,
                        id: orderId,
                        order_number: orderNumber,
                        total_amount: totalAmount,
                        items: cartItems
                      };
                      await sendOrderConfirmationEmail(orderWithItems, user.email, user.name);
                    }
                  });
                } catch (emailErr) {
                  console.error('Error sending order confirmation email:', emailErr);
                }
              }, 1000); // Delay to ensure order is fully created

              res.status(201).json({
                message: 'Order created successfully',
                orderId: orderId,
                orderNumber: orderNumber,
                totalAmount: totalAmount,
                status: 'pending'
              });
            });
          }).catch(itemErr => {
            console.error('Error adding order items:', itemErr);
            res.status(500).json({ message: 'Server error' });
          });
        });
    });
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's orders
app.get('/api/orders', requireAuth, (req, res) => {
  const userId = req.session.userId;

  const query = `
    SELECT o.id, o.order_number, o.status, o.total_amount, o.payment_status,
           o.created_at, o.updated_at,
           COUNT(oi.id) as item_count
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    WHERE o.user_id = ?
    GROUP BY o.id
    ORDER BY o.created_at DESC
  `;

  db.all(query, [userId], (err, orders) => {
    if (err) {
      console.error('Error fetching orders:', err);
      return res.status(500).json({ message: 'Server error' });
    }

    res.json(orders);
  });
});

// Get specific order details
app.get('/api/orders/:id', requireAuth, (req, res) => {
  const userId = req.session.userId;
  const orderId = req.params.id;

  // Get order details
  const orderQuery = `
    SELECT o.*, u.name as customer_name, u.email as customer_email
    FROM orders o
    JOIN users u ON o.user_id = u.id
    WHERE o.id = ? AND o.user_id = ?
  `;

  db.get(orderQuery, [orderId, userId], (err, order) => {
    if (err) {
      console.error('Error fetching order:', err);
      return res.status(500).json({ message: 'Server error' });
    }

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Get order items
    const itemsQuery = `
      SELECT oi.*, p.image, p.description
      FROM order_items oi
      LEFT JOIN products p ON oi.product_name = p.name
      WHERE oi.order_id = ?
    `;

    db.all(itemsQuery, [orderId], (itemsErr, items) => {
      if (itemsErr) {
        console.error('Error fetching order items:', itemsErr);
        return res.status(500).json({ message: 'Server error' });
      }

      res.json({
        ...order,
        items: items
      });
    });
  });
});

// Cancel order (customer)
app.post('/api/orders/:id/cancel', requireAuth, (req, res) => {
  const userId = req.session.userId;
  const orderId = req.params.id;

  // Check if order can be cancelled (only pending orders)
  db.get('SELECT status FROM orders WHERE id = ? AND user_id = ?', [orderId, userId], (err, order) => {
    if (err) {
      console.error('Error fetching order:', err);
      return res.status(500).json({ message: 'Server error' });
    }

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending orders can be cancelled' });
    }

    // Update order status to cancelled
    db.run(`UPDATE orders SET status = 'cancelled', updated_at = datetime('now')
      WHERE id = ? AND user_id = ?`, [orderId, userId], function(updateErr) {
        if (updateErr) {
          console.error('Error cancelling order:', updateErr);
          return res.status(500).json({ message: 'Server error' });
        }

        console.log(`Order cancelled: ${orderId} by user ${userId}`);
        res.json({ message: 'Order cancelled successfully' });
      });
  });
});

// Admin: Update order status
app.put('/api/admin/orders/:id/status', requireAuth, (req, res) => {
  const orderId = req.params.id;
  const { status, adminNotes } = req.body;

  if (!status) {
    return res.status(400).json({ message: 'Status is required' });
  }

  const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }

  // Get current order status for comparison
  db.get('SELECT o.*, u.name, u.email FROM orders o JOIN users u ON o.user_id = u.id WHERE o.id = ?',
    [orderId], (err, currentOrder) => {
      if (err) {
        console.error('Error fetching current order:', err);
        return res.status(500).json({ message: 'Server error' });
      }

      if (!currentOrder) {
        return res.status(404).json({ message: 'Order not found' });
      }

      // Update order status
      db.run(`UPDATE orders SET status = ?, updated_at = datetime('now')
        WHERE id = ?`, [status, orderId], function(err) {
          if (err) {
            console.error('Error updating order status:', err);
            return res.status(500).json({ message: 'Server error' });
          }

          if (this.changes === 0) {
            return res.status(404).json({ message: 'Order not found' });
          }

          console.log(`Order ${orderId} status updated to ${status}`);

          // Send status update email if status changed and email is configured
          if (status !== currentOrder.status && emailConfig.auth.user !== 'your-email@gmail.com') {
            setTimeout(async () => {
              try {
                const updatedOrder = { ...currentOrder, status: status };
                await sendOrderStatusUpdateEmail(updatedOrder, currentOrder.email, currentOrder.name, currentOrder.status);
              } catch (emailErr) {
                console.error('Error sending status update email:', emailErr);
              }
            }, 500);
          }

          res.json({ message: 'Order status updated successfully' });
        });
    });
});

// Admin: Get all orders (for admin dashboard)
app.get('/api/admin/orders', requireAuth, (req, res) => {
  const query = `
    SELECT o.*, u.name as customer_name, u.email as customer_email,
           COUNT(oi.id) as item_count
    FROM orders o
    JOIN users u ON o.user_id = u.id
    LEFT JOIN order_items oi ON o.id = oi.order_id
    GROUP BY o.id
    ORDER BY o.created_at DESC
  `;

  db.all(query, [], (err, orders) => {
    if (err) {
      console.error('Error fetching orders:', err);
      return res.status(500).json({ message: 'Server error' });
    }

    res.json(orders);
  });
});

// M-Pesa Payment Endpoints

// Initiate M-Pesa payment
app.post('/api/mpesa/stkpush', requireAuth, async (req, res) => {
  const userId = req.session.userId;
  const { phoneNumber, amount, orderId } = req.body;

  if (!phoneNumber || !amount || !orderId) {
    return res.status(400).json({ message: 'Phone number, amount, and order ID are required' });
  }

  // Validate phone number format (Kenyan format)
  const kenyaPhoneRegex = /^(\+254|254|0)[17]\d{8}$/;
  if (!kenyaPhoneRegex.test(phoneNumber)) {
    return res.status(400).json({ message: 'Please provide a valid Kenyan phone number' });
  }

  // Format phone number to international format
  let formattedPhone = phoneNumber;
  if (phoneNumber.startsWith('0')) {
    formattedPhone = '+254' + phoneNumber.substring(1);
  } else if (phoneNumber.startsWith('254')) {
    formattedPhone = '+' + phoneNumber;
  }

  try {
    // Verify order belongs to user
    db.get('SELECT order_number, total_amount FROM orders WHERE id = ? AND user_id = ?',
      [orderId, userId], async (err, order) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ message: 'Server error' });
        }

        if (!order) {
          return res.status(404).json({ message: 'Order not found' });
        }

        if (Math.abs(parseFloat(order.total_amount) - parseFloat(amount)) > 0.01) {
          return res.status(400).json({ message: 'Amount does not match order total' });
        }

        // Initiate M-Pesa STK Push
        const result = await initiateMpesaSTKPush(
          formattedPhone,
          amount,
          order.order_number,
          `Payment for order ${order.order_number}`
        );

        if (result.success) {
          // Update order with payment reference
          db.run(`UPDATE orders SET payment_reference = ?, updated_at = datetime('now')
            WHERE id = ?`, [result.checkoutRequestId, orderId], (updateErr) => {
              if (updateErr) {
                console.error('Error updating order payment reference:', updateErr);
              }
            });

          res.json({
            message: 'M-Pesa payment request sent successfully',
            checkoutRequestId: result.checkoutRequestId,
            responseDescription: result.responseDescription
          });
        } else {
          res.status(400).json({
            message: result.error || 'Failed to initiate M-Pesa payment'
          });
        }
      });
  } catch (error) {
    console.error('M-Pesa payment error:', error);
    res.status(500).json({ message: 'Payment processing error' });
  }
});

// M-Pesa payment callback (webhook)
app.post('/api/mpesa/callback', (req, res) => {
  const callbackData = req.body;

  console.log('M-Pesa callback received:', JSON.stringify(callbackData, null, 2));

  // Handle different callback types
  if (callbackData.Body && callbackData.Body.stkCallback) {
    const stkCallback = callbackData.Body.stkCallback;
    const checkoutRequestId = stkCallback.CheckoutRequestID;
    const resultCode = stkCallback.ResultCode;

    if (resultCode === 0) {
      // Payment successful
      const callbackMetadata = stkCallback.CallbackMetadata;
      const amount = callbackMetadata.Item.find(item => item.Name === 'Amount')?.Value;
      const mpesaReceiptNumber = callbackMetadata.Item.find(item => item.Name === 'MpesaReceiptNumber')?.Value;
      const phoneNumber = callbackMetadata.Item.find(item => item.Name === 'PhoneNumber')?.Value;

      console.log(`Payment successful: ${mpesaReceiptNumber} for amount ${amount}`);

      // Update order payment status
      db.run(`UPDATE orders SET payment_status = 'completed', payment_reference = ?,
        updated_at = datetime('now') WHERE payment_reference = ?`,
        [mpesaReceiptNumber, checkoutRequestId], (err) => {
          if (err) {
            console.error('Error updating payment status:', err);
          } else {
            console.log(`Payment status updated for checkout request: ${checkoutRequestId}`);
          }
        });

    } else {
      // Payment failed or cancelled
      const resultDesc = stkCallback.ResultDesc;
      console.log(`Payment failed: ${resultDesc} for checkout request: ${checkoutRequestId}`);

      // Update order payment status to failed
      db.run(`UPDATE orders SET payment_status = 'failed', updated_at = datetime('now')
        WHERE payment_reference = ?`, [checkoutRequestId], (err) => {
          if (err) {
            console.error('Error updating payment status:', err);
          }
        });
    }
  }

  // Always respond with success to M-Pesa
  res.json({ message: 'Callback received successfully' });
});

// Query M-Pesa payment status
app.post('/api/mpesa/query', requireAuth, async (req, res) => {
  const { checkoutRequestId } = req.body;

  if (!checkoutRequestId) {
    return res.status(400).json({ message: 'Checkout request ID is required' });
  }

  try {
    const result = await queryMpesaPayment(checkoutRequestId);

    if (result.success) {
      let paymentStatus = 'pending';

      if (result.resultCode === '0') {
        paymentStatus = 'completed';
      } else if (result.resultCode === '1032') {
        paymentStatus = 'cancelled';
      } else if (result.resultCode === '1') {
        paymentStatus = 'failed';
      }

      // Update order status if payment is completed
      if (paymentStatus === 'completed') {
        db.run(`UPDATE orders SET payment_status = 'completed', updated_at = datetime('now')
          WHERE payment_reference = ?`, [checkoutRequestId], (err) => {
            if (err) {
              console.error('Error updating payment status:', err);
            }
          });
      }

      res.json({
        status: paymentStatus,
        resultCode: result.resultCode,
        resultDescription: result.resultDesc
      });
    } else {
      res.status(400).json({ message: result.error });
    }
  } catch (error) {
    console.error('Payment query error:', error);
    res.status(500).json({ message: 'Payment query failed' });
  }
});

// Analytics and Reporting Endpoints

// Get order analytics
app.get('/api/admin/analytics', requireAuth, (req, res) => {
  const queries = {
    // Order status distribution
    statusDistribution: `
      SELECT status, COUNT(*) as count
      FROM orders
      GROUP BY status
    `,

    // Monthly revenue for last 12 months
    monthlyRevenue: `
      SELECT
        strftime('%Y-%m', created_at) as month,
        SUM(total_amount) as revenue,
        COUNT(*) as order_count
      FROM orders
      WHERE created_at >= date('now', '-12 months')
      GROUP BY strftime('%Y-%m', created_at)
      ORDER BY month
    `,

    // Top selling products
    topProducts: `
      SELECT
        oi.product_name,
        SUM(oi.quantity) as total_quantity,
        SUM(oi.subtotal) as total_revenue,
        COUNT(DISTINCT oi.order_id) as order_count
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status = 'delivered'
      GROUP BY oi.product_name
      ORDER BY total_revenue DESC
      LIMIT 10
    `,

    // Daily orders for last 30 days
    dailyOrders: `
      SELECT
        date(created_at) as order_date,
        COUNT(*) as order_count,
        SUM(total_amount) as daily_revenue
      FROM orders
      WHERE created_at >= date('now', '-30 days')
      GROUP BY date(created_at)
      ORDER BY order_date
    `,

    // Payment method distribution
    paymentMethods: `
      SELECT
        payment_method,
        COUNT(*) as count,
        SUM(total_amount) as total_amount
      FROM orders
      WHERE payment_method IS NOT NULL
      GROUP BY payment_method
    `,

    // Customer location distribution
    locationDistribution: `
      SELECT
        u.location,
        COUNT(DISTINCT o.id) as order_count,
        SUM(o.total_amount) as total_revenue
      FROM orders o
      JOIN users u ON o.user_id = u.id
      GROUP BY u.location
      ORDER BY order_count DESC
    `
  };

  const results = {};

  // Execute all queries
  const queryPromises = Object.entries(queries).map(([key, query]) => {
    return new Promise((resolve, reject) => {
      db.all(query, [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          results[key] = rows;
          resolve();
        }
      });
    });
  });

  Promise.all(queryPromises).then(() => {
    res.json(results);
  }).catch(err => {
    console.error('Error fetching analytics:', err);
    res.status(500).json({ message: 'Server error' });
  });
});

// Get revenue analytics
app.get('/api/admin/revenue', requireAuth, (req, res) => {
  const { period = '30' } = req.query; // Default to 30 days

  const query = `
    SELECT
      SUM(total_amount) as total_revenue,
      COUNT(*) as total_orders,
      AVG(total_amount) as average_order_value,
      COUNT(CASE WHEN status = 'delivered' THEN 1 END) as completed_orders,
      SUM(CASE WHEN status = 'delivered' THEN total_amount ELSE 0 END) as completed_revenue
    FROM orders
    WHERE created_at >= date('now', '-${period} days')
  `;

  db.get(query, [], (err, row) => {
    if (err) {
      console.error('Error fetching revenue analytics:', err);
      return res.status(500).json({ message: 'Server error' });
    }

    res.json({
      period: `${period} days`,
      ...row
    });
  });
});

// Get user registration analytics
app.get('/api/admin/users', requireAuth, (req, res) => {
  const queries = {
    // User registration by month
    monthlyRegistrations: `
      SELECT
        strftime('%Y-%m', created_at) as month,
        COUNT(*) as registration_count
      FROM users
      WHERE created_at >= date('now', '-12 months')
      GROUP BY strftime('%Y-%m', created_at)
      ORDER BY month
    `,

    // User location distribution
    locationDistribution: `
      SELECT
        location,
        COUNT(*) as user_count
      FROM users
      WHERE location IS NOT NULL
      GROUP BY location
      ORDER BY user_count DESC
    `,

    // Total users and verification status
    userStats: `
      SELECT
        COUNT(*) as total_users,
        COUNT(CASE WHEN email_verified = 1 THEN 1 END) as verified_users,
        COUNT(CASE WHEN email_verified = 0 THEN 1 END) as unverified_users
      FROM users
    `
  };

  const results = {};

  const queryPromises = Object.entries(queries).map(([key, query]) => {
    return new Promise((resolve, reject) => {
      db.all(query, [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          results[key] = rows;
          resolve();
        }
      });
    });
  });

  Promise.all(queryPromises).then(() => {
    res.json(results);
  }).catch(err => {
    console.error('Error fetching user analytics:', err);
    res.status(500).json({ message: 'Server error' });
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});