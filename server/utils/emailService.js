import nodemailer from "nodemailer";

class EmailService {
  constructor() {
    this.transporter = null;
    this.isMockMode = null;
    this.initialized = false;
  }

  // Initialize the email service with environment variables
  initialize() {
    if (this.initialized) {
      return;
    }

    // Check if email configuration is provided
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;

    console.log("🔍 Checking email configuration...");
    console.log(
      `📧 EMAIL_USER: ${
        emailUser
          ? `${emailUser.substring(0, 3)}***@${emailUser.split("@")[1]}`
          : "NOT SET"
      }`
    );
    console.log(`🔑 EMAIL_PASS: ${emailPass ? "***SET***" : "NOT SET"}`);

    if (
      !emailUser ||
      !emailPass ||
      emailUser === "your-email@gmail.com" ||
      emailPass === "your-app-password"
    ) {
      console.warn(
        "⚠️ Email configuration not properly set. Please configure EMAIL_USER and EMAIL_PASS in .env file"
      );
      console.warn(
        "📧 Email verification will be in MOCK mode - codes will appear in console"
      );
      console.warn("📝 To fix this:");
      console.warn(
        "   1. Create a Gmail App Password: https://myaccount.google.com/apppasswords"
      );
      console.warn("   2. Set EMAIL_USER=your-gmail@gmail.com in .env");
      console.warn("   3. Set EMAIL_PASS=your-16-digit-app-password in .env");
      this.isMockMode = true;
    } else {
      console.log("📧 Email service initialized with Gmail");
      this.isMockMode = false;
    }

    this.transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: emailUser || "your-email@gmail.com",
        pass: emailPass || "your-app-password",
      },
    });

    // Alternative configurations for other email providers:
    //
    // For Outlook/Hotmail:
    // this.transporter = nodemailer.createTransport({
    //   service: "hotmail",
    //   auth: {
    //     user: emailUser,
    //     pass: emailPass,
    //   },
    // });
    //
    // For custom SMTP:
    // this.transporter = nodemailer.createTransport({
    //   host: "smtp.your-email-provider.com",
    //   port: 587,
    //   secure: false,
    //   auth: {
    //     user: emailUser,
    //     pass: emailPass,
    //   },
    // });

    this.initialized = true;

    // Test the connection if not in mock mode
    if (!this.isMockMode) {
      this.testConnection();
    }
  }

  // Test the email connection
  async testConnection() {
    try {
      console.log("🔄 Testing email connection...");
      await this.transporter.verify();
      console.log("✅ Email service connection successful!");
    } catch (error) {
      console.error("❌ Email service connection failed:", error.message);
      console.error("🔧 Troubleshooting tips:");
      console.error(
        "   1. Make sure you're using a Gmail App Password (not your regular password)"
      );
      console.error(
        "   2. Check if 2-factor authentication is enabled on your Gmail account"
      );
      console.error("   3. Verify EMAIL_USER and EMAIL_PASS in your .env file");
      console.error(
        "   4. Make sure there are no spaces in your environment variables"
      );

      // Switch to mock mode if connection fails
      console.warn("📧 Switching to MOCK mode due to connection failure");
      this.isMockMode = true;
    }
  }

  // Send verification email with provided code
  async sendVerificationEmail(email, code, purpose = "verification") {
    // Ensure service is initialized
    this.initialize();

    try {
      console.log(
        `📧 Attempting to send verification email to ${email} with code: ${code}`
      );
      console.log(`📝 Purpose: ${purpose}, Mock Mode: ${this.isMockMode}`);

      if (this.isMockMode) {
        // Mock mode - just log the code
        console.log(`📧 MOCK EMAIL to ${email}`);
        console.log(`📋 Subject: ${this.getEmailSubject(purpose)}`);
        console.log(`🔢 Verification Code: ${code}`);
        console.log(`⏰ Expires in: 10 minutes`);
        console.log(`📝 Purpose: ${purpose}`);
        console.log(
          "🔧 To enable real emails, configure EMAIL_USER and EMAIL_PASS in .env file"
        );

        return {
          success: true,
          messageId: `mock_email_${Date.now()}`,
          expiresIn: "10 minutes",
          mockMode: true,
        };
      }

      const subject = this.getEmailSubject(purpose);
      const html = this.getEmailTemplate(code, purpose);

      const mailOptions = {
        from: `"Legends Milk Cart" <${process.env.EMAIL_USER}>`,
        to: email,
        subject,
        html,
      };

      console.log(`📮 Sending email via Gmail...`);
      const result = await this.transporter.sendMail(mailOptions);

      console.log(`✅ Verification email sent successfully!`);
      console.log(`📧 To: ${email}`);
      console.log(`🆔 Message ID: ${result.messageId}`);
      console.log(`🔢 Code: ${code}`);

      return {
        success: true,
        messageId: result.messageId,
        expiresIn: "10 minutes",
      };
    } catch (error) {
      console.error("❌ Email send error:", error);

      // Provide detailed error messages based on error type
      if (error.code === "EAUTH") {
        console.error("🔑 Authentication Error Details:");
        console.error("   - Your Gmail credentials are incorrect");
        console.error(
          "   - Make sure you're using an App Password, not your regular Gmail password"
        );
        console.error(
          "   - Generate App Password: https://myaccount.google.com/apppasswords"
        );
        throw new Error(
          "Email authentication failed. Please check your Gmail App Password."
        );
      } else if (error.code === "ENOTFOUND") {
        console.error("🌐 Network Error Details:");
        console.error("   - Cannot connect to Gmail servers");
        console.error("   - Check your internet connection");
        throw new Error("Network error: Cannot connect to email service.");
      } else if (error.code === "ETIMEDOUT") {
        console.error("⏰ Timeout Error Details:");
        console.error("   - Request to Gmail servers timed out");
        console.error("   - This might be a temporary network issue");
        throw new Error("Email service timeout. Please try again.");
      } else if (error.responseCode === 535) {
        console.error("🔐 Gmail Security Error:");
        console.error("   - Invalid credentials or app password");
        console.error(
          "   - Make sure 2FA is enabled and you're using an App Password"
        );
        throw new Error(
          "Gmail authentication rejected. Check your App Password."
        );
      } else {
        console.error("❓ Unknown Error Details:", {
          code: error.code,
          response: error.response,
          responseCode: error.responseCode,
        });
        throw new Error(`Failed to send verification email: ${error.message}`);
      }
    }
  }

  // Send contact form data to admin
  async sendContactFormToAdmin(formData) {
    // Ensure service is initialized
    this.initialize();

    try {
      const adminEmail = process.env.ADMIN_EMAIL || "webbites79@gmail.com";
      console.log(`📧 Sending contact form data to admin: ${adminEmail}`);
      console.log(`📝 Form data:`, formData);

      if (this.isMockMode) {
        // Mock mode - just log the form data
        console.log(`📧 MOCK CONTACT FORM EMAIL to ${adminEmail}`);
        console.log(
          `📋 Subject: New Contact Form Submission - Legends Milk Cart`
        );
        console.log(`👤 Name: ${formData.name}`);
        console.log(`📞 Phone: ${formData.phone}`);
        console.log(`💬 Message: ${formData.message}`);
        console.log(`📅 Submitted: ${new Date().toLocaleString()}`);
        console.log(
          "🔧 To enable real emails, configure EMAIL_USER and EMAIL_PASS in .env file"
        );

        return {
          success: true,
          messageId: `mock_contact_email_${Date.now()}`,
          mockMode: true,
        };
      }

      const subject = `New Contact Form Submission - Legends Milk Cart`;
      const html = this.getContactFormEmailTemplate(formData);

      const mailOptions = {
        from: `"Legends Milk Cart Contact Form" <${process.env.EMAIL_USER}>`,
        to: adminEmail,
        subject,
        html,
        replyTo: formData.email || undefined, // If email is provided in form
      };

      console.log(`📮 Sending contact form email to admin...`);
      const result = await this.transporter.sendMail(mailOptions);

      console.log(`✅ Contact form email sent successfully!`);
      console.log(`📧 To: ${adminEmail}`);
      console.log(`🆔 Message ID: ${result.messageId}`);
      console.log(`👤 From: ${formData.name}`);

      return {
        success: true,
        messageId: result.messageId,
      };
    } catch (error) {
      console.error("❌ Contact form email send error:", error);
      throw new Error(`Failed to send contact form email: ${error.message}`);
    }
  }

  // Get email subject based on purpose
  getEmailSubject(purpose) {
    switch (purpose) {
      case "signup":
        return "Welcome to Legends Milk Cart - Verify Your Email";
      case "login":
        return "Legends Milk Cart - Login Verification Code";
      case "password_reset":
        return "Legends Milk Cart - Reset Your Password";
      default:
        return "Legends Milk Cart - Email Verification";
    }
  }

  // Get email template
  getEmailTemplate(code, purpose) {
    const baseTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10B981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .code { background: #fff; border: 2px solid #10B981; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
          .code-number { font-size: 32px; font-weight: bold; color: #10B981; letter-spacing: 4px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Legends Milk Cart</h1>
          </div>
          <div class="content">
            ${this.getContentByPurpose(code, purpose)}
            <div class="code">
              <p style="margin: 0; font-size: 16px; color: #666;">Your verification code is:</p>
              <div class="code-number">${code}</div>
              <p style="margin: 0; font-size: 14px; color: #666;">This code expires in 10 minutes</p>
            </div>
            <p style="color: #666; font-size: 14px;">
              If you didn't request this, please ignore this email.
            </p>
          </div>
          <div class="footer">
            <p>© 2024 Legends Milk Cart. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return baseTemplate;
  }

  // Get contact form email template for admin
  getContactFormEmailTemplate(formData) {
    const timestamp = new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    return `
    <!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    /* Reset styles for email clients */
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
      line-height: 1.6;
      color: #1F2937;
      background-color: #F9FAFB;
    }
    * {
      box-sizing: border-box;
    }
    a {
      text-decoration: none;
    }
    /* Main container */
    .container {
      max-width: 600px;
      margin: 20px auto;
      background: linear-gradient(180deg, #F9FAFB 0%, #FFFFFF 100%);
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    /* Header */
    .header {
      background: #3B82F6;
      color: #FFFFFF;
      padding: 24px 16px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
    }
    .header p {
      margin: 8px 0 0;
      font-size: 14px;
      opacity: 0.9;
    }
    /* Content */
    .content {
      padding: 24px 16px;
    }
    .form-details {
      background: #F3F4F6;
      border-radius: 6px;
      padding: 20px;
      margin: 16px 0;
      border-left: 4px solid #3B82F6;
    }
    .detail-row {
      display: flex;
      flex-wrap: wrap;
      margin-bottom: 12px;
      align-items: flex-start;
    }
    .detail-label {
      font-weight: 600;
      color: #374151;
      min-width: 100px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
    }
    .detail-value {
      color: #1F2937;
      flex: 1;
      font-size: 14px;
    }
    .message-text {
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 4px;
      padding: 12px;
      margin-top: 8px;
      font-style: italic;
      color: #4B5563;
      white-space: pre-wrap;
      font-size: 14px;
    }
    .timestamp {
      background: #EFF6FF;
      border-radius: 4px;
      padding: 10px;
      margin: 16px 0;
      text-align: center;
      font-size: 13px;
      color: #2563EB;
      font-weight: 500;
    }
    /* Action Buttons */
    .action-buttons {
      margin: 24px 0;
      text-align: center;
    }
    .action-btn {
      display: inline-block;
      padding: 10px 20px;
      border-radius: 6px;
      font-weight: 500;
      font-size: 14px;
      margin: 8px;
      color: #FFFFFF;
      text-align: center;
    }
    .whatsapp-btn {
      background: #25D366;
    }
    .call-btn {
      background: #059669;
    }
    /* Footer */
    .footer {
      text-align: center;
      padding: 16px;
      background: #F3F4F6;
      color: #6B7280;
      font-size: 12px;
      border-top: 1px solid #E5E7EB;
    }
    .tips {
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid #E5E7EB;
      color: #6B7280;
      font-size: 13px;
    }
    .icon {
      width: 16px;
      height: 16px;
      vertical-align: middle;
    }
    /* Dark mode */
    @media (prefers-color-scheme: dark) {
      body {
        background-color: #111827;
        color: #D1D5DB;
      }
      .container {
        background: linear-gradient(180deg, #1F2937 0%, #111827 100%);
      }
      .form-details {
        background: #374151;
        border-left-color: #60A5FA;
      }
      .detail-label {
        color: #D1D5DB;
      }
      .detail-value {
        color: #F3F4F6;
      }
      .message-text {
        background: #1F2937;
        border-color: #4B5563;
        color: #D1D5DB;
      }
      .timestamp {
        background: #1E40AF;
        color: #BFDBFE;
      }
      .footer {
        background: #374151;
        color: #9CA3AF;
        border-top-color: #4B5563;
      }
      .tips {
        color: #9CA3AF;
        border-top-color: #4B5563;
      }
    }
    /* Responsive design */
    @media screen and (max-width: 480px) {
      .container {
        margin: 10px;
        border-radius: 6px;
      }
      .header h1 {
        font-size: 20px;
      }
      .header p {
        font-size: 13px;
      }
      .content {
        padding: 16px;
      }
      .form-details {
        padding: 16px;
      }
      .detail-row {
        flex-direction: column;
        margin-bottom: 16px;
      }
      .detail-label {
        min-width: 100%;
        margin-bottom: 8px;
      }
      .action-btn {
        display: block;
        width: 100%;
        margin: 8px 0;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🥛 New Contact Form Submission</h1>
      <p>Legends Milk Cart - Customer Inquiry</p>
    </div>
    
    <div class="content">
      <p>Hello Admin,</p>
      <p>A new contact form submission has been received from the Legends Milk Cart website. Details below:</p>
      
      <div class="form-details">
        <div class="detail-row">
          <span class="detail-label">
            <span class="icon">👤</span>
            Customer Name:
          </span>
          </div>
          <span class="detail-value"><strong>${formData.name}</strong></span>
        
        <div class="detail-row">
          <span class="detail-label">
            <span class="icon">📞</span>
            Phone Number:
          </span>
          </div>
          <span class="detail-value"><strong>${formData.phone}</strong></span>
        
        <div class="detail-row">
          <span class="detail-label">
            <span class="icon">💬</span>
            Message:
          </span>
          
        </div>
        <span class="detail-value">
            <div class="message-text">${formData.message}</div>
          </span>
      </div>
      
      <div class="timestamp">
        <strong>📅 Submitted on:</strong> ${new Date().toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })}
      </div>
      
      <div class="action-buttons">
        <a href="https://wa.me/91${formData.phone.replace(/\D/g, '')}" class="action-btn whatsapp-btn">
          📱 Reply via WhatsApp
        </a>
        <a href="tel:+91${formData.phone.replace(/\D/g, '')}" class="action-btn call-btn">
          📞 Call Customer
        </a>
      </div>
      
      <div class="tips">
        <strong>💡 Quick Response Tips:</strong><br>
        • Respond within 2 hours for best customer experience<br>
        • Use the customer's name in your response<br>
        • Ask clarifying questions about their specific needs<br>
        • Provide product recommendations based on their inquiry
      </div>
    </div>
    
    <div class="footer">
      <p>© 2025 Legends Milk Cart. All rights reserved.</p>
      <p>This email was automatically generated from your website contact form.</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  // Get content based on purpose
  getContentByPurpose(code, purpose) {
    switch (purpose) {
      case "signup":
        return `
          <h2>Welcome to Legends Milk Cart! 🎉</h2>
          <p>Thank you for signing up. Please verify your email address to complete your registration.</p>
        `;
      case "login":
        return `
          <h2>Login Verification</h2>
          <p>Someone is trying to log in to your Legends Milk Cart account. Use the code below to verify it's you.</p>
        `;
      case "password_reset":
        return `
          <h2>Reset Your Password</h2>
          <p>We received a request to reset your password. Use the code below to proceed.</p>
        `;
      default:
        return `
          <h2>Email Verification</h2>
          <p>Please verify your email address using the code below.</p>
        `;
    }
  }

  // Test email functionality
  async testEmail(testEmail) {
    console.log(`🧪 Testing email functionality with ${testEmail}`);
    try {
      const result = await this.sendVerificationEmail(
        testEmail,
        "123456",
        "test"
      );
      console.log("✅ Test email completed:", result);
      return result;
    } catch (error) {
      console.error("❌ Test email failed:", error.message);
      throw error;
    }
  }
}

// Create singleton instance
const emailService = new EmailService();

export default emailService;
