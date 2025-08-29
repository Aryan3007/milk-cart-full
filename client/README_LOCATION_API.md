# 📍 Google Maps API Setup Guide

## 🎯 Google Maps Geocoding API (Best Accuracy)

### Why Google Maps API?

- **Industry Best**: Most accurate geocoding service available
- **Free Tier**: $200 credit/month (~40,000 requests)
- **Global Coverage**: Works in 200+ countries with excellent data
- **Fast Response**: Sub-second response times
- **Reliable**: 99.9% uptime guarantee

### Cost Breakdown:

- **Free**: $200 credit/month
- **Geocoding API**: $5 per 1,000 requests
- **Typical Usage**: ~$10-20/month for small-medium apps
- **Very Cost-Effective**: Best value for accuracy

## 🚀 Setup Steps:

### 1. Create Google Cloud Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account
3. Create a new project or select existing one

### 2. Enable APIs

1. Go to **"APIs & Services" > "Library"**
2. Search for and enable:
   - **Geocoding API** (for converting coordinates to addresses)
   - **Maps JavaScript API** (optional, for future map features)

### 3. Create API Key

1. Go to **"APIs & Services" > "Credentials"**
2. Click **"Create Credentials" > "API Key"**
3. Copy the generated API key

### 4. Restrict API Key (IMPORTANT - Follow these exact steps)

1. Click on the created API key
2. Under **"Application restrictions"**, select **"None"** (for development) or **"IP addresses"** (for production)
3. **DO NOT** use "HTTP referrers" for Geocoding API
4. Under **"API restrictions"**, select **"Restrict key"** and choose:
   - Geocoding API
   - Maps JavaScript API (if enabled)

### 5. Add to Environment Variables

Add the API key to your `.env` file:

```env
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

## 🔧 Troubleshooting Common Errors:

### Error: "API keys with referer restrictions cannot be used with this API"

**Problem**: HTTP referrer restrictions don't work with Geocoding API

**Solution**:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **"APIs & Services" > "Credentials"**
3. Click on your API key
4. Under **"Application restrictions"**, change to:
   - **"None"** (for development - less secure but works)
   - **"IP addresses"** (for production - more secure)
5. **Remove** any HTTP referrer restrictions
6. Save the changes

### Error: "REQUEST_DENIED"

**Possible Causes**:

1. API key restrictions too strict
2. Billing not enabled
3. API not enabled
4. Quota exceeded

**Solutions**:

1. **Check API Key Restrictions**: Use "None" or "IP addresses" only
2. **Enable Billing**: Required for API usage
3. **Enable Geocoding API**: Go to API Library and enable it
4. **Check Quota**: Monitor usage in Google Cloud Console

### Error: "OVER_QUERY_LIMIT"

**Solution**:

1. Check usage in Google Cloud Console
2. Wait for quota reset (usually daily)
3. Consider upgrading billing plan

## 📊 Current Implementation:

The app now uses a **smart fallback system**:

1. **🥇 Primary**: Google Maps API (Best accuracy)
2. **🥈 Fallback**: OpenStreetMap (Free, no key needed)
3. **🥉 Final**: Coordinates only (Always works)

### Benefits:

- **🎯 Maximum Accuracy**: Google Maps provides the best results
- **🛡️ Reliable Fallbacks**: If Google fails, OpenStreetMap takes over
- **💰 Cost Control**: Free tier covers most use cases
- **🌍 Global Coverage**: Works everywhere with excellent data

## 🧪 Testing:

### 1. Add API Key

```env
VITE_GOOGLE_MAPS_API_KEY=AIzaSyYourActualKeyHere
```

### 2. Restart Development Server

```bash
npm run dev
```

### 3. Test Location Feature

1. Go to Profile page
2. Click "Add New Address"
3. Click "Use Current Location"
4. Allow location access
5. Verify accurate address is filled

## 💡 Tips for Best Results:

### 1. Enable High Accuracy GPS

- Use `enableHighAccuracy: true` (already implemented)
- Wait for GPS signal to stabilize
- Use outdoors for better accuracy

### 2. Handle API Limits

- Monitor usage in Google Cloud Console
- Set up billing alerts
- Consider caching for repeated locations

### 3. Error Handling

- Graceful fallback to OpenStreetMap
- Clear error messages for users
- Manual entry always available

## 🔧 Troubleshooting:

### Common Issues:

1. **"API key not valid"**: Check key restrictions and billing
2. **"Quota exceeded"**: Monitor usage in Google Cloud Console
3. **"Location timeout"**: Check GPS settings and signal strength

### Solutions:

1. **Verify API Key**: Check in Google Cloud Console
2. **Enable Billing**: Required for API usage
3. **Check Restrictions**: Ensure domain is allowed
4. **Monitor Usage**: Set up alerts for quota limits

## 📈 Usage Monitoring:

### Google Cloud Console:

1. Go to **"APIs & Services" > "Dashboard"**
2. Monitor **Geocoding API** usage
3. Set up **billing alerts** for cost control
4. Check **error rates** and performance

### Typical Monthly Costs:

- **Small App**: $5-15/month
- **Medium App**: $15-50/month
- **Large App**: $50-200/month

The Google Maps API provides the **best accuracy** in the industry at a very reasonable cost! 🎯
