#!/usr/bin/env node

/**
 * Email Configuration Test Script
 *
 * This script tests your email configuration to ensure emails are working properly.
 *
 * Usage:
 * 1. Configure your .env file with SMTP settings
 * 2. Run: node test-email.js
 */

require('dotenv').config();
const nodemailer = require('nodemailer');

async function testEmailConfiguration() {
  console.log('🧪 Testing Email Configuration...\n');

  // Check if SMTP settings are configured
  const requiredEnvVars = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    console.error('\nPlease configure your .env file first.');
    console.error('See EMAIL_SETUP.md for detailed instructions.\n');
    process.exit(1);
  }

  console.log('✅ Environment variables configured');
  console.log(`📧 SMTP Host: ${process.env.SMTP_HOST}`);
  console.log(`🔌 SMTP Port: ${process.env.SMTP_PORT}`);
  console.log(`👤 SMTP User: ${process.env.SMTP_USER}`);
  console.log('');

  // Create transporter
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true' || false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    debug: true, // Enable debug output
    logger: true  // Log to console
  });

  try {
    // Verify connection
    console.log('🔍 Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection successful!\n');

    // Send test email
    console.log('📤 Sending test email...');
    const testEmail = {
      from: `"HIRE-ME Test" <${process.env.SMTP_USER}>`,
      to: process.env.SMTP_USER, // Send to yourself for testing
      subject: 'HIRE-ME Email Configuration Test',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;"><i class="fas fa-tools"></i> HIRE-ME</h1>
            <p style="margin: 10px 0 0 0;">Email Configuration Test</p>
          </div>

          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px;">
            <h2 style="color: #10b981; margin-bottom: 20px;">✅ Email Configuration Successful!</h2>

            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
              Your email configuration is working perfectly! The HIRE-ME platform can now send:
            </p>

            <ul style="color: #4b5563; margin-bottom: 25px;">
              <li>📧 Account verification emails</li>
              <li>🔑 Password reset emails</li>
              <li>📦 Order confirmation emails</li>
              <li>🚚 Order status update notifications</li>
            </ul>

            <div style="background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #0c4a6e; font-size: 14px;">
                <strong>Test Details:</strong><br>
                Sent at: ${new Date().toLocaleString()}<br>
                SMTP Host: ${process.env.SMTP_HOST}<br>
                Configuration: Working perfectly!
              </p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <p style="color: #6b7280; font-size: 14px;">
                You can now proceed with full email functionality testing.
              </p>
            </div>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

            <p style="color: #6b7280; font-size: 12px; margin-bottom: 0;">
              This is an automated test email from your HIRE-ME platform.
            </p>
          </div>
        </div>
      `,
      text: `
        HIRE-ME Email Configuration Test

        ✅ Email Configuration Successful!

        Your email configuration is working perfectly! The HIRE-ME platform can now send:
        - Account verification emails
        - Password reset emails
        - Order confirmation emails
        - Order status update notifications

        Test Details:
        - Sent at: ${new Date().toLocaleString()}
        - SMTP Host: ${process.env.SMTP_HOST}
        - Status: Working perfectly!

        You can now proceed with full email functionality testing.
      `
    };

    const result = await transporter.sendMail(testEmail);
    console.log('✅ Test email sent successfully!');
    console.log(`📬 Message ID: ${result.messageId}`);
    console.log(`👤 Sent to: ${process.env.SMTP_USER}`);
    console.log('');

    console.log('🎉 Email configuration test completed successfully!');
    console.log('🚀 Your HIRE-ME platform is ready to send emails!');
    console.log('');
    console.log('📋 Next Steps:');
    console.log('   1. Test user registration email flow');
    console.log('   2. Test order confirmation emails');
    console.log('   3. Test password reset functionality');
    console.log('   4. Monitor email delivery in production');

  } catch (error) {
    console.error('❌ Email test failed:');
    console.error('Error:', error.message);

    if (error.code === 'EAUTH') {
      console.error('\n🔍 Authentication failed. Possible causes:');
      console.error('   - Wrong email or password');
      console.error('   - Gmail: Use app password, not regular password');
      console.error('   - Check if SMTP access is enabled');
    }

    if (error.code === 'ECONNECTION') {
      console.error('\n🔍 Connection failed. Possible causes:');
      console.error('   - Wrong SMTP host or port');
      console.error('   - Firewall blocking outbound connections');
      console.error('   - Network connectivity issues');
    }

    console.error('\n📖 See EMAIL_SETUP.md for troubleshooting help.');
    process.exit(1);
  }
}

// Run the test
testEmailConfiguration().catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});