import { useState } from 'react';
import { ShoppingBag, Leaf, X, LogIn } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Product } from '../types';
import { useCart } from '../contexts/CartContext';

// Mock product for demo
const mockProduct: Product = {
  id: '1',
  name: 'Pure Cow Milk',
  description: '100% pure & unprocessed A2 milk from healthy desi cows',
  price: 60,
  image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&h=300&fit=crop',
  hoverImage: 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=400&h=300&fit=crop',
  badges: ['A2 Milk', 'Fresh Daily'],
  category: 'milk',
  stock: 100,
  rating: 5,
  reviews: 10,
  unit: 'Litre',
};

export default function ProductCard({ product = mockProduct }: { product?: Product }) {
  const [isHovered, setIsHovered] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [feedback, setFeedback] = useState("");
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [isLocalLoading, setIsLocalLoading] = useState(false);

  const { addToCart } = useCart();

  // Helper to get auth token (adjust if you use context)
  const getToken = () => localStorage.getItem('authToken');

  const handleAddToCart = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();

    // Check if user is logged in
    const token = getToken();
    if (!token) {
      setShowLoginPopup(true);
      return;
    }

    setIsLocalLoading(true);
    setFeedback("");
    try {
      await addToCart(product, quantity);
      setFeedback('Added to cart!');
      // Reset quantity after successful add
      setQuantity(1);
    } catch (error) {
      setFeedback('Error adding to cart');
      console.error('Add to cart error:', error);
    } finally {
      setIsLocalLoading(false);
      setTimeout(() => setFeedback(''), 2000);
    }
  };



  const displayImage = isHovered && product.hoverImage ? product.hoverImage : product.image;

  return (
    <Link to={`/product/${product.id}`}>
      <div
        className="group relative bg-white rounded-2xl shadow-lg overflow-hidden transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 cursor-pointer border border-gray-100"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Product Image Container */}
        <div className="relative w-full aspect-[4/3] overflow-hidden bg-gradient-to-br from-emerald-50 to-blue-50">
          <img
            src={displayImage}
            alt={product.name}
            className={`object-cover w-full h-full transition-all duration-500 ${isHovered ? 'scale-110' : 'scale-100'}`}
          />

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent"></div>

          {/* Top Badges */}
          {/* <div className="absolute top-3 left-3 flex flex-wrap gap-1">
            {product.badges.slice(0, 2).map((badge, index) => (
              <span
                key={index}
                className="px-2 py-1 text-xs font-medium bg-white/90 backdrop-blur-sm text-emerald-700 rounded-full border border-emerald-200 shadow-sm"
              >
                {badge}
              </span>
            ))}
          </div> */}



          {/* Stock Status */}
          {/* {product.stock <= 5 && (
            <div className="absolute bottom-3 left-3">
              <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-700 rounded-full">
                Only {product.stock} left
              </span>
            </div>
          )} */}
        </div>

        {/* Product Details */}
        <div className="p-5">

          {/* Product Name */}
          <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 min-h-[2.5rem] group-hover:text-emerald-600 transition-colors">
            {product.name}
          </h3>

          {/* Description */}
          {/* <p className="text-sm text-gray-600 mb-4 line-clamp-2 min-h-[2.5rem]">
            {product.description}
          </p> */}

          {/* Price and Unit */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                ₹{product.price}
              </span>
              <span className="text-sm text-gray-500">/{product.unit}</span>
            </div>
            <div className=" md:flex hidden items-center gap-1 text-emerald-600">
              <Leaf size={16} />
              <span className="text-sm font-medium">Fresh</span>
            </div>
          </div>



          {/* Add to Cart Button */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={e => { e.stopPropagation(); e.preventDefault(); setQuantity(q => Math.max(1, q - 1)); }}
              className="px-2 py-1 bg-gray-100 rounded-l-lg border border-r-0 border-gray-300 text-lg font-bold disabled:opacity-50"
              disabled={quantity <= 1 || isLocalLoading}
              aria-label="Decrease quantity"
            >-</button>
            <input
              type="number"
              min={1}
              max={product.stock}
              value={quantity}
              onChange={e => setQuantity(Math.max(1, Math.min(product.stock, Number(e.target.value))))}
              className="w-12 text-center border-t border-b border-gray-300 focus:outline-none"
              disabled={isLocalLoading}
            />
            <button
              onClick={e => { e.stopPropagation(); e.preventDefault(); setQuantity(q => Math.min(product.stock, q + 1)); }}
              className="px-2 py-1 bg-gray-100 rounded-r-lg border border-l-0 border-gray-300 text-lg font-bold disabled:opacity-50"
              disabled={quantity >= product.stock || isLocalLoading}
              aria-label="Increase quantity"
            >+</button>
          </div>
          <button
            onClick={handleAddToCart}
            disabled={isLocalLoading || !product.stock}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:shadow-none disabled:transform-none disabled:cursor-not-allowed"
          >
            <div className="flex items-center justify-center gap-2">
              {isLocalLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Adding...</span>
                </>
              ) : !product.stock ? (
                <span>Out of Stock</span>
              ) : (
                <>
                  <ShoppingBag className='md:block hidden' size={18} />
                  <span className='md:text-base text-sm px-4'>Add to Cart ₹{(product.price * quantity).toFixed(2)}</span>
                </>
              )}
            </div>
          </button>
          {feedback && <div className="text-center text-sm mt-2 text-emerald-600">{feedback}</div>}


        </div>

        {/* Hover Effect Border */}
        <div className={`absolute inset-0 border-2 border-emerald-400 rounded-2xl transition-opacity duration-300 pointer-events-none ${isHovered ? 'opacity-100' : 'opacity-0'}`}></div>
      </div>

      {/* Login Popup */}
      {showLoginPopup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative animate-in fade-in zoom-in duration-200">
            {/* Close Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowLoginPopup(false);
              }}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X size={20} className="text-gray-500" />
            </button>

            {/* Content */}
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                <LogIn size={24} className="text-emerald-600" />
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Login Required
              </h3>

              <p className="text-gray-600 mb-6">
                Please log in to add items to your cart and start shopping.
              </p>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowLoginPopup(false);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>

                <Link
                  to="/login"
                  className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors text-center font-medium"
                  onClick={(e) => e.stopPropagation()}
                >
                  Login
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </Link>
  );
}