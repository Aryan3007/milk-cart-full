import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Trash2,
  AlertCircle,
  Eye,
  User,
  Info,
  QrCode,
  IndianRupee,
  Copy,
  CheckCircle2,
  Calendar,
  CreditCard,
  Filter,
} from "lucide-react";
import { Order } from "../types";
import { useAuth } from "../contexts/AuthContext";
import ApiService from "../services/api";
import AnimatedSection from "../components/AnimatedSection";
import {
  warningToastHandler,
  errorToastHandler,
  successToastHandler,
} from "../utils/toastUtils";

interface ApiOrder {
  id: string;
  orderNumber: string;
  items: Array<{
    productId: {
      _id: string;
      name: string;
      images: string[];
    };
    name: string;
    price: number;
    quantity: number;
    image: string | null;
    _id: string;
  }>;
  totalAmount: number;
  subtotal?: number;
  shippingFee?: number;
  tax?: number;
  discount?: number;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  shippingAddress: {
    name: string;
    address: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
    phone?: string;
    country: string;
  };
  deliveryShift: string;
  createdAt: string;
  estimatedDelivery?: string;
  deliveredAt?: string;
  confirmedAt?: string;
  cancelledAt?: string;
  adminNotes?: string;
  cancellationReason?: string;
  cancelledBy?: "user" | "admin";
  canBeCancelled?: boolean;
  cancellationMessage?: string;
}

interface UnpaidOrder {
  id: string;
  orderNumber: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    image?: string;
  }>;
  totalAmount: number;
  confirmedAt?: string;
  deliveredAt?: string;
  paymentStatus: string;
  status: string;
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
  orders: Array<{
    id: string;
    orderNumber: string;
    amount: number;
  }>;
}

export default function OrdersPage() {
  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, []);

  const [orders, setOrders] = useState<Order[]>([]);
  const [unpaidOrders, setUnpaidOrders] = useState<UnpaidOrder[]>([]);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [cancellingOrder, setCancellingOrder] = useState<string | null>(null);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [paymentSession, setPaymentSession] = useState<PaymentSession | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [upiTransactionId, setUpiTransactionId] = useState("");
  const [upiReference, setUpiReference] = useState("");
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [expiryTime, setExpiryTime] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<
    "all" | "pending" | "paid" | "unpaid"
  >("all");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "confirmed" | "delivered" | "cancelled"
  >("all");

  const { user } = useAuth();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      await Promise.all([loadOrders(), loadUnpaidOrders()]);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [loadOrders, loadUnpaidOrders]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

  useEffect(() => {
    // Update total amount when selected orders change
    const selectedTotal = unpaidOrders
      .filter((order) => selectedOrders.includes(order.id))
      .reduce((sum, order) => sum + order.totalAmount, 0);
    setTotalAmount(selectedTotal);
  }, [selectedOrders, unpaidOrders]);

  useEffect(() => {
    // Handle session expiry countdown
    if (paymentSession && expiryTime) {
      const timer = setInterval(() => {
        const now = Date.now();
        if (now >= expiryTime) {
          setPaymentSession(null);
          setExpiryTime(null);
          setError(
            "Payment session expired. Please create a new payment session.",
          );
          clearInterval(timer);
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [paymentSession, expiryTime]);

  const loadOrders = useCallback(async () => {
    if (!ApiService.isAuthenticated()) return;

    try {
      const response = await ApiService.getMyOrders();
      if (response.success && response.orders) {
        const formattedOrders: Order[] = response.orders.map(
          (order: ApiOrder) => ({
            id: order.id,
            userId: user?.id || "",
            items: order.items.map((item) => ({
              product: {
                id: item.productId?._id || item._id || `item-${Math.random()}`,
                name: item.name,
                description: "",
                price: item.price,
                image:
                  item.image ||
                  item.productId?.images?.[0] ||
                  "/placeholder.jpg",
                category: "",
                stock: 0,
                badges: [],
                rating: 0,
                reviews: 0,
                unit: "piece",
              },
              quantity: item.quantity,
            })),
            total: order.totalAmount,
            subtotal: order.subtotal,
            shippingFee: order.shippingFee,
            tax: order.tax,
            discount: order.discount,
            deliveryAddress: {
              id: "",
              name: order.shippingAddress.name,
              phone: order.shippingAddress.phone || "",
              addressLine1: order.shippingAddress.address,
              addressLine2: "",
              city: order.shippingAddress.city,
              state: order.shippingAddress.state,
              pincode: order.shippingAddress.zipCode,
              isDefault: false,
            },
            paymentMethod: order.paymentMethod.toUpperCase() as
              | "COD"
              | "UPI"
              | "CARD",
            status: order.status.toUpperCase() as Order["status"],
            orderDate: order.createdAt,
            deliveryDate: order.estimatedDelivery || "",
            deliveryShift: order.deliveryShift,
            adminNotes: order.adminNotes,
            cancellationReason: order.cancellationReason,
            cancelledBy: order.cancelledBy,
            confirmedAt: order.confirmedAt,
            cancelledAt: order.cancelledAt,
            deliveredAt: order.deliveredAt,
            canBeCancelled: order.canBeCancelled,
            cancellationMessage: order.cancellationMessage,
            paymentStatus: order.paymentStatus,
          }),
        );
        setOrders(formattedOrders);
        console.log("Orders loaded successfully:", formattedOrders.length);
      }
    } catch (error) {
      console.error("Failed to load orders:", error);
      if (
        error instanceof Error &&
        error.message.includes("Authentication required")
      ) {
        warningToastHandler("Please log in to view your orders.");
        return;
      }
      setError("Failed to load orders. Please try again.");
    }
  }, [user]);

  const loadUnpaidOrders = useCallback(async () => {
    try {
      console.log("Loading unpaid orders...");
      const response = await ApiService.getUnpaidOrders();
      console.log("Unpaid orders response:", response);

      if (response.success) {
        setUnpaidOrders(response.data.unpaidOrders);
        console.log("Unpaid orders loaded:", response.data.unpaidOrders.length);
        // Auto-select all orders by default
        setSelectedOrders(
          response.data.unpaidOrders.map((order: UnpaidOrder) => order.id),
        );
      } else {
        console.error("Failed to fetch unpaid orders:", response.message);
        setError(response.message || "Failed to fetch unpaid orders");
      }
    } catch (err: unknown) {
      const error = err as Error;
      console.error("Error loading unpaid orders:", error);
      setError(error.message || "Failed to fetch unpaid orders");
    }
  }, []);

  const createPaymentSession = async () => {
    if (selectedOrders.length === 0) {
      setError("Please select at least one order to pay for");
      return;
    }

    try {
      setPaymentLoading(true);
      setError(null);

      const response = await ApiService.createPaymentSession({
        orderIds: selectedOrders,
        metadata: {
          deviceInfo: navigator.userAgent,
        },
      });

      if (response.success) {
        setPaymentSession(response.data);
        setExpiryTime(Date.now() + response.data.expiresIn * 1000);
        successToastHandler(
          "Payment session created! Scan QR code to pay via UPI",
        );
      } else {
        setError(response.message || "Failed to create payment session");
      }
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || "Failed to create payment session");
    } finally {
      setPaymentLoading(false);
    }
  };

  const markPaymentCompleted = async () => {
    if (!paymentSession || !upiTransactionId.trim()) {
      setError("Payment session and UPI transaction ID are required");
      return;
    }

    try {
      setPaymentLoading(true);
      setError(null);

      const response = await ApiService.markPaymentCompleted(
        paymentSession.paymentId,
        {
          upiTransactionId: upiTransactionId.trim(),
          upiReferenceNumber: upiReference.trim(),
        },
      );

      if (response.success) {
        successToastHandler(
          "Payment marked as completed! It will be verified by admin within 24 hours.",
        );
        setPaymentSession(null);
        setExpiryTime(null);
        setUpiTransactionId("");
        setUpiReference("");
        setShowPaymentForm(false);
        // Refresh data
        loadData();
      } else {
        if (response.expired) {
          setPaymentSession(null);
          setExpiryTime(null);
        }
        setError(response.message || "Failed to mark payment as completed");
      }
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || "Failed to mark payment as completed");
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm("Are you sure you want to cancel this order?")) return;

    setCancellingOrder(orderId);
    try {
      const response = await ApiService.cancelOrder(
        orderId,
        "Cancelled by user",
      );
      if (response.success) {
        setOrders((prevOrders) =>
          prevOrders.map((order) =>
            order.id === orderId
              ? { ...order, status: "CANCELLED" as Order["status"] }
              : order,
          ),
        );
        successToastHandler("Order cancelled successfully");
      } else {
        errorToastHandler("Failed to cancel order. Please try again.");
      }
    } catch (error) {
      console.error("Failed to cancel order:", error);
      errorToastHandler("Failed to cancel order. Please try again.");
    } finally {
      setCancellingOrder(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopySuccess(true);
      successToastHandler("Copied to clipboard!");
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatTimeRemaining = () => {
    if (!expiryTime) return "";
    const remaining = Math.max(0, Math.floor((expiryTime - Date.now()) / 1000));
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrders((prev) =>
      prev.includes(orderId)
        ? prev.filter((id) => id !== orderId)
        : [...prev, orderId],
    );
  };

  const selectAllOrders = () => {
    setSelectedOrders(unpaidOrders.map((order) => order.id));
  };

  const clearSelection = () => {
    setSelectedOrders([]);
  };

  const getStatusIcon = (status: Order["status"]) => {
    switch (status) {
      case "PENDING":
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case "CONFIRMED":
        return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case "DELIVERED":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "CANCELLED":
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Package className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: Order["status"]) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200";
      case "CONFIRMED":
        return "bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200";
      case "DELIVERED":
        return "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200";
      case "CANCELLED":
        return "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200";
      default:
        return "bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200";
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200";
      case "pending":
        return "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200";
      case "processing":
        return "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200";
      case "failed":
        return "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200";
      default:
        return "bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200";
    }
  };

  const getTabCounts = () => {
    const paid = orders.filter(
      (order) => order.paymentStatus === "paid",
    ).length;
    const unpaid = orders.filter(
      (order) =>
        (order.status === "DELIVERED" || order.status === "CONFIRMED") &&
        order.paymentStatus !== "paid",
    ).length;
    const pending = orders.filter((order) => order.status === "PENDING").length;

    console.log("Tab counts:", {
      all: orders.length,
      paid,
      unpaid,
      pending,
      orders: orders.map((o) => ({
        id: o.id.slice(-8),
        status: o.status,
        paymentStatus: o.paymentStatus,
      })),
    });

    return { all: orders.length, paid, unpaid, pending };
  };

  const getFilteredOrders = () => {
    let filtered = orders;

    if (statusFilter !== "all") {
      filtered = filtered.filter(
        (order) => order.status.toLowerCase() === statusFilter,
      );
    }

    switch (activeTab) {
      case "paid": {
        const paidOrders = filtered.filter(
          (order) => order.paymentStatus === "paid",
        );
        console.log("Paid orders:", paidOrders.length);
        return paidOrders;
      }
      case "unpaid": {
        const unpaidFiltered = filtered.filter(
          (order) =>
            (order.status === "DELIVERED" || order.status === "CONFIRMED") &&
            order.paymentStatus !== "paid",
        );
        console.log("Unpaid filtered orders:", unpaidFiltered.length);
        return unpaidFiltered;
      }
      case "pending": {
        const pendingOrders = filtered.filter(
          (order) => order.status === "PENDING",
        );
        console.log("Pending orders:", pendingOrders.length);
        return pendingOrders;
      }
      default:
        console.log("All orders:", filtered.length);
        return filtered;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <AnimatedSection className="text-center">
            <div className="flex items-center justify-center mb-6">
              <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Loading your orders...
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Please wait while we fetch your order history and payment
              information.
            </p>
          </AnimatedSection>
        </div>
      </div>
    );
  }

  const tabCounts = getTabCounts();
  const filteredOrders = getFilteredOrders();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatedSection>
          <div className="flex items-center space-x-3 mb-8">
            <Package className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              My Orders & Payments
            </h1>
          </div>
        </AnimatedSection>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center"
          >
            <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
            <p className="text-red-700">{error}</p>
          </motion.div>
        )}

        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center"
          >
            <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
            <p className="text-green-700">{successMessage}</p>
          </motion.div>
        )}

        {/* Payment Session Active */}
        {paymentSession && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden"
          >
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
              <div className="flex items-center justify-between text-white">
                <div className="flex items-center">
                  <QrCode className="h-6 w-6 mr-3" />
                  <h2 className="text-xl font-semibold">
                    Payment Session Active
                  </h2>
                </div>
                {expiryTime && (
                  <div className="flex items-center bg-white/20 rounded-lg px-3 py-1">
                    <Clock className="h-4 w-4 mr-1" />
                    <span className="font-mono">{formatTimeRemaining()}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* QR Code Section */}
                <div className="text-center">
                  <div className="bg-white border-2 border-gray-200 rounded-lg p-4 inline-block">
                    <img
                      src={paymentSession.qrCodeUrl}
                      alt="Payment QR Code"
                      className="w-48 h-48 mx-auto"
                    />
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-3">
                    Scan with any UPI app to pay
                  </p>
                </div>

                {/* Payment Details */}
                <div className="space-y-4">
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                      Payment Details
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-300">
                          Amount:
                        </span>
                        <span className="font-semibold text-green-600">
                          ₹{paymentSession.totalAmount}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-300">
                          Orders:
                        </span>
                        <span className="font-semibold dark:text-white">
                          {paymentSession.orderCount}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-300">
                          Payment ID:
                        </span>
                        <span className="font-mono text-xs dark:text-white">
                          {paymentSession.paymentId}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-300">
                          UPI ID:
                        </span>
                        <div className="flex items-center">
                          <span className="font-mono text-xs mr-2 dark:text-white">
                            {paymentSession.upiId}
                          </span>
                          <button
                            onClick={() =>
                              copyToClipboard(paymentSession.upiId)
                            }
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
                          >
                            {copySuccess ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payment Completion Form */}
                  <div className="space-y-4">
                    <button
                      onClick={() => setShowPaymentForm(!showPaymentForm)}
                      className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      {showPaymentForm
                        ? "Hide Payment Form"
                        : "I Have Paid - Mark as Complete"}
                    </button>

                    {showPaymentForm && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="space-y-3"
                      >
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            UPI Transaction ID{" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={upiTransactionId}
                            onChange={(e) =>
                              setUpiTransactionId(e.target.value)
                            }
                            placeholder="Enter UPI Transaction ID"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            UPI Reference Number (Optional)
                          </label>
                          <input
                            type="text"
                            value={upiReference}
                            onChange={(e) => setUpiReference(e.target.value)}
                            placeholder="Enter UPI Reference Number"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                          />
                        </div>
                        <button
                          onClick={markPaymentCompleted}
                          disabled={paymentLoading || !upiTransactionId.trim()}
                          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                        >
                          {paymentLoading ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Confirm Payment
                            </>
                          )}
                        </button>
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Order Flow and Timing Rules */}
        <AnimatedSection>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
            {/* Order Process Info */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                    Order Process
                  </h3>
                  <p className="text-blue-700 dark:text-blue-300 text-sm">
                    Pending → Admin Approves → Payment → Delivery
                  </p>
                </div>
              </div>
            </div>

            {/* Morning Shift Rules */}
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
              <div className="flex items-start space-x-3">
                <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
                    Morning Shift (5 AM - 11:00 AM)
                  </h3>
                  <p className="text-amber-700 dark:text-amber-300 text-sm">
                    Order by 11:59 PM day before • Cancel until 8 PM day before
                    delivery
                  </p>
                </div>
              </div>
            </div>
          </div>
        </AnimatedSection>

        {/* Tabs */}
        <AnimatedSection>
          <div className="mb-6">
            <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
              {[
                { key: "all", label: "All Orders", count: tabCounts.all },
                {
                  key: "pending",
                  label: "Awaiting Approval",
                  count: tabCounts.pending,
                },
                {
                  key: "unpaid",
                  label: "Payment Due",
                  count: tabCounts.unpaid,
                },
                { key: "paid", label: "Paid", count: tabCounts.paid },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as typeof activeTab)}
                  className={`flex-1 py-2 px-4 rounded-md font-medium text-sm transition-colors ${
                    activeTab === tab.key
                      ? "bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow"
                      : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  {tab.label}{" "}
                  {tab.count > 0 && (
                    <span
                      className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                        activeTab === tab.key
                          ? "bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200"
                          : "bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </AnimatedSection>

        {/* Status Filter */}
        <AnimatedSection>
          <div className="mb-6 flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Filter by status:
              </span>
            </div>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as typeof statusFilter)
              }
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </AnimatedSection>

        {/* Unpaid Orders Payment Section */}
        {!paymentSession &&
          activeTab === "unpaid" &&
          unpaidOrders.length > 0 && (
            <AnimatedSection>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden mb-8">
                <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-4">
                  <div className="flex items-center justify-between text-white">
                    <div className="flex items-center">
                      <CreditCard className="h-6 w-6 mr-3" />
                      <h2 className="text-xl font-semibold">
                        Pay for Approved Orders
                      </h2>
                    </div>
                    <div className="flex items-center bg-white/20 rounded-lg px-3 py-1">
                      <IndianRupee className="h-4 w-4 mr-1" />
                      <span className="font-semibold">₹{totalAmount}</span>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  {/* Selection Controls */}
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={selectAllOrders}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 text-sm font-medium"
                      >
                        Select All
                      </button>
                      <button
                        onClick={clearSelection}
                        className="text-gray-600 hover:text-gray-800 dark:text-gray-400 text-sm font-medium"
                      >
                        Clear Selection
                      </button>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {selectedOrders.length} of {unpaidOrders.length} orders
                      selected
                    </p>
                  </div>

                  {/* Orders List */}
                  <div className="space-y-4 mb-6">
                    {unpaidOrders.map((order) => (
                      <motion.div
                        key={order.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                          selectedOrders.includes(order.id)
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                            : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600"
                        }`}
                        onClick={() => toggleOrderSelection(order.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <input
                              type="checkbox"
                              checked={selectedOrders.includes(order.id)}
                              onChange={() => toggleOrderSelection(order.id)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <div>
                              <h3 className="font-semibold text-gray-900 dark:text-white">
                                Order #{order.orderNumber}
                              </h3>
                              <div className="flex items-center text-sm text-gray-600 dark:text-gray-300 mt-1">
                                <Calendar className="h-4 w-4 mr-1" />
                                <span>
                                  {order.deliveredAt
                                    ? `Delivered: ${formatDate(
                                        order.deliveredAt,
                                      )}`
                                    : `Confirmed: ${formatDate(
                                        order.confirmedAt!,
                                      )}`}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-lg text-green-600">
                              ₹{order.totalAmount}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {order.items.length} items
                            </p>
                          </div>
                        </div>

                        {/* Order Items */}
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {order.items.slice(0, 3).map((item, index) => (
                              <div
                                key={index}
                                className="flex items-center text-sm text-gray-600 dark:text-gray-300"
                              >
                                <span className="mr-2">•</span>
                                <span>
                                  {item.name} x {item.quantity}
                                </span>
                              </div>
                            ))}
                            {order.items.length > 3 && (
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                +{order.items.length - 3} more items
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Payment Button */}
                  <div className="flex justify-between items-center">
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      Total Selected: ₹{totalAmount}
                    </div>
                    <button
                      onClick={createPaymentSession}
                      disabled={selectedOrders.length === 0 || paymentLoading}
                      className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                    >
                      {paymentLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Creating Session...
                        </>
                      ) : (
                        <>
                          <QrCode className="h-4 w-4 mr-2" />
                          Pay Now
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </AnimatedSection>
          )}

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <AnimatedSection>
            <div className="text-center py-16">
              <div className="text-8xl mb-6">📦</div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                {activeTab === "unpaid"
                  ? "No payment due"
                  : activeTab === "paid"
                    ? "No paid orders"
                    : activeTab === "pending"
                      ? "No pending orders"
                      : "No orders yet"}
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-8">
                {activeTab === "unpaid"
                  ? "All your approved orders have been paid!"
                  : activeTab === "paid"
                    ? "You haven't made any payments yet."
                    : activeTab === "pending"
                      ? "No orders are currently awaiting admin approval."
                      : "You haven't placed any orders yet. Start shopping to see your orders here."}
              </p>
              {activeTab === "all" && (
                <motion.button
                  onClick={() => window.history.back()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Start Shopping
                </motion.button>
              )}
            </div>
          </AnimatedSection>
        ) : (
          <div className="space-y-6">
            {filteredOrders.map((order, index) => (
              <AnimatedSection key={order.id} delay={index * 0.1}>
                <motion.div
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6"
                  whileHover={{ y: -2 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                          Order #{order.id.slice(-8)}
                        </h3>
                        <div
                          className={`flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                            order.status,
                          )}`}
                        >
                          {getStatusIcon(order.status)}
                          <span>{order.status}</span>
                        </div>
                        {order.paymentStatus && (
                          <div
                            className={`flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium ${getPaymentStatusColor(
                              order.paymentStatus,
                            )}`}
                          >
                            <CreditCard className="w-4 h-4" />
                            <span className="capitalize">
                              {order.paymentStatus}
                            </span>
                          </div>
                        )}
                      </div>
                      <p className="text-gray-600 dark:text-gray-300 text-sm mb-1">
                        Placed on{" "}
                        {new Date(order.orderDate).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                        ₹{order.total}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {order.items.length} item
                        {order.items.length > 1 ? "s" : ""}
                      </div>
                    </div>
                  </div>

                  {/* Enhanced Cancellation Status for Pending/Confirmed Orders */}
                  {(order.status === "PENDING" ||
                    order.status === "CONFIRMED") && (
                    <div className="mb-4 p-4 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-700 dark:to-blue-900/20 rounded-lg border border-gray-200 dark:border-gray-600">
                      <div className="flex items-start space-x-3">
                        <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                        <div className="flex-1">
                          <h5 className="font-medium text-gray-900 dark:text-white mb-1">
                            Timing Information
                          </h5>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                            {order.deliveryShift === "morning"
                              ? "Morning orders: Place by 11:59 PM day before • Cancel until 8 PM day before delivery"
                              : "Evening orders: Place by 2 PM same day • Cancel until 2 PM same day"}
                          </p>
                          {order.cancellationMessage && (
                            <div className="flex items-center space-x-2 p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-md">
                              <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                              <span className="text-sm text-yellow-800 dark:text-yellow-200">
                                {order.cancellationMessage}
                              </span>
                            </div>
                          )}
                          {order.canBeCancelled === false &&
                            !order.cancellationMessage && (
                              <div className="flex items-center space-x-2 p-2 bg-red-100 dark:bg-red-900/30 rounded-md">
                                <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                                <span className="text-sm text-red-800 dark:text-red-200">
                                  Cancellation period has expired
                                </span>
                              </div>
                            )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Order Items */}
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                        Items
                      </h4>
                      <div className="space-y-2">
                        {order.items.map((item) => (
                          <div
                            key={item.product.id}
                            className="flex items-center space-x-3"
                          >
                            <img
                              src={item.product.image}
                              alt={item.product.name}
                              className="w-12 h-12 object-cover rounded-lg"
                            />
                            <div className="flex-1">
                              <div className="font-medium text-gray-900 dark:text-white text-sm">
                                {item.product.name}
                              </div>
                              <div className="text-gray-500 dark:text-gray-400 text-xs">
                                Qty: {item.quantity} × ₹{item.product.price}
                              </div>
                            </div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              ₹{item.product.price * item.quantity}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Price Breakdown */}
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                        Price Breakdown
                      </h4>
                      <div className="space-y-2 text-sm">
                        {order.subtotal && (
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-300">
                              Subtotal:
                            </span>
                            <span className="text-gray-900 dark:text-white">
                              ₹{order.subtotal}
                            </span>
                          </div>
                        )}
                        {order.shippingFee && (
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-300">
                              Delivery Charges:
                            </span>
                            <span className="text-gray-900 dark:text-white">
                              ₹{order.shippingFee}
                            </span>
                          </div>
                        )}
                        {order.tax && order.tax > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-300">
                              Tax:
                            </span>
                            <span className="text-gray-900 dark:text-white">
                              ₹{order.tax}
                            </span>
                          </div>
                        )}
                        {order.discount && order.discount > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-300">
                              Discount:
                            </span>
                            <span className="text-green-600 dark:text-green-400">
                              -₹{order.discount}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700 font-semibold">
                          <span className="text-gray-900 dark:text-white">
                            Total:
                          </span>
                          <span className="text-emerald-600 dark:text-emerald-400">
                            ₹{order.total}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Delivery Details */}
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                        Delivery Details
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-gray-600 dark:text-gray-300">
                            Address:
                          </span>
                          <div className="text-gray-900 dark:text-white">
                            {order.deliveryAddress.name}
                            <br />
                            {order.deliveryAddress.addressLine1}
                            <br />
                            {order.deliveryAddress.city},{" "}
                            {order.deliveryAddress.state} -{" "}
                            {order.deliveryAddress.pincode}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-300">
                            Payment:{" "}
                          </span>
                          <span className="text-gray-900 dark:text-white">
                            {order.paymentMethod}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-300">
                            Delivery Shift:{" "}
                          </span>
                          <span className="text-gray-900 dark:text-white capitalize">
                            {order.deliveryShift ? (
                              <>
                                {order.deliveryShift} Shift
                                <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                                  (
                                  {order.deliveryShift === "morning"
                                    ? "6:00 AM - 8:00 AM"
                                    : "5:00 PM - 7:00 PM"}
                                  )
                                </span>
                              </>
                            ) : (
                              "Not specified"
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Admin Notes */}
                  {order.adminNotes && (
                    <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-start space-x-2">
                        <User className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-1" />
                        <div className="flex-1">
                          <h5 className="font-medium text-gray-900 dark:text-white mb-1">
                            Admin Notes:
                          </h5>
                          <div className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line">
                            {order.adminNotes}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Cancellation Info */}
                  {order.status === "CANCELLED" && order.cancellationReason && (
                    <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-start space-x-2">
                        <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-1" />
                        <div className="flex-1">
                          <h5 className="font-medium text-gray-900 dark:text-white mb-1">
                            Cancellation Details:
                          </h5>
                          <div className="text-sm text-gray-600 dark:text-gray-300">
                            <p>{order.cancellationReason}</p>
                            {order.cancelledBy && (
                              <p className="text-xs mt-1">
                                Cancelled by:{" "}
                                {order.cancelledBy === "user" ? "You" : "Admin"}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <motion.button
                      onClick={() =>
                        setExpandedOrder(
                          expandedOrder === order.id ? null : order.id,
                        )
                      }
                      className="flex items-center space-x-2 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-medium transition-colors"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Eye className="w-4 h-4" />
                      <span>
                        {expandedOrder === order.id
                          ? "Hide Details"
                          : "View Details"}
                      </span>
                    </motion.button>

                    {(order.status === "PENDING" ||
                      order.status === "CONFIRMED") &&
                      order.canBeCancelled !== false && (
                        <motion.button
                          onClick={() => handleCancelOrder(order.id)}
                          disabled={cancellingOrder === order.id}
                          className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          {cancellingOrder === order.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                          <span>Cancel Order</span>
                        </motion.button>
                      )}
                  </div>

                  {/* Expanded Details */}
                  {expandedOrder === order.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <h5 className="font-medium text-gray-900 dark:text-white mb-2">
                            Order Timeline
                          </h5>
                          <div className="space-y-2 text-gray-600 dark:text-gray-300">
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              <span>
                                Order placed:{" "}
                                {new Date(order.orderDate).toLocaleString(
                                  "en-IN",
                                  {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  },
                                )}
                              </span>
                            </div>
                            {order.confirmedAt && (
                              <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                                <span>
                                  Confirmed:{" "}
                                  {new Date(order.confirmedAt).toLocaleString(
                                    "en-IN",
                                    {
                                      day: "numeric",
                                      month: "short",
                                      year: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    },
                                  )}
                                </span>
                              </div>
                            )}
                            {order.deliveredAt && (
                              <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span>
                                  Delivered:{" "}
                                  {new Date(order.deliveredAt).toLocaleString(
                                    "en-IN",
                                    {
                                      day: "numeric",
                                      month: "short",
                                      year: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    },
                                  )}
                                </span>
                              </div>
                            )}
                            {order.cancelledAt && (
                              <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                <span>
                                  Cancelled:{" "}
                                  {new Date(order.cancelledAt).toLocaleString(
                                    "en-IN",
                                    {
                                      day: "numeric",
                                      month: "short",
                                      year: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    },
                                  )}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div>
                          <h5 className="font-medium text-gray-900 dark:text-white mb-2">
                            Delivery Information
                          </h5>
                          <div className="space-y-2 text-gray-600 dark:text-gray-300">
                            {order.deliveryAddress.phone && (
                              <div className="flex items-center space-x-2">
                                <span>📞</span>
                                <span>{order.deliveryAddress.phone}</span>
                              </div>
                            )}
                            <div className="flex items-center space-x-2">
                              <span>💳</span>
                              <span>{order.paymentMethod}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span>🚚</span>
                              <span className="capitalize">
                                {order.deliveryShift} delivery (
                                {order.deliveryShift === "morning"
                                  ? "5:00 AM - 11:00 AM"
                                  : "5-7 PM"}
                                )
                              </span>
                            </div>
                            {order.paymentStatus && (
                              <div className="flex items-center space-x-2">
                                <span>💰</span>
                                <span className="capitalize">
                                  Payment: {order.paymentStatus}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              </AnimatedSection>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
