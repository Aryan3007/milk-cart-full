import { useState, useEffect } from 'react';
import { Menu, X, Milk, User, Package, Loader2, CarTaxiFront, ShoppingCart, LogOut } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../store';
import { logout } from '../store';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

interface NavItem {
  name: string;
  href: string;
  scrollTo?: string;
}

const navItems: NavItem[] = [
  { name: 'Home', href: '/', scrollTo: '#home' },
  { name: 'Products', href: '/products' },
  { name: 'Subscriptions', href: '/subscriptions' },
  { name: 'Contact', href: '/', scrollTo: '#contact' },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const dispatch = useAppDispatch();
  const { isAuthenticated, user, isLoading } = useAppSelector(state => state.auth);
  const navigate = useNavigate();
  const location = useLocation();

  // Close mobile menu when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  const handleNavClick = (item: NavItem) => {
    if (item.scrollTo) {
      if (location.pathname !== '/') {
        navigate('/');
        setTimeout(() => {
          const element = document.querySelector(item.scrollTo!);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
          }
        }, 200);
      } else {
        const element = document.querySelector(item.scrollTo);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }
    } else {
      navigate(item.href);
    }
    setIsOpen(false);
  };

  const handleLogout = () => {
    dispatch(logout());
    setIsOpen(false);
    navigate('/');
  };

  const handleLoginClick = () => {
    navigate('/login');
    setIsOpen(false);
  };

  const handleCartClick = () => {
    navigate('/cart');
    setIsOpen(false);
  };



  return (
    <div
      className="fixed top-0 left-0 p-2 right-0 z-50 transition-all duration-300"

    >
      <div className="max-w-full  py-3 bg-red-500  mx-auto px-4 sm:px-6 lg:px-8 ">
        <div className="flex justify-between items-center h-fit">
          <div className="flex items-center space-x-2">
            <Link to="/" className="flex items-center space-x-2" aria-label="Legends Milk Cart Home">
              <Milk className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xl font-bold text-gray-900 dark:text-white">Legends</span>
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
              <button
                onClick={handleCartClick}
                className="text-gray-700 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors duration-200"
                aria-label="View shopping cart"
              >
                <CarTaxiFront size={20} />
              </button>

              {isAuthenticated ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="flex items-center space-x-2 text-gray-700 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors duration-200"
                      aria-label={`User menu for ${user?.name || 'User'}`}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <User size={20} />
                      )}
                      <span className="hidden lg:block">{user?.name || 'User'}</span>
                    </button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user?.name}</p>
                        <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    <DropdownMenuItem asChild>
                      <Link to="/profile" className="cursor-pointer">
                        <User className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuItem asChild>
                      <Link to="/orders" className="cursor-pointer">
                        <Package className="mr-2 h-4 w-4" />
                        <span>Orders</span>
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Logout</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <button
                  onClick={handleLoginClick}
                  disabled={isLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
                  aria-label="Log in"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : null}
                  <span>{isLoading ? 'Loading...' : 'Login'}</span>
                </button>
              )}
            </div>
          </div>

          <div className="md:hidden flex items-center space-x-4">
            <ShoppingCart
              onClick={handleCartClick}
              aria-label="View shopping cart"
            />
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-700"
              aria-label={isOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isOpen}
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      <div>
        {isOpen && (
          <div
            className="md:hidden bg-white/60 shadow-lg backdrop-blur-lg rounded-3xl mt-2 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800"

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
                  disabled={isLoading}
                  className=" w-full text-left px-4 py-2 bg-emerald-600 disabled:bg-gray-400 text-white rounded-lg hover:bg-emerald-700 transition-colors duration-200 flex items-center space-x-2"
                  role="menuitem"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : null}
                  <span>{isLoading ? 'Loading...' : 'Login'}</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}