import { SchoolData } from './types';
import { calculateDistanceKm } from './haversine';

export const BASE_COORDINATES = {
  lat: 12.3021,
  lng: 76.6178,
  address: '661, Sahukar Chennaiah Road, Janatha Nagar, Bogadi 2nd Stage, TK Layout, Mysuru, Karnataka 570009',
};

export const MYSURU_URBAN_LOCALITIES = new Set([
  'alanahalli',
  'bannimantap',
  'belavadi',
  'bogadi',
  'chamarajapuram',
  'dattagalli',
  'gokulam',
  'hebbal',
  'hootagalli',
  'j p nagar',
  'jp nagar',
  'jayalakshmipuram',
  'kuvempunagar',
  'lakshmipuram',
  'metagalli',
  'mysuru',
  'mysore',
  'rajiv nagar',
  'ramakrishna nagar',
  'salundi',
  'saraswathipuram',
  'siddartha layout',
  'siddartha nagar',
  'srirampura',
  'vidyaranyapuram',
  'vijayanagar',
  'yadavagiri',
  'yelwal',
]);

export const MYSURU_RURAL_TALUKS = new Set([
  'bannur',
  'bettadapura',
  'hampapura',
  'hullahalli',
  'hunsur',
  'k r nagar',
  'kr nagar',
  'nanjangud',
  'periyapatna',
  'sargur',
  't narasipura',
  't. narasipura',
]);

export const OUTSTATION_DISTRICTS = new Set([
  'chamarajanagar',
  'mandya',
  'hassan',
  'kodagu',
]);

/**
 * Checks if a school belongs to the Mysuru City core urban boundary
 */
export function isMysuruCitySchool(school: {
  area?: string | null;
  taluk?: string | null;
  district?: string | null;
  latitude: number;
  longitude: number;
}): boolean {
  const dist = (school.district || '').toLowerCase().trim();
  const taluk = (school.taluk || '').toLowerCase().trim();
  const area = (school.area || '').toLowerCase().trim();

  // Explicit non-Mysuru districts
  if (OUTSTATION_DISTRICTS.has(dist)) return false;

  // Rural taluks of Mysuru
  if (MYSURU_RURAL_TALUKS.has(taluk) || MYSURU_RURAL_TALUKS.has(area)) return false;

  // Distance from city base (Bogadi)
  const distKm = calculateDistanceKm(
    BASE_COORDINATES.lat,
    BASE_COORDINATES.lng,
    school.latitude,
    school.longitude
  );

  // Must be within 18 km and have Mysuru district or urban locality
  if (distKm > 18) return false;
  if (dist === 'mysuru' || dist === 'mysore' || MYSURU_URBAN_LOCALITIES.has(area)) {
    return true;
  }

  return false;
}

/**
 * Categorizes a school into its geographic zone
 */
export function getTerritoryZone(school: {
  area?: string | null;
  taluk?: string | null;
  district?: string | null;
  latitude?: number;
  longitude?: number;
}): 'MYSURU_URBAN' | 'MYSURU_RURAL' | 'OUTSTATION' {
  const dist = (school.district || '').toLowerCase().trim();
  const taluk = (school.taluk || '').toLowerCase().trim();
  const area = (school.area || '').toLowerCase().trim();

  if (OUTSTATION_DISTRICTS.has(dist)) {
    return 'OUTSTATION';
  }

  if (MYSURU_RURAL_TALUKS.has(taluk) || MYSURU_RURAL_TALUKS.has(area)) {
    return 'MYSURU_RURAL';
  }

  if (dist === 'mysuru' || dist === 'mysore' || MYSURU_URBAN_LOCALITIES.has(area)) {
    if (school.latitude && school.longitude) {
      const distKm = calculateDistanceKm(
        BASE_COORDINATES.lat,
        BASE_COORDINATES.lng,
        school.latitude,
        school.longitude
      );
      if (distKm > 20) return 'MYSURU_RURAL';
    }
    return 'MYSURU_URBAN';
  }

  return 'OUTSTATION';
}

/**
 * Filter schools strictly according to territory / zone / area selection
 */
export function filterSchoolsByTerritory(
  schools: SchoolData[],
  options: {
    zone?: 'ALL' | 'MYSURU_URBAN' | 'MYSURU_RURAL' | 'OUTSTATION';
    district?: string;
    area?: string;
    maxDistanceKm?: number;
    baseLat?: number;
    baseLng?: number;
  }
): SchoolData[] {
  const {
    zone = 'ALL',
    district,
    area,
    maxDistanceKm,
    baseLat = BASE_COORDINATES.lat,
    baseLng = BASE_COORDINATES.lng,
  } = options;

  return schools.filter((school) => {
    // 1. Strict Area Match: If the user explicitly chose an area from the list,
    // preserve all schools in that area without dropping due to distance
    if (area && area !== 'ALL') {
      return school.area?.toLowerCase().trim() === area.toLowerCase().trim();
    }

    // 2. Strict District Match if provided
    if (district && district !== 'ALL') {
      if (school.district?.toLowerCase().trim() !== district.toLowerCase().trim()) {
        return false;
      }
    }

    // 3. Zone Match
    if (zone !== 'ALL') {
      const schoolZone = getTerritoryZone(school);
      if (schoolZone !== zone) return false;
    }

    // 4. Distance Bound (only applied when not searching a specific outstation district)
    if (maxDistanceKm && (!district || district.toLowerCase() === 'mysuru')) {
      const distKm = calculateDistanceKm(baseLat, baseLng, school.latitude, school.longitude);
      if (distKm > maxDistanceKm) return false;
    }

    return true;
  });
}

/**
 * Validates whether a generated route is geographically sensible
 */
export function validateRouteSensibility(
  stops: Array<{
    school_name: string;
    latitude: number;
    longitude: number;
    area?: string;
    district?: string;
  }>,
  origin: { lat: number; lng: number }
): { sensible: boolean; warnings: string[]; maxLegDistanceKm: number } {
  const warnings: string[] = [];
  let maxLegDistanceKm = 0;

  if (stops.length === 0) {
    return { sensible: true, warnings: [], maxLegDistanceKm: 0 };
  }

  // Check leg distances
  let prevLat = origin.lat;
  let prevLng = origin.lng;

  for (let i = 0; i < stops.length; i++) {
    const stop = stops[i];
    const legDist = calculateDistanceKm(prevLat, prevLng, stop.latitude, stop.longitude);
    if (legDist > maxLegDistanceKm) {
      maxLegDistanceKm = Number(legDist.toFixed(1));
    }

    // Warn if a single leg is unusually long (> 25 km) within a daily city plan
    if (legDist > 25) {
      warnings.push(
        `Long travel leg detected: ${legDist.toFixed(1)} km before stop ${i + 1} (${stop.school_name})`
      );
    }

    prevLat = stop.latitude;
    prevLng = stop.longitude;
  }

  // Check district consistency: Flag if mixing different districts in same day route
  const districts = new Set(
    stops.map((s) => (s.district || '').toLowerCase().trim()).filter(Boolean)
  );
  if (districts.size > 1) {
    warnings.push(
      `Cross-district route warning: Route contains schools from multiple districts (${Array.from(districts).join(', ')})`
    );
  }

  const sensible = warnings.length === 0;
  return { sensible, warnings, maxLegDistanceKm };
}
