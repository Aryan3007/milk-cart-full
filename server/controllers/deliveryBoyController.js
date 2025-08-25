import jwt from "jsonwebtoken";
import DeliveryBoy from "../models/DeliveryBoy.js";
import rateLimit from "express-rate-limit";

// Rate limiting for delivery boy authentication endpoints
export const deliveryBoyAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs (increased from 10)
  message: {
    success: false,
    message: "Too many authentication attempts, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Separate rate limiting for delivery boy login (more restrictive)
export const deliveryBoyLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 login attempts per windowMs
  message: {
    success: false,
    message: "Too many login attempts, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Separate rate limiting for delivery boy registration (less restrictive)
export const deliveryBoyRegisterLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 registration attempts per windowMs
  message: {
    success: false,
    message: "Too many registration attempts, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Helper function to generate JWT token
const generateToken = (deliveryBoyId) => {
  return jwt.sign(
    { deliveryBoyId, userType: "deliveryBoy" },
    process.env.JWT_SECRET,
    { expiresIn: "30d" }
  );
};

// Helper function to format delivery boy response
const formatDeliveryBoyResponse = (deliveryBoy) => {
  return {
    id: deliveryBoy._id,
    name: deliveryBoy.name,
    email: deliveryBoy.email,
    phone: deliveryBoy.phone,
    age: deliveryBoy.age,
    shift: deliveryBoy.shift,
    address: deliveryBoy.address,
    isVerified: deliveryBoy.isVerified,
    isApproved: deliveryBoy.isApproved,
    status: deliveryBoy.status,
    avatar: deliveryBoy.avatar,
    lastLogin: deliveryBoy.lastLogin,
    totalDeliveries: deliveryBoy.totalDeliveries,
    rating: deliveryBoy.rating,
    totalRatings: deliveryBoy.totalRatings,
    canLogin: deliveryBoy.canLogin,
    createdAt: deliveryBoy.createdAt,
    updatedAt: deliveryBoy.updatedAt,
  };
};

// Helper function to validate password strength
const validatePassword = (password) => {
  if (password.length < 8) {
    return {
      valid: false,
      message: "Password must be at least 8 characters long",
    };
  }
  if (!/(?=.*[a-z])/.test(password)) {
    return {
      valid: false,
      message: "Password must contain at least one lowercase letter",
    };
  }
  if (!/(?=.*[A-Z])/.test(password)) {
    return {
      valid: false,
      message: "Password must contain at least one uppercase letter",
    };
  }
  if (!/(?=.*\d)/.test(password)) {
    return {
      valid: false,
      message: "Password must contain at least one number",
    };
  }
  return { valid: true };
};

// Register delivery boy
export const registerDeliveryBoy = async (req, res) => {
  try {
    const { name, email, password, phone, age, shift, address } = req.body;

    // Validate required fields (email is now optional)
    if (!name || !password || !phone || !age || !shift || !address) {
      return res.status(400).json({
        success: false,
        message:
          "All fields are required: name, password, phone, age, shift, address (email is optional)",
      });
    }

    // Validate email format if provided
    if (email && email.trim()) {
      const emailRegex = /\S+@\S+\.\S+/;
      if (!emailRegex.test(email.trim())) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid email address",
        });
      }
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.message,
      });
    }

    // Validate age
    if (age < 18 || age > 100) {
      return res.status(400).json({
        success: false,
        message: "Age must be between 18 and 100",
      });
    }

    // Validate shift
    if (!["morning", "evening", "both"].includes(shift)) {
      return res.status(400).json({
        success: false,
        message: "Shift must be 'morning', 'evening', or 'both'",
      });
    }

    // Check if delivery boy already exists with email or phone
    const existingDeliveryBoy = await DeliveryBoy.findOne({
      $or: [
        ...(email && email.trim() ? [{ email: email.toLowerCase() }] : []),
        { phone: phone.trim() }
      ],
    });

    if (existingDeliveryBoy) {
      return res.status(409).json({
        success: false,
        message: "Email or phone number is already registered",
      });
    }

    // Create new delivery boy
    const newDeliveryBoy = new DeliveryBoy({
      name: name.trim(),
      email: email && email.trim() ? email.toLowerCase().trim() : undefined,
      password,
      phone: phone.trim(),
      age: parseInt(age),
      shift: shift.toLowerCase(),
      address: address.trim(),
    });

    await newDeliveryBoy.save();

    res.status(201).json({
      success: true,
      message:
        "Registration successful! Your account is pending approval from admin.",
      data: {
        deliveryBoy: formatDeliveryBoyResponse(newDeliveryBoy),
      },
    });
  } catch (error) {
    console.error("Delivery boy registration error:", error);

    // Handle mongoose validation errors
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: messages[0] || "Validation failed",
      });
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(409).json({
        success: false,
        message: `${field} is already registered`,
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error during registration",
    });
  }
};

// Login delivery boy
export const loginDeliveryBoy = async (req, res) => {
  try {
    const { identifier, password } = req.body; // identifier can be email or phone

    // Validate required fields
    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: "Email/phone and password are required",
      });
    }

    // Find delivery boy by email or phone and include password field
    const isEmail = identifier.includes('@');
    const query = isEmail 
      ? { email: identifier.toLowerCase() }
      : { phone: identifier.trim() };
    
    const deliveryBoy = await DeliveryBoy.findOne(query).select("+password +loginAttempts +lockUntil");

    if (!deliveryBoy) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Check if account is locked
    if (deliveryBoy.isLocked) {
      return res.status(423).json({
        success: false,
        message:
          "Account is temporarily locked due to too many failed attempts. Please try again later.",
      });
    }

    // Check if delivery boy can login (approved and active)
    if (!deliveryBoy.canLogin) {
      let message = "Account access denied.";

      if (deliveryBoy.status === "pending") {
        message = "Your account is pending approval from admin.";
      } else if (deliveryBoy.status === "rejected") {
        message = "Your account has been rejected.";
      } else if (deliveryBoy.status === "suspended") {
        message = "Your account has been suspended.";
      } else if (!deliveryBoy.isActive) {
        message = "Your account is deactivated.";
      }

      return res.status(403).json({
        success: false,
        message,
      });
    }

    // Verify password
    const isPasswordValid = await deliveryBoy.comparePassword(password);
    if (!isPasswordValid) {
      await deliveryBoy.incLoginAttempts();
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Reset login attempts on successful login
    if (deliveryBoy.loginAttempts > 0) {
      await deliveryBoy.resetLoginAttempts();
    }

    // Update last login
    await deliveryBoy.updateLastLogin();

    // Generate JWT token
    const token = generateToken(deliveryBoy._id);

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        token,
        deliveryBoy: formatDeliveryBoyResponse(deliveryBoy),
      },
    });
  } catch (error) {
    console.error("Delivery boy login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during login",
    });
  }
};

// Get delivery boy profile by token
export const getDeliveryBoyProfile = async (req, res) => {
  try {
    const deliveryBoyId = req.deliveryBoyId; // From auth middleware

    const deliveryBoy = await DeliveryBoy.findById(deliveryBoyId);
    if (!deliveryBoy) {
      return res.status(404).json({
        success: false,
        message: "Delivery boy not found",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        deliveryBoy: formatDeliveryBoyResponse(deliveryBoy),
      },
    });
  } catch (error) {
    console.error("Get delivery boy profile error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching profile",
    });
  }
};

// Update delivery boy profile
export const updateDeliveryBoyProfile = async (req, res) => {
  try {
    const deliveryBoyId = req.deliveryBoyId; // From auth middleware
    const { name, phone, age, shift, address } = req.body;

    const deliveryBoy = await DeliveryBoy.findById(deliveryBoyId);
    if (!deliveryBoy) {
      return res.status(404).json({
        success: false,
        message: "Delivery boy not found",
      });
    }

    // Update fields if provided
    if (name) deliveryBoy.name = name.trim();
    if (phone) {
      // Check if phone is already taken by another delivery boy
      const existingDeliveryBoy = await DeliveryBoy.findOne({
        phone: phone.trim(),
        _id: { $ne: deliveryBoyId },
      });
      if (existingDeliveryBoy) {
        return res.status(409).json({
          success: false,
          message: "Phone number is already registered",
        });
      }
      deliveryBoy.phone = phone.trim();
    }
    if (age) deliveryBoy.age = parseInt(age);
    if (shift) deliveryBoy.shift = shift.toLowerCase();
    if (address) deliveryBoy.address = address.trim();

    await deliveryBoy.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: {
        deliveryBoy: formatDeliveryBoyResponse(deliveryBoy),
      },
    });
  } catch (error) {
    console.error("Update delivery boy profile error:", error);

    // Handle validation errors
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: messages[0] || "Validation failed",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error while updating profile",
    });
  }
};

// Change delivery boy password
export const changeDeliveryBoyPassword = async (req, res) => {
  try {
    const deliveryBoyId = req.deliveryBoyId; // From auth middleware
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    // Validate new password strength
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.message,
      });
    }

    const deliveryBoy = await DeliveryBoy.findById(deliveryBoyId).select(
      "+password"
    );
    if (!deliveryBoy) {
      return res.status(404).json({
        success: false,
        message: "Delivery boy not found",
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await deliveryBoy.comparePassword(
      currentPassword
    );
    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // Update password
    deliveryBoy.password = newPassword;
    await deliveryBoy.save();

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change delivery boy password error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while changing password",
    });
  }
};

// Get all delivery boys (for admin)
export const getAllDeliveryBoys = async (req, res) => {
  try {
    const { status, shift, page = 1, limit = 10, search } = req.query;

    // Build filter object
    const filter = {};
    if (status) filter.status = status;
    if (shift) filter.shift = shift;

    // Add search functionality
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex }
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    const deliveryBoys = await DeliveryBoy.find(filter)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await DeliveryBoy.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        deliveryBoys: deliveryBoys.map(formatDeliveryBoyResponse),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("Get all delivery boys error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching delivery boys",
    });
  }
};

// Approve delivery boy (for admin)
export const approveDeliveryBoy = async (req, res) => {
  try {
    const { deliveryBoyId } = req.params;
    const adminId = req.userId; // From auth middleware

    const deliveryBoy = await DeliveryBoy.findById(deliveryBoyId);
    if (!deliveryBoy) {
      return res.status(404).json({
        success: false,
        message: "Delivery boy not found",
      });
    }

    await deliveryBoy.approve(adminId);

    res.status(200).json({
      success: true,
      message: "Delivery boy approved successfully",
      data: {
        deliveryBoy: formatDeliveryBoyResponse(deliveryBoy),
      },
    });
  } catch (error) {
    console.error("Approve delivery boy error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while approving delivery boy",
    });
  }
};

// Reject delivery boy (for admin)
export const rejectDeliveryBoy = async (req, res) => {
  try {
    const { deliveryBoyId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required",
      });
    }

    const deliveryBoy = await DeliveryBoy.findById(deliveryBoyId);
    if (!deliveryBoy) {
      return res.status(404).json({
        success: false,
        message: "Delivery boy not found",
      });
    }

    await deliveryBoy.reject(reason);

    res.status(200).json({
      success: true,
      message: "Delivery boy rejected successfully",
      data: {
        deliveryBoy: formatDeliveryBoyResponse(deliveryBoy),
      },
    });
  } catch (error) {
    console.error("Reject delivery boy error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while rejecting delivery boy",
    });
  }
};

// Suspend delivery boy (for admin)
export const suspendDeliveryBoy = async (req, res) => {
  try {
    const { deliveryBoyId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: "Suspension reason is required",
      });
    }

    const deliveryBoy = await DeliveryBoy.findById(deliveryBoyId);
    if (!deliveryBoy) {
      return res.status(404).json({
        success: false,
        message: "Delivery boy not found",
      });
    }

    await deliveryBoy.suspend(reason);

    res.status(200).json({
      success: true,
      message: "Delivery boy suspended successfully",
      data: {
        deliveryBoy: formatDeliveryBoyResponse(deliveryBoy),
      },
    });
  } catch (error) {
    console.error("Suspend delivery boy error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while suspending delivery boy",
    });
  }
};
