import { useState, useEffect, useRef } from "react";
import { Menu, X, Milk, User, Package, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import CartIcon from "./CartIcon";
import ThemeToggle from "./ThemeToggle";
import { useAuth } from "../contexts/AuthContext";
import { Link, useNavigate, useLocation } from "react-router-dom";

interface NavItem {
  name: string;
  href: string;
  scrollTo?: string;
}

const navItems: NavItem[] = [
  { name: "Home", href: "/", scrollTo: "#home" },
  { name: "Products", href: "/products" },
  { name: "Subscriptions", href: "/subscriptions" },
  { name: "Contact", href: "/", scrollTo: "#contact" },
];

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const {
    isAuthenticated,
    user,
    logout,
    isLoading,
    isGoogleAuthLoading,
    googleAuthError,
    clearGoogleAuthError,
  } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Clear Google auth error when user navigates away from login page
  useEffect(() => {
    if (googleAuthError && location.pathname !== "/login") {
      clearGoogleAuthError();
    }
  }, [location.pathname, googleAuthError, clearGoogleAuthError]);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showUserMenu]);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  const handleNavClick = (item: NavItem) => {
    if (item.scrollTo) {
      if (location.pathname !== "/") {
        navigate("/");
        setTimeout(() => {
          const element = document.querySelector(item.scrollTo!);
          if (element) {
            element.scrollIntoView({ behavior: "smooth" });
          }
        }, 200);
      } else {
        const element = document.querySelector(item.scrollTo);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      }
    } else {
      navigate(item.href);
    }
    setIsOpen(false);
  };

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
    setIsOpen(false);
    navigate("/");
  };

  const handleLoginClick = () => {
    if (googleAuthError) {
      clearGoogleAuthError();
    }
    navigate("/login");
    setIsOpen(false);
  };

  const handleCartClick = () => {
    navigate("/cart");
    setIsOpen(false);
  };

  // Determine if we should show loading state
  const showAuthLoading = isLoading || isGoogleAuthLoading;

  return (
    <motion.nav
      className="fixed top-0 left-0 p-2 right-0 z-50 transition-all duration-300"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6 }}
      aria-label="Main navigation"
    >
      <div className="max-w-7xl bg-white/60  py-3 rounded-full shadow-lg backdrop-blur-md  mx-auto px-4 sm:px-6 lg:px-8 mt-2">
        <div className="flex justify-between items-center h-fit">
          <div className="flex items-center space-x-2">
            <Link
              to="/"
              className="flex items-center space-x-2"
              aria-label="Legends Milk Cart Home"
            >
              <Milk className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                Legends
              </span>
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <button
                key={item.name}
                onClick={() => handleNavClick(item)}
                className="text-gray-700 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium transition-colors duration-200"
                aria-label={`Navigate to ${item.name}`}
              >
                {item.name}
              </button>
            ))}

            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <CartIcon
                onClick={handleCartClick}
                aria-label="View shopping cart"
              />
              {isAuthenticated ? (
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center space-x-2 text-gray-700 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors duration-200"
                    aria-label={`User menu for ${user?.name || "User"}`}
                    aria-expanded={showUserMenu}
                    disabled={showAuthLoading}
                  >
                    {showAuthLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <User size={20} />
                    )}
                    <span className="hidden lg:block">
                      {user?.name || "User"}
                    </span>
                  </button>

                  <AnimatePresence>
                    {showUserMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
                        role="menu"
                      >
                        <Link
                          to="/profile"
                          onClick={() => setShowUserMenu(false)}
                          className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-lg transition-colors flex items-center space-x-2"
                          role="menuitem"
                        >
                          <User size={16} />
                          <span>Profile</span>
                        </Link>
                        <Link
                          to="/orders"
                          onClick={() => setShowUserMenu(false)}
                          className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center space-x-2"
                          role="menuitem"
                        >
                          <Package size={16} />
                          <span>Orders</span>
                        </Link>

                        <button
                          onClick={handleLogout}
                          className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-b-lg transition-colors"
                          role="menuitem"
                        >
                          Logout
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <button
                  onClick={handleLoginClick}
                  disabled={showAuthLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
                  aria-label="Log in"
                >
                  {showAuthLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : null}
                  <span>{showAuthLoading ? "Loading..." : "Login"}</span>
                </button>
              )}
            </div>
          </div>

          <div className="md:hidden flex items-center space-x-4">
            <ThemeToggle />
            <CartIcon
              onClick={handleCartClick}
              aria-label="View shopping cart"
            />
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-700"
              aria-label={isOpen ? "Close menu" : "Open menu"}
              aria-expanded={isOpen}
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="md:hidden bg-white/60 shadow-lg backdrop-blur-lg rounded-3xl mt-2 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            role="menu"
          >
            <div className="px-4 py-4 space-y-2">
              {navItems.map((item) => (
                <button
                  key={item.name}
                  onClick={() => handleNavClick(item)}
                  className="block w-full text-left px-4 py-2 text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors duration-200"
                  role="menuitem"
                  aria-label={`Navigate to ${item.name}`}
                >
                  {item.name}
                </button>
              ))}

              {isAuthenticated ? (
                <>
                  <Link
                    to="/profile"
                    onClick={() => setIsOpen(false)}
                    className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors duration-200"
                    role="menuitem"
                  >
                    Profile
                  </Link>
                  <Link
                    to="/orders"
                    onClick={() => setIsOpen(false)}
                    className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors duration-200"
                    role="menuitem"
                  >
                    My Orders
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors duration-200"
                    role="menuitem"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <button
                  onClick={handleLoginClick}
                  disabled={showAuthLoading}
                  className=" w-full text-left px-4 py-2 bg-emerald-600 disabled:bg-gray-400 text-white rounded-lg hover:bg-emerald-700 transition-colors duration-200 flex items-center space-x-2"
                  role="menuitem"
                >
                  {showAuthLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : null}
                  <span>{showAuthLoading ? "Loading..." : "Login"}</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
