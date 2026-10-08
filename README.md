# Mittsure Field Route & School CRM

> **Production-Quality Field Outreach, Motorcycle Route Optimizer & School CRM**  
> Designed specifically for **Nichhenametla Kalyan Ashrith**, Relationship Manager / School Outreach Representative at **Mittsure Technologies LLP** covering the Mysuru territory.

---

## 🌟 Executive Summary

**Mittsure Field Route & School CRM** transforms school field sales productivity. Instead of juggling loose paper sheets, unverified notes, and ad-hoc navigation, this application provides an integrated, mobile-first workflow:

1. **487 Real Assigned Schools Master**: Full dataset extracted directly from the official assignment sheet across Mysuru, Mandya, Chamarajanagar, Hassan, and Kodagu with full codes, boards, principal contacts, opportunity ratings, and recommended programme allocations.
2. **7-School Daily Route Planning**: Round trip optimization starting at the user's PG/home in Bogadi 2nd Stage, visiting 7 clustered schools, and returning to base.
3. **Google Maps Platform Integration**: Powered by Google Routes API (`ComputeRoutes`) with `travelMode: TWO_WHEELER`, waypoint sequence optimization (`optimizeWaypointOrder: true`), and graceful driving fallback.
4. **Mobile Outdoor Field Mode**: Minimal-click, high-contrast interface designed for quick 30-second interactions while on a motorcycle.
5. **Duplicate Prevention & Revisit Tracking**: Prevents accidental re-visits while enabling intentional revisits with complete historical visit preservation.
6. **GPS Verification**: Compares live device GPS against school coordinates with a configurable 150-meter threshold.
7. **3-Day Rolling Schedule & Daily Remarks**: Multi-day preview with dedicated remarks for logging field notes and daily updates.
8. **Integrated AI Field Assistant**: On-demand pitch generation for **MOM (Mittsure Olympiad Masters)** and **Junior Power Quest**, real-time school objection handling, and strategic route advice.

---

## 🛠️ Architecture & Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, Strict TypeScript
- **Styling**: Tailwind CSS, Mobile-first responsive layout (desktop sidebar + mobile bottom navigation)
- **Database & ORM**: SQLite with Prisma ORM (`dev.db` zero-config local persistence, PostgreSQL-compatible schema)
- **Mapping & Routing**: Google Maps Routes API, Google Places API (New), Maps JavaScript API, local TSP 2-opt routing engine, official Google Maps navigation deep links
- **Icons**: Lucide Icons
- **Offline & PWA**: Service Worker caching (`/public/sw.js`), Web App Manifest (`/public/manifest.json`), IndexedDB offline visit queue

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: v18.17+ (Tested on Node v24)
- **npm**: v9+ (Tested on npm 11)

### 1. Installation
Clone or navigate to the project directory and install dependencies:

```bash
cd "c:\Users\User\OneDrive\Desktop\PROJECT\Mittsure"
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:

```env
DATABASE_URL="file:./dev.db"
NEXT_PUBLIC_APP_NAME="Mittsure Field Route & School CRM"
NEXT_PUBLIC_DEFAULT_USER="Nichhenametla Kalyan Ashrith"

# Optional: Google Maps Platform API Key
GOOGLE_MAPS_API_KEY=""
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=""
```

*(Note: If `GOOGLE_MAPS_API_KEY` is left blank, the app runs in full local simulation mode with realistic road distances and TSP waypoint optimization, while still providing direct Google Maps navigation links that open in your phone's native Google Maps app!)*

### 3. Database Setup & Seeding
Push the Prisma schema and seed the database with all 487 schools:

```bash
npx prisma db push
npm run db:seed
```

### 4. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Automated Testing

Run the test suite to verify key business calculations and rules:

```bash
npm test
```

### Test Coverage Includes:
- **KPI Calculation**: 22 completed / 487 assigned $\rightarrow$ exactly 465 remaining and 4.52% completion.
- **Duplicate Detection**: Deduplication by `school_id`, `s_no`, Place ID, and normalized `name + area`.
- **Revisit Integrity**: Validates that recording revisits preserves past visit logs without overwriting.
- **GPS Proximity**: Haversine distance verification within the 150m boundary.
- **Waypoint Sequencing**: Reordering stops according to Google Routes API permutation index.

---

## 📱 Modules Overview

| Module | Route | Key Highlights |
|---|---|---|
| **Dashboard** | `/` | Dynamic KPI cards, 22/487 progress bar, active route preview, recent visits, pending follow-ups |
| **School Master** | `/schools` | Searchable table & grid of all 487 schools, board/type/area filters, Category A–F opportunity badges |
| **School Details** | `/schools/[id]` | Full profile, complete unedited visit history, customized AI sales pitch generator |
| **Route Planner** | `/route-planner` | Base PG $\rightarrow$ 7 Schools $\rightarrow$ Base round trip optimization, leg-by-leg metrics, interactive map |
| **Field Mode** | `/field-mode` | High-contrast outdoor screen: large **NAVIGATE**, **CALL**, **RECORD VISIT**, **MARK VISITED** buttons |
| **Visit CRM** | `/visits` | Chronological audit trail of all outreach events, outcome badges, GPS verification status |
| **Follow-ups** | `/followups` | Tabbed urgency views (Today, Overdue, Pending, Completed), direct call & reschedule actions |
| **3-Day Schedule** | `/calendar` | Rolling 3-day preview with dedicated remarks section to log daily field notes |
| **AI Assistant** | `/ai-assistant` | Tailored MOM & Junior Quest pitches, instant objection responses, daily route timing advice |
| **Analytics** | `/analytics` | Conversion funnel (Registrations, Leads, Follow-ups), board breakdowns, velocity target calculator |
| **Data Quality** | `/data-quality` | Audit scanner identifying missing phone numbers, placeholder PINs, and coordinates |
| **Import / Export** | `/import-export` | CSV school batch importer with deduplication, CSV export, full JSON database backup & restore |
| **Settings** | `/settings` | Configurable base PG address, daily school count (7), travel mode, and editable pitch collateral |

---

## 🗺️ Google Maps Platform Integration

See [GOOGLE_MAPS_SETUP.md](GOOGLE_MAPS_SETUP.md) for step-by-step instructions on enabling Google Cloud Platform APIs, restricting your API keys, and testing live routes.

---

## 💼 User Profile & Default Base

- **Representative**: Nichhenametla Kalyan Ashrith
- **Company**: Mittsure Technologies LLP
- **Base PG Location**: `661, Sahukar Chennaiah Road, Janatha Nagar, Bogadi 2nd Stage, TK Layout, Mysuru, Karnataka 570009` (Lat: 12.3021, Lng: 76.6178)
- **Target Velocity**: 7 schools/day on motorcycle (TWO_WHEELER)

---

## 🔒 Security & Data Integrity

- Environment variables are kept secure and excluded from version control.
- API keys are never exposed in client bundles when server-side routing is used.
- Zero data loss: offline visits are cached and synchronized when internet connectivity returns.
