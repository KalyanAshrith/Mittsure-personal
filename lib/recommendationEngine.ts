import { SchoolData } from './types';
import { calculateDistanceKm } from './haversine';

export interface ScoreBreakdown {
  pendingStatus: number;         // max 30
  schoolCategory: number;        // max 20
  geoClustering: number;         // max 15
  productFit: number;            // max 10
  distanceFromBase: number;      // max 10
  contactLeadPotential: number;  // max 10
  workloadBalance: number;       // max 5
  total: number;                 // max 100
  details: {
    pendingReason: string;
    categoryReason: string;
    clusteringReason: string;
    productFitReason: string;
    distanceReason: string;
    contactReason: string;
    workloadReason: string;
  };
}

export interface RecommendationCriteria {
  baseLat: number;
  baseLng: number;
  targetCount?: number;
  board?: string; // ALL, CBSE, ICSE, STATE BOARD
  schoolType?: string; // ALL, PRIMARY, PRE-SCHOOL, SMALL_AND_EARLY_YEARS, etc.
  area?: string;
  district?: string;
  visitStatus?: string; // ALL, NOT_VISITED, REVISIT_ONLY, FOLLOW_UP_ONLY
  maxDistanceKm?: number;
  programme?: string; // ALL, MOM, Junior Power Quest, Both
  preset?: string;
  currentUserOnly?: boolean;
  isSaturday?: boolean;
  isSunday?: boolean;
}

export interface CandidateSchool extends SchoolData {
  distanceFromBaseKm: number;
  recommendationScore: number;
  scoreBreakdown: ScoreBreakdown;
  matchReasons: string[];
}

export class SchoolRecommendationEngine {
  /**
   * Deterministic 100-Point Transparent Priority Scoring System
   * - Pending status: 30 pts
   * - School type/category: 20 pts
   * - Geographical clustering: 15 pts
   * - Product fit: 10 pts
   * - Distance from base: 10 pts
   * - Contact/lead potential: 10 pts
   * - Daily workload balance: 5 pts
   * Total = 100 pts.
   */
  public static calculatePriorityScore(
    school: SchoolData,
    criteria: RecommendationCriteria,
    areaPendingCounts: Map<string, number>,
    distKm: number
  ): { score: number; breakdown: ScoreBreakdown; matchReasons: string[] } {
    const {
      board,
      schoolType,
      area,
      visitStatus = 'NOT_VISITED',
      programme,
      preset,
      isSaturday = false,
      isSunday = false,
    } = criteria;

    const matchReasons: string[] = [];

    // 1. PENDING STATUS (Max 30 pts)
    let pendingStatus = 0;
    let pendingReason = '';

    const isVisitedByCurrent = Boolean(
      school.visited_by_current_user || (school.visit_status === 'VISITED' && !school.visited_by_previous_rep)
    );

    if (!isVisitedByCurrent && school.visit_status !== 'VISITED') {
      pendingStatus = 30;
      pendingReason = 'Pending allotment: Unvisited by current representative (+30)';
      matchReasons.push('Pending unvisited school');
    } else if (visitStatus === 'REVISIT_ONLY' || visitStatus === 'ALL') {
      pendingStatus = 20;
      pendingReason = 'Scheduled revisit target (+20)';
      matchReasons.push('Revisit target');
    } else if (school.visit_status === 'FOLLOW-UP' || school.next_followup_date) {
      pendingStatus = 30;
      pendingReason = 'Active follow-up pending (+30)';
      matchReasons.push('Follow-up pending');
    } else {
      pendingStatus = 0;
      pendingReason = 'Already completed by representative (0)';
    }

    // 2. SCHOOL TYPE / CATEGORY (Max 20 pts)
    let schoolCategory = 0;
    let categoryReason = '';

    const isEarlyYearsTheme =
      schoolType === 'SMALL_AND_EARLY_YEARS' ||
      schoolType === 'PRE-SCHOOL' ||
      preset === 'Pre-school Day';

    const isEarlyYearsSchool =
      ['PRE-SCHOOL', 'PLAY SCHOOL', 'NURSERY', 'MONTESSORI', 'KINDERGARTEN'].includes(
        school.school_type?.toUpperCase()
      ) ||
      ['D', 'E'].includes(school.opportunity_type) ||
      (school.student_strength !== null && school.student_strength !== undefined && school.student_strength <= 250);

    if (isEarlyYearsTheme) {
      if (isEarlyYearsSchool) {
        schoolCategory = 20;
        categoryReason = `Early-Years target category (${school.school_type || 'Pre-School'}) (+20)`;
        matchReasons.push(`Small / Early-Years focus (${school.school_type})`);
      } else {
        schoolCategory = 0;
        categoryReason = 'Non-early years school deprioritized under current theme (0)';
      }
    } else if (schoolType && schoolType !== 'ALL') {
      if (school.school_type?.toUpperCase() === schoolType.toUpperCase()) {
        schoolCategory = 20;
        categoryReason = `Category match: ${school.school_type} (+20)`;
        matchReasons.push(`${school.school_type} category match`);
      } else {
        schoolCategory = 5;
        categoryReason = `Alternative category: ${school.school_type} (+5)`;
      }
    } else if (board && board !== 'ALL') {
      if (school.board?.toUpperCase() === board.toUpperCase()) {
        schoolCategory = 20;
        categoryReason = `Curriculum match: ${school.board} (+20)`;
        matchReasons.push(`${school.board} curriculum match`);
      } else {
        schoolCategory = 10;
        categoryReason = `Curriculum: ${school.board} (+10)`;
      }
    } else {
      // Default / Balanced mode
      if (isEarlyYearsSchool || ['PRIMARY', 'HIGH SCHOOL'].includes(school.school_type?.toUpperCase())) {
        schoolCategory = 20;
        categoryReason = `Core school tier (${school.school_type}) (+20)`;
      } else {
        schoolCategory = 15;
        categoryReason = `General category (${school.school_type || 'Standard'}) (+15)`;
      }
    }

    // 3. GEOGRAPHICAL CLUSTERING (Max 15 pts)
    let geoClustering = 0;
    let clusteringReason = '';

    const pendingInArea = areaPendingCounts.get(school.area) || 0;
    if (area && area !== 'ALL' && school.area.toLowerCase() === area.toLowerCase()) {
      geoClustering = 15;
      clusteringReason = `Direct match in selected cluster area: ${school.area} (+15)`;
      matchReasons.push(`Cluster match: ${school.area}`);
    } else if (pendingInArea >= 15) {
      geoClustering = 15;
      clusteringReason = `High-density cluster (${pendingInArea} pending schools in ${school.area}) (+15)`;
      matchReasons.push(`Dense cluster: ${school.area}`);
    } else if (pendingInArea >= 8) {
      geoClustering = 12;
      clusteringReason = `Active cluster (${pendingInArea} pending schools in ${school.area}) (+12)`;
    } else if (pendingInArea >= 3) {
      geoClustering = 8;
      clusteringReason = `Local cluster (${pendingInArea} pending schools in ${school.area}) (+8)`;
    } else {
      geoClustering = 5;
      clusteringReason = `Standard cluster (${school.area}) (+5)`;
    }

    // 4. PRODUCT FIT (Max 10 pts)
    let productFit = 0;
    let productFitReason = '';

    const verifiedProduct = getVerifiedProductRecommendation(school);
    if (verifiedProduct.includes('Junior Power Quest') && (isEarlyYearsTheme || programme === 'Junior Power Quest')) {
      productFit = 10;
      productFitReason = 'Direct verified product match: Junior Power Quest (Early Years) (+10)';
      matchReasons.push('Junior Power Quest Fit');
    } else if (verifiedProduct.includes('MOM') && programme === 'MOM') {
      productFit = 10;
      productFitReason = 'Direct verified product match: MOM Olympiad Masters (+10)';
      matchReasons.push('MOM Programme Fit');
    } else if (verifiedProduct.includes('Both')) {
      productFit = 10;
      productFitReason = 'Verified dual-programme match: MOM & Junior Power Quest (+10)';
      matchReasons.push('Dual-Programme Fit');
    } else if (verifiedProduct !== 'Class range not verified') {
      productFit = 8;
      productFitReason = `Verified programme match: ${verifiedProduct} (+8)`;
    } else {
      productFit = 5;
      productFitReason = 'Class range not verified in master data: Partial score (+5)';
    }

    // 5. DISTANCE FROM BASE (Max 10 pts)
    let distanceFromBase = 0;
    let distanceReason = '';

    if (distKm <= 5) {
      distanceFromBase = 10;
      distanceReason = `Within 5 km of PG base (${distKm.toFixed(1)} km) (+10)`;
      matchReasons.push(`Near PG base (${distKm.toFixed(1)} km)`);
    } else if (distKm <= 8) {
      distanceFromBase = 8;
      distanceReason = `Within 8 km of PG base (${distKm.toFixed(1)} km) (+8)`;
    } else if (distKm <= 12) {
      distanceFromBase = 5;
      distanceReason = `Within 12 km of PG base (${distKm.toFixed(1)} km) (+5)`;
    } else {
      distanceFromBase = 2;
      distanceReason = `Outer circuit (${distKm.toFixed(1)} km) (+2)`;
    }

    // 6. CONTACT / LEAD POTENTIAL (Max 10 pts)
    let contactLeadPotential = 0;
    let contactReason = '';

    const hasPhone = Boolean(school.phone && school.phone.trim().length >= 6);
    const hasPerson = Boolean(
      (school.contact_person && school.contact_person.trim().length > 2 && !school.contact_person.includes('Head')) ||
      (school.principal_name && school.principal_name.trim().length > 2 && !school.principal_name.includes('Head'))
    );
    const hasEmail = Boolean(school.email && school.email.includes('@'));

    if (hasPhone && (hasPerson || hasEmail)) {
      contactLeadPotential = 10;
      contactReason = 'Verified contact phone & decision maker / email available (+10)';
    } else if (hasPhone || hasPerson || hasEmail) {
      contactLeadPotential = 5;
      contactReason = 'Partial contact details available in master allotment (+5)';
    } else {
      contactLeadPotential = 0;
      contactReason = 'No direct contact info in master allotment: In-person walk-in required (0)';
    }

    // 7. DAILY WORKLOAD BALANCE (Max 5 pts)
    let workloadBalance = 0;
    let workloadReason = '';

    if (isSunday) {
      workloadBalance = 0;
      workloadReason = 'Sunday weekly holiday (0 visits)';
    } else if (isSaturday) {
      workloadBalance = 5;
      workloadReason = 'Saturday half-day target (manageable <= 6 schools) (+5)';
    } else {
      workloadBalance = 5;
      workloadReason = 'Full-day manageable workload target (7 schools daily) (+5)';
    }

    const total =
      pendingStatus +
      schoolCategory +
      geoClustering +
      productFit +
      distanceFromBase +
      contactLeadPotential +
      workloadBalance;

    const breakdown: ScoreBreakdown = {
      pendingStatus,
      schoolCategory,
      geoClustering,
      productFit,
      distanceFromBase,
      contactLeadPotential,
      workloadBalance,
      total,
      details: {
        pendingReason,
        categoryReason,
        clusteringReason,
        productFitReason,
        distanceReason,
        contactReason,
        workloadReason,
      },
    };

    return { score: total, breakdown, matchReasons: matchReasons.slice(0, 3) };
  }

  /**
   * Evaluates and scores schools to produce ranked candidates for the daily route
   */
  public static recommendSchools(
    schools: SchoolData[],
    criteria: RecommendationCriteria
  ): CandidateSchool[] {
    const {
      baseLat,
      baseLng,
      schoolType,
      visitStatus = 'NOT_VISITED',
      maxDistanceKm = 18,
      preset,
      district,
    } = criteria;

    // Count pending schools per area for clustering calculation
    const areaPendingCounts = new Map<string, number>();
    for (const s of schools) {
      if (s.visit_status === 'NOT VISITED' && !s.visited_by_current_user) {
        const a = s.area || 'Other';
        areaPendingCounts.set(a, (areaPendingCounts.get(a) || 0) + 1);
      }
    }

    const candidates: CandidateSchool[] = [];

    for (const school of schools) {
      const distKm = calculateDistanceKm(
        baseLat,
        baseLng,
        school.latitude,
        school.longitude
      );

      // Area and Geographic Filtering:
      // If user selected a specific area from the list, keep ALL schools in that area without confusion
      if (criteria.area && criteria.area !== 'ALL') {
        if (school.area?.toLowerCase() !== criteria.area.toLowerCase()) {
          continue;
        }
      } else {
        // If "ALL" areas is selected:
        // Support explicit district filter if provided
        if (district && district !== 'ALL') {
          if (school.district?.toLowerCase() !== district.toLowerCase()) {
            continue;
          }
        } else {
          // By default when planning without a specific area, keep within local Mysuru city circuit
          // so distant subordinate cities (Chamarajanagar ~55km, Mandya ~39km) are not injected
          if (maxDistanceKm && distKm > maxDistanceKm) {
            continue;
          }
          if (school.district === 'Chamarajanagar' || school.district === 'Mandya' || distKm > 20) {
            continue;
          }
        }
      }

      // Hard Visit Status Filter
      if (visitStatus === 'NOT_VISITED') {
        if (school.visited_by_current_user || school.visit_status === 'VISITED') {
          continue;
        }
      } else if (visitStatus === 'REVISIT_ONLY') {
        if (!school.visited_by_current_user && school.visit_status === 'NOT VISITED') {
          continue;
        }
      } else if (visitStatus === 'FOLLOW_UP_ONLY') {
        if (school.visit_status !== 'FOLLOW-UP' && !school.next_followup_date) {
          continue;
        }
      }

      // Hard Early-Years Theme Filter:
      // When user selects SMALL & EARLY YEARS, do not mix unrelated large schools
      const isEarlyYearsTheme =
        schoolType === 'SMALL_AND_EARLY_YEARS' ||
        preset === 'Pre-school Day';

      const isEarlyYearsSchool =
        ['PRE-SCHOOL', 'PLAY SCHOOL', 'NURSERY', 'MONTESSORI', 'KINDERGARTEN'].includes(
          school.school_type?.toUpperCase()
        ) ||
        ['D', 'E'].includes(school.opportunity_type) ||
        (school.student_strength !== null && school.student_strength !== undefined && school.student_strength <= 250);

      if (isEarlyYearsTheme && !isEarlyYearsSchool) {
        continue;
      }

      const { score, breakdown, matchReasons } = this.calculatePriorityScore(
        school,
        criteria,
        areaPendingCounts,
        distKm
      );

      candidates.push({
        ...school,
        distanceFromBaseKm: Number(distKm.toFixed(2)),
        recommendationScore: score,
        scoreBreakdown: breakdown,
        matchReasons,
      });
    }

    // Sort by recommendation score descending, then by distance ascending
    candidates.sort((a, b) => {
      if (b.recommendationScore !== a.recommendationScore) {
        return b.recommendationScore - a.recommendationScore;
      }
      return a.distanceFromBaseKm - b.distanceFromBaseKm;
    });

    return candidates;
  }

  /**
   * Deterministic 5+2 Quota Recommendation:
   * Selects 5 State Board / Pre-schools + 2 CBSE or ICSE schools (total 7 schools)
   * Saturday half-day adjusts to 3 State/Pre-school + 2 CBSE/ICSE (total 5 schools)
   * Ensures geographic clustering between the two cohorts.
   */
  public static recommendQuotaSchools(
    schools: SchoolData[],
    criteria: RecommendationCriteria,
    quota: { stateOrPreSchool: number; cbseOrIcse: number } = {
      stateOrPreSchool: criteria.isSaturday ? 3 : 5,
      cbseOrIcse: 2,
    }
  ): {
    selectedSchools: CandidateSchool[];
    candidates: CandidateSchool[];
    quotaSummary: {
      stateOrPreCount: number;
      cbseOrIcseCount: number;
      totalCount: number;
      stateOrPreTarget: number;
      cbseOrIcseTarget: number;
    };
  } {
    const allRanked = this.recommendSchools(schools, criteria);

    // Partition into State/Pre-school and CBSE/ICSE
    const stateOrPrePool = allRanked.filter(isStateOrPreSchool);
    const cbseOrIcsePool = allRanked.filter(isCbseOrIcseSchool);

    // Pick top State / Pre-schools
    const selectedStateOrPre = stateOrPrePool.slice(0, quota.stateOrPreSchool);

    // Compute geographic centroid of selected State/Pre-schools
    let centroidLat = criteria.baseLat;
    let centroidLng = criteria.baseLng;
    if (selectedStateOrPre.length > 0) {
      centroidLat =
        selectedStateOrPre.reduce((sum, s) => sum + s.latitude, 0) / selectedStateOrPre.length;
      centroidLng =
        selectedStateOrPre.reduce((sum, s) => sum + s.longitude, 0) / selectedStateOrPre.length;
    }

    // Sort CBSE/ICSE pool by proximity to this cluster centroid, then by score
    // STRICT CLUSTER GUARD: Filter out any school exceeding 14 km from circuit centroid
    const localCbsePool = cbseOrIcsePool.filter((s) => {
      const distToCentroid = calculateDistanceKm(centroidLat, centroidLng, s.latitude, s.longitude);
      return distToCentroid <= 14;
    });

    const sortedCbseIcse = [...(localCbsePool.length > 0 ? localCbsePool : cbseOrIcsePool)].sort((a, b) => {
      const distA = calculateDistanceKm(centroidLat, centroidLng, a.latitude, a.longitude);
      const distB = calculateDistanceKm(centroidLat, centroidLng, b.latitude, b.longitude);
      // If within 2 km of each other relative to cluster, prefer higher score
      if (Math.abs(distA - distB) < 2.0) {
        return b.recommendationScore - a.recommendationScore;
      }
      return distA - distB;
    });

    const selectedCbseIcse = sortedCbseIcse.slice(0, quota.cbseOrIcse);

    const combinedSelected = [...selectedStateOrPre, ...selectedCbseIcse];

    // If quota couldn't fill the target because of pool shortages, backfill from allRanked
    const targetTotal = criteria.isSaturday ? 3 + 2 : (criteria.targetCount || 7);
    if (combinedSelected.length < targetTotal && allRanked.length > combinedSelected.length) {
      const selectedIdSet = new Set(combinedSelected.map((s) => s.id));
      const needed = targetTotal - combinedSelected.length;
      const additional = allRanked.filter((s) => !selectedIdSet.has(s.id)).slice(0, needed);
      combinedSelected.push(...additional);
    }

    // Reorder full candidates list so selected are first, followed by others
    const selectedIds = new Set(combinedSelected.map((s) => s.id));
    const remaining = allRanked.filter((s) => !selectedIds.has(s.id));
    const reorderedCandidates = [...combinedSelected, ...remaining];

    return {
      selectedSchools: combinedSelected,
      candidates: reorderedCandidates,
      quotaSummary: {
        stateOrPreCount: selectedStateOrPre.length,
        cbseOrIcseCount: selectedCbseIcse.length,
        totalCount: combinedSelected.length,
        stateOrPreTarget: quota.stateOrPreSchool,
        cbseOrIcseTarget: quota.cbseOrIcse,
      },
    };
  }

  /**
   * Group candidate schools by geographic cluster
   */
  public static getAreaClusters(schools: SchoolData[]): {
    area: string;
    total: number;
    visited: number;
    remaining: number;
  }[] {
    const map = new Map<string, { total: number; visited: number }>();

    for (const s of schools) {
      const area = s.area || 'Other';
      const existing = map.get(area) || { total: 0, visited: 0 };
      existing.total += 1;
      if (s.visit_status !== 'NOT VISITED' || s.visited_by_current_user) {
        existing.visited += 1;
      }
      map.set(area, existing);
    }

    return Array.from(map.entries())
      .map(([area, stats]) => ({
        area,
        total: stats.total,
        visited: stats.visited,
        remaining: stats.total - stats.visited,
      }))
      .sort((a, b) => b.total - a.total);
  }
}

/**
 * Checks if a school belongs to State Board or Pre-School / Early-Years category
 */
export function isStateOrPreSchool(school: SchoolData): boolean {
  const b = school.board?.toUpperCase() || '';
  const t = school.school_type?.toUpperCase() || '';
  return (
    b === 'STATE BOARD' ||
    b === 'STATE' ||
    t === 'PLAY SCHOOL' ||
    t === 'PRE-SCHOOL' ||
    t === 'NURSERY' ||
    t === 'MONTESSORI' ||
    t === 'KINDERGARTEN' ||
    (b === 'OTHER' && (['D', 'E'].includes(school.opportunity_type) || t === 'PLAY SCHOOL'))
  );
}

/**
 * Checks if a school belongs to CBSE or ICSE board
 */
export function isCbseOrIcseSchool(school: SchoolData): boolean {
  const b = school.board?.toUpperCase() || '';
  return b === 'CBSE' || b === 'ICSE';
}

/**
 * Product recommendation supported strictly by school class/type information
 * - Nursery/LKG/UKG: Junior Power Quest
 * - Class 1-12: MOM (Mittsure Olympiad Masters)
 * - Both: Both
 * - Unverified: 'Class range not verified' (Never guesses)
 */
export function getVerifiedProductRecommendation(school: SchoolData): string {
  const hasEarly = Boolean(
    school.nursery_available ||
    school.lkg_available ||
    school.ukg_available ||
    ['PRE-SCHOOL', 'PLAY SCHOOL', 'NURSERY', 'MONTESSORI', 'KINDERGARTEN'].includes(
      school.school_type?.toUpperCase()
    )
  );

  const hasSenior = Boolean(
    school.primary_available ||
    school.secondary_available ||
    ['PRIMARY', 'HIGH SCHOOL', 'COMPOSITE', 'INTERNATIONAL'].includes(
      school.school_type?.toUpperCase()
    )
  );

  if (hasEarly && hasSenior) {
    return 'Both (MOM & Junior Power Quest)';
  } else if (hasEarly) {
    return 'Junior Power Quest (Early Years)';
  } else if (hasSenior) {
    return 'MOM — Mittsure Olympiad Masters';
  } else {
    return 'Class range not verified';
  }
}

/**
 * Generates the deterministic planning explanation block for the route planner
 * As requested in Step 9:
 * "WHY THESE SCHOOLS?
 * 5 schools selected because they are:
 * - pending
 * - small/early-years focused
 * - geographically compatible
 * - suitable for current field objective
 * - within daily workload target.
 * ROUTE ORDER OPTIMIZED BY GOOGLE MAPS"
 */
export function generatePlanExplanation(
  schools: SchoolData[],
  dayType: 'FULL_DAY' | 'HALF_DAY' | 'HOLIDAY' = 'FULL_DAY',
  theme: string = '5 STATE/PRE + 2 CBSE/ICSE'
): string {
  const count = schools.length;
  const stateCount = schools.filter(isStateOrPreSchool).length;
  const cbseIcseCount = schools.filter(isCbseOrIcseSchool).length;

  return `${count} schools selected following 5+2 daily quota policy:
- ${stateCount} State Board & Pre-schools (Foundational & Local outreach)
- ${cbseIcseCount} CBSE / ICSE institutions (Senior Olympiad benchmarking)
- Pending status: unvisited by current representative
- Geographically compatible: clustered within Mysuru circuit for two-wheeler travel
- Within the daily workload target (${count} schools).
ROUTE ORDER OPTIMIZED BY GOOGLE MAPS`;
}

/**
 * Step 10 — Suggested Replacement Generator
 * Finds a suitable candidate replacement with an explicit explainable reason
 * Never replaces automatically; returns candidate for user confirmation ([KEEP CURRENT] vs [REPLACE])
 */
export function getReplacementSuggestion(
  currentSchool: SchoolData,
  allCandidates: CandidateSchool[],
  selectedSchoolIds: string[]
): { suggestedSchool: CandidateSchool; reason: string } | null {
  const unselected = allCandidates.filter(
    (c) => !selectedSchoolIds.includes(c.id) && c.id !== currentSchool.id
  );

  if (unselected.length === 0) return null;

  // Reason 1: Current school already visited
  if (currentSchool.visited_by_current_user || currentSchool.visit_status === 'VISITED') {
    return {
      suggestedSchool: unselected[0],
      reason: 'Completed / Current school has already been visited by representative',
    };
  }

  // Reason 2: Duplicate school
  const countInSelection = selectedSchoolIds.filter((id) => id === currentSchool.id).length;
  if (countInSelection > 1) {
    return {
      suggestedSchool: unselected[0],
      reason: 'Duplicate / School appears multiple times in current day circuit',
    };
  }

  // Reason 3: Outside selected category
  const isCurrentEarly = ['PRE-SCHOOL', 'PLAY SCHOOL', 'NURSERY', 'MONTESSORI', 'KINDERGARTEN'].includes(
    currentSchool.school_type?.toUpperCase()
  );
  const bestEarly = unselected.find((c) =>
    ['PRE-SCHOOL', 'PLAY SCHOOL', 'NURSERY', 'MONTESSORI', 'KINDERGARTEN'].includes(
      c.school_type?.toUpperCase()
    )
  );
  if (!isCurrentEarly && bestEarly) {
    return {
      suggestedSchool: bestEarly,
      reason: 'Outside selected category / Candidate is an unvisited Small & Early-Years school',
    };
  }

  // Reason 4: Higher priority score candidate in closer cluster
  const topCandidate = unselected[0];
  const currentScore = (currentSchool as CandidateSchool).recommendationScore || 50;

  return {
    suggestedSchool: topCandidate,
    reason: `Higher priority score (${topCandidate.recommendationScore} pts vs ${currentScore} pts) and closer proximity to PG base`,
  };
}
