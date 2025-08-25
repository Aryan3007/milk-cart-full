import Cart from "../models/cart.js";
import Product from "../models/Product.js";

// Controller to add an item to the cart
export const addItemToCart = async (req, res) => {
  try {
    // Extract productId and quantity from the request body
    const { productId, quantity = 1 } = req.body;

    // Validate input
    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    if (quantity <= 0 || quantity > 100) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be between 1 and 100",
      });
    }

    // Ensure the product exists and is active
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (!product.isActive || product.status !== "active") {
      return res.status(400).json({
        success: false,
        message: "Product is not available",
      });
    }

    // Check stock availability
    if (product.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock. Available: ${product.stock}`,
      });
    }

    // Get the current price (use discount price if available)
    const currentPrice = product.discountPrice || product.price;

    // Check if the user already has a cart
    let cart = await Cart.findOne({ userId: req.user.userId }); // Ensure the use of userId in the query


    if (!cart) {
      // If no cart exists for the user, create a new cart
      cart = new Cart({
        userId: req.user.userId,
        items: [
          {
            productId,
            quantity,
            price: currentPrice,
          },
        ],
      });
    } else {
      // If cart exists, check if the product is already in the cart
      const existingItem = cart.items.find(
        (item) => item.productId.toString() === productId
      );

      if (existingItem) {
        // Check if total quantity would exceed stock
        const newQuantity = existingItem.quantity + quantity;
        if (newQuantity > product.stock) {
          return res.status(400).json({
            success: false,
            message: `Cannot add ${quantity} more. Maximum available: ${
              product.stock - existingItem.quantity
            }`,
          });
        }

        if (newQuantity > 100) {
          return res.status(400).json({
            success: false,
            message: "Cannot exceed maximum quantity of 100 per item",
          });
        }

        // Update quantity and price (in case price changed)
        existingItem.quantity = newQuantity;
        existingItem.price = currentPrice;
      } else {
        // If the item is not in the cart, add it
        cart.items.push({
          productId,
          quantity,
          price: currentPrice,
        });
      }
    }
console.log(cart);

    // Save the updated cart
    await cart.save();

    // Populate the cart with product details for response
    await cart.populate("items.productId", "name images brand");

    return res.status(200).json({
      success: true,
      message: "Item added to cart successfully",
      cart: {
        id: cart._id,
        items: cart.items,
        totalItems: cart.totalItems,
        totalAmount: cart.totalAmount,
      },
    });
  } catch (error) {
    console.error("Error adding to cart:", error);
    return res.status(500).json({
      success: false,
      message: "Error adding to cart",
      error: error.message,
    });
  }
};

// Controller to fetch the user's cart
export const getCart = async (req, res) => {
  try {
    // Find the cart using userId
    const cart = await Cart.findOne({ userId: req.user.userId }).populate(
      "items.productId",
      "name images brand price discountPrice stock isActive status"
    );

    if (!cart) {
      // Return empty cart instead of 404
      return res.status(200).json({
        success: true,
        cart: {
          id: null,
          items: [],
          totalItems: 0,
          totalAmount: 0,
        },
      });
    }

    // Filter out items where product doesn't exist or is inactive
    const validItems = cart.items.filter(
      (item) =>
        item.productId &&
        item.productId.isActive &&
        item.productId.status === "active"
    );

    // Update cart if some items were invalid
    if (validItems.length !== cart.items.length) {
      cart.items = validItems;
      await cart.save();
    }

    return res.status(200).json({
      success: true,
      cart: {
        id: cart._id,
        items: cart.items,
        totalItems: cart.totalItems,
        totalAmount: cart.totalAmount,
        updatedAt: cart.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error fetching cart:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching cart",
      error: error.message,
    });
  }
};

// Update cart item quantity
export const updateCartItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;

    // Validate quantity
    if (!quantity || quantity <= 0 || quantity > 100) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be between 1 and 100",
      });
    }

    // Find the cart for the authenticated user
    const cart = await Cart.findOne({ userId: req.user.userId });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    // Find the item in the cart by itemId
    const item = cart.items.id(itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found in cart",
      });
    }

    // Check if product still exists and is available
    const product = await Product.findById(item.productId);
    if (!product || !product.isActive || product.status !== "active") {
      return res.status(400).json({
        success: false,
        message: "Product is no longer available",
      });
    }

    // Check stock availability
    if (product.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock. Available: ${product.stock}`,
      });
    }

    // Update the quantity and price (in case price changed)
    item.quantity = quantity;
    item.price = product.discountPrice || product.price;

    // Save the cart with the updated item
    await cart.save();

    // Populate cart for response
    await cart.populate("items.productId", "name images brand");

    return res.status(200).json({
      success: true,
      message: "Cart item updated successfully",
      cart: {
        id: cart._id,
        items: cart.items,
        totalItems: cart.totalItems,
        totalAmount: cart.totalAmount,
      },
    });
  } catch (error) {
    console.error("Error updating cart item:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating cart item",
      error: error.message,
    });
  }
};
// Remove an item from the cart
export const removeCartItem = async (req, res) => {
  try {
    const { itemId } = req.params;

    // Find the cart for the authenticated user
    const cart = await Cart.findOne({ userId: req.user.userId });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    // Find the item in the cart by itemId
    const item = cart.items.id(itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found in cart",
      });
    }

    // Remove the item using the pull method
    cart.items.pull(itemId);

    // Save the updated cart
    await cart.save();

    // Populate cart for response
    await cart.populate("items.productId", "name images brand");

    return res.status(200).json({
      success: true,
      message: "Item removed from cart successfully",
      cart: {
        id: cart._id,
        items: cart.items,
        totalItems: cart.totalItems,
        totalAmount: cart.totalAmount,
      },
    });
  } catch (error) {
    console.error("Error removing cart item:", error);
    return res.status(500).json({
      success: false,
      message: "Error removing cart item",
      error: error.message,
    });
  }
};

// Clear all items from the cart
export const clearCart = async (req, res) => {
  try {
    // Find the cart for the authenticated user
    const cart = await Cart.findOne({ userId: req.user.userId });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    // Clear all items in the cart
    cart.items = [];
    await cart.save();

    return res.status(200).json({
      success: true,
      message: "Cart cleared successfully",
      cart: {
        id: cart._id,
        items: cart.items,
        totalItems: cart.totalItems,
        totalAmount: cart.totalAmount,
      },
    });
  } catch (error) {
    console.error("Error clearing cart:", error);
    return res.status(500).json({
      success: false,
      message: "Error clearing cart",
      error: error.message,
    });
  }
};

// Get cart item count (useful for UI badges)
export const getCartItemCount = async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user.userId });

    const itemCount = cart ? cart.totalItems : 0;

    return res.status(200).json({
      success: true,
      count: itemCount,
    });
  } catch (error) {
    console.error("Error getting cart item count:", error);
    return res.status(500).json({
      success: false,
      message: "Error getting cart item count",
      error: error.message,
    });
  }
};
