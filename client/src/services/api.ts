import { Address } from "../types";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;
console.log(API_BASE_URL);

// Auth utility functions
const getAuthToken = (): string | null => {
  return localStorage.getItem("authToken");
};

const removeAuthToken = () => {
  localStorage.removeItem("authToken");
  localStorage.removeItem("user");
};

// Logout function that can be called from anywhere
const logoutUser = () => {
  removeAuthToken();
  // Redirect to home page or login page
  window.location.href = "/";
};

// Centralized API instance with token expiration handling
class ApiInstance {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const token = getAuthToken();

    // Add default headers
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    // Add auth token if available
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const url = `${this.baseURL}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Handle 401 Unauthorized - Token expired
      if (response.status === 401) {
        console.log("Token expired, logging out user");
        logoutUser();
        throw new Error("Authentication expired. Please login again.");
      }

      // Handle other error status codes
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      return response.json();
    } catch (error) {
      // Re-throw the error if it's already handled (like 401)
      if (
        error instanceof Error &&
        error.message.includes("Authentication expired")
      ) {
        throw error;
      }

      // Handle network errors
      if (error instanceof TypeError) {
        throw new Error("Network error. Please check your connection.");
      }

      throw error;
    }
  }

  // GET request
  async get(endpoint: string) {
    return this.request(endpoint, { method: "GET" });
  }

  // POST request
  async post(endpoint: string, data?: Record<string, unknown>) {
    return this.request(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // PUT request
  async put(endpoint: string, data?: Record<string, unknown>) {
    return this.request(endpoint, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // DELETE request
  async delete(endpoint: string, data?: Record<string, unknown>) {
    return this.request(endpoint, {
      method: "DELETE",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // PATCH request
  async patch(endpoint: string, data?: Record<string, unknown>) {
    return this.request(endpoint, {
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
    });
  }
}

// Create API instance
const api = new ApiInstance(API_BASE_URL);

// API service class using the centralized instance
export class ApiService {
  // Cart APIs
  static async addToCart(productId: string, quantity: number) {
    if (!getAuthToken()) throw new Error("Authentication required");
    return api.post("/cart", { productId, quantity });
  }

  static async getCart() {
    if (!getAuthToken()) throw new Error("Authentication required");
    return api.get("/cart");
  }

  static async updateCartItem(productId: string, quantity: number) {
    if (!getAuthToken()) throw new Error("Authentication required");
    return api.put(`/cart/${productId}`, { quantity });
  }

  static async removeFromCart(productId: string) {
    if (!getAuthToken()) throw new Error("Authentication required");
    return api.delete(`/cart/${productId}`);
  }

  static async clearCart() {
    if (!getAuthToken()) throw new Error("Authentication required");
    return api.delete("/cart");
  }

  // Order APIs
  static async placeOrder(orderData: {
    products: Array<{
      productId: string;
      quantity: number;
    }>;
    shippingAddress: {
      name: string;
      address: string;
      city: string;
      state: string;
      zipCode: string;
      phone?: string;
    };
    paymentMethod: "cod" | "online" | "wallet";
    deliveryShift: "morning" | "evening";
    deliveryDate?: string; // Add optional delivery date field
    customerNotes?: string;
  }) {
    if (!getAuthToken()) throw new Error("Authentication required");
    return api.post("/orders", orderData);
  }

  static async getMyOrders(page = 1, limit = 10, status?: string) {
    if (!getAuthToken()) throw new Error("Authentication required");

    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (status) {
      params.append("status", status);
    }

    return api.get(`/orders?${params}`);
  }

  static async getOrder(orderId: string) {
    if (!getAuthToken()) throw new Error("Authentication required");
    return api.get(`/orders/${orderId}`);
  }

  static async cancelOrder(orderId: string, reason: string) {
    if (!getAuthToken()) throw new Error("Authentication required");
    return api.delete(`/orders/${orderId}`, { reason });
  }

  // User Profile & Address APIs
  static async getUserProfile() {
    if (!getAuthToken()) throw new Error("Authentication required");
    return api.get("/auth/user");
  }

  static async updateUserAddress(
    userId: string,
    addressData: {
      label: string;
      address: string;
      city: string;
      state: string;
      zipCode: string;
      country?: string;
      isDefault?: boolean;
    }
  ) {
    if (!getAuthToken()) throw new Error("Authentication required");
    return api.put(`/auth/user/${userId}/address`, addressData);
  }

  // Legacy Address APIs (keeping for compatibility)
  static async getAddresses() {
    if (!getAuthToken()) throw new Error("Authentication required");
    return api.get("/address");
  }

  static async addAddress(addressData: Omit<Address, "id">) {
    if (!getAuthToken()) throw new Error("Authentication required");
    return api.post("/address", addressData);
  }

  // Email Authentication APIs (no auth required)
  static async emailSignup(name: string, email: string, password: string) {
    return api.post("/auth/register", { name, email, password });
  }

  static async emailLogin(email: string, password: string) {
    return api.post("/auth/login", { email, password });
  }

  static async verifyEmail(email: string, code: string) {
    return api.post("/auth/verify-email", { email, code });
  }

  static async resendVerificationCode(email: string) {
    return api.post("/auth/resend-verification-code", { email });
  }

  // Auth APIs (require token)
  static async changePassword(currentPassword: string, newPassword: string) {
    if (!getAuthToken()) throw new Error("Authentication required");
    return api.put("/auth/change-password", { currentPassword, newPassword });
  }

  static async updateProfile(name: string, phone?: string) {
    if (!getAuthToken()) throw new Error("Authentication required");
    return api.put("/auth/profile", { name, phone });
  }

  // Google Authentication API (no auth required)
  static async googleAuth(googleData: {
    googleId: string;
    email: string;
    name: string;
    avatar?: string;
  }) {
    return api.post("/auth/google", googleData);
  }

  // Product APIs (no auth required)
  static async getProducts() {
    return api.get("/products");
  }

  static async getProductById(productId: string) {
    return api.get(`/products/${productId}`);
  }

  // Payment APIs
  static async getUnpaidOrders() {
    if (!getAuthToken()) throw new Error("Authentication required");
    return api.get("/user-payments/unpaid-orders");
  }

  static async createPaymentSession(data: {
    orderIds: string[];
    metadata?: Record<string, unknown>;
  }) {
    if (!getAuthToken()) throw new Error("Authentication required");
    return api.post("/user-payments/create-payment", data);
  }

  static async markPaymentCompleted(
    paymentId: string,
    data: { upiTransactionId: string; upiReferenceNumber?: string }
  ) {
    if (!getAuthToken()) throw new Error("Authentication required");
    return api.post(`/user-payments/${paymentId}/mark-completed`, data);
  }

  static async getPaymentStatus(paymentId: string) {
    if (!getAuthToken()) throw new Error("Authentication required");
    return api.get(`/user-payments/${paymentId}`);
  }

  static async getPaymentHistory(page = 1, limit = 10, status = "all") {
    if (!getAuthToken()) throw new Error("Authentication required");
    return api.get(
      `/user-payments?page=${page}&limit=${limit}&status=${status}`
    );
  }

  // Auth helper methods
  static setAuthToken(token: string) {
    localStorage.setItem("authToken", token);
  }

  static removeAuthToken() {
    removeAuthToken();
  }

  static isAuthenticated(): boolean {
    return !!getAuthToken();
  }

  // Manual logout method
  static logout() {
    logoutUser();
  }
}

export default ApiService;
