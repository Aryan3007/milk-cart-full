import dotenv from "dotenv";
dotenv.config();
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import mongoose from "mongoose";
import authRouter from "./routes/authRoute.js";
import productRouter from "./routes/productRoute.js";
import categoryrouter from "./routes/categoryRoutes.js";
import cartrouter from "./routes/cartRoute.js";
import orderRouter from "./routes/orderRoute.js";
import wishlistrouter from "./routes/wishlistRoute.js";
import paymentrouter from "./routes/paymentRoute.js";
import userPaymentRouter from "./routes/userPayments.js";
import contactRouter from "./routes/contactRoute.js";
import googleAuthRouter from "./routes/googleAuthRoute.js";
import deliveryBoyRouter from "./routes/deliveryBoyRoute.js";
import adminDashboardRouter from "./routes/adminDashboardRoute.js";
import subscriptionRouter from "./routes/subscriptionRoute.js";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded

// Connect to database
const connectDB = async () => {
  try {
    const connect = await mongoose.connect(process.env.MONGO_URL, {
      serverSelectionTimeoutMS: 30000, // 30 seconds
      socketTimeoutMS: 45000, // 45 seconds
      maxPoolSize: 10, // Maximum number of connections in the connection pool
      minPoolSize: 1, // Minimum number of connections in the connection pool
      maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
      connectTimeoutMS: 20000, // How long to wait for a connection to be established
    });
    console.log(`Connected to MongoDB: ${connect.connection.host}`);

    // Handle connection events
    mongoose.connection.on("error", (err) => {
      console.error("MongoDB connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      console.log("MongoDB disconnected");
    });

    mongoose.connection.on("reconnected", () => {
      console.log("MongoDB reconnected");
    });
  } catch (error) {
    console.log(`Error in MongoDB connection: ${error}`);
    process.exit(1); // Exit the process with failure
  }
};
connectDB();

app.use("/api/v1/auth", authRouter);
app.use("/api/v1", productRouter);
app.use("/api/v1/category", categoryrouter);
app.use("/api/v1/cart", cartrouter);
app.use("/api/v1/orders", orderRouter);
app.use("/api/v1/wishlist", wishlistrouter);
app.use("/api/v1/payment", paymentrouter);
app.use("/api/v1/user-payments", userPaymentRouter);
app.use("/api/v1/contact", contactRouter);
app.use("/api/v1/google-auth", googleAuthRouter);
app.use("/api/v1/delivery-boy", deliveryBoyRouter);
app.use("/api/v1/admin", adminDashboardRouter);
app.use("/api/v1/subscription", subscriptionRouter);

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
