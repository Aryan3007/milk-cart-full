import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  MapPin,
  CreditCard,
  Truck,
  CheckCircle,
  Plus,
  Loader2,
  AlertTriangle,
  Navigation,
  AlertCircle,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../contexts/CartContext";
import { useAuth } from "../contexts/AuthContext";
import ApiService from "../services/api";
import { Address } from "../types";
import AnimatedSection from "../components/AnimatedSection";
import { extractBestGoogleAddressFields } from "../utils/api";
import {
  warningToastHandler,
  errorToastHandler,
  successToastHandler,
} from "../utils/toastUtils";

interface DeliveryAvailability {
  morning: {
    available: boolean;
    reason: string;
  };
  evening: {
    available: boolean;
    reason: string;
  };
}

interface DeliverySlot {
  date: string;
  dateFormatted: string;
  shifts: {
    morning: {
      available: boolean;
      timeRange: string;
      cutoffPassed?: boolean;
      reason?: string;
    };
    // evening: {
    //   available: boolean;
    //   timeRange: string;
    //   cutoffPassed?: boolean;
    //   reason?: string;
    // };
  };
}

export default function CheckoutPage() {
  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, []);

  const navigate = useNavigate();
  const { items, total } = useCart();
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<
    "cod" | "online" | "wallet"
  >("cod");
  const [deliveryShift, setDeliveryShift] = useState<"morning" | "evening">(
    "morning"
  );
  const [deliveryDate, setDeliveryDate] = useState<string>("");
  const [availableSlots, setAvailableSlots] = useState<DeliverySlot[]>([]);
  const [customerNotes, setCustomerNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [deliveryAvailability, setDeliveryAvailability] =
    useState<DeliveryAvailability | null>(null);
  const [newAddress, setNewAddress] = useState({
    label: "home",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    country: "India",
  });
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [showLocationModal, setShowLocationModal] = useState(false);

  const deliveryFee = 50; // Fixed ₹50 delivery charge per order
  const finalTotal = total + deliveryFee;

  // Redirect if cart is empty
  useEffect(() => {
    if (items.length === 0) {
      navigate("/cart");
    }
  }, [items, navigate]);

  // Load available delivery slots
  useEffect(() => {
    const loadDeliverySlots = async () => {
      try {
        console.log("Loading delivery slots from API...");
        const response = await fetch(
          `${
            import.meta.env.VITE_BACKEND_URL
          }/orders/available-slots?t=${Date.now()}`
        );
        const data = await response.json();

        console.log("API Response:", data);

        if (data.success && data.slots) {
          setAvailableSlots(data.slots);
          console.log("Available slots set:", data.slots);

          // Auto-select first available slot
          if (data.slots.length > 0) {
            const firstSlot = data.slots[0];
            setDeliveryDate(firstSlot.date);
            console.log("Auto-selected delivery date:", firstSlot.date);

            // Auto-select morning shift if available, otherwise evening
            if (firstSlot.shifts.morning.available) {
              setDeliveryShift("morning");
            }
            // Note: Evening delivery is commented out per user's request
            // else if (firstSlot.shifts.evening.available) {
            //   setDeliveryShift("evening");
            // }
          }
        } else {
          console.error("Failed to load delivery slots:", data.message);
          // Keep existing fallback logic if new API fails
          setDeliveryAvailability({
            morning: { available: true, reason: "" },
            evening: {
              available: false,
              reason: "Evening delivery temporarily disabled",
            },
          });
        }
      } catch (error) {
        console.error("Failed to load delivery slots:", error);
        // Fallback to existing logic
        setDeliveryAvailability({
          morning: { available: true, reason: "" },
          evening: {
            available: false,
            reason: "Evening delivery temporarily disabled",
          },
        });
      }
    };

    loadDeliverySlots();
  }, []);

  // Load addresses from user profile API
  useEffect(() => {
    const loadAddresses = async () => {
      if (!ApiService.isAuthenticated()) return;

      setIsLoadingAddresses(true);
      try {
        const response = await ApiService.getUserProfile();
        if (response.success && response.data.user.addresses) {
          const formattedAddresses: Address[] =
            response.data.user.addresses.map(
              (addr: {
                _id: string;
                label: string;
                address: string;
                city: string;
                state: string;
                zipCode: string;
                country: string;
                isDefault: boolean;
              }) => ({
                id: addr._id,
                name: user?.name || "Customer", // Use user name from auth context
                phone: user?.phone || "", // Use user phone from auth context
                addressLine1: addr.address,
                addressLine2:
                  addr.label === "home"
                    ? "Home Address"
                    : addr.label === "work"
                    ? "Work Address"
                    : "",
                city: addr.city,
                state: addr.state,
                pincode: addr.zipCode,
                isDefault: addr.isDefault,
              })
            );

          setAddresses(formattedAddresses);
          const defaultAddr = formattedAddresses.find((addr) => addr.isDefault);
          setSelectedAddress(defaultAddr || formattedAddresses[0] || null);
        }
      } catch (error) {
        console.error("Failed to load addresses:", error);

        // Check if it's an authentication error
        if (
          error instanceof Error &&
          error.message.includes("Authentication required")
        ) {
          warningToastHandler("Please log in to access addresses.");
          return;
        }
      } finally {
        setIsLoadingAddresses(false);
      }
    };

    loadAddresses();
  }, [user]);

  const handlePlaceOrder = async () => {
    if (!selectedAddress || !user || items.length === 0) return;

    // Check if delivery date is selected
    if (!deliveryDate) {
      warningToastHandler("Please select a delivery date");
      return;
    }

    // Find the selected delivery slot to validate availability
    const selectedSlot = availableSlots.find(
      (slot) => slot.date === deliveryDate
    );
    if (!selectedSlot) {
      warningToastHandler("Selected delivery date is no longer available");
      return;
    }

    // Check if selected delivery shift is available for the selected date
    // Since we only support morning shift now, we only check morning availability
    if (deliveryShift === "morning" && !selectedSlot.shifts.morning.available) {
      warningToastHandler(
        `Cannot place order: ${
          selectedSlot.shifts.morning.reason ||
          "Morning delivery slot not available"
        }`
      );
      return;
    }

    // Fallback check for old delivery availability system
    if (deliveryAvailability) {
      const fallbackAvailability = deliveryAvailability[deliveryShift];
      if (!fallbackAvailability.available) {
        warningToastHandler(
          `Cannot place order: ${fallbackAvailability.reason}`
        );
        return;
      }
    }

    setIsLoading(true);
    try {
      // Convert cart items to order products format
      const products = items.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
      }));

      const orderData = {
        products,
        shippingAddress: {
          name: selectedAddress.name,
          address: `${selectedAddress.addressLine1}${
            selectedAddress.addressLine2
              ? ", " + selectedAddress.addressLine2
              : ""
          }`,
          city: selectedAddress.city,
          state: selectedAddress.state,
          zipCode: selectedAddress.pincode,
          phone: selectedAddress.phone || user.phone || "",
        },
        paymentMethod,
        deliveryShift,
        deliveryDate, // Add delivery date to order data
        customerNotes: customerNotes || undefined,
      };

      const response = await ApiService.placeOrder(orderData);

      if (response.success && response.order) {
        successToastHandler("Order placed successfully! 🎉");
        navigate(`/order-success?orderId=${response.order.id}`);
      } else {
        throw new Error(response.message || "Failed to place order");
      }
    } catch (error) {
      console.error("Failed to place order:", error);

      if (
        error instanceof Error &&
        error.message.includes("Authentication required")
      ) {
        warningToastHandler("Please log in to place orders.");
        navigate("/login");
        return;
      }

      if (
        error instanceof Error &&
        error.message.includes("Morning shift orders must be placed")
      ) {
        warningToastHandler(error.message);
        return;
      }

      if (error instanceof Error && error.message.includes("delivery date")) {
        warningToastHandler(error.message);
        return;
      }

      errorToastHandler("Failed to place order. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAddress = async () => {
    if (!ApiService.isAuthenticated() || !user) return;

    // Enforce single address - always replace existing address
    setIsLoading(true);
    try {
      const response = await ApiService.updateUserAddress(user.userId, {
        label: newAddress.label,
        address: newAddress.address,
        city: newAddress.city,
        state: newAddress.state,
        zipCode: newAddress.zipCode,
        country: newAddress.country,
        isDefault: true, // Always set as default since we only allow one address
      });

      if (response.success) {
        successToastHandler("Address added successfully!");
        // Update local addresses state
        const newAddressObj = {
          id: response.data.addressId,
          name: user.name,
          addressLine1: newAddress.address,
          addressLine2: "",
          city: newAddress.city,
          state: newAddress.state,
          pincode: newAddress.zipCode,
          phone: user.phone || "",
          isDefault: true,
        };
        setAddresses([newAddressObj]);
        setSelectedAddress(newAddressObj);
        setShowAddressForm(false);
        setNewAddress({
          label: "home",
          address: "",
          city: "",
          state: "",
          zipCode: "",
          country: "India",
        });
      } else {
        throw new Error(response.message || "Failed to add address");
      }
    } catch (error) {
      console.error("Failed to add address:", error);

      // Check if it's an authentication error
      if (
        error instanceof Error &&
        error.message.includes("Authentication required")
      ) {
        warningToastHandler("Please log in to manage addresses.");
        return;
      }

      errorToastHandler("Failed to add address. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Live address fetching functionality
  interface LocationData {
    latitude: number;
    longitude: number;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    building?: string;
    flat?: string;
    landmark?: string;
  }

  const getCurrentLocation = async (): Promise<LocationData | null> => {
    setLocationLoading(true);
    setLocationError("");

    try {
      // Get current position with high accuracy
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 30000,
          });
        }
      );

      const { latitude, longitude } = position.coords;

      // Try Google Maps Geocoding API first (best accuracy)
      let locationData: LocationData | null = null;

      try {
        const googleResponse = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${
            import.meta.env.VITE_GOOGLE_MAPS_API_KEY
          }&language=en`
        );

        if (googleResponse.ok) {
          const googleData = await googleResponse.json();

          if (
            googleData.status === "OK" &&
            googleData.results &&
            googleData.results.length > 0
          ) {
            // Use the utility to extract the best address fields
            const best = extractBestGoogleAddressFields(googleData.results);

            // Check location restrictions
            if (best.country.toLowerCase() !== "india") {
              setShowLocationModal(true);
              setLocationLoading(false);
              return null;
            }
            if (best.state.toLowerCase() !== "rajasthan") {
              setShowLocationModal(true);
              setLocationLoading(false);
              return null;
            }
            if (best.city.toLowerCase() !== "jaipur") {
              setShowLocationModal(true);
              setLocationLoading(false);
              return null;
            }

            locationData = {
              latitude,
              longitude,
              address: best.address,
              city: best.city,
              state: best.state,
              zipCode: best.zipCode,
              country: best.country,
              landmark: best.landmark,
            };
          }
        }
      } catch {
        console.log("Google Maps API failed, trying fallback...");
      }

      // Fallback: OpenStreetMap (free, no API key needed)
      if (!locationData) {
        try {
          const osmResponse = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1&accept-language=en&zoom=18`
          );

          if (osmResponse.ok) {
            const osmData = await osmResponse.json();
            if (osmData.address) {
              const address = osmData.address;
              const streetNumber = address.house_number || "";
              const road = address.road || "";
              const fullAddress =
                `${streetNumber} ${road}`.trim() ||
                osmData.display_name.split(",")[0] ||
                "";

              locationData = {
                latitude,
                longitude,
                address: fullAddress,
                city:
                  address.city ||
                  address.town ||
                  address.village ||
                  address.county ||
                  "",
                state: address.state || address.province || "",
                zipCode: address.postcode || "",
                country: address.country || "",
              };
            }
          }
        } catch {
          console.log("OpenStreetMap failed, using coordinates only...");
        }
      }

      // Final fallback: Coordinates only
      if (!locationData) {
        locationData = {
          latitude,
          longitude,
          address: `Location at ${latitude.toFixed(6)}, ${longitude.toFixed(
            6
          )}`,
          city: "",
          state: "",
          zipCode: "",
          country: "",
        };
      }

      return locationData;
    } catch (error) {
      console.error("Location error:", error);
      if (error instanceof GeolocationPositionError) {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError(
              "Location access denied. Please enable location services in your browser settings."
            );
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError(
              "Location information unavailable. Please check your GPS settings and try again."
            );
            break;
          case error.TIMEOUT:
            setLocationError(
              "Location request timed out. Please try again in a moment."
            );
            break;
          default:
            setLocationError("Failed to get your location. Please try again.");
        }
      } else {
        setLocationError(
          "Failed to get address from location. You can still enter your address manually below."
        );
      }
      return null;
    } finally {
      setLocationLoading(false);
    }
  };

  const fillFormWithLocation = async () => {
    const locationData = await getCurrentLocation();
    if (locationData) {
      setNewAddress((prev) => ({
        ...prev,
        address: locationData.address,
        city: locationData.city,
        state: locationData.state,
        zipCode: locationData.zipCode,
        country: locationData.country,
      }));
    }
  };

  if (isLoadingAddresses) {
    return (
      <div className="min-h-screen pt-20 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl px-4 py-16 mx-auto sm:px-6 lg:px-8">
          <AnimatedSection className="text-center">
            <div className="flex items-center justify-center mb-6">
              <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" />
            </div>
            <h1 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">
              Loading checkout...
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Please wait while we load your addresses.
            </p>
          </AnimatedSection>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl px-4 py-8 mx-auto sm:px-6 lg:px-8">
        <AnimatedSection>
          <div className="flex items-center mb-8 space-x-3">
            <motion.button
              onClick={() => navigate("/cart")}
              className="flex items-center space-x-2 text-gray-600 transition-colors dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400"
              whileHover={{ x: -5 }}
            >
              <ArrowLeft size={20} />
              <span>Back to Cart</span>
            </motion.button>
          </div>

          <h1 className="mb-8 text-3xl font-bold text-gray-900 dark:text-white">
            Checkout
          </h1>
        </AnimatedSection>

        {/* Delivery Timing Notice */}
        {/* {deliveryAvailability && (
          <AnimatedSection delay={0.05}>
            <div className="p-4 mb-6 border bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 rounded-xl">
              <div className="flex items-start space-x-3">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div>
                  <h3 className="mb-1 font-semibold text-amber-900 dark:text-amber-100">
                    Order Timing Information
                  </h3>
                  <div className="space-y-1 text-sm text-amber-700 dark:text-amber-300">

                  <div className="space-y-1 text-sm text-amber-700 dark:text-amber-300">
                    <p>• Morning shift (6-8 AM): Orders must be placed by 11:59 PM the day before</p>

                    <p>• Evening shift (5-7 PM): Orders must be placed by 2:00 PM on delivery day</p>
                  </div>
                </div>
              </div>
            </div>
          </AnimatedSection>
        )} */}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Left Column - Forms */}
          <div className="space-y-8 lg:col-span-2">
            {/* Delivery Address */}
            <AnimatedSection delay={0.1}>
              <div className="p-6 bg-white shadow-lg dark:bg-gray-800 rounded-2xl">
                <div className="flex items-center mb-6 space-x-3">
                  <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900">
                    <MapPin className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Delivery Address
                  </h2>
                </div>

                {addresses.length > 0 && !showAddressForm ? (
                  <div className="space-y-4">
                    {addresses.map((address) => (
                      <motion.div
                        key={address.id}
                        onClick={() => setSelectedAddress(address)}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                          selectedAddress?.id === address.id
                            ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                            : "border-gray-200 dark:border-gray-700 hover:border-emerald-300"
                        }`}
                        whileHover={{ scale: 1.02 }}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              {address.name}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                              {address.phone}
                            </p>
                            <p className="mt-1 text-gray-600 dark:text-gray-300">
                              {address.addressLine1}
                              {address.addressLine2 &&
                                `, ${address.addressLine2}`}
                            </p>
                            <p className="text-gray-600 dark:text-gray-300">
                              {address.city}, {address.state} -{" "}
                              {address.pincode}
                            </p>
                          </div>
                          {address.isDefault && (
                            <span className="px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full dark:bg-green-900 dark:text-green-200">
                              Default
                            </span>
                          )}
                        </div>
                      </motion.div>
                    ))}

                    <motion.button
                      onClick={() => setShowAddressForm(true)}
                      className="flex items-center justify-center w-full p-4 space-x-2 text-gray-600 transition-colors border-2 border-gray-300 border-dashed rounded-lg dark:border-gray-600 dark:text-gray-300 hover:border-emerald-500 hover:text-emerald-600"
                      whileHover={{ scale: 1.02 }}
                    >
                      <Plus size={20} />
                      <span>Add New Address</span>
                    </motion.button>
                  </div>
                ) : (
                  /* Address Form - updated for new API structure */
                  <div className="space-y-4">
                    {/* Live Address Button */}
                    <div className="p-4 border border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-700 rounded-xl">
                      <button
                        onClick={fillFormWithLocation}
                        disabled={locationLoading}
                        className="flex items-center justify-center w-full px-6 py-3 text-lg font-semibold text-white transition-all duration-200 shadow-lg bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:opacity-60"
                      >
                        {locationLoading ? (
                          <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                        ) : (
                          <Navigation className="w-6 h-6 mr-2" />
                        )}
                        <span>
                          {locationLoading
                            ? "Getting Location..."
                            : "Fetch Live Address"}
                        </span>
                      </button>
                      {locationError && (
                        <div className="flex items-center mt-2 space-x-2 text-red-600 dark:text-red-400">
                          <AlertCircle className="w-4 h-4" />
                          <span className="text-sm">{locationError}</span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                          Address Label *
                        </label>
                        <select
                          value={newAddress.label}
                          onChange={(e) =>
                            setNewAddress({
                              ...newAddress,
                              label: e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg dark:border-gray-600 focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                          required
                        >
                          <option value="home">Home</option>
                          <option value="work">Work</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                          Country *
                        </label>
                        <select
                          value={newAddress.country}
                          onChange={(e) =>
                            setNewAddress({
                              ...newAddress,
                              country: e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg dark:border-gray-600 focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                          required
                        >
                          <option value="India">India</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        Full Address *
                      </label>
                      <input
                        type="text"
                        placeholder="Enter your complete address"
                        value={newAddress.address}
                        onChange={(e) =>
                          setNewAddress({
                            ...newAddress,
                            address: e.target.value,
                          })
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg dark:border-gray-600 focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                          City *
                        </label>
                        <input
                          type="text"
                          placeholder="Enter city name"
                          value={newAddress.city}
                          onChange={(e) =>
                            setNewAddress({
                              ...newAddress,
                              city: e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg dark:border-gray-600 focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                          required
                        />
                      </div>
                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                          State *
                        </label>
                        <input
                          type="text"
                          placeholder="Enter state name"
                          value={newAddress.state}
                          onChange={(e) =>
                            setNewAddress({
                              ...newAddress,
                              state: e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg dark:border-gray-600 focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                          required
                        />
                      </div>
                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                          ZIP Code *
                        </label>
                        <input
                          type="text"
                          placeholder="Enter ZIP code"
                          value={newAddress.zipCode}
                          onChange={(e) =>
                            setNewAddress({
                              ...newAddress,
                              zipCode: e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg dark:border-gray-600 focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                          required
                        />
                      </div>
                    </div>

                    <div className="p-3 border border-blue-200 rounded-lg bg-blue-50 dark:bg-blue-900/20 dark:border-blue-700">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        📍 <strong>Note:</strong> This will be your delivery
                        address. We support one address per account for optimal
                        delivery management.
                      </p>
                    </div>

                    <div className="flex space-x-4">
                      <motion.button
                        onClick={handleAddAddress}
                        disabled={
                          isLoading ||
                          !newAddress.label ||
                          !newAddress.address ||
                          !newAddress.city ||
                          !newAddress.state ||
                          !newAddress.zipCode ||
                          !newAddress.country
                        }
                        className="px-6 py-3 font-medium text-white transition-colors rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {isLoading ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          "Save Address"
                        )}
                      </motion.button>

                      {addresses.length > 0 && (
                        <motion.button
                          onClick={() => setShowAddressForm(false)}
                          className="px-6 py-3 font-medium text-gray-900 transition-colors bg-gray-100 rounded-lg dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 dark:text-white"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          Cancel
                        </motion.button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </AnimatedSection>

            {/* Delivery Date Selection */}
            <AnimatedSection delay={0.15}>
              <div className="p-6 bg-white shadow-lg dark:bg-gray-800 rounded-2xl">
                <div className="flex items-center mb-6 space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg dark:bg-blue-900">
                    <Truck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Delivery Date
                  </h2>
                </div>

                {availableSlots.length > 0 ? (
                  <div className="space-y-3">
                    {availableSlots.map((slot) => (
                      <motion.div
                        key={slot.date}
                        onClick={() => setDeliveryDate(slot.date)}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                          deliveryDate === slot.date
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                            : "border-gray-200 dark:border-gray-700 hover:border-blue-300"
                        }`}
                        whileHover={{ scale: 1.02 }}
                      >
                        <div className="flex items-start space-x-3">
                          <div
                            className={`w-4 h-4 rounded-full border-2 mt-1 ${
                              deliveryDate === slot.date
                                ? "border-blue-500 bg-blue-500"
                                : "border-gray-300"
                            }`}
                          >
                            {deliveryDate === slot.date && (
                              <div className="w-full h-full transform scale-50 bg-white rounded-full"></div>
                            )}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              {slot.dateFormatted}
                            </h3>
                            <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                              <div className="flex items-center space-x-2">
                                <span
                                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    slot.shifts.morning.available
                                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                      : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                  }`}
                                >
                                  Morning: {slot.shifts.morning.timeRange}
                                </span>
                              </div>
                              {!slot.shifts.morning.available &&
                                slot.shifts.morning.reason && (
                                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                                    {slot.shifts.morning.reason}
                                  </p>
                                )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                    <div className="flex items-center justify-center mb-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                    Loading available delivery dates...
                  </div>
                )}
              </div>
            </AnimatedSection>

            {/* Delivery Shift */}
            <AnimatedSection delay={0.25}>
              <div className="p-6 bg-white shadow-lg dark:bg-gray-800 rounded-2xl">
                <div className="flex items-center mb-6 space-x-3">
                  <div className="p-2 bg-purple-100 rounded-lg dark:bg-purple-900">
                    <Truck className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Delivery Shift
                  </h2>
                </div>

                <div className="space-y-3">
                  {[
                    {
                      id: "morning",
                      label: "Morning Shift",
                      desc: "5:00 AM - 11:00 AM",
                    },
                    // { id: "evening", label: "Evening Shift", desc: "5:00 PM - 7:00 PM" },
                  ].map((shift) => {
                    const selectedSlot = availableSlots.find(
                      (slot) => slot.date === deliveryDate
                    );
                    const isAvailable = selectedSlot
                      ? shift.id === "morning"
                        ? selectedSlot.shifts.morning.available
                        : false // Evening is commented out
                      : deliveryAvailability?.[
                          shift.id as keyof DeliveryAvailability
                        ]?.available ?? true;

                    const reason = selectedSlot
                      ? shift.id === "morning"
                        ? selectedSlot.shifts.morning.reason || ""
                        : "Evening delivery is temporarily disabled"
                      : deliveryAvailability?.[
                          shift.id as keyof DeliveryAvailability
                        ]?.reason || "";

                    return (
                      <motion.div
                        key={shift.id}
                        onClick={() =>
                          isAvailable &&
                          setDeliveryShift(shift.id as "morning" | "evening")
                        }
                        className={`p-4 border-2 rounded-lg transition-colors ${
                          !isAvailable
                            ? "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 cursor-not-allowed opacity-60"
                            : deliveryShift === shift.id
                            ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20 cursor-pointer"
                            : "border-gray-200 dark:border-gray-700 hover:border-purple-300 cursor-pointer"
                        }`}
                        whileHover={isAvailable ? { scale: 1.02 } : {}}
                      >
                        <div className="flex items-start space-x-3">
                          <div
                            className={`w-4 h-4 rounded-full border-2 mt-1 ${
                              !isAvailable
                                ? "border-gray-300 bg-gray-200"
                                : deliveryShift === shift.id
                                ? "border-purple-500 bg-purple-500"
                                : "border-gray-300"
                            }`}
                          >
                            {deliveryShift === shift.id && isAvailable && (
                              <div className="w-full h-full transform scale-50 bg-white rounded-full"></div>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h3 className="font-semibold text-gray-900 dark:text-white">
                                {shift.label}
                              </h3>
                              {!isAvailable && (
                                <AlertTriangle className="w-4 h-4 text-amber-500" />
                              )}
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                              {shift.desc}
                            </p>
                            {!isAvailable && reason && (
                              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                                {reason}
                              </p>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </AnimatedSection>

            {/* Payment Method */}
            <AnimatedSection delay={0.2}>
              <div className="p-6 bg-white shadow-lg dark:bg-gray-800 rounded-2xl">
                <div className="flex items-center mb-6 space-x-3">
                  <div className="p-2 bg-green-100 rounded-lg dark:bg-green-900">
                    <CreditCard className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Payment Method
                  </h2>
                </div>

                <div className="space-y-3">
                  {[
                    {
                      id: "cod",
                      label: "Cash on Delivery",
                      desc: "Pay when you receive",
                    },
                    // { id: "online", label: "Online Payment", desc: "Pay now (UPI/Card/Wallet)" },
                    // { id: "wallet", label: "Wallet", desc: "Pay using wallet balance" },
                  ].map((method) => (
                    <motion.div
                      key={method.id}
                      onClick={() =>
                        setPaymentMethod(
                          method.id as "cod" | "online" | "wallet"
                        )
                      }
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        paymentMethod === method.id
                          ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                          : "border-gray-200 dark:border-gray-700 hover:border-green-300"
                      }`}
                      whileHover={{ scale: 1.02 }}
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-4 h-4 rounded-full border-2 ${
                            paymentMethod === method.id
                              ? "border-green-500 bg-green-500"
                              : "border-gray-300"
                          }`}
                        >
                          {paymentMethod === method.id && (
                            <div className="w-full h-full transform scale-50 bg-white rounded-full"></div>
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {method.label}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            {method.desc}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </AnimatedSection>

            {/* Customer Notes */}
            <AnimatedSection delay={0.3}>
              <div className="p-6 bg-white shadow-lg dark:bg-gray-800 rounded-2xl">
                <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">
                  Special Instructions (Optional)
                </h2>
                <textarea
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  placeholder="Any special delivery instructions..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none dark:border-gray-600 focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
            </AnimatedSection>
          </div>

          {/* Right Column - Order Summary */}
          <div className="lg:col-span-1">
            <AnimatedSection delay={0.4}>
              <div className="sticky p-6 bg-white shadow-lg dark:bg-gray-800 rounded-2xl top-24">
                <h2 className="mb-6 text-xl font-bold text-gray-900 dark:text-white">
                  Order Summary
                </h2>

                <div className="mb-6 space-y-4">
                  {items.map((item) => (
                    <div
                      key={item.product.id}
                      className="flex items-center space-x-3"
                    >
                      <img
                        src={item.product.image}
                        alt={item.product.name}
                        className="object-cover w-12 h-12 rounded-lg"
                      />
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                          {item.product.name}
                        </h3>
                        <p className="text-xs text-gray-600 dark:text-gray-300">
                          Qty: {item.quantity} × ₹{item.product.price}
                        </p>
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white">
                        ₹{item.product.price * item.quantity}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-4 space-y-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">
                      Subtotal
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      ₹{total}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">
                      Delivery Fee
                    </span>
                    <span className="font-medium text-green-600 dark:text-green-400">
                      ₹{deliveryFee}
                    </span>
                  </div>

                  <div className="flex justify-between pt-3 text-lg font-bold border-t border-gray-200 dark:border-gray-700">
                    <span className="text-gray-900 dark:text-white">Total</span>
                    <span className="text-emerald-600 dark:text-emerald-400">
                      ₹{finalTotal}
                    </span>
                  </div>
                </div>

                <motion.button
                  onClick={handlePlaceOrder}
                  disabled={
                    !selectedAddress ||
                    !deliveryDate ||
                    isLoading ||
                    items.length === 0 ||
                    !user ||
                    availableSlots.length === 0
                  }
                  className="flex items-center justify-center w-full px-6 py-3 mt-6 space-x-2 font-semibold text-white transition-colors rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle size={20} />
                      <span>Place Order</span>
                    </>
                  )}
                </motion.button>

                {!selectedAddress && (
                  <p className="mt-2 text-sm text-center text-red-500">
                    Please select a delivery address to continue
                  </p>
                )}

                {!deliveryDate && (
                  <p className="mt-2 text-sm text-center text-red-500">
                    Please select a delivery date to continue
                  </p>
                )}

                {items.length === 0 && (
                  <p className="mt-2 text-sm text-center text-red-500">
                    Your cart is empty
                  </p>
                )}

                {!user && (
                  <p className="mt-2 text-sm text-center text-red-500">
                    Please log in to place an order
                  </p>
                )}

                {availableSlots.length === 0 && (
                  <p className="mt-2 text-sm text-center text-red-500">
                    No delivery slots available at the moment
                  </p>
                )}

                <div className="p-3 mt-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                  <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400">
                    <Truck size={16} />
                    <span className="text-sm font-medium">
                      {deliveryDate && deliveryShift
                        ? `Expected delivery: ${
                            availableSlots.find(
                              (slot) => slot.date === deliveryDate
                            )?.dateFormatted
                          } ${deliveryShift} shift`
                        : "Select delivery date and shift to see expected delivery"}
                    </span>
                  </div>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </div>

      {/* Location Restriction Modal */}
      {showLocationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="relative w-full max-w-md mx-4 overflow-hidden bg-white shadow-2xl dark:bg-gray-800 rounded-2xl">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-red-500 to-pink-500">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    🚫 Service Area Restricted
                  </h3>
                  <p className="text-sm text-white/90">
                    We're currently serving in Jaipur only
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 mt-1 bg-red-100 rounded-full dark:bg-red-900">
                    <X className="w-4 h-4 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h4 className="mb-1 font-semibold text-gray-900 dark:text-white">
                      Location Not Supported
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      We currently only deliver to{" "}
                      <strong>Jaipur, Rajasthan, India</strong>. Your location
                      is outside our service area.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 mt-1 bg-blue-100 rounded-full dark:bg-blue-900">
                    <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h4 className="mb-1 font-semibold text-gray-900 dark:text-white">
                      Service Areas
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      <strong>Country:</strong> India
                      <br />
                      <strong>State:</strong> Rajasthan
                      <br />
                      <strong>City:</strong> Jaipur
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 mt-1 bg-green-100 rounded-full dark:bg-green-900">
                    <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h4 className="mb-1 font-semibold text-gray-900 dark:text-white">
                      What You Can Do
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      • Enter a Jaipur address manually
                      <br />
                      • Contact us to request service in your area
                      <br />• Check back later for expanded coverage
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 dark:bg-gray-700 dark:border-gray-600">
              <button
                onClick={() => setShowLocationModal(false)}
                className="flex items-center justify-center w-full px-6 py-3 space-x-2 font-medium text-white transition-colors bg-gray-600 hover:bg-gray-700 rounded-xl"
              >
                <X className="w-4 h-4" />
                <span>Close</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
