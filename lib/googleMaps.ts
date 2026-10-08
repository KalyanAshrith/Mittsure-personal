import {
  RouteLeg,
  RouteOptimizationRequest,
  RouteOptimizationResult,
  SchoolData,
  TravelMode,
} from './types';
import {
  calculateDistanceKm,
  estimateRoadDistanceKm,
  estimateTravelTime,
} from './haversine';

export class GoogleMapsService {
  private static apiKey = process.env.GOOGLE_MAPS_API_KEY || '';

  /**
   * Generates official Google Maps turn-by-turn navigation URL for a single school
   */
  public static getSchoolNavigationUrl(
    lat: number,
    lng: number,
    placeId?: string | null,
    mode: TravelMode = 'TWO_WHEELER'
  ): string {
    const travelModeParam = mode === 'TWO_WHEELER' ? 'two-wheeler' : 'driving';
    let url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=${travelModeParam}`;
    if (placeId) {
      url += `&destination_place_id=${placeId}`;
    }
    return url;
  }

  /**
   * Generates official Google Maps multi-stop round-trip route URL
   */
  public static getMultiStopRouteUrl(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    stops: { lat: number; lng: number }[],
    mode: TravelMode = 'TWO_WHEELER'
  ): string {
    const travelModeParam = mode === 'TWO_WHEELER' ? 'two-wheeler' : 'driving';
    const originStr = `${origin.lat},${origin.lng}`;
    const destStr = `${destination.lat},${destination.lng}`;
    const waypointsStr = stops.map((s) => `${s.lat},${s.lng}`).join('|');

    return `https://www.google.com/maps/dir/?api=1&origin=${originStr}&destination=${destStr}&waypoints=${encodeURIComponent(
      waypointsStr
    )}&travelmode=${travelModeParam}`;
  }

  /**
   * Computes an optimized round-trip route using Google Maps Routes API (or intelligent fallback)
   */
  public static async optimizeRoute(
    request: RouteOptimizationRequest,
    schoolsMap: Map<string, SchoolData>
  ): Promise<RouteOptimizationResult> {
    const { origin, destination, intermediateSchoolIds, travelMode = 'TWO_WHEELER' } = request;
    const apiKey = process.env.GOOGLE_MAPS_API_KEY || '';

    const intermediateSchools = intermediateSchoolIds
      .map((id) => schoolsMap.get(id))
      .filter((s): s is SchoolData => Boolean(s));

    if (intermediateSchools.length === 0) {
      throw new Error('No valid intermediate schools selected for route optimization.');
    }

    // Try Google Maps Routes API if key is available
    if (apiKey && apiKey.trim().length > 10) {
      try {
        const result = await this.callGoogleRoutesApi(
          origin,
          destination,
          intermediateSchools,
          travelMode,
          apiKey
        );
        return result;
      } catch (err: any) {
        console.warn('Google Routes API call failed, falling back to local optimizer:', err.message);
        // Fall back to local routing
        return this.calculateLocalOptimizedRoute(
          origin,
          destination,
          intermediateSchools,
          travelMode,
          true // note it's simulated due to API issue
        );
      }
    }

    // No API key configured: use local TSP round-trip optimizer
    return this.calculateLocalOptimizedRoute(
      origin,
      destination,
      intermediateSchools,
      travelMode,
      true
    );
  }

  /**
   * Direct integration with Google Maps Platform Routes API (ComputeRoutes)
   */
  private static async callGoogleRoutesApi(
    origin: { lat: number; lng: number; address: string },
    destination: { lat: number; lng: number; address: string },
    schools: SchoolData[],
    requestedMode: TravelMode,
    apiKey: string
  ): Promise<RouteOptimizationResult> {
    let mode = requestedMode;
    let isFallbackDrive = false;

    // Build payload for Routes API
    const buildPayload = (travelMode: TravelMode) => ({
      origin: {
        location: {
          latLng: {
            latitude: origin.lat,
            longitude: origin.lng,
          },
        },
      },
      destination: {
        location: {
          latLng: {
            latitude: destination.lat,
            longitude: destination.lng,
          },
        },
      },
      intermediates: schools.map((s) => ({
        location: {
          latLng: {
            latitude: s.latitude,
            longitude: s.longitude,
          },
        },
      })),
      travelMode: travelMode === 'TWO_WHEELER' ? 'TWO_WHEELER' : 'DRIVE',
      optimizeWaypointOrder: true,
      routingPreference: 'TRAFFIC_UNAWARE',
      computeAlternativeRoutes: false,
    });

    const endpoint = 'https://routes.googleapis.com/directions/v2:computeRoutes';
    const fieldMask =
      'routes.duration,routes.distanceMeters,routes.optimizedIntermediateWaypointIndex,routes.legs';

    let response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': fieldMask,
      },
      body: JSON.stringify(buildPayload(mode)),
    });

    // If TWO_WHEELER fails with 400 (e.g. not supported in specific account/region), gracefully retry with DRIVE
    if (!response.ok && mode === 'TWO_WHEELER') {
      console.warn('TWO_WHEELER routing unavailable in Routes API, falling back to DRIVE');
      mode = 'DRIVE';
      isFallbackDrive = true;
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': fieldMask,
        },
        body: JSON.stringify(buildPayload(mode)),
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google Routes API Error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const route = data.routes?.[0];
    if (!route) {
      throw new Error('Google Routes API returned no route.');
    }

    // Waypoint indices returned by Google Routes API
    // routes.optimizedIntermediateWaypointIndex: array of indices of the intermediate waypoints in their optimized order
    const optimizedIndices: number[] =
      route.optimizedIntermediateWaypointIndex ?? schools.map((_, i) => i);

    const optimizedSchools = optimizedIndices.map((idx) => schools[idx]);
    const optimizedOrder = optimizedSchools.map((s) => s.id);

    const totalDistanceMeters = route.distanceMeters || 0;
    const totalDistanceKm = Number((totalDistanceMeters / 1000).toFixed(2));
    const totalSeconds = parseInt(route.duration?.replace('s', '') || '0', 10);
    const { formatted: totalDurationFormatted } = estimateTravelTime(
      totalDistanceKm,
      mode
    );

    // Build leg details
    const legs: RouteLeg[] = [];
    const orderedPoints = [
      { name: 'Base (Home/PG)', lat: origin.lat, lng: origin.lng },
      ...optimizedSchools.map((s) => ({
        name: s.school_name,
        lat: s.latitude,
        lng: s.longitude,
      })),
      { name: 'Base (Home/PG)', lat: destination.lat, lng: destination.lng },
    ];

    if (route.legs && route.legs.length === orderedPoints.length - 1) {
      for (let i = 0; i < route.legs.length; i++) {
        const leg = route.legs[i];
        const distM = leg.distanceMeters || 0;
        const durS = parseInt(leg.duration?.replace('s', '') || '0', 10);
        legs.push({
          fromName: orderedPoints[i].name,
          toName: orderedPoints[i + 1].name,
          distanceMeters: distM,
          distanceKm: Number((distM / 1000).toFixed(2)),
          durationSeconds: durS,
          durationFormatted: `${Math.max(1, Math.round(durS / 60))} min`,
        });
      }
    } else {
      // Build legs from coordinates
      for (let i = 0; i < orderedPoints.length - 1; i++) {
        const dKm = estimateRoadDistanceKm(
          orderedPoints[i].lat,
          orderedPoints[i].lng,
          orderedPoints[i + 1].lat,
          orderedPoints[i + 1].lng
        );
        const t = estimateTravelTime(dKm, mode);
        legs.push({
          fromName: orderedPoints[i].name,
          toName: orderedPoints[i + 1].name,
          distanceKm: dKm,
          distanceMeters: Math.round(dKm * 1000),
          durationSeconds: t.seconds,
          durationFormatted: t.formatted,
        });
      }
    }

    const googleMapsDirectionsUrl = this.getMultiStopRouteUrl(
      origin,
      destination,
      optimizedSchools.map((s) => ({ lat: s.latitude, lng: s.longitude })),
      mode
    );

    return {
      optimizedOrder,
      optimizedIndices,
      totalDistanceKm,
      totalDistanceMeters,
      totalDurationFormatted,
      totalDurationSeconds: totalSeconds,
      travelMode: mode,
      legs,
      isFallbackDrive,
      isSimulated: false,
      googleMapsDirectionsUrl,
    };
  }

  /**
   * Local round-trip TSP solver (Greedy Nearest Neighbor + 2-Opt)
   * Used when offline or before a Google Maps API Key is entered.
   */
  public static calculateLocalOptimizedRoute(
    origin: { lat: number; lng: number; address: string },
    destination: { lat: number; lng: number; address: string },
    schools: SchoolData[],
    travelMode: TravelMode = 'TWO_WHEELER',
    isSimulated: boolean = true
  ): RouteOptimizationResult {
    const n = schools.length;
    if (n === 1) {
      const leg1Km = estimateRoadDistanceKm(
        origin.lat,
        origin.lng,
        schools[0].latitude,
        schools[0].longitude
      );
      const leg2Km = estimateRoadDistanceKm(
        schools[0].latitude,
        schools[0].longitude,
        destination.lat,
        destination.lng
      );
      const totalKm = Number((leg1Km + leg2Km).toFixed(2));
      const t1 = estimateTravelTime(leg1Km, travelMode);
      const t2 = estimateTravelTime(leg2Km, travelMode);
      const totalSeconds = t1.seconds + t2.seconds;
      const { formatted } = estimateTravelTime(totalKm, travelMode);

      return {
        optimizedOrder: [schools[0].id],
        optimizedIndices: [0],
        totalDistanceKm: totalKm,
        totalDistanceMeters: Math.round(totalKm * 1000),
        totalDurationFormatted: formatted,
        totalDurationSeconds: totalSeconds,
        travelMode,
        legs: [
          {
            fromName: 'Base (PG/Home)',
            toName: schools[0].school_name,
            distanceKm: leg1Km,
            distanceMeters: Math.round(leg1Km * 1000),
            durationFormatted: t1.formatted,
            durationSeconds: t1.seconds,
          },
          {
            fromName: schools[0].school_name,
            toName: 'Base (PG/Home)',
            distanceKm: leg2Km,
            distanceMeters: Math.round(leg2Km * 1000),
            durationFormatted: t2.formatted,
            durationSeconds: t2.seconds,
          },
        ],
        isSimulated,
        googleMapsDirectionsUrl: this.getMultiStopRouteUrl(
          origin,
          destination,
          [{ lat: schools[0].latitude, lng: schools[0].longitude }],
          travelMode
        ),
      };
    }

    // Multi-stop Traveling Salesperson optimization:
    // Nearest neighbor initial tour starting from origin
    const visited = new Set<number>();
    const tourIndices: number[] = [];
    let currentLat = origin.lat;
    let currentLng = origin.lng;

    for (let step = 0; step < n; step++) {
      let nearestIdx = -1;
      let nearestDist = Infinity;

      for (let i = 0; i < n; i++) {
        if (!visited.has(i)) {
          const dist = calculateDistanceKm(
            currentLat,
            currentLng,
            schools[i].latitude,
            schools[i].longitude
          );
          if (dist < nearestDist) {
            nearestDist = dist;
            nearestIdx = i;
          }
        }
      }

      if (nearestIdx !== -1) {
        visited.add(nearestIdx);
        tourIndices.push(nearestIdx);
        currentLat = schools[nearestIdx].latitude;
        currentLng = schools[nearestIdx].longitude;
      }
    }

    // 2-Opt local search improvement on the intermediate stops
    let improved = true;
    let iteration = 0;
    while (improved && iteration < 30) {
      improved = false;
      iteration++;
      for (let i = 0; i < n - 1; i++) {
        for (let j = i + 1; j < n; j++) {
          const prevLat = i === 0 ? origin.lat : schools[tourIndices[i - 1]].latitude;
          const prevLng = i === 0 ? origin.lng : schools[tourIndices[i - 1]].longitude;
          const nextLat = j === n - 1 ? destination.lat : schools[tourIndices[j + 1]].latitude;
          const nextLng = j === n - 1 ? destination.lng : schools[tourIndices[j + 1]].longitude;

          const currentCost =
            calculateDistanceKm(prevLat, prevLng, schools[tourIndices[i]].latitude, schools[tourIndices[i]].longitude) +
            calculateDistanceKm(schools[tourIndices[j]].latitude, schools[tourIndices[j]].longitude, nextLat, nextLng);

          const reversedCost =
            calculateDistanceKm(prevLat, prevLng, schools[tourIndices[j]].latitude, schools[tourIndices[j]].longitude) +
            calculateDistanceKm(schools[tourIndices[i]].latitude, schools[tourIndices[i]].longitude, nextLat, nextLng);

          if (reversedCost < currentCost - 0.05) {
            // Reverse tour between i and j
            const sub = tourIndices.slice(i, j + 1).reverse();
            tourIndices.splice(i, sub.length, ...sub);
            improved = true;
          }
        }
      }
    }

    const optimizedSchools = tourIndices.map((idx) => schools[idx]);
    const optimizedOrder = optimizedSchools.map((s) => s.id);

    // Calculate legs
    const legs: RouteLeg[] = [];
    let totalKm = 0;
    let totalSeconds = 0;

    const orderedStops = [
      { name: 'Base (PG/Home)', lat: origin.lat, lng: origin.lng },
      ...optimizedSchools.map((s) => ({
        name: s.school_name,
        lat: s.latitude,
        lng: s.longitude,
      })),
      { name: 'Base (PG/Home)', lat: destination.lat, lng: destination.lng },
    ];

    for (let i = 0; i < orderedStops.length - 1; i++) {
      const legKm = estimateRoadDistanceKm(
        orderedStops[i].lat,
        orderedStops[i].lng,
        orderedStops[i + 1].lat,
        orderedStops[i + 1].lng
      );
      const t = estimateTravelTime(legKm, travelMode);
      totalKm += legKm;
      totalSeconds += t.seconds;

      legs.push({
        fromName: orderedStops[i].name,
        toName: orderedStops[i + 1].name,
        distanceKm: legKm,
        distanceMeters: Math.round(legKm * 1000),
        durationSeconds: t.seconds,
        durationFormatted: t.formatted,
      });
    }

    totalKm = Number(totalKm.toFixed(2));
    const { formatted: totalDurationFormatted } = estimateTravelTime(totalKm, travelMode);

    const googleMapsDirectionsUrl = this.getMultiStopRouteUrl(
      origin,
      destination,
      optimizedSchools.map((s) => ({ lat: s.latitude, lng: s.longitude })),
      travelMode
    );

    return {
      optimizedOrder,
      optimizedIndices: tourIndices,
      totalDistanceKm: totalKm,
      totalDistanceMeters: Math.round(totalKm * 1000),
      totalDurationFormatted,
      totalDurationSeconds: totalSeconds,
      travelMode,
      legs,
      isSimulated,
      googleMapsDirectionsUrl,
    };
  }
}
