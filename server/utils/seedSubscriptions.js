import Subscription from "../models/Subscription.js";

const subscriptionPlans = [
  // Cow Milk 3L Plans
  {
    name: "30 Days Cow Milk 3L Daily",
    milkType: "cow",
    volume: "3L",
    duration: 30,
    price: 6300,
    description: "Fresh cow milk delivered daily for 30 days",
    features: [
      "Pure cow milk",
      "3L daily delivery",
      "Farm fresh quality",
      "Morning delivery",
    ],
  },
  {
    name: "15 Days Cow Milk 3L Daily",
    milkType: "cow",
    volume: "3L",
    duration: 15,
    price: 3150,
    description: "Fresh cow milk delivered daily for 15 days",
    features: [
      "Pure cow milk",
      "3L daily delivery",
      "Farm fresh quality",
      "Morning delivery",
    ],
  },
  {
    name: "7 Days Cow Milk 3L Daily",
    milkType: "cow",
    volume: "3L",
    duration: 7,
    price: 1470,
    description: "Fresh cow milk delivered daily for 7 days",
    features: [
      "Pure cow milk",
      "3L daily delivery",
      "Farm fresh quality",
      "Morning delivery",
    ],
  },

  // Buffalo Milk 3L Plans
  {
    name: "30 Days Buffalo Milk 3L Daily",
    milkType: "buffalo",
    volume: "3L",
    duration: 30,
    price: 7200,
    description: "Rich buffalo milk delivered daily for 30 days",
    features: [
      "Pure buffalo milk",
      "3L daily delivery",
      "Rich and creamy",
      "Morning delivery",
    ],
  },
  {
    name: "15 Days Buffalo Milk 3L Daily",
    milkType: "buffalo",
    volume: "3L",
    duration: 15,
    price: 3600,
    description: "Rich buffalo milk delivered daily for 15 days",
    features: [
      "Pure buffalo milk",
      "3L daily delivery",
      "Rich and creamy",
      "Morning delivery",
    ],
  },
  {
    name: "7 Days Buffalo Milk 3L Daily",
    milkType: "buffalo",
    volume: "3L",
    duration: 7,
    price: 1680,
    description: "Rich buffalo milk delivered daily for 7 days",
    features: [
      "Pure buffalo milk",
      "3L daily delivery",
      "Rich and creamy",
      "Morning delivery",
    ],
  },

  // Cow Milk 2L Plans
  {
    name: "30 Days Cow Milk 2L Daily",
    milkType: "cow",
    volume: "2L",
    duration: 30,
    price: 4200,
    description: "Fresh cow milk delivered daily for 30 days",
    features: [
      "Pure cow milk",
      "2L daily delivery",
      "Farm fresh quality",
      "Morning delivery",
    ],
  },
  {
    name: "15 Days Cow Milk 2L Daily",
    milkType: "cow",
    volume: "2L",
    duration: 15,
    price: 2100,
    description: "Fresh cow milk delivered daily for 15 days",
    features: [
      "Pure cow milk",
      "2L daily delivery",
      "Farm fresh quality",
      "Morning delivery",
    ],
  },
  {
    name: "7 Days Cow Milk 2L Daily",
    milkType: "cow",
    volume: "2L",
    duration: 7,
    price: 980,
    description: "Fresh cow milk delivered daily for 7 days",
    features: [
      "Pure cow milk",
      "2L daily delivery",
      "Farm fresh quality",
      "Morning delivery",
    ],
  },

  // Buffalo Milk 2L Plans
  {
    name: "30 Days Buffalo Milk 2L Daily",
    milkType: "buffalo",
    volume: "2L",
    duration: 30,
    price: 4800,
    description: "Rich buffalo milk delivered daily for 30 days",
    features: [
      "Pure buffalo milk",
      "2L daily delivery",
      "Rich and creamy",
      "Morning delivery",
    ],
  },
  {
    name: "15 Days Buffalo Milk 2L Daily",
    milkType: "buffalo",
    volume: "2L",
    duration: 15,
    price: 2400,
    description: "Rich buffalo milk delivered daily for 15 days",
    features: [
      "Pure buffalo milk",
      "2L daily delivery",
      "Rich and creamy",
      "Morning delivery",
    ],
  },
  {
    name: "7 Days Buffalo Milk 2L Daily",
    milkType: "buffalo",
    volume: "2L",
    duration: 7,
    price: 1120,
    description: "Rich buffalo milk delivered daily for 7 days",
    features: [
      "Pure buffalo milk",
      "2L daily delivery",
      "Rich and creamy",
      "Morning delivery",
    ],
  },

  // Cow Milk 1L Plans
  {
    name: "30 Days Cow Milk 1L Daily",
    milkType: "cow",
    volume: "1L",
    duration: 30,
    price: 2100,
    description: "Fresh cow milk delivered daily for 30 days",
    features: [
      "Pure cow milk",
      "1L daily delivery",
      "Farm fresh quality",
      "Morning delivery",
    ],
  },
  {
    name: "15 Days Cow Milk 1L Daily",
    milkType: "cow",
    volume: "1L",
    duration: 15,
    price: 1050,
    description: "Fresh cow milk delivered daily for 15 days",
    features: [
      "Pure cow milk",
      "1L daily delivery",
      "Farm fresh quality",
      "Morning delivery",
    ],
  },
  {
    name: "7 Days Cow Milk 1L Daily",
    milkType: "cow",
    volume: "1L",
    duration: 7,
    price: 490,
    description: "Fresh cow milk delivered daily for 7 days",
    features: [
      "Pure cow milk",
      "1L daily delivery",
      "Farm fresh quality",
      "Morning delivery",
    ],
  },

  // Buffalo Milk 1L Plans
  {
    name: "30 Days Buffalo Milk 1L Daily",
    milkType: "buffalo",
    volume: "1L",
    duration: 30,
    price: 2400,
    description: "Rich buffalo milk delivered daily for 30 days",
    features: [
      "Pure buffalo milk",
      "1L daily delivery",
      "Rich and creamy",
      "Morning delivery",
    ],
  },
  {
    name: "15 Days Buffalo Milk 1L Daily",
    milkType: "buffalo",
    volume: "1L",
    duration: 15,
    price: 1200,
    description: "Rich buffalo milk delivered daily for 15 days",
    features: [
      "Pure buffalo milk",
      "1L daily delivery",
      "Rich and creamy",
      "Morning delivery",
    ],
  },
  {
    name: "7 Days Buffalo Milk 1L Daily",
    milkType: "buffalo",
    volume: "1L",
    duration: 7,
    price: 560,
    description: "Rich buffalo milk delivered daily for 7 days",
    features: [
      "Pure buffalo milk",
      "1L daily delivery",
      "Rich and creamy",
      "Morning delivery",
    ],
  },
];

// Calculate daily price and add other fields for each plan
const processedPlans = subscriptionPlans.map((plan, index) => ({
  ...plan,
  dailyPrice: Math.round((plan.price / plan.duration) * 100) / 100,
  isActive: true,
  popularity: index < 6 ? 5 : index < 12 ? 3 : 1, // Give higher popularity to shorter duration plans
  discount: 0,
  originalPrice: plan.price,
}));

export const seedSubscriptions = async () => {
  try {
    console.log("🌱 Starting subscription plans seeding...");

    // Check if subscriptions already exist
    const existingCount = await Subscription.countDocuments();
    if (existingCount > 0) {
      console.log(
        `⚠️  ${existingCount} subscription plans already exist. Skipping seeding.`
      );
      return;
    }

    // Insert all subscription plans
    const insertedPlans = await Subscription.insertMany(processedPlans);
    console.log(
      `✅ Successfully seeded ${insertedPlans.length} subscription plans`
    );

    // Log some sample plans
    console.log("\n📋 Sample plans created:");
    insertedPlans.slice(0, 3).forEach((plan) => {
      console.log(`- ${plan.name}: ₹${plan.price} (₹${plan.dailyPrice}/day)`);
    });

    return insertedPlans;
  } catch (error) {
    console.error("❌ Error seeding subscription plans:", error);
    throw error;
  }
};

export const clearSubscriptions = async () => {
  try {
    console.log("🧹 Clearing all subscription plans...");
    const result = await Subscription.deleteMany({});
    console.log(`✅ Cleared ${result.deletedCount} subscription plans`);
    return result;
  } catch (error) {
    console.error("❌ Error clearing subscription plans:", error);
    throw error;
  }
};

// Export the plans data for reference
export { subscriptionPlans, processedPlans };
