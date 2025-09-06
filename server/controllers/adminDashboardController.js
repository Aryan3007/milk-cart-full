import Order from "../models/Order.js";
import User from "../models/User.js";
import Payment from "../models/Payment.js";

// Get dashboard metrics for admin
export const getDashboardMetrics = async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    // Get start and end of current month
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    // Today's Orders
    const todaysOrders = await Order.find({
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });

    const todaysOrdersCount = todaysOrders.length;
    const acceptedToday = todaysOrders.filter(
      (order) => order.status === "confirmed" || order.status === "approved",
    ).length;
    const pendingToday = todaysOrders.filter(
      (order) => order.status === "pending",
    ).length;

    // Monthly Revenue (from 1st to end of current month)
    const monthlyOrders = await Order.find({
      createdAt: { $gte: startOfMonth, $lte: endOfMonth },
      status: { $ne: "cancelled" },
    });

    const monthlyRevenue = monthlyOrders.reduce(
      (sum, order) => sum + (order.totalAmount || 0),
      0,
    );

    // Total Users
    const totalUsers = await User.countDocuments();

    // New Users Today
    const newUsersToday = await User.countDocuments({
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });

    // New Users This Month
    const newUsersThisMonth = await User.countDocuments({
      createdAt: { $gte: startOfMonth, $lte: endOfMonth },
    });

    // Top Selling Products (aggregate from all non-cancelled orders)
    const allOrders = await Order.find({ status: { $ne: "cancelled" } });

    const productSales = {};
    allOrders.forEach((order) => {
      (order.items || []).forEach((item) => {
        const name = item.name || "Unknown";
        if (!productSales[name]) {
          productSales[name] = { name, quantity: 0, revenue: 0 };
        }
        productSales[name].quantity += item.quantity;
        productSales[name].revenue += item.quantity * item.price;
      });
    });

    const topSellingProducts = Object.values(productSales)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 3);

    // Payment Analytics
    const pendingPayments = await Payment.countDocuments({
      paymentStatus: "completed",
      verificationStatus: "pending",
    });

    const todaysPayments = await Payment.find({
      createdAt: { $gte: startOfDay, $lte: endOfDay },
      paymentStatus: "completed",
    });

    const todaysPaymentAmount = todaysPayments.reduce(
      (sum, payment) => sum + (payment.totalAmount || 0),
      0,
    );

    const monthlyPayments = await Payment.find({
      createdAt: { $gte: startOfMonth, $lte: endOfMonth },
      paymentStatus: "completed",
      verificationStatus: "verified",
    });

    const monthlyPaymentAmount = monthlyPayments.reduce(
      (sum, payment) => sum + (payment.totalAmount || 0),
      0,
    );

    const pendingPaymentAmount = await Payment.aggregate([
      {
        $match: {
          paymentStatus: "completed",
          verificationStatus: "pending",
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$totalAmount" },
        },
      },
    ]);

    const totalPendingAmount = pendingPaymentAmount[0]?.totalAmount || 0;

    // Response
    res.status(200).json({
      success: true,
      data: {
        todaysOrdersCount,
        acceptedToday,
        pendingToday,
        monthlyRevenue,
        totalUsers,
        newUsersToday,
        newUsersThisMonth,
        topSellingProducts,
        paymentAnalytics: {
          pendingPayments,
          todaysPaymentCount: todaysPayments.length,
          todaysPaymentAmount,
          monthlyPaymentCount: monthlyPayments.length,
          monthlyPaymentAmount,
          totalPendingAmount,
        },
        monthInfo: {
          startDate: startOfMonth.toISOString(),
          endDate: endOfMonth.toISOString(),
          message:
            "Monthly Revenue is calculated from the 1st to the end of the current month.",
        },
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard metrics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard metrics",
      error: error.message,
    });
  }
};

// Get report summary for a date range
export const getReportSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "startDate and endDate are required",
      });
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // include the full end day

    // Orders in range
    const orders = await Order.find({
      createdAt: { $gte: start, $lte: end },
    });
    const totalOrders = orders.length;
    const cancelledOrders = orders.filter(
      (o) => o.status === "cancelled",
    ).length;
    const totalRevenue = orders
      .filter((o) => o.status !== "cancelled")
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    // Users who placed orders in the given time interval
    const uniqueUserIds = [...new Set(orders.map((order) => order.userId))];
    const totalUsers = uniqueUserIds.length;

    // Generate revenue trend data (day-wise)
    const revenueTrend = [];
    const currentDate = new Date(start);

    while (currentDate <= end) {
      const dayStart = new Date(currentDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);

      const dayOrders = orders.filter((order) => {
        const orderDate = new Date(order.createdAt);
        return (
          orderDate >= dayStart &&
          orderDate <= dayEnd &&
          order.status !== "cancelled"
        );
      });

      const dayRevenue = dayOrders.reduce(
        (sum, order) => sum + (order.totalAmount || 0),
        0,
      );

      revenueTrend.push({
        date: currentDate.toISOString().split("T")[0], // YYYY-MM-DD format
        revenue: dayRevenue,
        orders: dayOrders.length,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    res.status(200).json({
      success: true,
      data: {
        totalRevenue,
        totalUsers,
        totalOrders,
        cancelledOrders,
        revenueTrend,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error fetching report summary:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch report summary",
      error: error.message,
    });
  }
};
