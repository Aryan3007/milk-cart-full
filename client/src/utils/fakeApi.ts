import { mockProducts, mockUser } from "./mockData";
import { Product, User, Order } from "../types";

// Simulate API delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const fakeApi = {
  // Products
  async getProducts(): Promise<Product[]> {
    await delay(800);
    return mockProducts;
  },

  async getProduct(id: string): Promise<Product | null> {
    await delay(500);
    return mockProducts.find((p) => p.id === id) || null;
  },

  async getProductsByCategory(category: string): Promise<Product[]> {
    await delay(600);
    if (category === "all") return mockProducts;
    return mockProducts.filter((p) => p.category === category);
  },

  // Auth
  async sendOTP(phone: string): Promise<{ success: boolean; otp: string }> {
    await delay(1000);
    return { success: true, otp: "123456" };
  },

  async verifyOTP(
    phone: string,
    otp: string,
  ): Promise<{ success: boolean; user?: User }> {
    await delay(800);
    if (otp === "123456") {
      return { success: true, user: { ...mockUser, phone } };
    }
    return { success: false };
  },

  // Orders
  async createOrder(
    orderData: Omit<Order, "id" | "orderDate">,
  ): Promise<Order> {
    await delay(1200);
    const order: Order = {
      ...orderData,
      id: Date.now().toString(),
      orderDate: new Date().toISOString(),
      status: "PENDING",
    };

    // Save to localStorage
    const existingOrders = JSON.parse(localStorage.getItem("orders") || "[]");
    existingOrders.push(order);
    localStorage.setItem("orders", JSON.stringify(existingOrders));

    return order;
  },

  async getOrders(userId: string): Promise<Order[]> {
    await delay(600);
    const orders = JSON.parse(localStorage.getItem("orders") || "[]");
    return orders.filter((order: Order) => order.userId === userId);
  },
};
