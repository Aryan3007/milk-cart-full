export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  image: string;
  hoverImage?: string;
  category: string;
  stock: number;
  badges: string[];
  rating: number;
  reviews: number;
  unit: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  itemId?: string; // Cart item ID for API operations
}

export interface User {
  id: string;
  userId: string; // Backend returns userId from /auth/user endpoint
  name: string;
  phone: string;
  email?: string;
  addresses: Address[];
}

export interface Address {
  id: string;
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

export interface Order {
  id: string;
  userId: string;
  items: CartItem[];
  total: number;
  subtotal?: number;
  shippingFee?: number;
  tax?: number;
  discount?: number;
  deliveryAddress: Address;
  paymentMethod: "COD" | "UPI" | "CARD";
  status: "PENDING" | "CONFIRMED" | "DELIVERED" | "CANCELLED";
  paymentStatus?: string;
  orderDate: string;
  deliveryDate?: string;
  deliveryShift?: string;
  adminNotes?: string;
  cancellationReason?: string;
  cancelledBy?: "user" | "admin";
  confirmedAt?: string;
  cancelledAt?: string;
  deliveredAt?: string;
  canBeCancelled?: boolean;
  cancellationMessage?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
}

export interface CartState {
  items: CartItem[];
  total: number;
  itemCount: number;
}
