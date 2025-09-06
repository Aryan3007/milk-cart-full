import { seedSubscriptions } from "./seedSubscriptions.js";

export const initializeDatabase = async () => {
  try {
    console.log("🚀 Initializing database...");

    // Seed subscription plans
    await seedSubscriptions();

    console.log("✅ Database initialization completed successfully!");
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    throw error;
  }
};

// Call this function to manually seed data
export const manualSeed = async () => {
  try {
    await initializeDatabase();
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
};
