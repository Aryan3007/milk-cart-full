import emailService from "../utils/emailService.js";

// Handle contact form submission
export const submitContactForm = async (req, res) => {
  try {
    const { name, phone, message } = req.body;

    // Validate required fields
    if (!name || !phone || !message) {
      return res.status(400).json({
        success: false,
        message: "All fields are required (name, phone, message)",
      });
    }

    // Validate phone number format (basic validation)
    const phoneRegex = /^[+]?[\d\s\-\(\)]+$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid phone number",
      });
    }

    // Validate name length
    if (name.length < 2 || name.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Name must be between 2 and 100 characters",
      });
    }

    // Validate message length
    if (message.length < 10 || message.length > 1000) {
      return res.status(400).json({
        success: false,
        message: "Message must be between 10 and 1000 characters",
      });
    }

    // Sanitize input data
    const sanitizedFormData = {
      name: name.trim(),
      phone: phone.trim(),
      message: message.trim(),
    };

    console.log("📝 Contact form submission received:", {
      name: sanitizedFormData.name,
      phone: sanitizedFormData.phone,
      messageLength: sanitizedFormData.message.length,
    });

    // Send email to admin
    const emailResult = await emailService.sendContactFormToAdmin(
      sanitizedFormData
    );

    if (emailResult.success) {
      console.log("✅ Contact form email sent successfully");
      res.status(200).json({
        success: true,
        message: "Thank you for your message! We will get back to you soon.",
        data: {
          messageId: emailResult.messageId,
          mockMode: emailResult.mockMode || false,
        },
      });
    } else {
      throw new Error("Failed to send email");
    }
  } catch (error) {
    console.error("❌ Contact form submission error:", error);

    // Send appropriate error response
    if (error.message.includes("Email")) {
      res.status(500).json({
        success: false,
        message:
          "Sorry, we are experiencing technical difficulties. Please try contacting us via WhatsApp or phone.",
        fallback: {
          whatsapp: "+91 85709 59545",
          phone: "+91 85709 59545",
        },
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Something went wrong. Please try again.",
      });
    }
  }
};

// Get contact information (for frontend)
export const getContactInfo = async (req, res) => {
  try {
    const contactInfo = {
      address: {
        village: "Dhanora",
        tehsil: "Bharari",
        district: "Hoshangabad",
        state: "Madhya Pradesh",
        pincode: "461990",
        fullAddress:
          "Village Dhanora, Tehsil Bharari, District Hoshangabad, MP 461990",
      },
      phone: {
        primary: "+91 85709 59545",
        secondary: "+91 87654 32109",
      },
      email: {
        info: "info@legendsmilkcart.com",
        orders: "orders@legendsmilkcart.com",
      },
      businessHours: {
        weekdays: "Mon - Sat: 6:00 AM - 8:00 PM",
        sunday: "Sunday: 6:00 AM - 12:00 PM",
      },
      socialMedia: {
        whatsapp: "https://wa.me/918570959545",
        facebook: "#",
        instagram: "#",
        youtube: "#",
      },
    };

    res.status(200).json({
      success: true,
      data: contactInfo,
    });
  } catch (error) {
    console.error("❌ Get contact info error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve contact information",
    });
  }
};
