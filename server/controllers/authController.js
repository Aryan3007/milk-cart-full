import jwt from "jsonwebtoken";
import User from "../models/User.js";
import emailService from "../utils/emailService.js";
import rateLimit from "express-rate-limit";

// Rate limiting for authentication endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: {
    success: false,
    message: "Too many authentication attempts, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for verification endpoints
export const verificationLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, // limit each IP to 5 verification attempts per windowMs
  message: {
    success: false,
    message: "Too many verification attempts, please try again later.",
  },
});

// Helper function to generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "30d" });
};

// Helper function to format user response
const formatUserResponse = (user) => {
  return {
    userId: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isVerified: user.isVerified,
    authProvider: user.authProvider,
    avatar: user.avatar,
    lastLogin: user.lastLogin,
    addresses: user.addresses,
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

// Register user with email/password
export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required",
      });
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.message,
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email is already registered",
      });
    }

    // Create new user
    const newUser = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      authProvider: "local",
      isVerified: false,
    });

    // Generate verification code
    const verificationCode = newUser.generateVerificationCode();
    await newUser.save();

    // Send verification email
    try {
      await emailService.sendVerificationEmail(
        email,
        verificationCode,
        "signup",
      );
    } catch (emailError) {
      // Email sending failed, but continue with registration
    }
    res.status(201).json({
      success: true,
      message:
        "Account created successfully. Please check your email for verification code.",
      data: {
        email: newUser.email,
        requiresVerification: true,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during registration",
    });
  }
};

// Login user with email/password
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Find user and include password field
    const user = await User.findOne({ email: email.toLowerCase() }).select(
      "+password +loginAttempts +lockUntil",
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Check if account is locked
    if (user.isLocked) {
      return res.status(423).json({
        success: false,
        message:
          "Account is temporarily locked due to too many failed attempts. Please try again later.",
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account is deactivated. Please contact support.",
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      await user.incLoginAttempts();
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Check if email is verified
    if (!user.isVerified) {
      // Generate new verification code
      const verificationCode = user.generateVerificationCode();
      await user.save();

      // Send verification email
      try {
        await emailService.sendVerificationEmail(
          email,
          verificationCode,
          "login",
        );
      } catch (emailError) {
        // Email sending failed
      }
      return res.status(403).json({
        success: false,
        message:
          "Please verify your email first. A new verification code has been sent.",
        data: {
          email: user.email,
          requiresVerification: true,
        },
      });
    }

    // Reset login attempts and update last login
    await user.resetLoginAttempts();
    await user.updateLastLogin();

    // Generate JWT token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        token,
        user: formatUserResponse(user),
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during login",
    });
  }
};

export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Check against environment variables
    if (
      email === process.env.ADMIN_LOGIN_EMAIL &&
      password === process.env.ADMIN_PASSWORD
    ) {
      // Generate JWT token for admin
      const token = jwt.sign(
        {
          userId: "admin",
          email: process.env.ADMIN_LOGIN_EMAIL,
          role: "admin",
          userType: "admin",
        },
        process.env.JWT_SECRET,
        { expiresIn: "24h" },
      );

      // Create admin user object for frontend
      const adminUser = {
        id: "admin",
        email: process.env.ADMIN_LOGIN_EMAIL,
        name: "Admin",
        role: "admin",
      };

      console.log("Admin Logged In Successfully");
      return res.status(200).json({
        success: true,
        message: "Admin login successful",
        token,
        user: adminUser,
      });
    } else {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during admin login",
      error: error.message,
    });
  }
};

// Controller to fetch all users
export const getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";

    // Validate pagination parameters
    if (page < 1) {
      return res.status(400).json({
        success: false,
        message: "Page number must be greater than 0",
      });
    }

    if (limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        message: "Limit must be between 1 and 100",
      });
    }

    // Calculate skip value for pagination
    const skip = (page - 1) * limit;

    // Build search query
    let searchQuery = {};
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");
      searchQuery = {
        $or: [
          { name: searchRegex },
          { email: searchRegex },
          { phone: searchRegex },
        ],
      };
    }

    // Get total count for pagination
    const totalUsers = await User.countDocuments(searchQuery);

    // Get paginated users
    const users = await User.find(searchQuery)
      .select("-password -verificationCode -verificationCodeExpiry")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }); // Sort by newest first

    const totalPages = Math.ceil(totalUsers / limit);

    res.status(200).json({
      success: true,
      message: "Fetched all users successfully",
      data: users.map(formatUserResponse),
      pagination: {
        currentPage: page,
        totalPages,
        totalUsers,
        usersPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching users",
    });
  }
};

// Get user details with order statistics
export const getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    // Import Order model
    const Order = (await import("../models/Order.js")).default;

    // Get user details
    const user = await User.findById(userId).select(
      "-password -verificationCode -verificationCodeExpiry",
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Get user's orders
    const userOrders = await Order.find({ userId: userId })
      .populate("items.productId", "name price")
      .sort({ createdAt: -1 });

    // Calculate statistics
    const totalOrders = userOrders.length;
    const nonCancelledOrders = userOrders.filter(
      (order) => order.status !== "cancelled",
    );
    const totalSpent = nonCancelledOrders.reduce(
      (sum, order) => sum + (order.totalAmount || 0),
      0,
    );
    const avgOrderValue =
      nonCancelledOrders.length > 0
        ? totalSpent / nonCancelledOrders.length
        : 0;

    // Get last order date
    const lastOrder = userOrders.length > 0 ? userOrders[0].createdAt : null;

    // Format orders for response
    const formattedOrders = userOrders.map((order) => ({
      id: order._id,
      orderDate: order.createdAt,
      items: order.items.map((item) => ({
        productName:
          item.productName || item.productId?.name || "Product not available",
        quantity: item.quantity,
        price: item.price,
        unit: item.unit || "units",
      })),
      totalAmount: order.totalAmount,
      status: order.status,
    }));

    res.status(200).json({
      success: true,
      message: "User details fetched successfully",
      data: {
        user: formatUserResponse(user),
        statistics: {
          totalOrders,
          totalSpent: totalSpent.toFixed(2),
          avgOrderValue: avgOrderValue.toFixed(2),
          lastOrder: lastOrder ? lastOrder.toISOString() : null,
        },
        orders: formattedOrders,
      },
    });
  } catch (error) {
    console.error("Error fetching user details:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching user details",
    });
  }
};

// Export user data
export const exportUserData = async (req, res) => {
  try {
    const { userId } = req.params;
    const { format } = req.query; // 'pdf' or 'excel'

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    if (!format || !["pdf", "excel"].includes(format)) {
      return res.status(400).json({
        success: false,
        message: "Export format must be 'pdf' or 'excel'",
      });
    }

    // Import Order model
    const Order = (await import("../models/Order.js")).default;

    // Get user details
    const user = await User.findById(userId).select(
      "-password -verificationCode -verificationCodeExpiry",
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Get user's orders
    const userOrders = await Order.find({ userId: userId })
      .populate("items.productId", "name price")
      .sort({ createdAt: -1 });

    // Calculate statistics
    const totalOrders = userOrders.length;
    const nonCancelledOrders = userOrders.filter(
      (order) => order.status !== "cancelled",
    );
    const totalSpent = nonCancelledOrders.reduce(
      (sum, order) => sum + (order.totalAmount || 0),
      0,
    );
    const avgOrderValue =
      nonCancelledOrders.length > 0
        ? totalSpent / nonCancelledOrders.length
        : 0;
    const lastOrder = userOrders.length > 0 ? userOrders[0].createdAt : null;

    // Format data for export
    const exportData = {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || "Not provided",
        address: user.addresses?.[0]?.address || "Not provided",
        joinedDate: user.createdAt,
        isVerified: user.isVerified,
        lastLogin: user.lastLogin,
      },
      statistics: {
        totalOrders,
        totalSpent: totalSpent.toFixed(2),
        avgOrderValue: avgOrderValue.toFixed(2),
        lastOrder: lastOrder ? lastOrder.toISOString() : null,
      },
      orders: userOrders.map((order) => ({
        orderId: order._id,
        orderDate: order.createdAt,
        items: order.items.map((item) => ({
          productName:
            item.productName || item.productId?.name || "Product not available",
          quantity: item.quantity,
          price: item.price,
          unit: item.unit || "units",
          total: (item.quantity * item.price).toFixed(2),
        })),
        totalAmount: order.totalAmount,
        status: order.status,
      })),
    };

    res.status(200).json({
      success: true,
      message: "User data prepared for export",
      data: exportData,
      exportFormat: format,
    });
  } catch (error) {
    console.error("Error exporting user data:", error);
    res.status(500).json({
      success: false,
      message: "Server error while exporting user data",
    });
  }
};

// Verify email with code
export const verifyEmail = async (req, res) => {
  try {
    const { email, code } = req.body;

    // Validate required fields
    if (!email || !code) {
      return res.status(400).json({
        success: false,
        message: "Email and verification code are required",
      });
    }

    // Find user with verification code
    const user = await User.findOne({ email: email.toLowerCase() }).select(
      "+verificationCode +verificationCodeExpiry",
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Verify the code
    if (!user.verifyCode(code)) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification code",
      });
    }

    // Mark user as verified and clear verification code
    user.isVerified = true;
    user.clearVerificationCode();
    await user.updateLastLogin();
    await user.save();

    // Generate JWT token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: "Email verified successfully",
      data: {
        token,
        user: formatUserResponse(user),
      },
    });
  } catch (error) {
    console.error("Email verification error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during email verification",
    });
  }
};

// Resend verification code
export const resendVerificationCode = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Email is already verified",
      });
    }

    // Generate new verification code
    const verificationCode = user.generateVerificationCode();
    await user.save();

    // Send verification email
    try {
      await emailService.sendVerificationEmail(
        email,
        verificationCode,
        "verification",
      );

      res.status(200).json({
        success: true,
        message: "Verification code sent successfully",
        data: {
          email: user.email,
        },
      });
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);
      res.status(500).json({
        success: false,
        message: "Failed to send verification email. Please try again.",
      });
    }
  } catch (error) {
    console.error("Resend verification error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// Google Auth0 authentication
export const googleAuth = async (req, res) => {
  try {
    const { googleId, email, name, avatar } = req.body;

    // Validate required fields
    if (!googleId || !email || !name) {
      return res.status(400).json({
        success: false,
        message: "Google ID, email, and name are required",
      });
    }

    // Check if user exists by email or Google ID
    let user = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { googleId: googleId }],
    });

    if (user) {
      // Update existing user with Google info if needed
      let userUpdated = false;

      if (!user.googleId) {
        user.googleId = googleId;
        user.authProvider = "google";
        userUpdated = true;
      }

      if (!user.isVerified) {
        user.isVerified = true; // Google users are automatically verified
        userUpdated = true;
      }

      if (avatar && user.avatar !== avatar) {
        user.avatar = avatar;
        userUpdated = true;
      }

      if (userUpdated) {
        await user.save();
      }

      await user.updateLastLogin();
    } else {
      // Create new user with Google data
      user = new User({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        googleId,
        avatar,
        authProvider: "google",
        isVerified: true, // Google users are automatically verified
      });

      await user.save();
      await user.updateLastLogin();
    }

    // Generate JWT token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: "Google authentication successful",
      data: {
        token,
        user: formatUserResponse(user),
      },
    });
  } catch (error) {
    console.error("Google authentication error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during Google authentication",
    });
  }
};

// Google JWT Authentication
export const googleJWTAuth = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        success: false,
        message: "Google credential is required",
      });
    }

    // Decode the JWT credential from Google
    try {
      // In a real implementation, you would verify this with Google's public keys
      // For now, we'll decode the JWT payload (this is NOT secure for production)
      const payload = JSON.parse(
        Buffer.from(credential.split(".")[1], "base64").toString(),
      );

      const googleId = payload.sub;
      const email = payload.email;
      const name = payload.name;
      const avatar = payload.picture;

      if (!googleId || !email || !name) {
        return res.status(400).json({
          success: false,
          message: "Invalid Google credential format",
        });
      }

      // Process the same way as regular Google auth
      // Check if user exists by email or Google ID
      let user = await User.findOne({
        $or: [{ email: email.toLowerCase() }, { googleId: googleId }],
      });

      if (user) {
        // Update existing user with Google info if needed
        let userUpdated = false;

        if (!user.googleId) {
          user.googleId = googleId;
          user.authProvider = "google";
          userUpdated = true;
        }

        if (!user.isVerified) {
          user.isVerified = true;
          userUpdated = true;
        }

        if (avatar && user.avatar !== avatar) {
          user.avatar = avatar;
          userUpdated = true;
        }

        if (userUpdated) {
          await user.save();
        }

        await user.updateLastLogin();
      } else {
        // Create new user with Google data
        user = new User({
          name: name.trim(),
          email: email.toLowerCase().trim(),
          googleId,
          avatar,
          authProvider: "google",
          isVerified: true,
        });

        await user.save();
        await user.updateLastLogin();
      }

      // Generate JWT token
      const token = generateToken(user._id);

      res.status(200).json({
        success: true,
        message: "Google authentication successful",
        data: {
          token,
          user: formatUserResponse(user),
        },
      });
    } catch (jwtError) {
      console.error("JWT decode error:", jwtError);
      return res.status(400).json({
        success: false,
        message: "Invalid Google credential",
      });
    }
  } catch (error) {
    console.error("Google JWT authentication error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during Google authentication",
    });
  }
};

// Get authenticated user details
export const getUserByToken = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "User fetched successfully",
      data: {
        user: formatUserResponse(user),
      },
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// Verify JWT token - lightweight endpoint for token validation
export const verifyToken = async (req, res) => {
  try {
    // If we reach here, the token is valid (thanks to isAuthenticated middleware)
    res.status(200).json({
      success: true,
      message: "Token is valid",
      data: {
        userId: req.user.userId,
        role: req.user.role,
        userType: req.user.userType || "user",
        valid: true,
      },
    });
  } catch (error) {
    console.error("Token verification error:", error);
    res.status(401).json({
      success: false,
      message: "Token verification failed",
    });
  }
};

// Update user profile
export const updateUserProfile = async (req, res) => {
  try {
    const { name, phone } = req.body;
    const userId = req.user.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Update fields if provided
    if (name) user.name = name.trim();
    if (phone) user.phone = phone.trim();

    await user.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: {
        user: formatUserResponse(user),
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during profile update",
    });
  }
};

// Add or update user address
export const updateUserAddress = async (req, res) => {
  try {
    const { userId } = req.params;
    const { label, address, city, state, zipCode, country, isDefault } =
      req.body;

    // Validate required fields
    if (!label || !address || !city || !state || !zipCode) {
      return res.status(400).json({
        success: false,
        message: "Label, address, city, state, and zipCode are required",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if user already has 5 addresses (maximum limit)
    if (user.addresses.length >= 5) {
      // Check if we're updating an existing address
      const existingAddressIndex = user.addresses.findIndex(
        (addr) => addr.label.toLowerCase() === label.toLowerCase(),
      );

      if (existingAddressIndex === -1) {
        return res.status(400).json({
          success: false,
          message:
            "Maximum of 5 addresses allowed. Please update an existing address or delete one first.",
        });
      }
    }

    // If this is set as default, remove default from others
    if (isDefault) {
      user.addresses.forEach((addr) => {
        addr.isDefault = false;
      });
    }

    // Check if address with same label exists
    const existingAddressIndex = user.addresses.findIndex(
      (addr) => addr.label.toLowerCase() === label.toLowerCase(),
    );

    const newAddress = {
      label: label.trim(),
      address: address.trim(),
      city: city.trim(),
      state: state.trim(),
      zipCode: zipCode.trim(),
      country: country?.trim() || "India",
      isDefault: isDefault || false,
    };

    if (existingAddressIndex !== -1) {
      // Update existing address
      user.addresses[existingAddressIndex] = newAddress;
    } else {
      // Add new address
      user.addresses.push(newAddress);
    }

    // If this is the first address, make it default
    if (user.addresses.length === 1) {
      user.addresses[0].isDefault = true;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message:
        existingAddressIndex !== -1
          ? "Address updated successfully"
          : "Address added successfully",
      data: {
        addresses: user.addresses,
      },
    });
  } catch (error) {
    console.error("Update/Add address error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during address operation",
    });
  }
};

// Delete user address
export const deleteUserAddress = async (req, res) => {
  try {
    const { userId } = req.params;
    const { addressId } = req.body;

    if (!addressId) {
      return res.status(400).json({
        success: false,
        message: "Address ID is required",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Find and remove the address
    const addressIndex = user.addresses.findIndex(
      (addr) => addr._id.toString() === addressId,
    );

    if (addressIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    const wasDefault = user.addresses[addressIndex].isDefault;
    user.addresses.splice(addressIndex, 1);

    // If deleted address was default and there are remaining addresses, make the first one default
    if (wasDefault && user.addresses.length > 0) {
      user.addresses[0].isDefault = true;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: "Address deleted successfully",
      data: {
        addresses: user.addresses,
      },
    });
  } catch (error) {
    console.error("Delete address error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during address deletion",
    });
  }
};

// Change password
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId;

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

    // Find user with password
    const user = await User.findById(userId).select("+password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if user has a password (Google users might not have one)
    if (!user.password) {
      return res.status(400).json({
        success: false,
        message: "Cannot change password for Google authenticated users",
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during password change",
    });
  }
};

// Test email endpoint for debugging
export const testEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required for testing",
      });
    }

    console.log(`🧪 Testing email functionality for: ${email}`);

    const result = await emailService.testEmail(email);

    res.status(200).json({
      success: true,
      message: "Test email sent successfully",
      data: result,
    });
  } catch (error) {
    console.error("Test email error:", error);
    res.status(500).json({
      success: false,
      message: `Test email failed: ${error.message}`,
    });
  }
};
