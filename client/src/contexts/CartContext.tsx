import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useRef,
} from "react";
import { CartState, CartItem, Product } from "../types";
import ApiService from "../services/api";
import {
  warningToastHandler,
  successToastHandler,
  errorToastHandler,
} from "../utils/toastUtils";

interface CartContextType extends CartState {
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  loadCart: () => void;
  isLoading: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

type CartAction =
  | { type: "CLEAR_CART" }
  | { type: "LOAD_CART"; payload: CartItem[] }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "UPDATE_QUANTITY"; productId: string; quantity: number }
  | { type: "REMOVE_ITEM"; productId: string };

const cartReducer = (
  state: CartState & { isLoading: boolean },
  action: CartAction,
): CartState & { isLoading: boolean } => {
  switch (action.type) {
    case "CLEAR_CART":
      return { ...state, items: [], total: 0, itemCount: 0 };

    case "LOAD_CART": {
      const items = action.payload;
      const total = items.reduce(
        (sum, item) => sum + item.product.price * item.quantity,
        0,
      );
      const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
      return { ...state, items, total, itemCount };
    }

    case "SET_LOADING":
      return { ...state, isLoading: action.payload };

    case "UPDATE_QUANTITY": {
      const updatedItems = state.items.map((item) =>
        item.product.id === action.productId
          ? { ...item, quantity: action.quantity }
          : item,
      );
      const total = updatedItems.reduce(
        (sum, item) => sum + item.product.price * item.quantity,
        0,
      );
      const itemCount = updatedItems.reduce(
        (sum, item) => sum + item.quantity,
        0,
      );
      return { ...state, items: updatedItems, total, itemCount };
    }

    case "REMOVE_ITEM": {
      const updatedItems = state.items.filter(
        (item) => item.product.id !== action.productId,
      );
      const total = updatedItems.reduce(
        (sum, item) => sum + item.product.price * item.quantity,
        0,
      );
      const itemCount = updatedItems.reduce(
        (sum, item) => sum + item.quantity,
        0,
      );
      return { ...state, items: updatedItems, total, itemCount };
    }

    default:
      return state;
  }
};

const initialState: CartState & { isLoading: boolean } = {
  items: [],
  total: 0,
  itemCount: 0,
  isLoading: false,
};

// Debounce function
const debounce = (func: (...args: unknown[]) => void, wait: number) => {
  let timeout: NodeJS.Timeout;
  return (...args: unknown[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);
  const pendingUpdates = useRef<Map<string, number>>(new Map());

  // Load cart only once on mount
  useEffect(() => {
    loadCart();
  }, []);

  // Sync pending updates before unmount
  useEffect(() => {
    const syncNow = async () => {
      const updates = Array.from(pendingUpdates.current.entries());
      if (updates.length === 0) return;

      try {
        for (const [itemId, quantity] of updates) {
          const cartItem = state.items.find(
            (item) => item.product.id === itemId,
          );
          if (!cartItem?.itemId) continue;

          await ApiService.updateCartItem(cartItem.itemId, quantity);
        }
        pendingUpdates.current.clear();
      } catch (error) {
        console.error("Failed to sync cart with backend:", error);
      }
    };

    const handleBeforeUnload = () => {
      syncNow();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      syncNow();
    };
  }, [state.items]);

  // Debounced sync function for regular updates
  const syncCartWithBackend = useRef(
    debounce(async () => {
      const updates = Array.from(pendingUpdates.current.entries());
      if (updates.length === 0) return;

      try {
        for (const [itemId, quantity] of updates) {
          const cartItem = state.items.find(
            (item) => item.product.id === itemId,
          );
          if (!cartItem?.itemId) continue;

          await ApiService.updateCartItem(cartItem.itemId, quantity);
        }
        pendingUpdates.current.clear();
      } catch (error) {
        console.error("Failed to sync cart with backend:", error);
        if (
          error instanceof Error &&
          error.message.includes("Authentication required")
        ) {
          warningToastHandler("Please log in to manage your cart.");
          window.location.href = "/login";
          return;
        }
      }
    }, 2000),
  ).current;

  // Function to force immediate sync with backend
  const forceSyncWithBackend = async () => {
    try {
      const updates = Array.from(pendingUpdates.current.entries());
      if (updates.length === 0) return;

      for (const [itemId, quantity] of updates) {
        const cartItem = state.items.find((item) => item.product.id === itemId);
        if (!cartItem?.itemId) continue;

        await ApiService.updateCartItem(cartItem.itemId, quantity);
      }
      pendingUpdates.current.clear();
    } catch (error) {
      console.error("Failed to force sync cart with backend:", error);
    }
  };

  const loadCart = async () => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      const response = await ApiService.getCart();

      if (response.success && response.cart) {
        const cartItems: CartItem[] = response.cart.items.map(
          (item: {
            _id: string;
            productId: {
              _id: string;
              name: string;
              description: string;
              price: number;
              images?: string[];
              category: string;
              stock: number;
              brand?: string;
            };
            quantity: number;
            price: number;
          }) => ({
            product: {
              id: item.productId._id,
              name: item.productId.name,
              description: item.productId.description,
              price: item.price,
              image: item.productId.images?.[0] || "/placeholder.jpg",
              category: item.productId.category,
              stock: item.productId.stock,
              badges: item.productId.brand ? [item.productId.brand] : [],
              rating: 4.5,
              reviews: 0,
              unit: "piece",
            },
            quantity: item.quantity,
            itemId: item._id,
          }),
        );

        dispatch({ type: "LOAD_CART", payload: cartItems });
      }
    } catch (error) {
      console.error("Failed to load cart:", error);
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  const addToCart = async (product: Product, quantity = 1) => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      const response = await ApiService.addToCart(product.id, quantity);

      if (response.success) {
        // Reload the entire cart to get accurate state from server
        await loadCart();
        successToastHandler("Item added to cart successfully! 🛒");
      } else {
        throw new Error(response.message || "Failed to add to cart");
      }
    } catch (error) {
      console.error("Failed to add to cart:", error);
      if (
        error instanceof Error &&
        error.message.includes("Authentication required")
      ) {
        warningToastHandler("Please log in to add products to cart.");
        window.location.href = "/login";
        return;
      }
      errorToastHandler("Failed to add product to cart. Please try again.");
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  const updateQuantity = async (productId: string, quantity: number) => {
    if (quantity < 1) return;

    // Update local state immediately
    dispatch({ type: "UPDATE_QUANTITY", productId, quantity });

    // Queue update for backend sync
    pendingUpdates.current.set(productId, quantity);

    // Start debounced sync
    syncCartWithBackend();
  };

  const removeFromCart = async (productId: string) => {
    try {
      // Force sync any pending updates first
      await forceSyncWithBackend();

      const cartItem = state.items.find(
        (item) => item.product.id === productId,
      );
      if (!cartItem?.itemId) return;

      // Update local state immediately
      dispatch({ type: "REMOVE_ITEM", productId });

      // Remove from backend
      await ApiService.removeFromCart(cartItem.itemId);
      successToastHandler("Item removed from cart");
    } catch (error) {
      console.error("Failed to remove item:", error);
      // Only reload cart if backend update fails
      loadCart();
    }
  };

  const clearCart = async () => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      const response = await ApiService.clearCart();

      if (response.success) {
        dispatch({ type: "CLEAR_CART" });
        pendingUpdates.current.clear();
      }
    } catch (error) {
      console.error("Failed to clear cart:", error);
      // Only reload cart if backend update fails
      loadCart();
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  return (
    <CartContext.Provider
      value={{
        ...state,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        loadCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}

export default CartProvider;
