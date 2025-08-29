#🥛 Legends milk Cart

A modern, responsive e-commerce frontend for the Dairy Fresh platform. Built with React, Vite, and Tailwind CSS for an exceptional customer shopping experience.

## 🚀 Features


### 🛍️ Shopping Experience

- **Product Catalog**: Browse dairy products with beautiful layouts
- **Advanced Search**: Find products by name, category, and filters
- **Product Details**: Comprehensive product information with reviews
- **Shopping Cart**: Persistent cart with real-time updates
- **Wishlist**: Save favorite products for later
- **Order Tracking**: Real-time order status updates

### 🔐 User Authentication

- **Phone Authentication**: Secure OTP-based login
- **Social Login**: Google OAuth integration
- **Profile Management**: Complete user profile handling
- **Address Management**: Multiple delivery addresses
- **Order History**: Track all previous orders

### 💳 Checkout & Payments

- **Seamless Checkout**: Multi-step checkout process
- **Payment Integration**: Multiple payment methods
- **Order Confirmation**: Detailed order summaries
- **Digital Receipts**: Email and SMS confirmations

### 🎨 Modern UI/UX

- **Responsive Design**: Perfect on all devices
- **Dark/Light Mode**: Toggle between themes
- **Smooth Animations**: Delightful micro-interactions
- **Fast Loading**: Optimized performance
- **Accessibility**: WCAG compliant design

### 📱 Mobile Optimized

- **Touch-friendly**: Mobile-first design approach
- **PWA Ready**: Progressive Web App capabilities
- **Offline Support**: Basic offline functionality
- **Push Notifications**: Order updates and promotions

## 🛠️ Tech Stack

- **Frontend Framework**: React 18
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: Context API + Zustand
- **Form Handling**: React Hook Form
- **HTTP Client**: Axios
- **Icons**: Lucide React
- **Routing**: React Router DOM
- **TypeScript**: Full type safety
- **PWA**: Workbox for offline support

## 🏗️ Project Structure

```
milk_fe/
├── public/                 # Static assets
│   ├── icons/             # App icons
│   └── manifest.json      # PWA manifest
├── src/
│   ├── components/        # Reusable components
│   │   ├── About.tsx      # About section
│   │   ├── AnimatedSection.tsx # Animated components
│   │   ├── AuthModal.tsx  # Authentication modal
│   │   ├── CartIcon.tsx   # Cart indicator
│   │   ├── Contact.tsx    # Contact section
│   │   ├── Footer.tsx     # Site footer
│   │   ├── Hero.tsx       # Hero section
│   │   ├── Navigation.tsx # Main navigation
│   │   ├── ProductCard.tsx # Product card component
│   │   ├── Products.tsx   # Products section
│   │   ├── Testimonials.tsx # Customer testimonials
│   │   ├── ThemeToggle.tsx # Theme switcher
│   │   └── WhyChooseUs.tsx # Features section
│   ├── contexts/          # React contexts
│   │   ├── AuthContext.tsx # Authentication context
│   │   ├── CartContext.tsx # Shopping cart context
│   │   └── ThemeContext.tsx # Theme context
│   ├── pages/            # Page components
│   │   ├── CartPage.tsx   # Shopping cart page
│   │   ├── CheckoutPage.tsx # Checkout process
│   │   ├── OrdersPage.tsx # Order history
│   │   ├── OrderSuccessPage.tsx # Order confirmation
│   │   ├── ProductDetailPage.tsx # Product details
│   │   ├── ProductsPage.tsx # Products listing
│   │   └── ProfilePage.tsx # User profile
│   ├── types/            # TypeScript types
│   │   └── index.ts      # Type definitions
│   ├── utils/            # Utility functions
│   │   ├── fakeApi.ts    # Mock API functions
│   │   └── mockData.ts   # Sample data
│   ├── App.tsx           # Main app component
│   ├── main.tsx          # App entry point
│   └── index.css         # Global styles
├── package.json
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Access to the backend API

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd milk_fe
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment Configuration**
   Create a `.env` file in the root directory:

   ```env
   VITE_API_BASE_URL=http://localhost:5000/api
   VITE_APP_NAME=Dairy Fresh
   VITE_APP_VERSION=1.0.0
   VITE_GOOGLE_CLIENT_ID=your-google-client-id
   VITE_RAZORPAY_KEY_ID=your-razorpay-key-id
   ```

4. **Start the development server**

   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:5173`

## 📱 Features in Detail

### Product Catalog

- **Grid/List Views**: Toggle between different layouts
- **Category Filters**: Filter by dairy product categories
- **Price Filters**: Set minimum and maximum price ranges
- **Search Functionality**: Real-time product search
- **Sort Options**: Price, popularity, ratings, newest

### Shopping Cart

- **Add to Cart**: One-click add to cart from product cards
- **Quantity Updates**: Adjust quantities in cart
- **Price Calculations**: Real-time total calculations
- **Persistent Storage**: Cart persists across sessions
- **Stock Validation**: Real-time stock checking

### Checkout Process

1. **Cart Review**: Review items and quantities
2. **Address Selection**: Choose or add delivery address
3. **Payment Method**: Select payment option
4. **Order Summary**: Final review before payment
5. **Payment Processing**: Secure payment handling
6. **Order Confirmation**: Success page with order details

### User Profile

- **Personal Information**: Name, email, phone management
- **Address Book**: Multiple delivery addresses
- **Order History**: View past orders with details
- **Wishlist**: Saved products for future purchase
- **Preferences**: App settings and preferences

### Responsive Design

- **Mobile Navigation**: Hamburger menu for mobile
- **Touch Gestures**: Swipe navigation for mobile
- **Tablet Layout**: Optimized for tablet devices
- **Desktop Layout**: Full-featured desktop experience

## 🎨 Theming & Customization

### Theme System

```javascript
// ThemeContext provides theme state
const { theme, toggleTheme } = useTheme();

// Automatic system preference detection
const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
```

### Color Palette

```css
/* Light Theme */
--color-primary: 59 130 246; /* blue-500 */
--color-secondary: 16 185 129; /* emerald-500 */
--color-background: 255 255 255; /* white */
--color-text: 17 24 39; /* gray-900 */

/* Dark Theme */
--color-primary: 96 165 250; /* blue-400 */
--color-secondary: 52 211 153; /* emerald-400 */
--color-background: 17 24 39; /* gray-900 */
--color-text: 243 244 246; /* gray-100 */
```

### Component Customization

```jsx
// Custom product card styling
<ProductCard
  className="hover:shadow-xl transition-shadow duration-300"
  imageClassName="rounded-lg"
  titleClassName="font-semibold text-gray-900 dark:text-white"
/>
```

## 🔌 API Integration

### Authentication Flow

```javascript
// Login with phone and OTP
const login = async (phone, otp) => {
  const response = await authApi.verifyOTP(phone, otp);
  if (response.success) {
    setUser(response.data.user);
    setToken(response.data.token);
  }
};
```

### Product API

```javascript
// Fetch products with filters
const fetchProducts = async (filters) => {
  const response = await api.get("/products", { params: filters });
  return response.data;
};

// Get product details
const getProduct = async (productId) => {
  const response = await api.get(`/products/${productId}`);
  return response.data;
};
```

### Cart Management

```javascript
// Add item to cart
const addToCart = async (productId, quantity) => {
  const response = await api.post("/cart", { productId, quantity });
  updateCartCount();
  return response.data;
};

// Update cart item
const updateCartItem = async (productId, quantity) => {
  const response = await api.put(`/cart/${productId}`, { quantity });
  return response.data;
};
```

### Order Processing

```javascript
// Place order
const placeOrder = async (orderData) => {
  const response = await api.post("/orders", orderData);
  clearCart();
  return response.data;
};

// Get order history
const getOrders = async () => {
  const response = await api.get("/orders/my-orders");
  return response.data;
};
```

## 🛡️ Security Features

### Authentication Security

- **JWT Tokens**: Secure token-based authentication
- **Token Refresh**: Automatic token renewal
- **Secure Storage**: Tokens stored in httpOnly cookies
- **CSRF Protection**: Cross-site request forgery protection

### Payment Security

- **PCI Compliance**: Secure payment processing
- **Encryption**: End-to-end encryption for sensitive data
- **Validation**: Client and server-side validation
- **3D Secure**: Additional authentication for cards

### Data Protection

- **Input Sanitization**: XSS protection
- **Rate Limiting**: API request limiting
- **HTTPS Only**: Secure communication
- **Privacy Controls**: User data protection

## ⚡ Performance Optimization

### Code Splitting

```javascript
// Lazy loading for routes
const ProductsPage = lazy(() => import("./pages/ProductsPage"));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage"));
```

### Image Optimization

```javascript
// Responsive images with lazy loading
<img
  src={product.image}
  alt={product.name}
  loading="lazy"
  className="w-full h-48 object-cover"
/>
```

### Caching Strategy

- **API Caching**: React Query for server state
- **Static Assets**: Browser caching for images
- **Service Worker**: Offline asset caching
- **Memory Caching**: In-memory state caching

### Bundle Optimization

- **Tree Shaking**: Remove unused code
- **Code Splitting**: Load code on demand
- **Asset Compression**: Gzip compression
- **Bundle Analysis**: Regular bundle size monitoring

## 🚀 Deployment

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

### Deploy to Vercel

```bash
npm run build
npx vercel --prod
```

### Deploy to Netlify

```bash
npm run build
npx netlify deploy --prod --dir=dist
```

### Environment Variables for Production

```env
VITE_API_BASE_URL=https://api.dairyfresh.com/api
VITE_GOOGLE_CLIENT_ID=production-google-client-id
VITE_RAZORPAY_KEY_ID=production-razorpay-key
VITE_APP_ENV=production
```

## 📊 Analytics & Monitoring

### User Analytics

- **Page Views**: Track page navigation
- **User Interactions**: Button clicks, form submissions
- **Conversion Funnel**: Shopping cart to order conversion
- **Performance Metrics**: Core Web Vitals

### Error Tracking

```javascript
// Error boundary for crash reporting
const ErrorBoundary = ({ children }) => {
  const handleError = (error, errorInfo) => {
    console.error("Application error:", error, errorInfo);
    // Send to error tracking service
  };

  return <ErrorBoundary onError={handleError}>{children}</ErrorBoundary>;
};
```

## 🧪 Testing

### Running Tests

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Coverage report
npm run test:coverage
```

### Test Structure

```javascript
// Component testing example
describe("ProductCard", () => {
  it("renders product information correctly", () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.getByText(mockProduct.name)).toBeInTheDocument();
  });

  it("handles add to cart action", () => {
    const mockAddToCart = jest.fn();
    render(<ProductCard product={mockProduct} onAddToCart={mockAddToCart} />);
    fireEvent.click(screen.getByText("Add to Cart"));
    expect(mockAddToCart).toHaveBeenCalledWith(mockProduct.id);
  });
});
```

## 🔧 Development Tools

### Code Quality

- **ESLint**: Code linting with React rules
- **Prettier**: Code formatting
- **Husky**: Git hooks for quality checks
- **TypeScript**: Type checking

### Development Server

```bash
# Start with hot reload
npm run dev

# Start with network access
npm run dev -- --host

# Start with custom port
npm run dev -- --port 3000
```

## 📱 Progressive Web App

### PWA Features

- **Offline Support**: Basic offline functionality
- **App Installation**: Add to home screen
- **Push Notifications**: Order updates
- **Background Sync**: Sync data when online

### Service Worker

```javascript
// Register service worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js");
}
```

## 🌐 Browser Support

### Modern Browsers

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Polyfills

- ES6+ features for older browsers
- CSS Grid fallbacks
- Intersection Observer polyfill

## 🐛 Troubleshooting

### Common Issues

1. **API Connection Failed**

   - Check backend server status
   - Verify API base URL in `.env`
   - Check CORS configuration

2. **Build Errors**

   - Clear `node_modules` and reinstall
   - Check TypeScript errors
   - Verify environment variables

3. **Authentication Issues**

   - Check JWT token validity
   - Verify OTP service configuration
   - Clear browser storage

4. **Payment Failures**
   - Verify Razorpay configuration
   - Check network connectivity
   - Validate payment data

### Debug Mode

```bash
# Enable debug logging
DEBUG=true npm run dev

# Verbose logging
VITE_LOG_LEVEL=verbose npm run dev
```

## 📝 Contributing

### Development Workflow

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Code Standards

- Follow ESLint configuration
- Use TypeScript for type safety
- Write tests for new features
- Update documentation

### Commit Convention

```
feat: add product search functionality
fix: resolve cart quantity update issue
docs: update README with deployment instructions
style: improve product card hover effects
```

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Support

For support and questions:

- Create an issue in the repository
- Check the documentation
- Contact the development team

## 🙏 Acknowledgments

- **React Team**: For the amazing framework
- **Vite Team**: For the fast build tool
- **Tailwind CSS**: For the utility-first styling
- **Lucide**: For the beautiful icons
- **Community**: For continuous feedback and support

---

Built with ❤️ by the Dairy Fresh Team
