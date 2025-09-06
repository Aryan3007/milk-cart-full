import dotenv from "dotenv";
dotenv.config();

export const paymentConfig = {
  // Admin UPI Configuration
  adminUpiId: process.env.ADMIN_UPI_ID || "admin@paytm",
  adminUpiName: process.env.ADMIN_UPI_NAME || "MilkCart Admin",
  adminMerchantCode: process.env.ADMIN_UPI_MERCHANT_CODE || "MILKCART",

  // QR Code Configuration
  qrCodeSize: 256,
  qrCodeFormat: "png",

  // Payment timeouts
  paymentTimeoutMinutes: 30,
  verificationTimeoutHours: 24,

  // Supported payment methods
  supportedMethods: ["upi", "card", "netbanking", "wallet"],

  // UPI URL format
  generateUpiUrl: (upiId, name, amount, transactionRef, note = "") => {
    const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(
      name,
    )}&am=${amount}&tr=${transactionRef}&tn=${encodeURIComponent(note)}&cu=INR`;
    return upiUrl;
  },

  // Validate UPI ID format
  isValidUpiId: (upiId) => {
    const upiRegex = /^[\w.-]+@[\w.-]+$/;
    return upiRegex.test(upiId);
  },
};

export default paymentConfig;
