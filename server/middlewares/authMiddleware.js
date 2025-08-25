import jwt from "jsonwebtoken";
import User from "../models/User.js";
import DeliveryBoy from "../models/DeliveryBoy.js";

// Middleware to check if the user is authenticated
export const isAuthenticated = async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Authorization header required",
      });
    }

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Bearer token required",
      });
    }

    const token = authHeader.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authorization token required",
      });
    }

    // Verify JWT secret exists
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET environment variable is not set");
      return res.status(500).json({
        success: false,
        message: "Server configuration error",
      });
    }

    // Verify and decode the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Handle admin tokens differently
    if (decoded.userType === "admin" && decoded.userId === "admin") {
      req.user = {
        userId: "admin",
        email: decoded.email,
        name: "Admin",
        role: "admin",
        userType: "admin",
      };
      return next();
    }

    // Handle both old and new token formats during transition
    const userId = decoded.userId || decoded.id;

    if (!userId) {
      console.error("Token missing userId/id field:", decoded);
      return res.status(401).json({
        success: false,
        message: "Invalid token format",
      });
    }

    // Find the user in database
    const user = await User.findById(userId);

    if (!user) {
      console.error(`User not found for ID: ${userId}`);
      return res.status(401).json({
        success: false,
        message: "User not found from authentication",
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account is deactivated",
      });
    }

    // Attach user info to request
    req.user = {
      userId: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    next(); // Proceed to the next middleware or route handler
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token has expired",
      });
    }

    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    console.error("Authentication error:", err);
    return res.status(401).json({
      success: false,
      message: "Authentication failed",
    });
  }
};

// Middleware specifically for admin authentication
export const isAdminAuthenticated = async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Authorization header required",
      });
    }

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Bearer token required",
      });
    }

    const token = authHeader.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authorization token required",
      });
    }

    // Verify JWT secret exists
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET environment variable is not set");
      return res.status(500).json({
        success: false,
        message: "Server configuration error",
      });
    }

    // Verify and decode the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if this is a valid admin token
    if (
      decoded.userType === "admin" &&
      decoded.userId === "admin" &&
      decoded.role === "admin"
    ) {
      req.user = {
        userId: "admin",
        email: decoded.email,
        name: "Admin",
        role: "admin",
        userType: "admin",
      };
      return next();
    }

    // If not an admin token, reject
    return res.status(403).json({
      success: false,
      message: "Access denied. Admin rights required.",
    });
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Admin token has expired",
      });
    }

    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid admin token",
      });
    }

    console.error("Admin authentication error:", err);
    return res.status(401).json({
      success: false,
      message: "Admin authentication failed",
    });
  }
};

export const isSeller = async (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ message: "Authorization token required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Handle both old and new token formats during transition
    const userId = decoded.userId || decoded.id;

    // Fetch the user from the database to ensure the latest role
    const user = await User.findById(userId);

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (user.role !== "seller") {
      return res
        .status(403)
        .json({ message: "Access denied. Only sellers are allowed." });
    }

    // Attach user data to request object
    req.user = { id: user._id, role: user.role };
    next();
  } catch (err) {
    console.error(err);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

export const isAdmin = (req, res, next) => {
  // Check if the user exists (should be set by isAuthenticated middleware)
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  // Check if they are an admin
  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Admin rights required.",
    });
  }

  next(); // Proceed to the next middleware or route handler
};

// Middleware to check if the delivery boy is authenticated
export const isDeliveryBoyAuthenticated = async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Authorization header required",
      });
    }

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Bearer token required",
      });
    }

    const token = authHeader.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authorization token required",
      });
    }

    // Verify JWT secret exists
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET environment variable is not set");
      return res.status(500).json({
        success: false,
        message: "Server configuration error",
      });
    }

    // Verify and decode the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if decoded token has deliveryBoyId and is of type deliveryBoy
    if (!decoded.deliveryBoyId || decoded.userType !== "deliveryBoy") {
      return res.status(401).json({
        success: false,
        message: "Invalid token format",
      });
    }

    // Find the delivery boy in database
    const deliveryBoy = await DeliveryBoy.findById(decoded.deliveryBoyId);

    if (!deliveryBoy) {
      return res.status(401).json({
        success: false,
        message: "Delivery boy not found",
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

    // Attach delivery boy info to request
    req.deliveryBoy = {
      deliveryBoyId: deliveryBoy._id,
      email: deliveryBoy.email,
      name: deliveryBoy.name,
      phone: deliveryBoy.phone,
      shift: deliveryBoy.shift,
      status: deliveryBoy.status,
    };

    // For backward compatibility, also set req.deliveryBoyId
    req.deliveryBoyId = deliveryBoy._id;

    next(); // Proceed to the next middleware or route handler
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token has expired",
      });
    }

    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    console.error("Delivery boy authentication error:", err);
    return res.status(401).json({
      success: false,
      message: "Authentication failed",
    });
  }
};
