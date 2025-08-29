
// Legacy functions - not implemented in current backend
export async function sendSignupOtp(_phone: string, _name?: string) {
  throw new Error('Phone-based OTP signup is not implemented. Please use email signup.');
}

export async function signupUser(_userData: { name: string; email: string; phone: string; otp: string }) {
  throw new Error('Phone-based OTP signup is not implemented. Please use email signup.');
}

// export async function sendBuyerOtp(phone: string) {
//   const res = await fetch('http://localhost:8080/api/auth/buyer/send-otp', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ phone })
//   });
//   return res.json();
// }

// export async function verifyBuyerOtp(phone: string, otp: string) {
//   const res = await fetch('http://localhost:8080/api/auth/buyer/verify-otp', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ phone, otp })
//   });
//   return res.json();
// }

// Contact form API
export async function submitContactForm(formData: { name: string; phone: string; message: string }) {
  const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/contact/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData)
  });
  return res.json();
}

export async function getContactInfo() {
  const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/contact/info`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });
  return res.json();
}

// Google Authentication API
export async function googleAuth(userData: { googleId: string; email: string; name: string; avatar?: string }) {
  const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/google-auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  });
  return res.json();
}

// Get user profile (protected route)
export async function getUserProfile(token: string) {
  const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/google-auth/profile`, {
    method: 'GET',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
  return res.json();
}

// Update user profile (protected route)
export async function updateUserProfile(token: string, userData: { name?: string; phone?: string; avatar?: string }) {
  const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/google-auth/profile`, {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(userData)
  });
  return res.json();
} 

export interface GoogleAddressFields {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  landmark: string;
}

/**
 * Extracts the most precise address fields from Google Maps Geocoding API results.
 * @param results The results array from Google Maps Geocoding API
 */
export function extractBestGoogleAddressFields(results: any[]): GoogleAddressFields {
  // Helper to check if a result is a Plus Code
  const isPlusCode = (formatted: string) => /^[A-Z0-9]{4,}\+[A-Z0-9]{2,}/.test(formatted.trim());

  // 1. Best: has postal_code and locality
  let bestResult = results.find((r) => {
    const hasPostal = r.address_components.some((c: any) => c.types.includes("postal_code"));
    const hasLocality = r.address_components.some((c: any) => c.types.includes("locality"));
    return hasPostal && hasLocality && !isPlusCode(r.formatted_address);
  });
  // 2. Fallback: has postal_code and sublocality/neighborhood/admin_area_2
  if (!bestResult) {
    bestResult = results.find((r) => {
      const hasPostal = r.address_components.some((c: any) => c.types.includes("postal_code"));
      const hasSub = r.address_components.some((c: any) =>
        c.types.includes("sublocality") ||
        c.types.includes("sublocality_level_1") ||
        c.types.includes("neighborhood") ||
        c.types.includes("administrative_area_level_2")
      );
      return hasPostal && hasSub && !isPlusCode(r.formatted_address);
    });
  }
  // 3. Fallback: has postal_code
  if (!bestResult) {
    bestResult = results.find((r) =>
      r.address_components.some((c: any) => c.types.includes("postal_code")) && !isPlusCode(r.formatted_address)
    );
  }
  // 4. Fallback: first non-PlusCode result
  if (!bestResult) {
    bestResult = results.find((r) => !isPlusCode(r.formatted_address));
  }
  // 5. Fallback: first result
  if (!bestResult) {
    bestResult = results[0];
  }

  const addressComponents = bestResult.address_components;
  const streetNumber = addressComponents.find((c: any) => c.types.includes("street_number"))?.long_name || "";
  const route = addressComponents.find((c: any) => c.types.includes("route"))?.long_name || "";
  const sublocality = addressComponents.find((c: any) => c.types.includes("sublocality_level_1") || c.types.includes("sublocality"))?.long_name || "";
  const neighborhood = addressComponents.find((c: any) => c.types.includes("neighborhood"))?.long_name || "";
  const adminArea2 = addressComponents.find((c: any) => c.types.includes("administrative_area_level_2"))?.long_name || "";
  const city = addressComponents.find((c: any) => c.types.includes("locality"))?.long_name || sublocality || neighborhood || adminArea2 || "";
  const state = addressComponents.find((c: any) => c.types.includes("administrative_area_level_1"))?.long_name || "";
  const zipCode = addressComponents.find((c: any) => c.types.includes("postal_code"))?.long_name || "";
  const country = addressComponents.find((c: any) => c.types.includes("country"))?.long_name || "";
  const landmark = addressComponents.find((c: any) =>
    c.types.includes("point_of_interest") ||
    c.types.includes("premise") ||
    c.types.includes("establishment") ||
    c.types.includes("natural_feature")
  )?.long_name || "";

  // Build address string
  let mainAddress = [streetNumber, route, sublocality, neighborhood].filter(Boolean).join(" ").trim();
  if (!mainAddress || isPlusCode(mainAddress)) {
    // Try to use the formatted address, but skip Plus Code if present
    const formatted = bestResult.formatted_address || "";
    const formattedParts = formatted.split(",");
    if (formattedParts.length > 1 && isPlusCode(formattedParts[0].trim())) {
      mainAddress = formattedParts.slice(1).join(",").trim();
    } else {
      mainAddress = formatted;
    }
  }

  return {
    address: mainAddress,
    city,
    state,
    zipCode,
    country,
    landmark,
  };
} 