import React, { useState, useEffect, useCallback } from "react";
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle,
  Package,
  Users,
  Copy,
} from "lucide-react";
import { successToastHandler, warningToastHandler } from "../utils/toastUtils";
import { toast } from "react-toastify";

interface SubscriptionPlan {
  _id: string;
  name: string;
  milkType: "cow" | "buffalo";
  volume: "1L" | "2L" | "3L";
  duration: 7 | 15 | 30;
  price: number;
  dailyPrice: number;
  description?: string;
  features: string[];
  isActive: boolean;
  discount: number;
  originalPrice: number;
}

interface UserSubscription {
  _id: string;
  orderId: string;
  status:
    | "pending"
    | "processing"
    | "active"
    | "paused"
    | "cancellation_requested"
    | "cancelled"
    | "completed"
    | "expired";
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  startDate: string;
  endDate: string;
  nextDeliveryDate: string;
  totalDeliveries: number;
  completedDeliveries: number;
  skippedDeliveries: number;
  deliveryAddress: {
    fullAddress: string;
    landmark?: string;
    city: string;
    state: string;
    pincode: string;
    contactNumber: string;
  };
  deliveryInstructions?: string;
  preferredDeliveryTime: "morning" | "afternoon" | "evening";
  paymentInfo: {
    transactionId?: string;
    paymentMethod: "card" | "upi" | "netbanking" | "wallet" | "cod";
    amount: number;
    currency: string;
    paymentDate?: string;
  };
  subscriptionId: SubscriptionPlan;
  discountApplied: number;
  createdAt: string;
  autoRenewal?: boolean;
}

interface PaymentSession {
  paymentId: string;
  referenceNumber: string;
  totalAmount: number;
  qrCodeUrl: string;
  upiId: string;
  upiName: string;
  orderCount: number;
  expiresIn: number;
  subscriptionId: string;
}

const SubscriptionsPage: React.FC = () => {
  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, []);

  // const { user } = useAuth(); // Remove unused user
  const [activeTab, setActiveTab] = useState<"plans" | "my-subscriptions">(
    "plans",
  );
  const [subscriptionPlans, setSubscriptionPlans] = useState<
    SubscriptionPlan[]
  >([]);
  const [userSubscriptions, setUserSubscriptions] = useState<
    UserSubscription[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [plansLoading, setPlansLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(
    null,
  );
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentSession, setPaymentSession] = useState<PaymentSession | null>(
    null,
  );
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [upiTransactionId, setUpiTransactionId] = useState("");
  const [upiReferenceNumber, setUpiReferenceNumber] = useState("");
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [milkTypeFilter, setMilkTypeFilter] = useState<
    "all" | "cow" | "buffalo"
  >("all");
  const [durationFilter, setDurationFilter] = useState<
    "all" | "7" | "15" | "30"
  >("all");
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellingSubscription, setCancellingSubscription] =
    useState<UserSubscription | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  // Form data for subscription
  const [subscriptionForm, setSubscriptionForm] = useState({
    deliveryAddress: {
      fullAddress: "",
      landmark: "",
      city: "",
      state: "",
      pincode: "",
      contactNumber: "",
    },
    deliveryInstructions: "",
    preferredDeliveryTime: "morning" as "morning" | "afternoon" | "evening",
    paymentMethod: "upi" as "card" | "upi" | "netbanking" | "wallet" | "cod",
    startDate: "",
  });

  // Update the cancel form state
  const [cancelForm, setCancelForm] = useState({
    reason: "",
    refundDetails: {
      mobileNumber: "",
      refundMethod: "upi" as "upi" | "bank_transfer",
      upiId: "",
      accountHolderName: "",
      bankName: "",
      accountNumber: "",
      ifscCode: "",
    },
  });

  // Load subscription plans
  const loadSubscriptionPlans = useCallback(async () => {
    setPlansLoading(true);
    try {
      const params = new URLSearchParams();
      if (milkTypeFilter !== "all") {
        params.append("milkType", milkTypeFilter);
      }

      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/subscription/plans?${params}`,
        {
          method: "GET",
        },
      );

      const data = await response.json();
      if (data.success) {
        let plans = data.data;

        // Filter by duration if specified
        if (durationFilter !== "all") {
          plans = plans.filter(
            (plan: SubscriptionPlan) =>
              plan.duration === parseInt(durationFilter),
          );
        }

        setSubscriptionPlans(plans);
      }
    } catch (error) {
      console.error("Error loading subscription plans:", error);
    } finally {
      setPlansLoading(false);
    }
  }, [milkTypeFilter, durationFilter]);

  // Load user subscriptions
  const loadUserSubscriptions = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("Authentication required");

      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/subscription/my-subscriptions`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      const data = await response.json();
      if (data.success) {
        setUserSubscriptions(data.data);
      }
    } catch (error) {
      console.error("Error loading user subscriptions:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load data based on active tab
  useEffect(() => {
    if (activeTab === "plans") {
      loadSubscriptionPlans();
    } else {
      loadUserSubscriptions();
    }
  }, [activeTab, milkTypeFilter, durationFilter, loadSubscriptionPlans, loadUserSubscriptions]);

  // Handle subscription form submission
  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPlan) return;

    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        toast.error("Please login to subscribe");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/subscription/subscribe`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            subscriptionId: selectedPlan._id,
            ...subscriptionForm,
          }),
        },
      );

      const data = await response.json();
      if (data.success) {
        successToastHandler("Subscription created successfully! 🎉");
        // Create payment session
        await createPaymentSession(selectedPlan._id, data.data._id);
        setShowSubscribeModal(false);
        setShowPaymentModal(true);
      }
    } catch (error) {
      console.error("Error creating subscription:", error);
    }
  };

  // Create payment session
  const createPaymentSession = async (
    planId: string,
    subscriptionId: string,
  ) => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("Authentication required");

      const response = await fetch(
        `${
          import.meta.env.VITE_BACKEND_URL
        }/subscription/create-payment-session`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            subscriptionId: subscriptionId,
            planId: planId,
          }),
        },
      );

      const data = await response.json();
      if (data.success) {
        successToastHandler(
          "Payment session created! Scan QR code to pay via UPI",
        );
        setPaymentSession(data.data);
        setTimeRemaining(data.data.expiresIn);
      }
    } catch (error) {
      console.error("Error creating payment session:", error);
    }
  };

  // Mark payment as completed
  const markPaymentCompleted = async () => {
    if (!paymentSession || !upiTransactionId) return;

    setPaymentLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("Authentication required");

      const response = await fetch(
        `${
          import.meta.env.VITE_BACKEND_URL
        }/subscription/mark-payment-completed/${paymentSession.paymentId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            upiTransactionId,
            upiReferenceNumber,
          }),
        },
      );

      const data = await response.json();
      if (data.success) {
        successToastHandler(
          "Payment submitted successfully! Your subscription will be activated soon.",
        );
        setPaymentCompleted(true);
        setShowPaymentForm(false);
        // Reload subscriptions after successful payment
        setTimeout(() => {
          setShowPaymentModal(false);
          setActiveTab("my-subscriptions");
          loadUserSubscriptions();
        }, 3000);
      }
    } catch (error) {
      console.error("Error marking payment completed:", error);
    } finally {
      setPaymentLoading(false);
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    successToastHandler("Copied to clipboard!");
  };

  // Handle subscription cancellation
  const handleCancelSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingSubscription) return;

    setCancelLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("Authentication required");

      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/subscription/my-subscriptions/${
          cancellingSubscription._id
        }/cancel`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reason: cancelForm.reason,
            refundDetails: cancelForm.refundDetails,
          }),
        },
      );

      const data = await response.json();
      if (data.success) {
        setShowCancelModal(false);
        setCancellingSubscription(null);
        // Reset form
        setCancelForm({
          reason: "",
          refundDetails: {
            mobileNumber: "",
            refundMethod: "upi",
            upiId: "",
            accountHolderName: "",
            bankName: "",
            accountNumber: "",
            ifscCode: "",
          },
        });
        // Reload subscriptions
        loadUserSubscriptions();
        successToastHandler(
          "Subscription cancelled successfully. Refund request has been created.",
        );
      }
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      warningToastHandler("Error cancelling subscription. Please try again.");
    } finally {
      setCancelLoading(false);
    }
  };

  // Open cancellation modal
  const openCancelModal = (subscription: UserSubscription) => {
    setCancellingSubscription(subscription);
    setShowCancelModal(true);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Get status color and icon
  const getStatusInfo = (status: string) => {
    switch (status) {
      case "active":
        return {
          color: "text-green-600 bg-green-50 border-green-200",
          icon: "🟢",
          label: "Active",
          description: "Your subscription is active and deliveries are ongoing",
        };
      case "pending":
        return {
          color: "text-orange-600 bg-orange-50 border-orange-200",
          icon: "⏳",
          label: "Pending Approval",
          description:
            "Waiting for admin approval to activate your subscription",
        };
      case "processing":
        return {
          color: "text-blue-600 bg-blue-50 border-blue-200",
          icon: "🔄",
          label: "Processing",
          description: "Payment verification in progress",
        };
      case "paused":
        return {
          color: "text-yellow-600 bg-yellow-50 border-yellow-200",
          icon: "⏸️",
          label: "Paused",
          description: "Your subscription is temporarily paused",
        };
      case "cancellation_requested":
        return {
          color: "text-purple-600 bg-purple-50 border-purple-200",
          icon: "📝",
          label: "Cancellation Requested",
          description: "Your cancellation request is being processed",
        };
      case "cancelled":
        return {
          color: "text-red-600 bg-red-50 border-red-200",
          icon: "❌",
          label: "Cancelled",
          description: "Your subscription has been cancelled",
        };
      case "completed":
        return {
          color: "text-blue-600 bg-blue-50 border-blue-200",
          icon: "✅",
          label: "Completed",
          description: "Your subscription has been completed successfully",
        };
      case "expired":
        return {
          color: "text-gray-600 bg-gray-50 border-gray-200",
          icon: "⏰",
          label: "Expired",
          description: "Your subscription has expired",
        };
      default:
        return {
          color: "text-gray-600 bg-gray-50 border-gray-200",
          icon: "❓",
          label: "Unknown",
          description: "Unknown subscription status",
        };
    }
  };

  // Get payment status info
  const getPaymentStatusInfo = (status: string) => {
    switch (status) {
      case "paid":
        return {
          color: "text-green-600 bg-green-50 border-green-200",
          icon: "💳",
          label: "Paid",
          description: "Payment completed successfully",
        };
      case "pending":
        return {
          color: "text-yellow-600 bg-yellow-50 border-yellow-200",
          icon: "⏳",
          label: "Payment Pending",
          description: "Payment is pending or being verified",
        };
      case "failed":
        return {
          color: "text-red-600 bg-red-50 border-red-200",
          icon: "❌",
          label: "Payment Failed",
          description: "Payment was unsuccessful",
        };
      case "refunded":
        return {
          color: "text-purple-600 bg-purple-50 border-purple-200",
          icon: "💰",
          label: "Refunded",
          description: "Payment has been refunded",
        };
      default:
        return {
          color: "text-gray-600 bg-gray-50 border-gray-200",
          icon: "❓",
          label: "Unknown",
          description: "Unknown payment status",
        };
    }
  };

  // Calculate progress percentage
  const getProgressPercentage = (subscription: UserSubscription) => {
    return Math.round(
      ((subscription.completedDeliveries + subscription.skippedDeliveries) /
        subscription.totalDeliveries) *
        100,
    );
  };

  // Countdown timer for payment
  useEffect(() => {
    if (timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeRemaining]);

  const formatTimeRemaining = () => {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen pt-24 bg-gray-50 dark:bg-gray-900">
      <div className="px-4 py-8 mx-auto max-w-7xl sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Milk Subscriptions
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Choose your milk delivery plan and enjoy fresh milk daily
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-8 border-b border-gray-200 dark:border-gray-700">
          <nav className="flex -mb-px space-x-8">
            <button
              onClick={() => setActiveTab("plans")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "plans"
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              <Package className="inline-block w-4 h-4 mr-2" />
              Available Plans
            </button>
            <button
              onClick={() => setActiveTab("my-subscriptions")}
              className={`py-2 px-1 flex items-center justify-center border-b-2 font-medium text-sm ${
                activeTab === "my-subscriptions"
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              <Users className="w-4 h-4 mr-2 inlinblock" />
              My Subscriptions
            </button>
          </nav>
        </div>

        {/* Subscription Plans Tab */}
        {activeTab === "plans" && (
          <div>
            {/* Filters */}
            <div className="flex-wrap gap-4 mb-6 fle x">
              <select
                value={milkTypeFilter}
                onChange={(e) =>
                  setMilkTypeFilter(e.target.value as "all" | "cow" | "buffalo")
                }
                className="px-4 py-2 text-gray-900 bg-white border rounded-lg bordegray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="all">All Milk Types</option>
                <option value="cow">Cow Milk</option>
                <option value="buffalo">Buffalo Milk</option>
              </select>

              <select
                value={durationFilter}
                onChange={(e) =>
                  setDurationFilter(e.target.value as "all" | "7" | "15" | "30")
                }
                className="px-4 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="all">All Durations</option>
                <option value="7">7 Days</option>
                <option value="15">15 Days</option>
                <option value="30">30 Days</option>
              </select>
            </div>

            {/* Plans Grid */}
            {plansLoading ? (
              <div className="py-12 text-center">
                <div className="w-12 h-12 mx-auto border-b-2 border-blue-600 rounded-full animate-spin"></div>
                <p className="mt-4 text-gray-600 dark:text-gray-400">
                  Loading subscription plans...
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {subscriptionPlans.map((plan) => (
                  <div
                    key={plan._id}
                    className="overflow-hidden bg-white rounded-lg shadow-md dark:bg-gray-800"
                  >
                    <div className="p-6">
                      {/* Plan Header */}
                      <div className="mb-4 text-center">
                        <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
                          {plan.name}
                        </h3>
                        <div className="flex items-center justify-center mb-3 space-x-2">
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-medium ${
                              plan.milkType === "cow"
                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                                : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                            }`}
                          >
                            {plan.milkType} Milk
                          </span>
                          <span className="px-3 py-1 text-sm font-medium text-blue-800 bg-blue-100 rounded-full dark:bg-blue-900 dark:text-blue-300">
                            {plan.volume}
                          </span>
                        </div>
                      </div>

                      {/* Pricing */}
                      <div className="mb-6 text-center">
                        <div className="text-3xl font-bold text-gray-900 dark:text-white">
                          ₹{plan.price.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          ₹{plan.dailyPrice}/day for {plan.duration} days
                        </div>
                        {plan.discount > 0 && (
                          <div className="mt-1 text-sm text-green-600">
                            {plan.discount}% off from ₹
                            {plan.originalPrice.toLocaleString()}
                          </div>
                        )}
                      </div>

                      {/* Features */}
                      <div className="mb-6">
                        <h4 className="mb-3 font-medium text-gray-900 dark:text-white">
                          What's included:
                        </h4>
                        <ul className="space-y-2">
                          {plan.features.map((feature, index) => (
                            <li
                              key={index}
                              className="flex items-center text-sm text-gray-600 dark:text-gray-400"
                            >
                              <CheckCircle className="flex-shrink-0 w-4 h-4 mr-2 text-green-500" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Description */}
                      {plan.description && (
                        <div className="mb-6">
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {plan.description}
                          </p>
                        </div>
                      )}

                      {/* Subscribe Button */}
                      <button
                        onClick={() => {
                          setSelectedPlan(plan);
                          setShowSubscribeModal(true);
                        }}
                        className="w-full px-4 py-3 font-medium text-white transition duration-200 bg-blue-600 rounded-lg hover:bg-blue-700"
                      >
                        Subscribe Now
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* My Subscriptions Tab */}
        {activeTab === "my-subscriptions" && (
          <div>
            {loading ? (
              <div className="py-12 text-center">
                <div className="w-12 h-12 mx-auto border-b-2 border-blue-600 rounded-full animate-spin"></div>
                <p className="mt-4 text-gray-600 dark:text-gray-400">
                  Loading your subscriptions...
                </p>
              </div>
            ) : userSubscriptions.length === 0 ? (
              <div className="py-12 text-center">
                <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
                  No subscriptions yet
                </h3>
                <p className="mb-6 text-gray-600 dark:text-gray-400">
                  Start your milk subscription journey today!
                </p>
                <button
                  onClick={() => setActiveTab("plans")}
                  className="px-4 py-2 font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  Browse Plans
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {userSubscriptions.map((subscription) => {
                  const statusInfo = getStatusInfo(subscription.status);
                  const paymentStatusInfo = getPaymentStatusInfo(
                    subscription.paymentStatus,
                  );

                  return (
                    <div
                      key={subscription._id}
                      className="overflow-hidden bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 dark:bg-gray-800 dark:border-gray-700"
                    >
                      {/* Header Section */}
                      <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                          {/* Plan Info */}
                          <div className="flex-1">
                            <div className="flex items-center mb-2">
                              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                {subscription.subscriptionId?.name ||
                                  "Unknown Plan"}
                              </h3>
                              <span className="ml-3 px-2 py-1 text-xs font-medium text-blue-800 bg-blue-100 rounded-full dark:bg-blue-900 dark:text-blue-300">
                                {subscription.subscriptionId?.volume}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {subscription.subscriptionId?.milkType === "cow"
                                ? "🐄 Cow Milk"
                                : "🐃 Buffalo Milk"}{" "}
                              • {subscription.subscriptionId?.duration} days
                            </p>
                          </div>

                          {/* Status Badges */}
                          <div className="flex flex-col mt-4 space-y-2 lg:mt-0 lg:ml-6 lg:space-y-1">
                            <div
                              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${statusInfo.color}`}
                            >
                              <span className="mr-2">{statusInfo.icon}</span>
                              {statusInfo.label}
                            </div>
                            <div
                              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${paymentStatusInfo.color}`}
                            >
                              <span className="mr-2">
                                {paymentStatusInfo.icon}
                              </span>
                              {paymentStatusInfo.label}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Content Section */}
                      <div className="p-6">
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                          {/* Left Column - Key Information */}
                          <div className="space-y-4">
                            {/* Progress Section */}
                            <div className="p-4 bg-gray-50 rounded-lg dark:bg-gray-700">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-semibold text-gray-900 dark:text-white">
                                  Delivery Progress
                                </h4>
                                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                  {subscription.completedDeliveries +
                                    subscription.skippedDeliveries}
                                  /{subscription.totalDeliveries}
                                </span>
                              </div>
                              <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300 rounded-full"
                                  style={{
                                    width: `${getProgressPercentage(
                                      subscription,
                                    )}%`,
                                  }}
                                ></div>
                              </div>
                              <div className="flex justify-between mt-2 text-xs text-gray-600 dark:text-gray-400">
                                <span>
                                  Completed: {subscription.completedDeliveries}
                                </span>
                                <span>
                                  Skipped: {subscription.skippedDeliveries}
                                </span>
                                <span>
                                  Remaining:{" "}
                                  {subscription.totalDeliveries -
                                    subscription.completedDeliveries -
                                    subscription.skippedDeliveries}
                                </span>
                              </div>
                            </div>

                            {/* Key Dates */}
                            <div className="space-y-3">
                              <h4 className="font-semibold text-gray-900 dark:text-white">
                                Important Dates
                              </h4>
                              <div className="space-y-2">
                                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg dark:bg-blue-900/20">
                                  <div className="flex items-center">
                                    <Calendar className="w-4 h-4 mr-2 text-blue-600" />
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                      Next Delivery
                                    </span>
                                  </div>
                                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                    {formatDate(subscription.nextDeliveryDate)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg dark:bg-gray-700">
                                  <div className="flex items-center">
                                    <Clock className="w-4 h-4 mr-2 text-gray-600" />
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                      End Date
                                    </span>
                                  </div>
                                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                    {formatDate(subscription.endDate)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Right Column - Details */}
                          <div className="space-y-4">
                            {/* Payment Information */}
                            <div className="p-4 bg-green-50 rounded-lg dark:bg-green-900/20">
                              <h4 className="mb-3 font-semibold text-gray-900 dark:text-white">
                                Payment Details
                              </h4>
                              <div className="space-y-2">
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-600 dark:text-gray-400">
                                    Amount:
                                  </span>
                                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                                    ₹
                                    {subscription.paymentInfo?.amount?.toLocaleString() ||
                                      0}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-600 dark:text-gray-400">
                                    Method:
                                  </span>
                                  <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                                    {subscription.paymentInfo?.paymentMethod ||
                                      "N/A"}
                                  </span>
                                </div>
                                {subscription.discountApplied > 0 && (
                                  <div className="flex justify-between">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                      Discount:
                                    </span>
                                    <span className="text-sm font-medium text-green-600">
                                      ₹{subscription.discountApplied}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Delivery Information */}
                            <div className="p-4 bg-gray-50 rounded-lg dark:bg-gray-700">
                              <h4 className="mb-3 font-semibold text-gray-900 dark:text-white">
                                Delivery Details
                              </h4>
                              <div className="space-y-2">
                                <div className="flex items-start">
                                  <MapPin className="w-4 h-4 mr-2 mt-0.5 text-gray-600 flex-shrink-0" />
                                  <div className="text-sm text-gray-700 dark:text-gray-300">
                                    <div className="font-medium">
                                      {subscription.deliveryAddress?.city},{" "}
                                      {subscription.deliveryAddress?.state}
                                    </div>
                                    <div className="text-gray-600 dark:text-gray-400">
                                      {subscription.deliveryAddress?.pincode}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center">
                                  <Clock className="w-4 h-4 mr-2 text-gray-600" />
                                  <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                                    {subscription.preferredDeliveryTime}{" "}
                                    delivery
                                  </span>
                                </div>
                                {subscription.deliveryInstructions && (
                                  <div className="flex items-start">
                                    <span className="w-4 h-4 mr-2 mt-0.5 text-gray-600">
                                      📝
                                    </span>
                                    <span className="text-sm text-gray-700 dark:text-gray-300">
                                      {subscription.deliveryInstructions}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Order Information */}
                            <div className="p-4 bg-gray-50 rounded-lg dark:bg-gray-700">
                              <h4 className="mb-3 font-semibold text-gray-900 dark:text-white">
                                Order Information
                              </h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600 dark:text-gray-400">
                                    Order ID:
                                  </span>
                                  <span className="font-mono text-gray-900 dark:text-white">
                                    {subscription.orderId}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600 dark:text-gray-400">
                                    Created:
                                  </span>
                                  <span className="text-gray-900 dark:text-white">
                                    {formatDate(subscription.createdAt)}
                                  </span>
                                </div>
                                {subscription.autoRenewal && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">
                                      Auto Renewal:
                                    </span>
                                    <span className="px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full dark:bg-green-900 dark:text-green-300">
                                      Enabled
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Status Description */}
                        <div className="mt-6 p-4 bg-blue-50 rounded-lg dark:bg-blue-900/20">
                          <div className="flex items-start">
                            <span className="mr-3 mt-1">ℹ️</span>
                            <div>
                              <h5 className="font-medium text-gray-900 dark:text-white mb-1">
                                Status Information
                              </h5>
                              <p className="text-sm text-gray-700 dark:text-gray-300">
                                {statusInfo.description}
                              </p>
                              {subscription.status === "processing" &&
                                subscription.paymentStatus === "pending" && (
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    Your payment is being verified. This usually
                                    takes a few minutes.
                                  </p>
                                )}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col mt-6 space-y-2 sm:flex-row sm:space-y-0 sm:space-x-3">
                          {(subscription.status === "active" ||
                            subscription.status === "paused") && (
                            <button
                              onClick={() => openCancelModal(subscription)}
                              className="px-4 py-2 text-sm font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-900/20"
                            >
                              Cancel Subscription
                            </button>
                          )}
                          {subscription.status === "pending" &&
                            subscription.paymentStatus === "pending" && (
                              <button className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700">
                                Complete Payment
                              </button>
                            )}
                          {subscription.status === "processing" && (
                            <div className="flex items-center px-4 py-2 text-sm text-blue-600 bg-blue-50 rounded-lg dark:bg-blue-900/20">
                              <div className="w-4 h-4 mr-2 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                              Payment verification in progress...
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Subscribe Modal */}
      {showSubscribeModal && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
                Subscribe to {selectedPlan.name}
              </h2>

              <form onSubmit={handleSubscribe} className="space-y-4">
                {/* Delivery Address */}
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Delivery Address
                  </label>
                  <textarea
                    value={subscriptionForm.deliveryAddress.fullAddress}
                    onChange={(e) =>
                      setSubscriptionForm((prev) => ({
                        ...prev,
                        deliveryAddress: {
                          ...prev.deliveryAddress,
                          fullAddress: e.target.value,
                        },
                      }))
                    }
                    className="w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                    rows={3}
                    required
                    placeholder="Enter your complete delivery address"
                  />
                </div>

                {/* City, State, Pincode */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      City
                    </label>
                    <input
                      type="text"
                      value={subscriptionForm.deliveryAddress.city}
                      onChange={(e) =>
                        setSubscriptionForm((prev) => ({
                          ...prev,
                          deliveryAddress: {
                            ...prev.deliveryAddress,
                            city: e.target.value,
                          },
                        }))
                      }
                      className="w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                      required
                    />
                  </div>
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      State
                    </label>
                    <input
                      type="text"
                      value={subscriptionForm.deliveryAddress.state}
                      onChange={(e) =>
                        setSubscriptionForm((prev) => ({
                          ...prev,
                          deliveryAddress: {
                            ...prev.deliveryAddress,
                            state: e.target.value,
                          },
                        }))
                      }
                      className="w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                      required
                    />
                  </div>
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Pincode
                    </label>
                    <input
                      type="text"
                      value={subscriptionForm.deliveryAddress.pincode}
                      onChange={(e) =>
                        setSubscriptionForm((prev) => ({
                          ...prev,
                          deliveryAddress: {
                            ...prev.deliveryAddress,
                            pincode: e.target.value,
                          },
                        }))
                      }
                      className="w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                      required
                    />
                  </div>
                </div>

                {/* Contact Number */}
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Contact Number
                  </label>
                  <input
                    type="tel"
                    value={subscriptionForm.deliveryAddress.contactNumber}
                    onChange={(e) =>
                      setSubscriptionForm((prev) => ({
                        ...prev,
                        deliveryAddress: {
                          ...prev.deliveryAddress,
                          contactNumber: e.target.value,
                        },
                      }))
                    }
                    className="w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                    required
                  />
                </div>

                {/* Delivery Time */}
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Preferred Delivery Time
                  </label>
                  <select
                    value={subscriptionForm.preferredDeliveryTime}
                    onChange={(e) =>
                      setSubscriptionForm((prev) => ({
                        ...prev,
                        preferredDeliveryTime: e.target.value as
                          | "morning"
                          | "afternoon"
                          | "evening",
                      }))
                    }
                    className="w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                  >
                    <option value="morning">
                      Morning (5:00 AM - 11:00 AM)
                    </option>
                    {/* <option value="afternoon">
                      Afternoon (12:00 PM - 3:00 PM)
                    </option>
                    <option value="evening">Evening (5:00 PM - 8:00 PM)</option> */}
                  </select>
                </div>

                {/* Start Date */}
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={subscriptionForm.startDate}
                    onChange={(e) =>
                      setSubscriptionForm((prev) => ({
                        ...prev,
                        startDate: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                    min={new Date().toISOString().split("T")[0]}
                  />
                </div>

                {/* Special Instructions */}
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Special Instructions (Optional)
                  </label>
                  <textarea
                    value={subscriptionForm.deliveryInstructions}
                    onChange={(e) =>
                      setSubscriptionForm((prev) => ({
                        ...prev,
                        deliveryInstructions: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                    rows={2}
                    placeholder="Any special delivery instructions..."
                  />
                </div>

                {/* Summary */}
                <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700">
                  <h4 className="mb-2 font-medium text-gray-900 dark:text-white">
                    Order Summary
                  </h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        Plan:
                      </span>
                      <span className="text-gray-900 dark:text-white">
                        {selectedPlan.name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        Duration:
                      </span>
                      <span className="text-gray-900 dark:text-white">
                        {selectedPlan.duration} days
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        Daily Price:
                      </span>
                      <span className="text-gray-900 dark:text-white">
                        ₹{selectedPlan.dailyPrice}
                      </span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span className="text-gray-900 dark:text-white">
                        Total Amount:
                      </span>
                      <span className="text-gray-900 dark:text-white">
                        ₹{selectedPlan.price.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowSubscribeModal(false)}
                    className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-md dark:border-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    Proceed to Payment
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && paymentSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="w-full max-w-md bg-white rounded-lg dark:bg-gray-800">
            <div className="p-6">
              {!paymentCompleted ? (
                <>
                  <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
                    Complete Payment
                  </h2>

                  {/* Payment Details */}
                  <div className="p-4 mb-6 rounded-lg bg-gray-50 dark:bg-gray-700">
                    <div className="mb-4 text-center">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        ₹{paymentSession.totalAmount.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Reference: {paymentSession.referenceNumber}
                      </div>
                    </div>

                    {/* QR Code */}
                    <div className="mb-4 text-center">
                      <img
                        src={paymentSession.qrCodeUrl}
                        alt="Payment QR Code"
                        className="w-48 h-48 mx-auto"
                      />
                    </div>

                    {/* UPI Details */}
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">
                          UPI ID:
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {paymentSession.upiId}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">
                          Name:
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {paymentSession.upiName}
                        </span>
                      </div>
                    </div>

                    {/* Copy UPI ID */}
                    <button
                      onClick={() => copyToClipboard(paymentSession.upiId)}
                      className="w-full px-4 py-2 mt-3 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
                    >
                      <Copy className="inline-block w-4 h-4 mr-2" />
                      Copy UPI ID
                    </button>
                  </div>

                  {/* Timer */}
                  <div className="mb-4 text-center">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Time remaining:
                    </div>
                    <div className="text-2xl font-bold text-red-600">
                      {formatTimeRemaining()}
                    </div>
                  </div>

                  {/* Payment Form */}
                  {showPaymentForm ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                          UPI Transaction ID
                        </label>
                        <input
                          type="text"
                          value={upiTransactionId}
                          onChange={(e) => setUpiTransactionId(e.target.value)}
                          className="w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                          placeholder="Enter UPI transaction ID"
                          required
                        />
                      </div>
                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                          UPI Reference Number (Optional)
                        </label>
                        <input
                          type="text"
                          value={upiReferenceNumber}
                          onChange={(e) =>
                            setUpiReferenceNumber(e.target.value)
                          }
                          className="w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                          placeholder="Enter UPI reference number"
                        />
                      </div>
                      <button
                        onClick={markPaymentCompleted}
                        disabled={paymentLoading || !upiTransactionId}
                        className="w-full px-4 py-2 text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-gray-400"
                      >
                        {paymentLoading
                          ? "Processing..."
                          : "Mark Payment Complete"}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowPaymentForm(true)}
                      className="w-full px-4 py-2 text-white bg-green-600 rounded-md hover:bg-green-700"
                    >
                      I've Made the Payment
                    </button>
                  )}

                  <button
                    onClick={() => setShowPaymentModal(false)}
                    className="w-full px-4 py-2 mt-3 text-gray-700 border border-gray-300 rounded-md dark:border-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <div className="text-center">
                  <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
                  <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
                    Payment Submitted!
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Your payment has been submitted and is pending verification.
                    You'll receive a confirmation once verified.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cancel Subscription Modal */}
      {showCancelModal && cancellingSubscription && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
                Cancel Subscription
              </h2>
              <p className="mb-4 text-gray-600 dark:text-gray-400">
                Are you sure you want to cancel your subscription? This action
                cannot be undone.
              </p>

              <form onSubmit={handleCancelSubscription} className="space-y-4">
                {/* Cancellation Reason */}
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Reason for Cancellation *
                  </label>
                  <textarea
                    value={cancelForm.reason}
                    onChange={(e) =>
                      setCancelForm((prev) => ({
                        ...prev,
                        reason: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                    rows={3}
                    required
                    placeholder="Please provide a reason for cancellation..."
                  />
                </div>

                {/* Refund Details */}
                <div className="pt-4 border-t">
                  <h3 className="mb-3 text-lg font-medium text-gray-900 dark:text-white">
                    Refund Details
                  </h3>

                  {/* Mobile Number */}
                  <div className="mb-3">
                    <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Mobile Number *
                    </label>
                    <input
                      type="tel"
                      value={cancelForm.refundDetails.mobileNumber}
                      onChange={(e) =>
                        setCancelForm((prev) => ({
                          ...prev,
                          refundDetails: {
                            ...prev.refundDetails,
                            mobileNumber: e.target.value,
                          },
                        }))
                      }
                      className="w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                      required
                      placeholder="Enter mobile number"
                    />
                  </div>

                  {/* Refund Method Selection */}
                  <div className="mb-4">
                    <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Refund Method *
                    </label>
                    <div className="flex space-x-4">
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          value="upi"
                          checked={
                            cancelForm.refundDetails.refundMethod === "upi"
                          }
                          onChange={(e) =>
                            setCancelForm((prev) => ({
                              ...prev,
                              refundDetails: {
                                ...prev.refundDetails,
                                refundMethod: e.target.value as
                                  | "upi"
                                  | "bank_transfer",
                              },
                            }))
                          }
                          className="text-blue-600 form-radio"
                        />
                        <span className="ml-2">UPI</span>
                      </label>
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          value="bank_transfer"
                          checked={
                            cancelForm.refundDetails.refundMethod ===
                            "bank_transfer"
                          }
                          onChange={(e) =>
                            setCancelForm((prev) => ({
                              ...prev,
                              refundDetails: {
                                ...prev.refundDetails,
                                refundMethod: e.target.value as
                                  | "upi"
                                  | "bank_transfer",
                              },
                            }))
                          }
                          className="text-blue-600 form-radio"
                        />
                        <span className="ml-2">Bank Transfer</span>
                      </label>
                    </div>
                  </div>

                  {/* UPI Details */}
                  {cancelForm.refundDetails.refundMethod === "upi" && (
                    <div className="mb-3">
                      <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        UPI ID *
                      </label>
                      <input
                        type="text"
                        value={cancelForm.refundDetails.upiId}
                        onChange={(e) =>
                          setCancelForm((prev) => ({
                            ...prev,
                            refundDetails: {
                              ...prev.refundDetails,
                              upiId: e.target.value,
                            },
                          }))
                        }
                        className="w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                        required
                        placeholder="Enter UPI ID (e.g., user@upi)"
                      />
                    </div>
                  )}

                  {/* Bank Account Details */}
                  {cancelForm.refundDetails.refundMethod ===
                    "bank_transfer" && (
                    <>
                      <div className="mb-3">
                        <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                          Account Holder Name *
                        </label>
                        <input
                          type="text"
                          value={cancelForm.refundDetails.accountHolderName}
                          onChange={(e) =>
                            setCancelForm((prev) => ({
                              ...prev,
                              refundDetails: {
                                ...prev.refundDetails,
                                accountHolderName: e.target.value,
                              },
                            }))
                          }
                          className="w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                          required
                          placeholder="Enter account holder name"
                        />
                      </div>

                      <div className="mb-3">
                        <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                          Bank Name *
                        </label>
                        <input
                          type="text"
                          value={cancelForm.refundDetails.bankName}
                          onChange={(e) =>
                            setCancelForm((prev) => ({
                              ...prev,
                              refundDetails: {
                                ...prev.refundDetails,
                                bankName: e.target.value,
                              },
                            }))
                          }
                          className="w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                          required
                          placeholder="Enter bank name"
                        />
                      </div>

                      <div className="mb-3">
                        <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                          Account Number *
                        </label>
                        <input
                          type="text"
                          value={cancelForm.refundDetails.accountNumber}
                          onChange={(e) =>
                            setCancelForm((prev) => ({
                              ...prev,
                              refundDetails: {
                                ...prev.refundDetails,
                                accountNumber: e.target.value,
                              },
                            }))
                          }
                          className="w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                          required
                          placeholder="Enter account number"
                        />
                      </div>

                      <div className="mb-3">
                        <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                          IFSC Code *
                        </label>
                        <input
                          type="text"
                          value={cancelForm.refundDetails.ifscCode}
                          onChange={(e) =>
                            setCancelForm((prev) => ({
                              ...prev,
                              refundDetails: {
                                ...prev.refundDetails,
                                ifscCode: e.target.value,
                              },
                            }))
                          }
                          className="w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                          required
                          placeholder="Enter IFSC code"
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Buttons */}
                <div className="flex pt-4 space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCancelModal(false);
                      setCancellingSubscription(null);
                    }}
                    className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-md dark:border-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Keep Subscription
                  </button>
                  <button
                    type="submit"
                    disabled={cancelLoading}
                    className="flex-1 px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 disabled:bg-gray-400"
                  >
                    {cancelLoading ? "Cancelling..." : "Cancel Subscription"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionsPage;
