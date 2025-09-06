import mongoose from "mongoose";
import Payment from "./models/Payment.js";
import UserSubscription from "./models/UserSubscription.js";

// Connect to MongoDB
await mongoose.connect("mongodb://localhost:27017/milkcart");

try {
  console.log("Testing payment flow...");

  // Find a payment with paymentId
  const paymentId = "PAY-1752857559752-0295";
  const payment = await Payment.findOne({ paymentId });

  if (payment) {
    console.log("Payment found:");
    console.log("- Payment ID:", payment.paymentId);
    console.log("- Payment Status:", payment.paymentStatus);
    console.log("- Verification Status:", payment.verificationStatus);
    console.log("- UPI Transaction ID:", payment.upiTransactionId);
    console.log("- Subscription ID:", payment.subscriptionId);

    if (payment.subscriptionId) {
      const subscription = await UserSubscription.findById(
        payment.subscriptionId,
      );
      if (subscription) {
        console.log("\nSubscription found:");
        console.log("- Subscription ID:", subscription._id);
        console.log("- Status:", subscription.status);
        console.log("- Payment Status:", subscription.paymentStatus);
        console.log("- Order ID:", subscription.orderId);
      } else {
        console.log("\nSubscription not found for ID:", payment.subscriptionId);
      }
    } else {
      console.log("\nNo subscription ID in payment");
    }
  } else {
    console.log("Payment not found with ID:", paymentId);
  }
} catch (error) {
  console.error("Error:", error);
} finally {
  await mongoose.disconnect();
  process.exit(0);
}
