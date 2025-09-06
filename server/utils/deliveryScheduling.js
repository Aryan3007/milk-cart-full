/**
 * Delivery Scheduling Utilities
 * Handles dated and timed delivery system logic
 */

/**
 * Get available delivery slots based on current time and date
 * @param {Date} currentDate - Current date and time
 * @returns {Object} Available delivery slots for the next 7 days
 */
export const getAvailableDeliverySlots = (currentDate = new Date()) => {
  const slots = [];
  const now = new Date(currentDate);
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTimeInMinutes = currentHour * 60 + currentMinute;

  // Time cutoffs
  const morningCutoff = 23 * 60 + 59; // 11:59 PM in minutes (for next day morning delivery)

  // Generate slots for 7 days starting from tomorrow
  for (let dayOffset = 1; dayOffset <= 7; dayOffset++) {
    const date = new Date(now);
    date.setDate(now.getDate() + dayOffset);
    date.setHours(0, 0, 0, 0); // Reset to start of day

    // Use local date string instead of UTC
    const dateStr =
      date.getFullYear() +
      "-" +
      String(date.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(date.getDate()).padStart(2, "0");

    const slot = {
      date: dateStr,
      dateObj: date,
      isToday: false, // Never today since we start from tomorrow
      isTomorrow: dayOffset === 1, // First day (offset 1) is tomorrow
      morning: {
        available: false,
        cutoffPassed: false,
        reason: "",
      },
      evening: {
        available: false,
        cutoffPassed: false,
        reason: "Evening delivery is temporarily disabled",
      },
    };

    if (dayOffset === 1) {
      // Tomorrow - check if we can still place morning delivery order
      if (currentTimeInMinutes <= morningCutoff) {
        slot.morning = {
          available: true,
          cutoffPassed: false,
          reason: "",
        };
      } else {
        slot.morning = {
          available: false,
          cutoffPassed: true,
          reason: "Morning delivery orders must be placed before midnight",
        };
      }
    } else {
      // Day after tomorrow and beyond - morning is always available
      slot.morning = {
        available: true,
        cutoffPassed: false,
        reason: "",
      };
    }

    slots.push(slot);
  }

  return slots;
};

/**
 * Validate if an order can be placed for a specific delivery date and shift
 * @param {string} deliveryDate - Delivery date in YYYY-MM-DD format
 * @param {string} deliveryShift - 'morning' or 'evening'
 * @param {Date} currentDate - Current date and time
 * @returns {Object} Validation result
 */
export const validateDeliverySlot = (
  deliveryDate,
  deliveryShift,
  currentDate = new Date(),
) => {
  const now = new Date(currentDate);
  const targetDate = new Date(deliveryDate);
  targetDate.setHours(0, 0, 0, 0);

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const maxDate = new Date(tomorrow);
  maxDate.setDate(tomorrow.getDate() + 6); // 7 days from tomorrow

  // Check if delivery date is within allowed range (tomorrow to 7 days from tomorrow)
  if (targetDate < tomorrow || targetDate > maxDate) {
    return {
      valid: false,
      reason: "Delivery date must be between tomorrow and 7 days from tomorrow",
    };
  }

  // Check if delivery shift is valid
  if (!["morning", "evening"].includes(deliveryShift)) {
    return {
      valid: false,
      reason: "Delivery shift must be either morning or evening",
    };
  }

  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTimeInMinutes = currentHour * 60 + currentMinute;

  // Reject today's orders completely
  if (targetDate.getTime() === today.getTime()) {
    if (deliveryShift === "morning") {
      return {
        valid: false,
        reason: "Same day morning delivery is not available",
      };
    }
    if (deliveryShift === "evening") {
      return {
        valid: false,
        reason: "Same day evening delivery is not available",
      };
    }
  }

  // Tomorrow's morning orders
  if (
    targetDate.getTime() === tomorrow.getTime() &&
    deliveryShift === "morning"
  ) {
    const morningCutoff = 23 * 60 + 59; // 11:59 PM
    if (currentTimeInMinutes > morningCutoff) {
      return {
        valid: false,
        reason: "Morning delivery orders must be placed before midnight",
      };
    }
  }

  // Evening delivery validation (even though it's disabled)
  if (deliveryShift === "evening") {
    return {
      valid: false,
      reason: "Evening delivery is temporarily disabled",
    };
  }

  return {
    valid: true,
    reason: "",
  };
};

/**
 * Get user-friendly date labels
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @param {Date} currentDate - Current date
 * @returns {string} User-friendly label
 */
export const getDateLabel = (dateStr, currentDate = new Date()) => {
  const targetDate = new Date(dateStr);

  // Always return the actual date instead of "Today" or "Tomorrow"
  return targetDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

/**
 * Get delivery time slot description
 * @param {string} shift - 'morning' or 'evening'
 * @returns {string} Time slot description
 */
export const getDeliveryTimeSlot = (shift) => {
  switch (shift) {
    case "morning":
      return "5:00 AM - 11:00 AM";
    case "evening":
      return "5:00 PM - 7:00 PM";
    default:
      return "";
  }
};

/**
 * Format delivery slot for display
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @param {string} shift - 'morning' or 'evening'
 * @param {Date} currentDate - Current date
 * @returns {string} Formatted delivery slot
 */
export const formatDeliverySlot = (
  dateStr,
  shift,
  currentDate = new Date(),
) => {
  const dateLabel = getDateLabel(dateStr, currentDate);
  const timeSlot = getDeliveryTimeSlot(shift);
  return `${dateLabel}, ${
    shift.charAt(0).toUpperCase() + shift.slice(1)
  } (${timeSlot})`;
};
