import React, { useEffect, useState, useMemo } from "react";
import {
  User,
  Mail,
  Calendar,
  Shield,
  Edit,
  Save,
  X,
  MapPin,
  Home,
  Building,
  Globe,
  Navigation,
  Loader2,
  UserCheck,
  Plus,
  Trash2,
  Star,
  AlertCircle,
  Key,
  CheckCircle,
} from "lucide-react";
import { ApiService } from "../services/api";
import { extractBestGoogleAddressFields } from "../services/api";
import { errorToastHandler, successToastHandler } from "../utils/toastUtils";

const AnimatedSection = ({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) => (
  <div className="animate-fade-in" style={{ animationDelay: `${delay}s` }}>
    {children}
  </div>
);

interface Address {
  label: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isDefault: boolean;
  _id: string;
  building?: string;
  flat?: string;
  landmark?: string;
}

interface ApiUser {
  userId: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  isVerified: boolean;
  authProvider: string;
  lastLogin: string;
  addresses: Address[];
}

interface EditAddressForm {
  label: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  building?: string;
  flat?: string;
  landmark?: string;
  exactLatitude?: number;
  exactLongitude?: number;
}

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

export default function ProfilePage() {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editForm, setEditForm] = useState<EditAddressForm>({
    label: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    country: "",
    building: "",
    flat: "",
    landmark: "",
  });
  const [updateLoading, setUpdateLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: "",
    phone: "",
  });
  const [profileUpdateLoading, setProfileUpdateLoading] = useState(false);

  // Address management state
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null,
  );
  const [editing, setEditing] = useState(false);
  const [addingNew, setAddingNew] = useState(false);

  // Helper: get the user's addresses
  const userAddresses = useMemo(() => user?.addresses || [], [user?.addresses]);
  const selectedAddress = selectedAddressId
    ? userAddresses.find((addr) => addr._id === selectedAddressId)
    : userAddresses.find((addr) => addr.isDefault) || userAddresses[0] || null;

  // Auto-select first address on user load
  useEffect(() => {
    if (user && userAddresses.length > 0 && !selectedAddressId) {
      const defaultAddr =
        userAddresses.find((addr) => addr.isDefault) || userAddresses[0];
      setSelectedAddressId(defaultAddr._id);
    }
  }, [user, userAddresses, selectedAddressId]);

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await ApiService.getUserProfile();
        if (data.success) {
          setUser(data.data.user);
        } else {
          setError(data.message || "Failed to fetch user");
        }
      } catch (err) {
        setError("Failed to fetch user");
        console.error("Error fetching user:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  // Function to get current location and reverse geocode using Google Maps API (Best accuracy)
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
        },
      );

      const { latitude, longitude } = position.coords;

      // Try Google Maps Geocoding API first (best accuracy)
      let locationData: LocationData | null = null;

      try {
        const googleResponse = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${
            import.meta.env.VITE_GOOGLE_MAPS_API_KEY
          }&language=en`,
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
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1&accept-language=en&zoom=18`,
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
            6,
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
              "Location access denied. Please enable location services in your browser settings.",
            );
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError(
              "Location information unavailable. Please check your GPS settings and try again.",
            );
            break;
          case error.TIMEOUT:
            setLocationError(
              "Location request timed out. Please try again in a moment.",
            );
            break;
          default:
            setLocationError("Failed to get your location. Please try again.");
        }
      } else {
        setLocationError(
          "Failed to get address from location. You can still enter your address manually below.",
        );
      }
      return null;
    } finally {
      setLocationLoading(false);
    }
  };

  // Improved Use Current Location Button (for both add and edit forms):
  const fillFormWithLocation = async () => {
    const locationData = await getCurrentLocation();
    if (locationData) {
      setEditForm((prev) => ({
        ...prev,
        address: locationData.address,
        city: locationData.city,
        state: locationData.state,
        zipCode: locationData.zipCode,
        country: locationData.country,
        building: locationData.building || "",
        flat: locationData.flat || "",
        landmark: locationData.landmark || "",
        exactLatitude: locationData.latitude,
        exactLongitude: locationData.longitude,
      }));
      // Do NOT auto-save. User must click Save.
    }
  };

  // Update handler
  const handleUpdateAddress = async () => {
    if (!user || !selectedAddress) return;
    setUpdateLoading(true);
    try {
      const data = await ApiService.updateUserAddress(user.userId, {
        ...editForm,
        isDefault: selectedAddress.isDefault, // Preserve default status when updating
      });
      if (data.success) {
        setUser((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            addresses: data.data.addresses, // Use the addresses from server response
          };
        });
        setEditing(false);
        successToastHandler("Address updated successfully!");
      } else {
        errorToastHandler(data.message || "Failed to update address");
      }
    } catch (err) {
      console.error("Error updating address:", err);
      errorToastHandler("Failed to update address");
    } finally {
      setUpdateLoading(false);
    }
  };

  // Add handler
  const handleAddAddress = async () => {
    if (!user) return;

    // Check if user already has 5 addresses
    if (userAddresses.length >= 5) {
      errorToastHandler(
        "Maximum of 5 addresses allowed. Please delete an existing address first.",
      );
      return;
    }

    setUpdateLoading(true);
    try {
      const data = await ApiService.updateUserAddress(user.userId, {
        ...editForm,
        isDefault: userAddresses.length === 0, // Make first address default
      });
      if (data.success) {
        setUser((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            addresses: data.data.addresses, // Use the addresses from server response
          };
        });
        setAddingNew(false);
        setEditing(false);
        successToastHandler("Address added successfully!");
      } else {
        errorToastHandler(data.message || "Failed to add address");
      }
    } catch (err) {
      console.error("Error adding address:", err);
      errorToastHandler("Failed to add address");
    } finally {
      setUpdateLoading(false);
    }
  };

  // Delete handler
  const handleDeleteAddress = async (addressId: string) => {
    if (!user || userAddresses.length <= 1) {
      errorToastHandler("You must have at least one address.");
      return;
    }

    setUpdateLoading(true);
    try {
      const data = await ApiService.deleteUserAddress(user.userId, addressId);
      if (data.success) {
        setUser((prev) => {
          if (!prev) return null;
          const updatedAddresses = prev.addresses.filter(
            (addr) => addr._id !== addressId,
          );
          // If deleted address was selected, select the first remaining address
          if (selectedAddressId === addressId && updatedAddresses.length > 0) {
            setSelectedAddressId(updatedAddresses[0]._id);
          }
          return {
            ...prev,
            addresses: updatedAddresses,
          };
        });
        successToastHandler("Address deleted successfully!");
      } else {
        errorToastHandler(data.message || "Failed to delete address");
      }
    } catch (err) {
      console.error("Error deleting address:", err);
      errorToastHandler("Failed to delete address");
    } finally {
      setUpdateLoading(false);
    }
  };

  // Set address as default
  const handleSetAsDefault = async (addressId: string) => {
    if (!user) return;

    const addressToUpdate = userAddresses.find(
      (addr) => addr._id === addressId,
    );
    if (!addressToUpdate) return;

    setUpdateLoading(true);
    try {
      const data = await ApiService.updateUserAddress(user.userId, {
        ...addressToUpdate,
        isDefault: true,
      });
      if (data.success) {
        setUser((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            addresses: data.data.addresses,
          };
        });
        successToastHandler("Default address updated successfully!");
      } else {
        errorToastHandler(data.message || "Failed to update default address");
      }
    } catch (err) {
      console.error("Error setting default address:", err);
      errorToastHandler("Failed to update default address");
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleEditProfile = () => {
    if (!user) return;
    setProfileForm({
      name: user.name,
      phone: user.phone || "",
    });
    setEditingProfile(true);
  };

  const handleUpdateProfile = async () => {
    if (!user) return;
    setProfileUpdateLoading(true);
    try {
      const data = await ApiService.updateProfile(
        profileForm.name,
        profileForm.phone,
      );
      if (data.success) {
        setUser((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            name: profileForm.name,
            phone: profileForm.phone,
          };
        });
        setEditingProfile(false);
        successToastHandler("Profile updated successfully!");
      } else {
        errorToastHandler(data.message || "Failed to update profile");
      }
    } catch (err) {
      console.error("Error updating profile:", err);
      errorToastHandler("Failed to update profile");
    } finally {
      setProfileUpdateLoading(false);
    }
  };

  const handleCancelProfileEdit = () => {
    setEditingProfile(false);
    setProfileForm({
      name: "",
      phone: "",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen pt-20 bg-gradient-to-br from-emerald-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="text-center">
          <Loader2 className="w-12 h-12 mx-auto mb-4 text-emerald-600 animate-spin" />
          <p className="text-gray-600 dark:text-gray-300">
            Loading your profile...
          </p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen pt-20 bg-gradient-to-br from-emerald-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="max-w-md p-8 mx-4 text-center bg-white shadow-xl dark:bg-gray-800 rounded-2xl">
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full dark:bg-red-900">
            <User className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
            {error || "User not found"}
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Please try refreshing the page or contact support.
          </p>
        </div>
      </div>
    );
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen pt-20 bg-gradient-to-br from-emerald-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="px-4 py-8 mx-auto max-w-7xl sm:px-6 lg:px-8">
        {/* Header Section */}
        <AnimatedSection>
          <div className="mb-8 overflow-hidden bg-white shadow-xl dark:bg-gray-800 rounded-3xl">
            <div className="px-6 py-8 bg-gradient-to-r from-emerald-600 to-green-600 sm:px-8 sm:py-12">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-6">
                  <div className="flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-white/20 backdrop-blur-sm rounded-2xl">
                    <span className="text-xl font-bold text-white sm:text-2xl">
                      {getInitials(user.name)}
                    </span>
                  </div>
                  <div>
                    <h1 className="mb-2 text-2xl font-bold text-white sm:text-3xl">
                      {user.name}
                    </h1>
                    <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4 text-white/90">
                      <div className="flex items-center space-x-1">
                        <Mail className="w-4 h-4" />
                        <span className="text-sm">{user.email}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </AnimatedSection>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="space-y-8 lg:col-span-2">
            {/* Account Information */}
            <AnimatedSection delay={0.1}>
              <div className="overflow-hidden bg-white border border-gray-200 shadow-lg dark:bg-gray-800 rounded-2xl dark:border-gray-700">
                <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 dark:border-gray-600">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-10 h-10 bg-emerald-100 dark:bg-emerald-900 rounded-xl">
                        <User className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        Account Information
                      </h2>
                    </div>
                    {!editingProfile && (
                      <button
                        onClick={handleEditProfile}
                        className="flex items-center px-4 py-2 space-x-2 font-medium text-white transition-colors rounded-lg bg-emerald-600 hover:bg-emerald-700"
                      >
                        <Edit size={16} />
                        <span>Edit Profile</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-6">
                  {editingProfile ? (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Full Name
                          </label>
                          <input
                            type="text"
                            value={profileForm.name}
                            onChange={(e) =>
                              setProfileForm({
                                ...profileForm,
                                name: e.target.value,
                              })
                            }
                            className="w-full p-3 text-gray-900 bg-white border border-gray-300 rounded-lg dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            placeholder="Enter your full name"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Mobile Number
                          </label>
                          <input
                            type="tel"
                            value={profileForm.phone}
                            onChange={(e) =>
                              setProfileForm({
                                ...profileForm,
                                phone: e.target.value,
                              })
                            }
                            className="w-full p-3 text-gray-900 bg-white border border-gray-300 rounded-lg dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            placeholder="Enter your mobile number"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3">
                        <button
                          onClick={handleUpdateProfile}
                          disabled={profileUpdateLoading}
                          className="flex items-center justify-center flex-1 px-6 py-3 space-x-2 font-medium text-white transition-colors bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                        >
                          {profileUpdateLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                          <span>Save Changes</span>
                        </button>
                        <button
                          onClick={handleCancelProfileEdit}
                          className="flex items-center justify-center flex-1 px-6 py-3 space-x-2 font-medium text-white transition-colors bg-gray-500 rounded-lg hover:bg-gray-600"
                        >
                          <X className="w-4 h-4" />
                          <span>Cancel</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Full Name
                        </label>
                        <div className="flex items-center p-4 space-x-3 border border-gray-200 bg-gray-50 dark:bg-gray-700 rounded-xl dark:border-gray-600">
                          <User className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                          <span className="font-medium text-gray-900 dark:text-white">
                            {user.name}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Email Address
                        </label>
                        <div className="flex items-center p-4 space-x-3 border border-gray-200 bg-gray-50 dark:bg-gray-700 rounded-xl dark:border-gray-600">
                          <Mail className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                          <span className="font-medium text-gray-900 dark:text-white">
                            {user.email}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Mobile Number
                        </label>
                        <div className="flex items-center p-4 space-x-3 border border-gray-200 bg-gray-50 dark:bg-gray-700 rounded-xl dark:border-gray-600">
                          <User className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                          <span className="font-medium text-gray-900 dark:text-white">
                            {user.phone || "Not provided"}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Authentication
                        </label>
                        <div className="flex items-center p-4 space-x-3 border border-gray-200 bg-gray-50 dark:bg-gray-700 rounded-xl dark:border-gray-600">
                          <Key className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                          <span className="font-medium text-gray-900 capitalize dark:text-white">
                            {user.authProvider}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Last Login
                        </label>
                        <div className="flex items-center p-4 space-x-3 border border-gray-200 bg-gray-50 dark:bg-gray-700 rounded-xl dark:border-gray-600">
                          <Calendar className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                          <span className="font-medium text-gray-900 dark:text-white">
                            {formatDate(user.lastLogin)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </AnimatedSection>

            {/* Addresses */}
            <AnimatedSection delay={0.2}>
              <div className="overflow-hidden bg-white border border-gray-200 shadow-lg dark:bg-gray-800 rounded-2xl dark:border-gray-700">
                <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900 dark:to-emerald-900 dark:border-gray-600">
                  <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-10 h-10 bg-green-100 dark:bg-green-800 rounded-xl">
                        <MapPin className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                          Delivery Addresses
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Manage up to 5 delivery addresses (
                          {userAddresses.length}/5)
                        </p>
                      </div>
                    </div>
                    {userAddresses.length < 5 && (
                      <button
                        onClick={() => {
                          setAddingNew(true);
                          setEditing(true);
                          setEditForm({
                            label: "",
                            address: "",
                            city: "",
                            state: "",
                            zipCode: "",
                            country: "India",
                            building: "",
                            flat: "",
                            landmark: "",
                          });
                        }}
                        className="flex items-center justify-center px-4 py-3 space-x-2 font-medium text-white transition-all duration-200 bg-green-600 hover:bg-green-700 rounded-xl hover:scale-105"
                      >
                        <Plus size={16} />
                        <span className="text-sm">Add New Address</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-6">
                  {/* Address Selection */}
                  {userAddresses.length > 1 && !editing && (
                    <div className="mb-6">
                      <label className="block mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Select Address to View/Edit:
                      </label>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {userAddresses.map((addr) => (
                          <button
                            key={addr._id}
                            onClick={() => setSelectedAddressId(addr._id)}
                            className={`p-3 text-left border rounded-lg transition-all ${
                              selectedAddressId === addr._id
                                ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                                : "border-gray-200 hover:border-gray-300 dark:border-gray-600"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-gray-900 dark:text-white">
                                {addr.label}
                              </span>
                              {addr.isDefault && (
                                <Star className="w-4 h-4 text-yellow-500 fill-current" />
                              )}
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                              {addr.address}, {addr.city}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* No Addresses State */}
                  {userAddresses.length === 0 && !editing && (
                    <div className="text-center py-12">
                      <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full dark:bg-gray-700">
                        <MapPin className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                        No Addresses Added
                      </h3>
                      <p className="mb-6 text-gray-600 dark:text-gray-400">
                        Add your first delivery address to start placing orders.
                      </p>
                      <button
                        onClick={() => {
                          setAddingNew(true);
                          setEditing(true);
                          setEditForm({
                            label: "",
                            address: "",
                            city: "",
                            state: "",
                            zipCode: "",
                            country: "India",
                            building: "",
                            flat: "",
                            landmark: "",
                          });
                        }}
                        className="flex items-center justify-center px-6 py-3 mx-auto space-x-2 font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
                      >
                        <Plus size={16} />
                        <span>Add Your First Address</span>
                      </button>
                    </div>
                  )}

                  {/* Selected Address Display */}
                  {selectedAddress && !editing && (
                    <div className="space-y-6">
                      <div className="p-6 border border-gray-200 rounded-xl dark:border-gray-600">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center mb-3 space-x-3">
                              <div className="flex items-center justify-center w-10 h-10 bg-emerald-100 dark:bg-emerald-900 rounded-xl">
                                <Home className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                              </div>
                              <div>
                                <h4 className="text-lg font-bold text-gray-900 capitalize dark:text-white">
                                  {selectedAddress.label}
                                </h4>
                                <div className="flex items-center space-x-2">
                                  {selectedAddress.isDefault && (
                                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full dark:bg-green-900 dark:text-green-200">
                                      <Star className="w-3 h-3 mr-1 fill-current" />
                                      Default
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="space-y-2 text-gray-600 dark:text-gray-300">
                              <div className="flex items-center space-x-2">
                                <Building className="w-4 h-4" />
                                <span>{selectedAddress.address}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <MapPin className="w-4 h-4" />
                                <span>
                                  {selectedAddress.city},{" "}
                                  {selectedAddress.state} -{" "}
                                  {selectedAddress.zipCode}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Globe className="w-4 h-4" />
                                <span className="capitalize">
                                  {selectedAddress.country}
                                </span>
                              </div>
                              {(selectedAddress.building ||
                                selectedAddress.flat ||
                                selectedAddress.landmark) && (
                                <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                  <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                                    Additional Details:
                                  </h5>
                                  {selectedAddress.building && (
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                      Building: {selectedAddress.building}
                                    </p>
                                  )}
                                  {selectedAddress.flat && (
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                      Flat/House: {selectedAddress.flat}
                                    </p>
                                  )}
                                  {selectedAddress.landmark && (
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                      Landmark: {selectedAddress.landmark}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Address Actions */}
                        <div className="flex flex-wrap gap-2 mt-6">
                          <button
                            onClick={() => {
                              if (!selectedAddress) return;
                              setEditForm({
                                label: selectedAddress.label,
                                address: selectedAddress.address,
                                city: selectedAddress.city,
                                state: selectedAddress.state,
                                zipCode: selectedAddress.zipCode,
                                country: selectedAddress.country,
                                building: selectedAddress.building || "",
                                flat: selectedAddress.flat || "",
                                landmark: selectedAddress.landmark || "",
                              });
                              setAddingNew(false);
                              setEditing(true);
                            }}
                            className="flex items-center px-4 py-2 space-x-2 text-white transition-colors bg-emerald-600 rounded-lg hover:bg-emerald-700"
                          >
                            <Edit size={16} />
                            <span>Edit</span>
                          </button>

                          {!selectedAddress.isDefault && (
                            <button
                              onClick={() =>
                                handleSetAsDefault(selectedAddress._id)
                              }
                              disabled={updateLoading}
                              className="flex items-center px-4 py-2 space-x-2 text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                              <Star size={16} />
                              <span>Set as Default</span>
                            </button>
                          )}

                          {userAddresses.length > 1 && (
                            <button
                              onClick={() =>
                                handleDeleteAddress(selectedAddress._id)
                              }
                              disabled={updateLoading}
                              className="flex items-center px-4 py-2 space-x-2 text-white transition-colors bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                            >
                              <Trash2 size={16} />
                              <span>Delete</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Add/Edit Address Form */}
                  {editing && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                          {addingNew ? "Add New Address" : "Edit Address"}
                        </h4>
                        <button
                          onClick={() => {
                            setEditing(false);
                            setAddingNew(false);
                            setEditForm({
                              label: "",
                              address: "",
                              city: "",
                              state: "",
                              zipCode: "",
                              country: "",
                              building: "",
                              flat: "",
                              landmark: "",
                            });
                          }}
                          className="flex items-center px-4 py-2 space-x-2 text-white transition-colors bg-gray-500 rounded-lg hover:bg-gray-600"
                        >
                          <X size={16} />
                          <span>Cancel</span>
                        </button>
                      </div>

                      {/* Location Button */}
                      <button
                        onClick={fillFormWithLocation}
                        disabled={locationLoading}
                        className="flex items-center justify-center w-full px-6 py-4 mb-4 text-lg font-semibold text-white transition-all duration-200 shadow-lg bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:opacity-60"
                      >
                        {locationLoading ? (
                          <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                        ) : (
                          <Navigation className="w-6 h-6 mr-2" />
                        )}
                        <span>
                          {locationLoading
                            ? "Getting Location..."
                            : "Use Current Location"}
                        </span>
                      </button>

                      {locationError && (
                        <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
                          <AlertCircle className="w-4 h-4" />
                          <span className="text-sm">{locationError}</span>
                        </div>
                      )}

                      {/* Form Fields */}
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                            Address Label *
                          </label>
                          <input
                            type="text"
                            value={editForm.label}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                label: e.target.value,
                              })
                            }
                            className="w-full p-3 text-gray-900 bg-white border border-gray-300 rounded-lg dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            placeholder="e.g., Home, Office, Mom's House"
                          />
                        </div>

                        <div>
                          <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                            Street Address *
                          </label>
                          <input
                            type="text"
                            value={editForm.address}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                address: e.target.value,
                              })
                            }
                            className="w-full p-3 text-gray-900 bg-white border border-gray-300 rounded-lg dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            placeholder="Enter street address"
                          />
                        </div>

                        <div>
                          <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                            City *
                          </label>
                          <input
                            type="text"
                            value={editForm.city}
                            onChange={(e) =>
                              setEditForm({ ...editForm, city: e.target.value })
                            }
                            className="w-full p-3 text-gray-900 bg-white border border-gray-300 rounded-lg dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            placeholder="Enter city"
                          />
                        </div>

                        <div>
                          <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                            State *
                          </label>
                          <input
                            type="text"
                            value={editForm.state}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                state: e.target.value,
                              })
                            }
                            className="w-full p-3 text-gray-900 bg-white border border-gray-300 rounded-lg dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            placeholder="Enter state"
                          />
                        </div>

                        <div>
                          <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                            Zip Code *
                          </label>
                          <input
                            type="text"
                            value={editForm.zipCode}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                zipCode: e.target.value,
                              })
                            }
                            className="w-full p-3 text-gray-900 bg-white border border-gray-300 rounded-lg dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            placeholder="Enter zip code"
                          />
                        </div>

                        <div>
                          <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                            Country *
                          </label>
                          <input
                            type="text"
                            value={editForm.country}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                country: e.target.value,
                              })
                            }
                            className="w-full p-3 text-gray-900 bg-white border border-gray-300 rounded-lg dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            placeholder="Enter country"
                          />
                        </div>

                        <div>
                          <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                            Building/Complex (Optional)
                          </label>
                          <input
                            type="text"
                            value={editForm.building || ""}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                building: e.target.value,
                              })
                            }
                            className="w-full p-3 text-gray-900 bg-white border border-gray-300 rounded-lg dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            placeholder="e.g., ABC Tower"
                          />
                        </div>

                        <div>
                          <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                            Flat/House Number (Optional)
                          </label>
                          <input
                            type="text"
                            value={editForm.flat || ""}
                            onChange={(e) =>
                              setEditForm({ ...editForm, flat: e.target.value })
                            }
                            className="w-full p-3 text-gray-900 bg-white border border-gray-300 rounded-lg dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            placeholder="e.g., Flat 101"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                            Nearby Landmark (Optional)
                          </label>
                          <input
                            type="text"
                            value={editForm.landmark || ""}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                landmark: e.target.value,
                              })
                            }
                            className="w-full p-3 text-gray-900 bg-white border border-gray-300 rounded-lg dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            placeholder="e.g., Near Central Mall"
                          />
                        </div>
                      </div>

                      {/* Save Button */}
                      <div className="flex justify-end">
                        <button
                          onClick={
                            addingNew ? handleAddAddress : handleUpdateAddress
                          }
                          disabled={
                            updateLoading ||
                            !editForm.label ||
                            !editForm.address ||
                            !editForm.city ||
                            !editForm.state ||
                            !editForm.zipCode
                          }
                          className="flex items-center px-6 py-3 space-x-2 font-medium text-white transition-colors bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                        >
                          {updateLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                          <span>
                            {addingNew ? "Add Address" : "Save Changes"}
                          </span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </AnimatedSection>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Account Status */}
            <AnimatedSection delay={0.3}>
              <div className="p-6 bg-white border border-gray-200 shadow-lg dark:bg-gray-800 rounded-2xl dark:border-gray-700">
                <h3 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">
                  Account Status
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-300">
                      Email Verified
                    </span>
                    <div className="flex items-center space-x-2">
                      {user.isVerified ? (
                        <>
                          <UserCheck className="w-4 h-4 text-green-600" />
                          <span className="font-medium text-green-600">
                            Verified
                          </span>
                        </>
                      ) : (
                        <>
                          <Shield className="w-4 h-4 text-yellow-600" />
                          <span className="font-medium text-yellow-600">
                            Pending
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-300">
                      Account Type
                    </span>
                    <span className="px-3 py-1 text-sm font-medium capitalize rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                      {user.role}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-300">
                      Member Since
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {new Date(user.lastLogin).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                      })}
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
