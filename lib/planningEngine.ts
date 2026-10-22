import { SchoolData, RouteOptimizationResult, TravelMode } from './types';
import { calculateDistanceKm } from './haversine';
import {
  SchoolRecommendationEngine,
  CandidateSchool,
  isStateOrPreSchool,
  isCbseOrIcseSchool,
} from './recommendationEngine';
import { GoogleMapsService } from './googleMaps';
import { BASE_COORDINATES } from './geoSegregation';

export interface DailyPlanConfig {
  date: string; // YYYY-MM-DD
  origin?: { address: string; lat: number; lng: number };
  destination?: { address: string; lat: number; lng: number };
  targetCount?: number;
  territory?: 'MYSURU_URBAN' | 'MYSURU_RURAL' | 'OUTSTATION';
  district?: string;
  area?: string;
  travelMode?: TravelMode;
  excludeSchoolIds?: string[];
}

export interface GeneratedDayPlan {
  date: string;
  dayType: 'FULL_DAY' | 'HALF_DAY' | 'HOLIDAY';
  targetCount: number;
  isHoliday: boolean;
  selectedSchools: CandidateSchool[];
  explanation: string;
  origin: { address: string; lat: number; lng: number };
  destination: { address: string; lat: number; lng: number };
}

export class PlanningEngine {
  /**
   * Generates a practical, geographically coherent daily school visit plan
   */
  public static generateDayPlan(
    allSchools: SchoolData[],
    config: DailyPlanConfig
  ): GeneratedDayPlan {
    const {
      date,
      origin = BASE_COORDINATES,
      destination = BASE_COORDINATES,
      territory = 'MYSURU_URBAN',
      district,
      area,
      excludeSchoolIds = [],
    } = config;

    const [year, month, day] = date.split('-').map(Number);
    const targetDate = new Date(year, month - 1, day);
    const dayOfWeek = targetDate.getDay(); // 0 = Sun, 6 = Sat

    // 1. Sunday Holiday
    if (dayOfWeek === 0) {
      return {
        date,
        dayType: 'HOLIDAY',
        targetCount: 0,
        isHoliday: true,
        selectedSchools: [],
        explanation: 'Sunday is a weekly non-working holiday. No schools scheduled.',
        origin,
        destination,
      };
    }

    const isSaturday = dayOfWeek === 6;
    const dayType = isSaturday ? 'HALF_DAY' : 'FULL_DAY';
    const defaultTarget = isSaturday ? 5 : 7;
    const targetCount = config.targetCount || defaultTarget;

    // Filter available pool
    const excludedSet = new Set(excludeSchoolIds);
    const availablePool = allSchools.filter((s) => !excludedSet.has(s.id));

    // Quota allocation
    const stateQuota = isSaturday ? Math.min(3, targetCount) : Math.min(5, targetCount - 2);
    const cbseQuota = Math.max(1, targetCount - stateQuota);

    const quotaResult = SchoolRecommendationEngine.recommendQuotaSchools(
      availablePool,
      {
        baseLat: origin.lat,
        baseLng: origin.lng,
        district: district || (territory === 'MYSURU_URBAN' ? 'Mysuru' : undefined),
        area: area || 'ALL',
        visitStatus: 'NOT_VISITED',
        isSaturday,
        maxDistanceKm: territory === 'MYSURU_URBAN' ? 18 : 60,
      },
      {
        stateOrPreSchool: stateQuota,
        cbseOrIcse: cbseQuota,
      }
    );

    const selectedSchools = quotaResult.selectedSchools.slice(0, targetCount);

    const stateCount = selectedSchools.filter(isStateOrPreSchool).length;
    const cbseCount = selectedSchools.filter(isCbseOrIcseSchool).length;

    const explanation = `Plan for ${date} (${dayType === 'HALF_DAY' ? 'Saturday Half-Day' : 'Weekday Full-Day'}):
- Total Target: ${selectedSchools.length} schools
- ${stateCount} State Board & Early-Years schools
- ${cbseCount} CBSE / ICSE schools
- Geographically clustered starting and ending at ${origin.address}
- Round-trip return to base guaranteed`;

    return {
      date,
      dayType,
      targetCount: selectedSchools.length,
      isHoliday: false,
      selectedSchools,
      explanation,
      origin,
      destination,
    };
  }

  /**
   * Generates Day 1 kick-off plan from PG Base
   */
  public static generateDayOnePlan(allSchools: SchoolData[]): GeneratedDayPlan {
    const today = new Date();
    // If today is Sunday, start Monday
    if (today.getDay() === 0) {
      today.setDate(today.getDate() + 1);
    }
    const dateStr = today.toISOString().split('T')[0];

    return this.generateDayPlan(allSchools, {
      date: dateStr,
      origin: BASE_COORDINATES,
      destination: BASE_COORDINATES,
      territory: 'MYSURU_URBAN',
      district: 'Mysuru',
      targetCount: today.getDay() === 6 ? 5 : 7,
    });
  }
}
