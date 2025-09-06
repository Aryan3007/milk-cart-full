import mongoose from "mongoose";
import UserSubscription from "./models/UserSubscription.js";

// Connect to MongoDB
await mongoose.connect("mongodb://localhost:27017/milkcart");

try {
  // Find subscriptions with active status but pending payment
  const subscriptions = await UserSubscription.find({
    status: "active",
    paymentStatus: "pending",
  });

  console.log(
    `Found ${subscriptions.length} subscriptions with active status but pending payment`,
  );

  if (subscriptions.length > 0) {
    // Update them to pending status
    await UserSubscription.updateMany(
      { status: "active", paymentStatus: "pending" },
      { status: "pending" },
    );
    console.log("Updated subscriptions to pending status");
  }

  console.log("Script completed successfully");
} catch (error) {
  console.error("Error updating subscriptions:", error);
} finally {
  await mongoose.disconnect();
  process.exit(0);
}
