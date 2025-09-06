import Wishlist from "../models/wishlist.js";

// Get user wishlist
export const getUserWishlist = async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({
      userId: req.user.userId,
    }).populate("products"); // Capitalized Wishlist
    res.status(200).json({ wishlist });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch wishlist", error });
  }
};

// Add a product to the wishlist
export const addToWishlist = async (req, res) => {
  const { productId } = req.body;
  console.log(productId);
  try {
    let wishlist = await Wishlist.findOne({ userId: req.user.userId }); // Capitalized Wishlist

    if (!wishlist) {
      wishlist = new Wishlist({ userId: req.user.userId, products: [] });
    }

    if (!wishlist.products.includes(productId)) {
      wishlist.products.push(productId);
      await wishlist.save();
    }

    res.status(200).json({ message: "Product added to wishlist", wishlist });
  } catch (error) {
    console.error(error); // Log the error for debugging
    res
      .status(500)
      .json({ message: "Failed to add product to wishlist", error });
  }
};

// Remove a product from the wishlist
export const removeFromWishlist = async (req, res) => {
  const { productId } = req.params;

  try {
    const wishlist = await Wishlist.findOne({ userId: req.user.userId }); // Capitalized Wishlist

    if (!wishlist)
      return res.status(404).json({ message: "Wishlist not found" });

    wishlist.products = wishlist.products.filter(
      (id) => id.toString() !== productId,
    );
    await wishlist.save();

    res
      .status(200)
      .json({ message: "Product removed from wishlist", wishlist });
  } catch (error) {
    console.error(error); // Log the error for debugging
    res
      .status(500)
      .json({ message: "Failed to remove product from wishlist", error });
  }
};
