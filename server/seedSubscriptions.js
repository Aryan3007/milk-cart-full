import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import { seedSubscriptions } from "./utils/seedSubscriptions.js";

// Connect to database
const connectDB = async () => {
  try {
    const connect = await mongoose.connect(process.env.MONGO_URL, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 1,
      maxIdleTimeMS: 30000,
      connectTimeoutMS: 20000,
    });
    console.log(`✅ Connected to MongoDB: ${connect.connection.host}`);
    return connect;
  } catch (error) {
    console.log(`❌ Error in MongoDB connection: ${error}`);
    process.exit(1);
  }
};

// Main seeding function
const runSeeding = async () => {
  try {
    console.log("🚀 Starting subscription seeding process...");

    // Connect to database
    await connectDB();

    // Seed subscription plans
    await seedSubscriptions();

    console.log("✅ Subscription seeding completed successfully!");
    console.log("\n📝 Next steps:");
    console.log("1. Start your backend server: npm start");
    console.log(
      "2. Access subscription plans via API: GET /api/v1/subscription/plans",
    );
    console.log(
      "3. Admin can manage plans via: /api/v1/subscription/admin/plans",
    );

    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
};

// Run the seeding
runSeeding();
