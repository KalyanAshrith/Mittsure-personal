/**
 * Haversine formula to compute great-circle distance between two GPS coordinates
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in meters
}

export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  return Number((calculateDistanceMeters(lat1, lon1, lat2, lon2) / 1000).toFixed(2));
}

/**
 * Verify if the field rep's GPS location is within the school's boundary threshold
 * Default threshold: 150 meters
 */
export function verifyLocation(
  userLat: number,
  userLng: number,
  schoolLat: number,
  schoolLng: number,
  radiusMeters: number = 150
): { verified: boolean; distanceMeters: number; message: string } {
  const distance = Math.round(calculateDistanceMeters(userLat, userLng, schoolLat, schoolLng));
  const verified = distance <= radiusMeters;
  const message = verified
    ? `Location Verified (${distance}m from school)`
    : `Location appears outside school area (${distance}m away; threshold: ${radiusMeters}m)`;

  return { verified, distanceMeters: distance, message };
}

/**
 * Approximate road factor (actual urban road distance is ~1.28x to 1.35x crow-flies distance)
 */
export function estimateRoadDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const straightLine = calculateDistanceKm(lat1, lon1, lat2, lon2);
  return Number((straightLine * 1.3).toFixed(2));
}

/**
 * Estimate travel duration for two-wheeler vs car in Mysuru traffic
 */
export function estimateTravelTime(
  distanceKm: number,
  mode: 'TWO_WHEELER' | 'DRIVE' = 'TWO_WHEELER'
): { seconds: number; formatted: string } {
  // Two-wheeler average speed in Mysuru urban/semi-urban routes: ~28 km/h + 2 min buffer
  // Driving speed: ~24 km/h + 3 min buffer
  const speed = mode === 'TWO_WHEELER' ? 28 : 24;
  const hours = distanceKm / speed;
  const bufferSeconds = mode === 'TWO_WHEELER' ? 120 : 180;
  const totalSeconds = Math.max(180, Math.round(hours * 3600 + bufferSeconds));

  const mins = Math.round(totalSeconds / 60);
  if (mins < 60) {
    return { seconds: totalSeconds, formatted: `${mins} min` };
  }
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return { seconds: totalSeconds, formatted: `${h} hr ${m > 0 ? `${m} min` : ''}`.trim() };
}
