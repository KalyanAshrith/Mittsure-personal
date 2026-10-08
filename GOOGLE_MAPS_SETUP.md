# Google Maps Platform Setup Guide

This guide explains how to configure Google Cloud Platform (GCP) for **Mittsure Field Route & School CRM** to enable live route calculations, two-wheeler waypoint optimization, and Places integration.

---

## 1. Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Click the project dropdown at the top and select **New Project**.
3. Name your project (e.g., `mittsure-field-crm`) and click **Create**.

---

## 2. Enable Billing

Google Maps Platform requires an active Cloud Billing account to authorize API requests. Google provides a recurring **$200 monthly free credit** for Maps Platform products, which easily covers hundreds of daily school routes.

1. Navigate to **Billing** in the Google Cloud Console.
2. Link your billing account to your newly created project.

---

## 3. Enable the Required APIs

Enable the following three Google Maps Platform APIs:

### A. Routes API (Current Generation)
- **API Name**: `Routes API` (Service: `routes.googleapis.com`)
- **Purpose**: Computes multi-stop round-trip motorcycle routes (`travelMode: TWO_WHEELER`), waypoint sequence optimization (`optimizeWaypointOrder: true`), and leg-by-leg metrics.
- **Console Link**: [Enable Routes API](https://console.cloud.google.com/marketplace/product/google/routes.googleapis.com)

### B. Maps JavaScript API
- **API Name**: `Maps JavaScript API`
- **Purpose**: Renders interactive map surfaces with stop markers and polyline routes on the web.
- **Console Link**: [Enable Maps JavaScript API](https://console.cloud.google.com/marketplace/product/google/maps-backend.googleapis.com)

### C. Places API (New)
- **API Name**: `Places API (New)`
- **Purpose**: Retrieves school addresses, phone numbers, ratings, and Place IDs.
- **Console Link**: [Enable Places API](https://console.cloud.google.com/marketplace/product/google/places.googleapis.com)

---

## 4. Create and Secure API Keys

To prevent unauthorized quota usage, create and restrict your keys:

1. Go to **APIs & Services > Credentials**.
2. Click **Create Credentials > API Key**.
3. Copy the generated key.

### Recommended Key Restrictions:
- **API Restrictions**:
  Restrict the key to only authorize requests to:
  - `Routes API`
  - `Maps JavaScript API`
  - `Places API (New)`
- **Application Restrictions**:
  - For server-side calls (`GOOGLE_MAPS_API_KEY`): Restrict by IP address or leave unrestricted during initial local testing.
  - For client-side browser maps (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`): Restrict by HTTP Referrer (e.g., `http://localhost:3000/*` or your production domain).

---

## 5. Configure Environment Variables

Open the `.env` file in the project root and add your API keys:

```env
GOOGLE_MAPS_API_KEY="AIzaSyYourActualKeyHere..."
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="AIzaSyYourActualKeyHere..."
```

Restart your Next.js development server:

```bash
npm run dev
```

---

## 6. Two-Wheeler Motorcycle Routing Behavior

- The CRM requests `travelMode: TWO_WHEELER` with `optimizeWaypointOrder: true`.
- If two-wheeler routing is temporarily unavailable in a particular API configuration or region, the system automatically and gracefully falls back to `DRIVE` (car) mode and clearly alerts the representative:
  > *"Two-wheeler routing unavailable — using driving route."*
- If no API key is provided, the CRM operates in **Local Route Simulation Mode**, calculating realistic road distances and TSP 2-opt waypoint sequences, while providing direct **Open in Google Maps** links that launch native navigation on Android/iOS.
