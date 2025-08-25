import Category from "../models/Category.js";

// Default milk product categories
const defaultCategories = [
  {
    name: "Dairy",
    description: "All dairy products including milk, cheese, and yogurt",
  },
  {
    name: "Fresh Milk",
    description: "Fresh cow and buffalo milk varieties",
  },
  {
    name: "Cheese & Paneer",
    description: "Various types of cheese and fresh paneer",
  },
  {
    name: "Yogurt & Curd",
    description: "Fresh yogurt, curd, and fermented dairy products",
  },
  {
    name: "Butter & Ghee",
    description: "Fresh butter, ghee, and cooking fats",
  },
  {
    name: "Ice Cream",
    description: "Various flavors of ice cream and frozen desserts",
  },
];

export const seedCategories = async () => {
  try {
    console.log("🌱 Seeding default categories...");
    
    // Wait a bit for connection to fully stabilize
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if categories already exist
    const existingCategories = await Category.find({}).limit(1);
    
    if (existingCategories.length > 0) {
      console.log("📦 Categories already exist, skipping seed");
      console.log(`   Found: ${existingCategories[0].name}`);
      return existingCategories;
    }

    console.log("📝 Creating default categories...");
    
    // Insert default categories one by one to avoid bulk insert issues
    const createdCategories = [];
    for (const categoryData of defaultCategories) {
      try {
        const category = new Category(categoryData);
        const saved = await category.save();
        createdCategories.push(saved);
        console.log(`   ✓ Created: ${saved.name}`);
      } catch (error) {
        console.log(`   ⚠️ Failed to create ${categoryData.name}: ${error.message}`);
      }
    }
    
    console.log(`✅ Successfully seeded ${createdCategories.length} categories`);
    return createdCategories;
  } catch (error) {
    console.error("❌ Error seeding categories:", error.message);
    // Don't throw error to prevent server crash
    return [];
  }
};
