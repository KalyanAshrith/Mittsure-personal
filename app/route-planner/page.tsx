'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Route,
  Navigation,
  Bike,
  Sparkles,
  MapPin,
  Calendar,
  CheckCircle2,
  Filter,
  Layers,
  ArrowRight,
  ExternalLink,
  RotateCcw,
  Check,
  Compass,
  Lock,
  Unlock,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronUp,
  X,
  FileCheck,
  AlertCircle,
  HelpCircle,
  Lightbulb,
  Phone,
  Mail,
  User,
  ShieldAlert,
  Info,
} from 'lucide-react';
import RouteMap from '@/components/RouteMap';
import RecordVisitModal from '@/components/RecordVisitModal';
import NearbySchoolsModal from '@/components/NearbySchoolsModal';
import EveningWrapUpModal from '@/components/EveningWrapUpModal';
import AIMarkVisitedModal from '@/components/AIMarkVisitedModal';
import {
  SchoolRecommendationEngine,
  CandidateSchool,
  getVerifiedProductRecommendation,
  generatePlanExplanation,
  getReplacementSuggestion,
  ScoreBreakdown,
  isStateOrPreSchool,
  isCbseOrIcseSchool,
} from '@/lib/recommendationEngine';
import { RouteOptimizationResult, SchoolData, TravelMode } from '@/lib/types';
import { notifyDataChange, subscribeToDataChanges } from '@/lib/realtimeSync';

export default function RoutePlannerPage() {
  const [allSchools, setAllSchools] = useState<SchoolData[]>([]);
  const [candidates, setCandidates] = useState<CandidateSchool[]>([]);
  const [selectedSchoolIds, setSelectedSchoolIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<RouteOptimizationResult | null>(null);
  const [planSavedMessage, setPlanSavedMessage] = useState('');
  const [optimizationError, setOptimizationError] = useState('');

  // Existing plan & lock state
  const [hasExistingPlan, setHasExistingPlan] = useState(false);
  const [existingPlanData, setExistingPlanData] = useState<any>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [planMode, setPlanMode] = useState<'VIEW' | 'EDIT' | 'NEW'>('VIEW');
  const [showPlanProtectionBanner, setShowPlanProtectionBanner] = useState(false);

  // 100-Point Score Debug Inspection
  const [inspectScoreSchoolId, setInspectScoreSchoolId] = useState<string | null>(null);

  // Step 10: Suggested Replacement Dialog State
  const [replacementModalData, setReplacementModalData] = useState<{
    current: SchoolData;
    suggested: CandidateSchool;
    reason: string;
  } | null>(null);

  // AI Route Advice State
  const [aiAdvice, setAiAdvice] = useState<{
    id: string;
    title: string;
    explanation: string;
    suggestedOrder?: string[];
  } | null>(null);

  // Nearby Schools, Evening Wrap-Up & AI Mark Visited Modals
  const [isNearbyModalOpen, setIsNearbyModalOpen] = useState(false);
  const [isEveningWrapUpOpen, setIsEveningWrapUpOpen] = useState(false);
  const [isAiMarkVisitedOpen, setIsAiMarkVisitedOpen] = useState(false);

  // Date management: default tomorrow (or Monday if tomorrow is Sunday)
  const [date, setDate] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const qDate = new URLSearchParams(window.location.search).get('date');
      if (qDate && /^\d{4}-\d{2}-\d{2}$/.test(qDate)) return qDate;
    }
    const d = new Date();
    d.setDate(d.getDate() + 1); // default tomorrow
    if (d.getDay() === 0) {
      // If Sunday, skip to Monday!
      d.setDate(d.getDate() + 1);
    }
    return d.toISOString().split('T')[0];
  });

  // Day calculations
  const { isSunday, isSaturday, dayName, formattedDateString, workdayType } = useMemo(() => {
    if (!date) {
      return {
        isSunday: false,
        isSaturday: false,
        dayName: 'Monday',
        formattedDateString: '',
        workdayType: 'FULL WORKING DAY',
      };
    }
    const [year, month, day] = date.split('-').map(Number);
    const parsed = new Date(year, month - 1, day);
    const dayOfWeek = parsed.getDay();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];

    const dName = dayNames[dayOfWeek];
    const mName = monthNames[month - 1];
    const formatted = `${dName.toUpperCase()} • ${day} ${mName.toUpperCase()} ${year}`;

    let wType = 'FULL WORKING DAY (7 SCHOOLS DAILY TARGET)';
    if (dayOfWeek === 0) wType = 'WEEKLY HOLIDAY (NO VISITS)';
    else if (dayOfWeek === 6) wType = 'HALF DAY (MAX 6 SCHOOLS)';

    return {
      isSunday: dayOfWeek === 0,
      isSaturday: dayOfWeek === 6,
      dayName: dName,
      formattedDateString: formatted,
      workdayType: wType,
    };
  }, [date]);

  // Target count: 7 schools daily default (max 6 on Saturday half-day)
  const [targetCount, setTargetCount] = useState<number>(7);
  const [preset, setPreset] = useState('Balanced');
  const [boardFilter, setBoardFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [areaFilter, setAreaFilter] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const qArea = new URLSearchParams(window.location.search).get('area');
      if (qArea) return qArea;
    }
    return 'ALL';
  });
  const [visitFilter, setVisitFilter] = useState('NOT_VISITED');
  const [travelMode, setTravelMode] = useState<TravelMode>('TWO_WHEELER');
  const [areas, setAreas] = useState<string[]>([]);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Available areas sorted alphabetically with counts
  const availableAreas = useMemo(() => {
    return Array.from(new Set(allSchools.map((s) => s.area))).filter(Boolean).sort();
  }, [allSchools]);

  const areaCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of allSchools) {
      if (s.area) counts[s.area] = (counts[s.area] || 0) + 1;
    }
    return counts;
  }, [allSchools]);

  // Base Location (Default user PG Bogadi 2nd Stage)
  const [baseAddress, setBaseAddress] = useState(
    '661, Sahukar Chennaiah Road, Janatha Nagar, Bogadi 2nd Stage, TK Layout, Mysuru 570009'
  );
  const [baseLat, setBaseLat] = useState(12.3021);
  const [baseLng, setBaseLng] = useState(76.6178);

  // Modal for logging visit
  const [selectedSchoolForVisit, setSelectedSchoolForVisit] = useState<SchoolData | null>(null);
  const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);

  // 1-Click Quick Toggle
  const handleQuickToggle = async (school: SchoolData) => {
    const isVisited = Boolean(school.visited_by_current_user || school.visit_status === 'VISITED');
    const nextVisited = !isVisited;
    setTogglingId(school.id);

    try {
      const res = await fetch('/api/schools/quick-toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_id: school.id,
          visited: nextVisited,
        }),
      });

      if (res.ok) {
        setAllSchools((prev) =>
          prev.map((s) =>
            s.id === school.id
              ? {
                  ...s,
                  visited_by_current_user: nextVisited,
                  visit_status: nextVisited ? 'VISITED' : 'NOT VISITED',
                }
              : s
          )
        );
        notifyDataChange('visit', school.id);
      } else {
        const err = await res.json();
        alert(`Failed to update status: ${err.error || 'Server error'}`);
      }
    } catch (err) {
      console.error('Failed to toggle status:', err);
      alert('Failed to connect to server.');
    } finally {
      setTogglingId(null);
    }
  };

  // Load schools & settings initially
  useEffect(() => {
    async function loadInitialData() {
      try {
        setLoading(true);
        const [schoolsRes, settingsRes] = await Promise.all([
          fetch('/api/schools', { cache: 'no-store' }),
          fetch('/api/settings', { cache: 'no-store' }),
        ]);

        const schoolsJson = await schoolsRes.json();
        const settingsJson = await settingsRes.json();

        if (schoolsJson.schools) {
          setAllSchools(schoolsJson.schools);
          setAreas(schoolsJson.areas || []);
        }

        if (settingsJson.settings) {
          setBaseAddress(settingsJson.settings.base_address);
          setBaseLat(settingsJson.settings.base_latitude);
          setBaseLng(settingsJson.settings.base_longitude);
          setTravelMode(settingsJson.settings.preferred_travel_mode || 'TWO_WHEELER');
        }
      } catch (err) {
        console.error('Error loading initial data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadInitialData();

    const unsubscribe = subscribeToDataChanges(async (entity) => {
      if (entity === 'visit' || entity === 'route') {
        const schoolsRes = await fetch('/api/schools', { cache: 'no-store' });
        const schoolsJson = await schoolsRes.json();
        if (schoolsJson.schools) {
          setAllSchools(schoolsJson.schools);
          checkExistingPlanForDate(date, schoolsJson.schools);
        }
      }
    });

    return () => unsubscribe();
  }, [date]);

  // Check and load existing plan for current date
  const checkExistingPlanForDate = useCallback(
    async (planDate: string, schoolsList: SchoolData[]) => {
      try {
        const res = await fetch(`/api/routes/${planDate}`, { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          if (json.routePlan && json.routePlan.stops && json.routePlan.stops.length > 0) {
            const plan = json.routePlan;
            const todayStr = new Date().toISOString().split('T')[0];
            const activeStops = planDate >= todayStr
              ? plan.stops.filter((s: any) => !s.school?.visited_by_current_user || s.status === 'VISITED')
              : plan.stops;
            const stopSchoolIds: string[] = activeStops.map((s: any) => s.school.id);
            setHasExistingPlan(true);
            setExistingPlanData({ ...plan, stops: activeStops });
            setIsLocked(Boolean(plan.is_locked));
            setShowPlanProtectionBanner(true);
            setSelectedSchoolIds(stopSchoolIds);

            // Reconstruct optimization result so map & metrics show immediately
            setOptimizationResult({
              travelMode: (plan.travel_mode as TravelMode) || 'TWO_WHEELER',
              optimizedOrder: stopSchoolIds,
              optimizedIndices: stopSchoolIds.map((_: string, idx: number) => idx),
              legs: activeStops.map((st: any, i: number) => ({
                fromName: i === 0 ? 'PG Base' : activeStops[i - 1].school.school_name,
                toName: st.school.school_name,
                distanceMeters: (st.leg_distance_km || 2) * 1000,
                distanceKm: st.leg_distance_km || 2,
                durationSeconds: (st.leg_duration_minutes || 6) * 60,
                durationFormatted: `${st.leg_duration_minutes || 6} mins`,
              })),
              totalDistanceMeters: plan.total_distance_meters || 15000,
              totalDistanceKm: plan.total_distance_km || 15,
              totalDurationSeconds: plan.total_duration_seconds || 2400,
              totalDurationFormatted: plan.total_duration_formatted || '40 mins',
              isSimulated: false,
              googleMapsDirectionsUrl: `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
                plan.origin
              )}&destination=${encodeURIComponent(plan.destination)}&waypoints=${stopSchoolIds
                .map((id) => {
                  const s = schoolsList.find((sc) => sc.id === id);
                  return s ? `${s.latitude},${s.longitude}` : '';
                })
                .filter(Boolean)
                .join('|')}&travelmode=motorcycle`,
            });
            return true;
          }
        }
      } catch (err) {
        console.warn('No existing plan or failed fetch for date:', planDate, err);
      }
      setHasExistingPlan(false);
      setExistingPlanData(null);
      setIsLocked(false);
      setShowPlanProtectionBanner(false);
      return false;
    },
    []
  );

  // When date or allSchools change, check for existing plan or area override
  useEffect(() => {
    if (allSchools.length === 0 || !date) return;

    let isMounted = true;
    (async () => {
      const qArea = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('area') : null;
      const foundPlan = await checkExistingPlanForDate(date, allSchools);
      if (!isMounted) return;

      // If an area parameter is passed from Area Divide OR no existing plan is found, seed candidates
      if (qArea || !foundPlan) {
        const activeArea = qArea || areaFilter;
        if (qArea && qArea !== areaFilter) {
          setAreaFilter(qArea);
        }

        const quotaResult = SchoolRecommendationEngine.recommendQuotaSchools(
          allSchools,
          {
            baseLat,
            baseLng,
            targetCount: isSaturday ? 5 : targetCount,
            board: boardFilter,
            schoolType: typeFilter,
            area: activeArea,
            visitStatus: visitFilter,
            preset,
            isSaturday,
            isSunday,
          },
          {
            stateOrPreSchool: isSaturday ? 3 : 5,
            cbseOrIcse: 2,
          }
        );
        setCandidates(quotaResult.candidates);

        // Auto-select initial target stops if not Sunday
        if (!isSunday) {
          const topIds = quotaResult.selectedSchools.map((s) => s.id);
          setSelectedSchoolIds(topIds);
        } else {
          setSelectedSchoolIds([]);
        }
        setOptimizationResult(null);

        if (qArea) {
          setPlanSavedMessage(
            `Area "${qArea}" selected from Area-Wise Planning. Loaded unvisited candidate schools from ${qArea}. Click "OPTIMIZE ROUND TRIP" to route from PG Base.`
          );
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [date, allSchools, baseLat, baseLng, isSunday, isSaturday, checkExistingPlanForDate]);

  // Recalculate candidates list ONLY (do NOT overwrite selectedSchoolIds)
  useEffect(() => {
    if (allSchools.length === 0) return;

    const quotaResult = SchoolRecommendationEngine.recommendQuotaSchools(
      allSchools,
      {
        baseLat,
        baseLng,
        targetCount: isSaturday ? 5 : targetCount,
        board: boardFilter,
        schoolType: typeFilter,
        area: areaFilter,
        visitStatus: visitFilter,
        preset,
        isSaturday,
        isSunday,
      },
      {
        stateOrPreSchool: isSaturday ? 3 : 5,
        cbseOrIcse: 2,
      }
    );
    setCandidates(quotaResult.candidates);
  }, [
    allSchools,
    baseLat,
    baseLng,
    targetCount,
    isSaturday,
    boardFilter,
    typeFilter,
    areaFilter,
    visitFilter,
    preset,
  ]);

  // Generate contextual AI Route Advice based on current selection
  useEffect(() => {
    if (selectedSchoolIds.length < 2) {
      setAiAdvice(null);
      return;
    }

    const selected = selectedSchoolIds
      .map((id) => allSchools.find((s) => s.id === id))
      .filter((s): s is SchoolData => Boolean(s));

    // Check if multiple schools belong to same cluster (e.g., Bogadi or Saraswathipuram)
    const areaCounts: Record<string, number> = {};
    for (const sc of selected) {
      areaCounts[sc.area] = (areaCounts[sc.area] || 0) + 1;
    }

    const dominantArea = Object.entries(areaCounts).find(([_, count]) => count >= 2);
    if (dominantArea) {
      const [areaName, count] = dominantArea;
      setAiAdvice({
        id: `cluster-${areaName}-${selectedSchoolIds.length}`,
        title: `Cluster Synergy: ${count} Schools in ${areaName}`,
        explanation: `Prioritizing the ${count} schools in ${areaName} consecutively avoids heavy afternoon cross-city traffic and leaves composite schools for post-lunch principal meetings.`,
        suggestedOrder: [
          ...selected.filter((s) => s.area === areaName).map((s) => s.id),
          ...selected.filter((s) => s.area !== areaName).map((s) => s.id),
        ],
      });
    } else {
      setAiAdvice({
        id: `balance-distance-${selectedSchoolIds.length}`,
        title: 'Geographic Circuit Optimization',
        explanation:
          'Current selection spans across distinct Mysuru zones. Recommended round-trip ordering starts with the furthest school and loops back via Bogadi base.',
      });
    }
  }, [selectedSchoolIds, allSchools]);

  // Toggle school selection
  const toggleSelectSchool = (schoolId: string) => {
    if (isLocked) {
      alert('Plan is locked. Click "Edit Plan" to modify your school stops.');
      return;
    }
    if (isSunday) {
      alert('Sunday is a weekly holiday. No school visits can be scheduled on Sundays.');
      return;
    }

    setSelectedSchoolIds((prev) => {
      if (prev.includes(schoolId)) {
        return prev.filter((id) => id !== schoolId);
      } else {
        if (isSaturday && prev.length >= 5) {
          alert('Saturday is a half-day. Maximum recommended route is 5 schools.');
        } else if (prev.length >= 10) {
          alert('Maximum 10 stops recommended for a single day two-wheeler circuit.');
          return prev;
        }
        return [...prev, schoolId];
      }
    });
    setOptimizationResult(null);
    setPlanSavedMessage('');
    setOptimizationError('');
  };

  // Add a nearby school to the route circuit
  const handleAddNearbySchool = (school: SchoolData) => {
    if (isLocked) {
      alert('Plan is locked. Please unlock or click "Edit Plan" before adding schools.');
      return;
    }
    if (selectedSchoolIds.includes(school.id)) {
      alert(`"${school.school_name}" is already in today's route circuit.`);
      return;
    }
    if (isSaturday && selectedSchoolIds.length >= 5) {
      const proceed = confirm(
        'Warning: Saturday is a half-day and adding this school exceeds 5 stops. Proceed anyway?'
      );
      if (!proceed) return;
    } else if (selectedSchoolIds.length >= 10) {
      alert('Maximum 10 stops recommended for a single day two-wheeler circuit.');
      return;
    }

    setSelectedSchoolIds((prev) => [...prev, school.id]);
    setOptimizationResult(null);
    setPlanSavedMessage(`Added "${school.school_name}" to route. Click "OPTIMIZE ROUND TRIP" to update circuit.`);
  };

  // Quota breakdown counts for selected schools
  const selectedStateOrPreCount = useMemo(() => {
    return selectedSchoolIds
      .map((id) => allSchools.find((s) => s.id === id))
      .filter((s): s is SchoolData => Boolean(s && isStateOrPreSchool(s))).length;
  }, [selectedSchoolIds, allSchools]);

  const selectedCbseIcseCount = useMemo(() => {
    return selectedSchoolIds
      .map((id) => allSchools.find((s) => s.id === id))
      .filter((s): s is SchoolData => Boolean(s && isCbseOrIcseSchool(s))).length;
  }, [selectedSchoolIds, allSchools]);

  // Select 5 State/Pre-school + 2 CBSE/ICSE Quota
  const handleSelectQuotaSchools = () => {
    if (isLocked) {
      alert('Plan is locked. Click "Edit Plan" to modify your school stops.');
      return;
    }
    if (isSunday) {
      alert('Sunday is a weekly holiday. No school visits can be scheduled on Sundays.');
      return;
    }
    const quotaResult = SchoolRecommendationEngine.recommendQuotaSchools(
      allSchools,
      {
        baseLat,
        baseLng,
        targetCount: isSaturday ? 5 : targetCount,
        board: boardFilter,
        schoolType: typeFilter,
        area: areaFilter,
        visitStatus: visitFilter,
        preset,
        isSaturday,
        isSunday,
      },
      {
        stateOrPreSchool: isSaturday ? 3 : 5,
        cbseOrIcse: 2,
      }
    );
    setSelectedSchoolIds(quotaResult.selectedSchools.map((s) => s.id));
    setOptimizationResult(null);
    setPlanSavedMessage(
      isSaturday
        ? 'Applied Saturday Quota: Selected 3 State/Pre-schools and 2 CBSE/ICSE schools (5 total). Click "OPTIMIZE ROUND TRIP" to route.'
        : `Applied 5+2 Quota: Selected 5 State/Pre-schools and 2 CBSE/ICSE schools. Click "OPTIMIZE ROUND TRIP" to route.`
    );
    setOptimizationError('');
  };

  // Reset to top candidates
  const handleSelectTopCandidates = () => {
    if (isLocked) {
      alert('Plan is locked. Click "Edit Plan" to modify your school stops.');
      return;
    }
    const maxStops = isSaturday ? 5 : targetCount;
    const topIds = candidates.slice(0, maxStops).map((s) => s.id);
    setSelectedSchoolIds(topIds);
    setOptimizationResult(null);
    setPlanSavedMessage('');
    setOptimizationError('');
  };

  // Optimize Round Trip (passes ONLY selected schools)
  const handleOptimizeRoundTrip = async (saveDirectly: boolean = false) => {
    if (isSunday) {
      alert('Sunday is your weekly holiday. Route optimization is disabled.');
      return;
    }

    if (selectedSchoolIds.length === 0) {
      alert('Please select at least 1 school stop.');
      return;
    }

    if (isSaturday && selectedSchoolIds.length > 5) {
      const proceed = confirm(
        'Warning: Saturday is a half-day and you have selected more than 5 schools. Proceed anyway?'
      );
      if (!proceed) return;
    }

    setIsOptimizing(true);
    setPlanSavedMessage('');
    setOptimizationError('');

    try {
      const res = await fetch('/api/routes/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: { address: baseAddress, lat: baseLat, lng: baseLng },
          destination: { address: baseAddress, lat: baseLat, lng: baseLng },
          intermediateSchoolIds: selectedSchoolIds, // Strictly selected schools only
          travelMode,
          date,
          savePlan: saveDirectly,
          is_locked: isLocked,
          forceUnlock: !isLocked,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to optimize route');
      }

      setOptimizationResult(json.optimization);
      if (saveDirectly) {
        setHasExistingPlan(true);
        setPlanSavedMessage(`Route plan successfully saved to your calendar for ${date}!`);
        notifyDataChange('route', { date });
      }
    } catch (err: any) {
      console.error('Route optimization error:', err);
      setOptimizationError('Route optimization unavailable. Preserving original selection.');

      // Fallback: preserve original selection without substituting any school
      const selected = selectedSchoolIds
        .map((id) => allSchools.find((s) => s.id === id))
        .filter((s): s is SchoolData => Boolean(s));

      const fallbackDistanceKm = Number((selected.length * 2.8 + 4.2).toFixed(1));
      const fallbackDurationMins = Math.round(selected.length * 8 + 15);

      setOptimizationResult({
        travelMode,
        optimizedOrder: selectedSchoolIds,
        optimizedIndices: selectedSchoolIds.map((_: string, idx: number) => idx),
        legs: selected.map((school, i) => ({
          fromName: i === 0 ? 'PG Base' : selected[i - 1].school_name,
          toName: school.school_name,
          distanceMeters: Math.round(2800),
          distanceKm: 2.8,
          durationSeconds: 8 * 60,
          durationFormatted: '8 mins',
        })),
        totalDistanceMeters: Math.round(fallbackDistanceKm * 1000),
        totalDistanceKm: fallbackDistanceKm,
        totalDurationSeconds: fallbackDurationMins * 60,
        totalDurationFormatted: `${fallbackDurationMins} mins`,
        isSimulated: true,
        googleMapsDirectionsUrl: `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
          baseAddress
        )}&destination=${encodeURIComponent(baseAddress)}&waypoints=${selected
          .map((s) => `${s.latitude},${s.longitude}`)
          .join('|')}&travelmode=motorcycle`,
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  // Lock / Unlock Plan
  const handleToggleLock = async () => {
    const nextLocked = !isLocked;
    setIsLocked(nextLocked);

    try {
      await fetch(`/api/routes/${date}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_locked: nextLocked }),
      });
      notifyDataChange('route', { date, isLocked: nextLocked });
      setPlanSavedMessage(
        nextLocked ? '🔒 Plan locked! Modifications disabled.' : 'Plan unlocked for editing.'
      );
    } catch (err) {
      console.error('Error toggling lock:', err);
    }
  };

  // Saturday Trim action: [Optimize to 5]
  const handleTrimSaturdayToFive = () => {
    if (selectedSchoolIds.length > 5) {
      setSelectedSchoolIds(selectedSchoolIds.slice(0, 5));
      setOptimizationResult(null);
      setPlanSavedMessage('Trimmed to recommended maximum of 5 schools for Saturday half-day.');
    }
  };

  // Sunday switch to Monday
  const handlePlanMonday = () => {
    const [year, month, day] = date.split('-').map(Number);
    const targetDate = new Date(year, month - 1, day);
    const dayOfWeek = targetDate.getDay();
    const daysToAdd = dayOfWeek === 0 ? 1 : (8 - dayOfWeek) % 7 || 1;
    targetDate.setDate(targetDate.getDate() + daysToAdd);
    const y = targetDate.getFullYear();
    const m = String(targetDate.getMonth() + 1).padStart(2, '0');
    const d = String(targetDate.getDate()).padStart(2, '0');
    setDate(`${y}-${m}-${d}`);
  };

  // Apply AI Suggestion (Requires manual user click)
  const handleApplyAiSuggestion = () => {
    if (!aiAdvice || !aiAdvice.suggestedOrder) return;
    if (isLocked) {
      alert('Plan is locked. Click "Edit Plan" before applying suggestions.');
      return;
    }
    setSelectedSchoolIds(aiAdvice.suggestedOrder);
    setOptimizationResult(null);
    setPlanSavedMessage('AI cluster suggestion applied to candidate order.');
  };

  // Step 10: Open Suggested Replacement Modal
  const handleOpenReplacementModal = (currentSchool: SchoolData) => {
    const suggestion = getReplacementSuggestion(currentSchool, candidates, selectedSchoolIds);
    if (!suggestion) {
      alert('No replacement candidates currently available in unselected candidate pool.');
      return;
    }
    setReplacementModalData({
      current: currentSchool,
      suggested: suggestion.suggestedSchool,
      reason: suggestion.reason,
    });
  };

  const handleKeepCurrentSchool = () => {
    setReplacementModalData(null);
  };

  const handleConfirmReplacement = (currentId: string, suggestedId: string) => {
    if (isLocked) {
      alert('Plan is locked. Click "Edit Plan" before replacing stops.');
      return;
    }
    setSelectedSchoolIds((prev) => prev.map((id) => (id === currentId ? suggestedId : id)));
    setReplacementModalData(null);
    setOptimizationResult(null);
    setPlanSavedMessage('Candidate school replaced. Click "OPTIMIZE ROUND TRIP" to compute optimal route.');
  };

  // Plan Protection Actions
  const handleKeepExistingPlan = () => {
    setShowPlanProtectionBanner(false);
    setPlanMode('VIEW');
  };

  const handleEditExistingPlan = async () => {
    setIsLocked(false);
    setShowPlanProtectionBanner(false);
    setPlanMode('EDIT');
    try {
      await fetch(`/api/routes/${date}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_locked: false }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateNewPlan = () => {
    const confirmDiscard = confirm(
      `Are you sure you want to discard the existing plan for ${date} and create a fresh one?`
    );
    if (!confirmDiscard) return;

    setShowPlanProtectionBanner(false);
    setHasExistingPlan(false);
    setIsLocked(false);
    setPlanMode('NEW');

    // Seed from candidates
    const maxStops = isSaturday ? 5 : targetCount;
    const topIds = candidates.slice(0, maxStops).map((s) => s.id);
    setSelectedSchoolIds(topIds);
    setOptimizationResult(null);
    setPlanSavedMessage('');
  };

  // Selected school objects
  const selectedSchools = selectedSchoolIds
    .map((id) => allSchools.find((s) => s.id === id))
    .filter((s): s is SchoolData => Boolean(s));

  // Displayed stops in optimized order
  const displayedStops =
    optimizationResult && optimizationResult.optimizedOrder
      ? optimizationResult.optimizedOrder
          .map((id) => allSchools.find((s) => s.id === id))
          .filter((s): s is SchoolData => Boolean(s))
      : selectedSchools;

  // Estimated field time calculation: travel duration + 35 min per school visit
  const estimatedFieldTime = useMemo(() => {
    const travelMins = optimizationResult?.totalDurationSeconds
      ? Math.round(optimizationResult.totalDurationSeconds / 60)
      : displayedStops.length * 8;
    const visitMins = displayedStops.length * 35;
    const totalMins = travelMins + visitMins;
    const hours = (totalMins / 60).toFixed(1);
    return `~${hours} hrs total`;
  }, [optimizationResult, displayedStops.length]);

  return (
    <div className="space-y-6 pb-16">
      {/* HEADER SECTION: Date • Weekday • Workday Type */}
      <div className="glass-panel rounded-3xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-black px-2.5 py-1 rounded-xl bg-[#0F1B31] text-white tracking-wide shadow-xs">
                {dayName.toUpperCase()}
              </span>
              <span className="text-xs font-bold text-[#59627E] uppercase tracking-wider">
                {formattedDateString}
              </span>
              <span
                className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                  isSunday
                    ? 'bg-rose-100 text-rose-800'
                    : isSaturday
                    ? 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse motion-reduce:animate-none'
                    : 'bg-emerald-100 text-emerald-900'
                }`}
              >
                {workdayType}
              </span>

              {isLocked && (
                <span className="inline-flex items-center gap-1.5 text-xs font-black px-2.5 py-0.5 rounded-full bg-[#0F1B31] text-white shadow-xs">
                  <Lock className="w-3 h-3 text-emerald-400" />
                  <span>🔒 PLAN LOCKED</span>
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-[#020C21] tracking-tight">
              Daily Route Planner & Optimization
            </h1>
            <p className="text-xs sm:text-sm text-[#59627E] font-medium">
              Two-wheeler circuit starting and ending at PG Base (Bogadi 2nd Stage). Strict master
              allotment of 487 schools.
            </p>
          </div>

          {/* Quick Header Summary Metrics */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap text-xs">
            <div className="p-2.5 rounded-2xl glass-card text-center min-w-[85px]">
              <span className="text-[10px] uppercase text-[#59627E] block font-bold">Stops</span>
              <span className="text-base font-light text-[#020C21] font-mono">
                {displayedStops.length} Schools
              </span>
            </div>

            <div className="p-2.5 rounded-2xl glass-card text-center min-w-[95px]">
              <span className="text-[10px] uppercase text-[#59627E] block font-bold">Distance</span>
              <span className="text-base font-light text-emerald-700 font-mono">
                {optimizationResult?.totalDistanceKm || (displayedStops.length * 2.8).toFixed(1)} km
              </span>
            </div>

            <div className="p-2.5 rounded-2xl glass-card text-center min-w-[95px]">
              <span className="text-[10px] uppercase text-[#59627E] block font-bold">Travel Time</span>
              <span className="text-base font-light text-[#020C21] font-mono">
                {optimizationResult?.totalDurationFormatted || `${displayedStops.length * 8} mins`}
              </span>
            </div>

            <div className="p-2.5 rounded-2xl glass-card bg-emerald-50/30 text-center min-w-[105px]">
              <span className="text-[10px] uppercase text-emerald-800 block font-bold">
                Est. Field Time
              </span>
              <span className="text-base font-light text-emerald-900 font-mono">{estimatedFieldTime}</span>
            </div>
          </div>
        </div>
      </div>

      {/* PLAN CHANGE PROTECTION BANNER */}
      {showPlanProtectionBanner && hasExistingPlan && existingPlanData && (
        <div className="p-4 sm:p-5 bg-indigo-50/90 border-2 border-indigo-300 rounded-3xl text-indigo-950 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold flex-shrink-0">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-black text-sm text-indigo-950">
                  Existing Saved Route Plan Detected ({existingPlanData.stops?.length || 0} Schools)
                </p>
                {isLocked && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-indigo-200 text-indigo-900">
                    LOCKED
                  </span>
                )}
              </div>
              <p className="text-xs text-indigo-800 mt-0.5">
                A verified route plan is already configured in your database for {date}. Your planned
                schools will NOT be overwritten without your explicit confirmation.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-start md:self-auto flex-shrink-0">
            <button
              type="button"
              onClick={handleKeepExistingPlan}
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-sm transition active:scale-95"
            >
              KEEP EXISTING PLAN
            </button>
            <button
              type="button"
              onClick={handleEditExistingPlan}
              className="px-3 py-2 bg-white border border-indigo-300 hover:bg-indigo-100 text-indigo-900 font-bold text-xs rounded-xl transition"
            >
              EDIT PLAN
            </button>
            <button
              type="button"
              onClick={handleCreateNewPlan}
              className="px-3 py-2 bg-rose-50 border border-rose-300 hover:bg-rose-100 text-rose-800 font-bold text-xs rounded-xl transition"
            >
              CREATE NEW PLAN
            </button>
          </div>
        </div>
      )}

      {/* SUNDAY WEEKLY HOLIDAY CARD */}
      {isSunday && (
        <div className="bg-gradient-to-b from-emerald-50/90 to-teal-50/70 border-2 border-emerald-300 rounded-3xl p-8 sm:p-12 text-center max-w-2xl mx-auto shadow-sm my-6 space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-emerald-200 text-emerald-800 flex items-center justify-center mx-auto text-3xl shadow-inner animate-bounce motion-reduce:animate-none">
            🌿
          </div>
          <div>
            <span className="inline-block px-3.5 py-1 rounded-full text-xs font-black tracking-wider uppercase bg-emerald-200 text-emerald-900 mb-2">
              Weekly Holiday
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
              Sunday is your weekly holiday
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto mt-2 leading-relaxed">
              No school visits or route circuits are scheduled today. Weekly non-working days are
              completely excluded from representative performance targets and productivity averages.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/90 border border-emerald-200 max-w-sm mx-auto text-xs text-slate-700 shadow-sm">
            Next working day: <strong className="text-emerald-900 font-black">Monday, 7 September 2026</strong>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={handlePlanMonday}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-sm shadow-md shadow-emerald-600/20 transition"
            >
              <span>PLAN MONDAY</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* SATURDAY HALF-DAY WARNING BANNER (When > 5 schools selected) */}
      {!isSunday && isSaturday && selectedSchoolIds.length > 5 && (
        <div className="p-4 bg-amber-50 border-2 border-amber-400 rounded-3xl text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black flex-shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm text-amber-950">
                Half-day limit exceeded. Saturday is a half-day. Maximum recommended route is 5 schools.
              </p>
              <p className="text-xs text-amber-800 mt-0.5">
                You have {selectedSchoolIds.length} schools selected. Visiting more than 5 schools on
                Saturday risks arriving after school closing hours.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleTrimSaturdayToFive}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs rounded-xl shadow-sm transition active:scale-95 self-start sm:self-auto flex-shrink-0"
          >
            Optimize to 5
          </button>
        </div>
      )}

      {/* NOTIFICATIONS & ALERTS */}
      {planSavedMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs font-bold flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>{planSavedMessage}</span>
          </div>
          <Link
            href="/field-mode"
            className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-black hover:bg-emerald-700 transition"
          >
            Launch Field Mode
          </Link>
        </div>
      )}

      {optimizationError && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>{optimizationError}</span>
        </div>
      )}

      {/* AI ROUTE ADVICE CARD (Requires manual Apply Suggestion) */}
      {!isSunday && aiAdvice && (
        <div className="bg-gradient-to-r from-emerald-900 to-slate-900 text-white rounded-3xl p-4 sm:p-5 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center flex-shrink-0 font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400">
                  AI ROUTE ADVICE
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                  Manual Apply Only
                </span>
              </div>
              <h4 className="text-sm font-bold text-white mt-0.5">{aiAdvice.title}</h4>
              <p className="text-xs text-slate-300 mt-0.5 max-w-2xl">{aiAdvice.explanation}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 self-start sm:self-auto">
            {aiAdvice.suggestedOrder && (
              <button
                type="button"
                onClick={handleApplyAiSuggestion}
                disabled={isLocked}
                className="px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-sm transition disabled:opacity-40"
              >
                Apply Suggestion
              </button>
            )}
            <button
              type="button"
              onClick={() => setAiAdvice(null)}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition"
            >
              Ignore
            </button>
          </div>
        </div>
      )}

      {/* WORKFLOW CONTROLS PANEL (Hidden on Sunday) */}
      {!isSunday && (
        <div className="glass-panel rounded-3xl p-5 shadow-sm space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {/* Base Location */}
            <div>
              <label className="block font-bold text-[#59627E] uppercase tracking-wider text-[11px] mb-1.5">
                Base Origin & Return
              </label>
              <div className="p-2.5 rounded-2xl glass-card flex items-start gap-2">
                <MapPin className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold text-[#020C21] block line-clamp-1">
                    Bogadi 2nd Stage PG
                  </span>
                  <span className="text-[11px] text-[#59627E] font-medium block line-clamp-1">
                    {baseAddress}
                  </span>
                </div>
              </div>
            </div>

            {/* Date Selector */}
            <div>
              <label className="block font-bold text-[#59627E] uppercase tracking-wider text-[11px] mb-1.5">
                Route Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border border-[#DDE4EE] bg-white/80 rounded-2xl px-3 py-2 font-bold text-[#020C21] focus:ring-2 focus:ring-[#0F1B31] shadow-xs"
              />
            </div>

            {/* Target Count */}
            <div>
              <label className="block font-bold text-[#59627E] uppercase tracking-wider text-[11px] mb-1.5">
                Target Stops ({isSaturday ? 'Saturday Max 5' : 'Daily 7 Target'})
              </label>
              <div className="grid grid-cols-4 gap-1.5 font-bold">
                {(isSaturday ? [2, 3, 4, 5] : [5, 6, 7, 8]).map((num) => (
                  <button
                    key={num}
                    type="button"
                    disabled={isLocked}
                    onClick={() => {
                      setTargetCount(num);
                      const topIds = candidates.slice(0, num).map((s) => s.id);
                      setSelectedSchoolIds(topIds);
                      setOptimizationResult(null);
                    }}
                    className={`py-2 rounded-xl transition shadow-xs disabled:opacity-50 ${
                      targetCount === num
                        ? 'bg-[#0F1B31] text-white'
                        : 'bg-white/70 text-[#0F182F] hover:bg-white border border-white/80'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* Travel Mode */}
            <div>
              <label className="block font-bold text-[#59627E] uppercase tracking-wider text-[11px] mb-1.5">
                Travel Mode
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTravelMode('TWO_WHEELER')}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-2xl font-bold transition shadow-xs ${
                    travelMode === 'TWO_WHEELER'
                      ? 'bg-[#0F1B31] text-white'
                      : 'bg-white/70 text-[#0F182F] hover:bg-white border border-white/80'
                  }`}
                >
                  <Bike className="w-4 h-4 text-emerald-400" />
                  <span>Two-Wheeler</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTravelMode('DRIVE')}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-2xl font-bold transition shadow-xs ${
                    travelMode === 'DRIVE'
                      ? 'bg-[#0F1B31] text-white'
                      : 'bg-white/70 text-[#0F182F] hover:bg-white border border-white/80'
                  }`}
                >
                  <Navigation className="w-4 h-4" />
                  <span>Drive</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Outreach Presets */}
          <div className="pt-3 border-t border-white/60">
            <label className="block font-bold text-[#59627E] uppercase tracking-wider text-[11px] mb-1.5">
              Outreach Presets
            </label>
            <div className="flex items-center gap-1.5 flex-wrap text-xs">
              {[
                'Balanced',
                'Nearby Schools',
                'State Board Day',
                'CBSE Day',
                'Pre-school Day',
                'Follow-up Day',
                'Revisit Day',
              ].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPreset(p)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition shadow-xs ${
                    preset === p
                      ? 'bg-[#0F1B31] text-white'
                      : 'bg-white/70 text-[#0F182F] hover:bg-white border border-white/80'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Filter Row with AREA, CURRICULUM, CATEGORY, STATUS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
            <select
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              className="border border-[#0F1B31] bg-white font-black text-[#0F182F] rounded-xl p-2 shadow-xs transition hover:border-emerald-600 focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">📍 Area: All Areas ({allSchools.length})</option>
              {availableAreas.map((a) => (
                <option key={a} value={a}>
                  {a} ({areaCounts[a] || 0})
                </option>
              ))}
            </select>

            <select
              value={boardFilter}
              onChange={(e) => setBoardFilter(e.target.value)}
              className="border border-[#DDE4EE] bg-white/80 rounded-xl p-2 font-semibold text-[#0F182F] shadow-xs"
            >
              <option value="ALL">Curriculum Board: All</option>
              <option value="STATE BOARD">State Board</option>
              <option value="CBSE">CBSE</option>
              <option value="ICSE">ICSE</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="border border-[#DDE4EE] bg-white/80 rounded-xl p-2 font-semibold text-[#0F182F] shadow-xs"
            >
              <option value="ALL">Category: All</option>
              <option value="SMALL_AND_EARLY_YEARS">
                ★ Small & Early Years (Pre-school, Nursery, Small)
              </option>
              <option value="PRE-SCHOOL">Pre-School / Play-School Only</option>
              <option value="PRIMARY">Primary School</option>
              <option value="COMPOSITE">Composite / High School</option>
            </select>

            <select
              value={visitFilter}
              onChange={(e) => setVisitFilter(e.target.value)}
              className="border border-[#DDE4EE] bg-white/80 rounded-xl p-2 font-semibold text-[#0F182F] shadow-xs"
            >
              <option value="NOT_VISITED">Not Personally Visited (465)</option>
              <option value="ALL">All 487 Schools (Allow Revisits)</option>
              <option value="REVISIT_ONLY">Revisit Targets Only</option>
              <option value="FOLLOW_UP_ONLY">Follow-up Urgency Only</option>
            </select>
          </div>
        </div>
      )}

      {/* TWO-COLUMN WORKSPACE: Candidates List (Left) & Route Circuit + Map (Right) */}
      {!isSunday && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT COLUMN: Candidates (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="glass-panel rounded-3xl p-4 sm:p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div>
                  <h3 className="font-extrabold text-[#020C21] text-sm sm:text-base">
                    Candidate Schools
                  </h3>
                  <p className="text-xs text-[#59627E] font-medium">
                    Selected <strong className="text-emerald-700 font-bold">{selectedSchoolIds.length}</strong>{' '}
                    schools for this circuit
                  </p>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    disabled={isLocked}
                    onClick={handleSelectQuotaSchools}
                    className="btn-cta text-xs py-1.5 px-3 shadow-xs"
                    title="Auto-select 5 State/Pre-school + 2 CBSE/ICSE"
                  >
                    <span>5+2 Quota</span>
                    <span className="btn-knob w-5 h-5">
                      <Sparkles className="w-3 h-3 text-amber-300" />
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={isLocked}
                    onClick={() => setIsNearbyModalOpen(true)}
                    className="px-2.5 py-1 text-xs font-bold bg-white/70 hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl transition shadow-xs disabled:opacity-40 flex items-center gap-1"
                    title="Find schools near route stops or base"
                  >
                    <MapPin className="w-3 h-3 text-emerald-600" />
                    <span>+ Nearby</span>
                  </button>
                  <button
                    type="button"
                    disabled={isLocked}
                    onClick={handleSelectTopCandidates}
                    className="px-2.5 py-1 text-xs font-bold bg-white/70 hover:bg-white text-[#0F182F] rounded-xl border border-white/80 transition shadow-xs disabled:opacity-40"
                  >
                    Reset Top
                  </button>
                </div>
              </div>

              {/* 5+2 Quota Status Bar */}
              <div className="p-2.5 bg-white/60 border border-white/80 rounded-2xl flex items-center justify-between text-xs gap-2 flex-wrap shadow-xs">
                <div className="flex items-center gap-1.5 flex-wrap font-bold text-[11px]">
                  <span className="text-[#59627E] uppercase tracking-wider text-[10px] mr-0.5">
                    Goal:
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      selectedStateOrPreCount >= (isSaturday ? 3 : 5)
                        ? 'bg-emerald-100 text-emerald-800 font-extrabold'
                        : 'bg-amber-100 text-amber-900 font-bold'
                    }`}
                  >
                    <span>State/Pre: {selectedStateOrPreCount}/{isSaturday ? 3 : 5}</span>
                    {selectedStateOrPreCount >= (isSaturday ? 3 : 5) && <Check className="w-3 h-3" />}
                  </span>

                  <span
                    className={`px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      selectedCbseIcseCount >= 2
                        ? 'bg-indigo-100 text-indigo-800 font-extrabold'
                        : 'bg-amber-100 text-amber-900 font-bold'
                    }`}
                  >
                    <span>CBSE/ICSE: {selectedCbseIcseCount}/2</span>
                    {selectedCbseIcseCount >= 2 && <Check className="w-3 h-3" />}
                  </span>

                  <span className="px-2 py-0.5 rounded-full bg-[#0F1B31] text-white font-mono font-bold">
                    Total: {selectedSchoolIds.length}/{isSaturday ? 5 : 7}
                  </span>
                </div>

                <span
                  className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                    selectedStateOrPreCount === (isSaturday ? 3 : 5) && selectedCbseIcseCount === 2
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white text-[#59627E] border border-white/80'
                  }`}
                >
                  {selectedStateOrPreCount === (isSaturday ? 3 : 5) && selectedCbseIcseCount === 2
                    ? 'Target Met ✅'
                    : 'Balance Needed'}
                </span>
              </div>

              {isLocked && (
                <div className="p-2.5 rounded-2xl glass-card text-[#59627E] text-xs font-semibold flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#0F1B31]" />
                    <span>Plan is locked. Click &quot;Edit Plan&quot; to modify.</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleToggleLock}
                    className="px-2 py-0.5 rounded-xl bg-white border border-slate-300 text-[#020C21] font-bold hover:bg-slate-50"
                  >
                    Edit Plan
                  </button>
                </div>
              )}

              {/* Candidate List Scroll */}
              <div className="space-y-2.5 max-h-[640px] overflow-y-auto pr-1">
                {candidates.slice(0, 30).map((candidate) => {
                  const isSelected = selectedSchoolIds.includes(candidate.id);
                  const isVisited = candidate.visited_by_current_user || candidate.visit_status === 'VISITED';
                  const verifiedProduct = getVerifiedProductRecommendation(candidate);
                  const isScoreExpanded = inspectScoreSchoolId === candidate.id;

                  return (
                    <div
                      key={candidate.id}
                      className={`p-3.5 rounded-2xl transition-all duration-300 text-xs card-hover animate-fade-in ${
                        isSelected
                          ? 'glass-card border-l-4 border-l-emerald-500 bg-emerald-50/30 ring-1 ring-emerald-500/30 shadow-md'
                          : isLocked
                          ? 'glass-card opacity-80'
                          : isVisited
                          ? 'glass-card border-l-4 border-l-emerald-500'
                          : 'glass-card border-l-4 border-l-rose-500'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div
                          onClick={() => toggleSelectSchool(candidate.id)}
                          className="space-y-1 flex-1 cursor-pointer"
                        >
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono font-bold px-1.5 py-0.5 rounded-md bg-[#0F1B31] text-white text-[10px]">
                              #{candidate.s_no}
                            </span>
                            <span className="font-bold text-[10px] px-1.5 py-0.5 rounded-md bg-white/80 text-[#0F182F] border border-white/80 shadow-xs">
                              {candidate.board}
                            </span>
                            <span className="text-[10px] font-mono text-slate-700 font-bold bg-slate-100 border border-slate-200/80 px-1.5 py-0.5 rounded-md">
                              📍 {candidate.distanceFromBaseKm} km
                            </span>
                            <span className="text-[10px] font-semibold text-[#59627E] bg-white/80 px-1.5 py-0.5 rounded-md border border-[#DDE4EE]">
                              {candidate.area}
                            </span>

                            {/* 100-Point Score Badge */}
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#0F1B31] text-emerald-400 font-mono shadow-xs">
                              Score: {candidate.recommendationScore}/100
                            </span>
                          </div>

                          <h4 className="font-black text-[#020C21] line-clamp-1 text-sm mt-1">
                            {candidate.school_name}
                          </h4>

                          <p className="text-[11px] text-[#59627E] font-medium">
                            {candidate.area} • Category: {candidate.school_type || 'Unverified'}
                          </p>

                          <div className="pt-0.5 flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100/80 text-emerald-900 border border-emerald-200/60">
                              Pitch: {verifiedProduct}
                            </span>
                            {candidate.matchReasons.length > 0 && (
                              <span className="text-[10px] text-emerald-700 font-semibold">
                                ★ {candidate.matchReasons[0]}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Checkbox and quick action buttons */}
                        <div className="flex flex-col items-end gap-1.5 flex-shrink-0 pt-0.5">
                          <button
                            type="button"
                            onClick={() => toggleSelectSchool(candidate.id)}
                            className={`w-6 h-6 rounded-lg border flex items-center justify-center transition ${
                              isSelected
                                ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                                : 'border-slate-300 bg-white/80 hover:border-slate-400'
                            }`}
                            title={isSelected ? 'Remove from circuit' : 'Add to circuit'}
                          >
                            {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                          </button>

                          {/* 1-Click Quick Toggle */}
                          <button
                            type="button"
                            disabled={togglingId === candidate.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuickToggle(candidate);
                            }}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-black transition flex items-center gap-1 active:scale-95 shadow-xs ${
                              isVisited
                                ? 'bg-white/80 border border-rose-300 text-rose-700 hover:bg-rose-50'
                                : 'bg-emerald-600 text-white hover:bg-emerald-700'
                            }`}
                            title="1-Click Visit Status Toggle"
                          >
                            {togglingId === candidate.id ? (
                              '...'
                            ) : isVisited ? (
                              <>
                                <RotateCcw className="w-2.5 h-2.5" />
                                <span>Unvisit</span>
                              </>
                            ) : (
                              <>
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                                <span>✓ Visited</span>
                              </>
                            )}
                          </button>

                          {/* Quick Contact Icons */}
                          <div className="flex items-center gap-1">
                            {(candidate.phone || candidate.contact_number) && (
                              <a
                                href={`tel:${candidate.phone || candidate.contact_number}`}
                                title={`Call ${candidate.phone || candidate.contact_number}`}
                                className="p-1 rounded-lg bg-white/70 hover:bg-emerald-50 text-[#0F182F] hover:text-emerald-700 border border-white/80 transition shadow-xs"
                              >
                                <Phone className="w-3 h-3" />
                              </a>
                            )}
                            {candidate.email && (
                              <a
                                href={`mailto:${candidate.email}`}
                                title={`Email ${candidate.email}`}
                                className="p-1 rounded-lg bg-white/70 hover:bg-emerald-50 text-[#0F182F] hover:text-emerald-700 border border-white/80 transition shadow-xs"
                              >
                                <Mail className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Debug 100-Point Score Inspection Accordion */}
                      <div className="mt-2 pt-2 border-t border-white/60 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setInspectScoreSchoolId(isScoreExpanded ? null : candidate.id)}
                          className="text-[10px] font-bold text-[#59627E] hover:text-[#020C21] flex items-center gap-1 transition"
                        >
                          <Info className="w-3 h-3" />
                          <span>{isScoreExpanded ? 'Hide Score Breakdown' : 'Inspect 100-Point Score'}</span>
                          {isScoreExpanded ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                        </button>

                        <span className="text-[10px] font-mono text-[#59627E]">
                          {candidate.school_id}
                        </span>
                      </div>

                      {isScoreExpanded && candidate.scoreBreakdown && (
                        <div className="mt-2 p-2.5 rounded-xl bg-[#0F1B31] text-white space-y-1.5 font-mono text-[10px] shadow-sm">
                          <div className="flex items-center justify-between font-bold text-emerald-400 border-b border-slate-700 pb-1">
                            <span>100-POINT PRIORITY BREAKDOWN</span>
                            <span>TOTAL: {candidate.scoreBreakdown.total}/100 PTS</span>
                          </div>
                          <div className="space-y-1 text-slate-300">
                            <div className="flex justify-between">
                              <span>• Pending Status (Max 30):</span>
                              <span className="text-white font-bold">{candidate.scoreBreakdown.pendingStatus} pts</span>
                            </div>
                            <div className="flex justify-between">
                              <span>• School Category / Theme (Max 20):</span>
                              <span className="text-white font-bold">{candidate.scoreBreakdown.schoolCategory} pts</span>
                            </div>
                            <div className="flex justify-between">
                              <span>• Geographic Cluster (Max 15):</span>
                              <span className="text-white font-bold">{candidate.scoreBreakdown.geoClustering} pts</span>
                            </div>
                            <div className="flex justify-between">
                              <span>• Product Fit (Max 10):</span>
                              <span className="text-white font-bold">{candidate.scoreBreakdown.productFit} pts</span>
                            </div>
                            <div className="flex justify-between">
                              <span>• Distance from Base (Max 10):</span>
                              <span className="text-white font-bold">{candidate.scoreBreakdown.distanceFromBase} pts</span>
                            </div>
                            <div className="flex justify-between">
                              <span>• Contact / Lead Potential (Max 10):</span>
                              <span className="text-white font-bold">{candidate.scoreBreakdown.contactLeadPotential} pts</span>
                            </div>
                            <div className="flex justify-between">
                              <span>• Workload Balance (Max 5):</span>
                              <span className="text-white font-bold">{candidate.scoreBreakdown.workloadBalance} pts</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Optimization, Circuit Sequence & Route Map (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* ACTION BAR: Optimize, Lock / Unlock & Save */}
            <div className="glass-panel rounded-3xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black text-[#020C21]">
                  {selectedSchoolIds.length} Schools Selected for Circuit
                </p>
                <p className="text-[11px] text-[#59627E] font-medium">
                  Origin & Return: Bogadi 2nd Stage Base • Two-Wheeler Routing
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* LOCK / UNLOCK BUTTON */}
                <button
                  type="button"
                  onClick={handleToggleLock}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 shadow-xs ${
                    isLocked
                      ? 'bg-[#0F1B31] text-white border-[#0F1B31]'
                      : 'bg-white/80 text-[#0F182F] border-white/80 hover:bg-white'
                  }`}
                >
                  {isLocked ? (
                    <>
                      <Lock className="w-3.5 h-3.5 text-emerald-400" />
                      <span>🔒 LOCKED</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-3.5 h-3.5" />
                      <span>LOCK PLAN</span>
                    </>
                  )}
                </button>

                {/* FIND NEARBY SCHOOLS BUTTON */}
                <button
                  type="button"
                  onClick={() => setIsNearbyModalOpen(true)}
                  disabled={isLocked}
                  className="px-3 py-2 text-xs font-bold text-emerald-800 bg-white/80 hover:bg-emerald-50 border border-emerald-300 rounded-xl transition shadow-xs disabled:opacity-40 flex items-center gap-1.5"
                  title="Find schools near route stops or base"
                >
                  <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                  <span>+ Find Nearby</span>
                </button>

                {/* OPTIMIZE BUTTON - ConSentinel Style with Circular Knob */}
                <button
                  type="button"
                  onClick={() => handleOptimizeRoundTrip(false)}
                  disabled={isOptimizing || selectedSchoolIds.length === 0 || isLocked}
                  className={`btn-cta text-xs sm:text-sm py-2 px-4 shadow-sm transition disabled:opacity-40 flex items-center gap-2 ${
                    isLocked ? 'cursor-not-allowed shadow-none opacity-60' : ''
                  }`}
                >
                  <span>{isOptimizing ? 'Optimizing Order...' : 'OPTIMIZE ROUND TRIP'}</span>
                  <span className="btn-knob w-6 h-6">
                    <Compass className={`w-3.5 h-3.5 text-emerald-400 ${isOptimizing ? 'animate-spin' : ''}`} />
                  </span>
                </button>

                {/* SAVE SCHEDULE BUTTON */}
                {optimizationResult && (
                  <button
                    type="button"
                    onClick={() => handleOptimizeRoundTrip(true)}
                    disabled={isOptimizing}
                    className="px-3.5 py-2 text-xs sm:text-sm font-bold text-[#0F182F] bg-white/80 hover:bg-white border border-white/80 rounded-xl transition active:scale-95 shadow-xs"
                  >
                    Save Schedule
                  </button>
                )}

                {/* AI MARK VISITED BUTTON */}
                <button
                  type="button"
                  onClick={() => setIsAiMarkVisitedOpen(true)}
                  className="px-3.5 py-2 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 active:scale-95 rounded-xl transition flex items-center gap-1.5 shadow-sm"
                  title="Paste marked schools list and auto-match with AI"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>AI Mark Visited</span>
                </button>

                {/* EVENING WRAP-UP BUTTON */}
                <button
                  type="button"
                  onClick={() => setIsEveningWrapUpOpen(true)}
                  disabled={displayedStops.length === 0}
                  className="px-3.5 py-2 text-xs sm:text-sm font-bold text-amber-950 bg-amber-400 hover:bg-amber-300 active:scale-95 rounded-xl transition flex items-center gap-1.5 shadow-sm disabled:opacity-40"
                  title="Complete all visits and log evening summary"
                >
                  <span>🌆 Evening Wrap-Up</span>
                </button>
              </div>
            </div>

            {/* STEP 9: PLANNING EXPLANATION BANNER ("WHY THESE SCHOOLS?") */}
            <div className="glass-panel rounded-3xl p-4 sm:p-5 shadow-sm border border-emerald-500/30">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#0F1B31] text-emerald-400 flex items-center justify-center font-black flex-shrink-0 mt-0.5 shadow-sm">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xs font-black uppercase tracking-wider text-[#020C21]">
                      WHY THESE SCHOOLS?
                    </h3>
                    <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      ROUTE ORDER OPTIMIZED BY GOOGLE MAPS
                    </span>
                  </div>
                  <div className="text-xs text-[#0F182F] font-medium leading-relaxed whitespace-pre-line bg-white/60 p-3 rounded-2xl border border-white/80">
                    {existingPlanData?.remarks ||
                      generatePlanExplanation(
                        displayedStops,
                        isSunday ? 'HOLIDAY' : isSaturday ? 'HALF_DAY' : 'FULL_DAY',
                        preset
                      )}
                  </div>
                </div>
              </div>
            </div>

            {/* INTERACTIVE ROUTE MAP */}
            <RouteMap
              origin={{ address: baseAddress, lat: baseLat, lng: baseLng }}
              stops={displayedStops}
              legs={optimizationResult?.legs || []}
              totalDistanceKm={optimizationResult?.totalDistanceKm || 0}
              totalDurationFormatted={optimizationResult?.totalDurationFormatted || '0 min'}
              travelMode={travelMode}
              googleMapsDirectionsUrl={optimizationResult?.googleMapsDirectionsUrl}
              isSimulated={optimizationResult?.isSimulated}
              onSelectSchool={(s) => {
                setSelectedSchoolForVisit(s);
                setIsVisitModalOpen(true);
              }}
            />

            {/* NUMBERED STOP CARDS (With Micro-interaction Stagger & Verified Pitch) */}
            <div className="glass-panel rounded-3xl p-5 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-white/60 gap-2">
                <div>
                  <h3 className="font-black text-[#020C21] text-sm">
                    Numbered Stop Sequence (Two-Wheeler Circuit)
                  </h3>
                  <p className="text-[11px] text-[#59627E] font-medium">
                    Selected schools are preserved. Sequence reflects minimum round-trip transit.
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setIsNearbyModalOpen(true)}
                    disabled={isLocked}
                    className="px-2.5 py-1 text-xs font-bold text-[#0F182F] bg-white/80 hover:bg-white rounded-xl border border-white/80 transition flex items-center gap-1 disabled:opacity-40 shadow-xs"
                  >
                    <MapPin className="w-3 h-3 text-emerald-600" />
                    <span>+ Add Nearby</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEveningWrapUpOpen(true)}
                    disabled={displayedStops.length === 0}
                    className="px-2.5 py-1 text-xs font-bold text-amber-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition disabled:opacity-40 shadow-xs"
                  >
                    <span>🌆 Wrap-Up</span>
                  </button>
                  <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-lg">
                    {optimizationResult?.totalDistanceKm || (displayedStops.length * 2.8).toFixed(1)} km total
                  </span>
                </div>
              </div>

              <div className="space-y-2.5">
                {/* Base Departure */}
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-emerald-50/50 border border-emerald-200 text-xs shadow-xs">
                  <span className="w-7 h-7 rounded-xl bg-[#0F1B31] text-emerald-400 font-mono font-bold flex items-center justify-center text-[10px] shadow-xs">
                    BASE
                  </span>
                  <div>
                    <span className="font-black text-[#020C21]">
                      Departure: PG Base (Bogadi 2nd Stage)
                    </span>
                    <span className="text-[11px] text-emerald-700 block font-semibold">
                      Starting point for daily outreach circuit
                    </span>
                  </div>
                </div>

                {/* Numbered Stops Cards with Stagger Effect & Contact Actions */}
                {displayedStops.map((school, i) => {
                  const verifiedProduct = getVerifiedProductRecommendation(school);
                  const isVisited = Boolean(school.visited_by_current_user || school.visit_status === 'VISITED');
                  const hasContactPhone = Boolean(school.phone || school.contact_number);
                  const hasContactEmail = Boolean(school.email && school.email.includes('@'));
                  const hasContactPerson = Boolean(
                    (school.contact_person && !school.contact_person.includes('Head')) ||
                    (school.principal_name && !school.principal_name.includes('Head'))
                  );

                  return (
                    <div
                      key={school.id}
                      style={{ animationDelay: `${i * 50}ms` }}
                      className={`glass-card p-3.5 rounded-2xl transition-all duration-200 flex flex-col gap-3 text-xs ${
                        isVisited
                          ? 'border-l-4 border-l-emerald-500 bg-emerald-50/20'
                          : 'border-l-4 border-l-rose-500 bg-rose-50/20'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <span className="w-7 h-7 rounded-xl bg-[#0F1B31] text-white font-mono font-bold flex items-center justify-center text-xs flex-shrink-0 mt-0.5 shadow-xs">
                            {i + 1}
                          </span>

                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono font-bold text-[10px] px-1.5 py-0.5 rounded-md bg-white/80 text-[#0F182F] border border-white/80 shadow-xs">
                                STOP #{i + 1} • S.No. {school.s_no}
                              </span>
                              <span
                                className={`font-bold text-[10px] px-2 py-0.5 rounded-full ${
                                  isStateOrPreSchool(school)
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                                }`}
                              >
                                {isStateOrPreSchool(school)
                                  ? school.school_type === 'PLAY SCHOOL'
                                    ? '🧸 PRE-SCHOOL'
                                    : '🏛️ STATE BOARD'
                                  : `🎓 ${school.board}`}
                              </span>
                              <span
                                className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border shadow-xs ${
                                  isVisited ? 'badge-visited' : 'badge-not-visited'
                                }`}
                              >
                                {isVisited ? 'VISITED' : 'NOT VISITED'}
                              </span>
                            </div>

                            <h4 className="font-black text-[#020C21] text-sm mt-0.5">{school.school_name}</h4>

                            <p className="text-[11px] text-[#59627E] font-medium">
                              {school.area} • Category: {school.school_type || 'Unverified'} • Pitch:{' '}
                              <strong className="text-emerald-900 font-bold">{verifiedProduct}</strong>
                            </p>
                          </div>
                        </div>

                        {/* Stop Action Buttons */}
                        <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0 flex-wrap">
                          {/* 1-Click Quick Toggle */}
                          <button
                            type="button"
                            disabled={togglingId === school.id}
                            onClick={() => handleQuickToggle(school)}
                            className={`px-3 py-1.5 rounded-xl font-black flex items-center gap-1.5 text-xs transition active:scale-95 shadow-xs ${
                              isVisited
                                ? 'bg-white/80 text-rose-700 hover:bg-rose-50 border border-rose-300'
                                : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-600/20'
                            }`}
                            title={
                              isVisited
                                ? 'Mark school as unvisited'
                                : '1-Click mark school as visited'
                            }
                          >
                            {togglingId === school.id ? (
                              <span className="animate-pulse">Updating...</span>
                            ) : isVisited ? (
                              <>
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>↩ Unvisit</span>
                              </>
                            ) : (
                              <>
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                                <span>✓ Mark Visited</span>
                              </>
                            )}
                          </button>

                          <a
                            href={
                              school.google_maps_url ||
                              `https://www.google.com/maps/dir/?api=1&destination=${school.latitude},${school.longitude}&travelmode=motorcycle`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1.5 rounded-xl text-white bg-[#0F1B31] hover:bg-black font-bold flex items-center gap-1.5 text-xs transition shadow-xs"
                          >
                            <Navigation className="w-3.5 h-3.5 fill-current" />
                            <span>NAVIGATE</span>
                          </a>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSchoolForVisit(school);
                              setIsVisitModalOpen(true);
                            }}
                            className="px-2.5 py-1.5 rounded-xl text-[#0F182F] bg-white/80 border border-white/80 font-bold hover:bg-white text-xs transition shadow-xs"
                            title="Open detailed visit log modal"
                          >
                            LOG VISIT
                          </button>

                          {/* Step 10: Suggest Replacement Dialog Trigger */}
                          <button
                            type="button"
                            onClick={() => handleOpenReplacementModal(school)}
                            className="px-2.5 py-1.5 rounded-xl text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 font-bold text-xs flex items-center gap-1 transition shadow-xs"
                            title="Suggest replacement candidate (User review required)"
                          >
                            <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                            <span>Suggest Replacement</span>
                          </button>

                          {!isLocked && (
                            <button
                              type="button"
                              onClick={() => toggleSelectSchool(school.id)}
                              className="w-7 h-7 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-white/80 flex items-center justify-center transition border border-transparent hover:border-white/80"
                              title="Remove from day circuit"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Step 11: Real Contact Information Bar (Never invented) */}
                      <div className="pt-2 border-t border-white/60 flex items-center gap-2 flex-wrap text-[11px]">
                        {hasContactPhone && (
                          <a
                            href={`tel:${school.phone || school.contact_number}`}
                            className="px-2.5 py-1 rounded-xl bg-white/80 border border-white/80 hover:border-emerald-400 hover:bg-emerald-50 text-[#0F182F] font-bold flex items-center gap-1 transition shadow-xs"
                          >
                            <Phone className="w-3 h-3 text-emerald-600" />
                            <span>CALL: {school.phone || school.contact_number}</span>
                          </a>
                        )}

                        {hasContactEmail && (
                          <a
                            href={`mailto:${school.email}`}
                            className="px-2.5 py-1 rounded-xl bg-white/80 border border-white/80 hover:border-emerald-400 hover:bg-emerald-50 text-[#0F182F] font-bold flex items-center gap-1 transition shadow-xs"
                          >
                            <Mail className="w-3 h-3 text-emerald-600" />
                            <span>EMAIL: {school.email}</span>
                          </a>
                        )}

                        {hasContactPerson && (
                          <span className="px-2.5 py-1 rounded-xl bg-white/60 text-[#59627E] font-bold flex items-center gap-1">
                            <User className="w-3 h-3 text-[#59627E]" />
                            <span>CONTACT PERSON: {school.contact_person || school.principal_name}</span>
                          </span>
                        )}

                        {!hasContactPhone && !hasContactEmail && !hasContactPerson && (
                          <span className="text-[10px] text-[#59627E] italic">
                            Contact information: Not provided in master allotment (In-person field visit required)
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Base Finish */}
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-emerald-50/50 border border-emerald-200 text-xs shadow-xs">
                  <span className="w-7 h-7 rounded-xl bg-[#0F1B31] text-emerald-400 font-mono font-bold flex items-center justify-center text-[10px] shadow-xs">
                    FINISH
                  </span>
                  <div>
                    <span className="font-black text-[#020C21]">
                      Return: PG Base (Bogadi 2nd Stage)
                    </span>
                    <span className="text-[11px] text-emerald-700 block font-semibold">
                      Round-trip completion point
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RECORD VISIT MODAL */}
      <RecordVisitModal
        school={selectedSchoolForVisit}
        isOpen={isVisitModalOpen}
        onClose={() => {
          setIsVisitModalOpen(false);
          setSelectedSchoolForVisit(null);
        }}
        onVisitSaved={() => {
          // Re-fetch existing plan data to reflect latest visit status
          checkExistingPlanForDate(date, allSchools);
        }}
      />

      {/* STEP 10: SUGGESTED REPLACEMENT DIALOG (NO AUTOMATIC OVERWRITE) */}
      {replacementModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-scale-in">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center font-bold">
                  <ShieldAlert className="w-5 h-5 text-slate-950" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-950 tracking-tight">
                    Suggested replacement
                  </h3>
                  <p className="text-xs font-semibold text-amber-950/80">
                    User Selection Protection • No Automatic Substitution
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleKeepCurrentSchool}
                className="w-8 h-8 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center text-slate-950 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Comparison Body */}
            <div className="p-5 space-y-4 text-xs">
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-amber-950">
                <span className="font-bold uppercase tracking-wider text-[10px] block text-amber-800">
                  Reason
                </span>
                <p className="font-bold text-xs mt-0.5">{replacementModalData.reason}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Current */}
                <div className="p-3.5 rounded-2xl border-2 border-slate-200 bg-slate-50 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                      Current
                    </span>
                    <span className="font-mono font-bold text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-800">
                      S.No. {replacementModalData.current.s_no}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm line-clamp-2">
                    {replacementModalData.current.school_name}
                  </h4>
                  <p className="text-slate-500 text-[11px]">
                    {replacementModalData.current.area} • {replacementModalData.current.school_type || 'Unverified'}
                  </p>
                  <div className="pt-1">
                    <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                      Status: {replacementModalData.current.visit_status}
                    </span>
                  </div>
                </div>

                {/* Suggested */}
                <div className="p-3.5 rounded-2xl border-2 border-emerald-500 bg-emerald-50/50 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
                      Suggested
                    </span>
                    <span className="font-mono font-bold text-[10px] px-1.5 py-0.5 rounded bg-emerald-600 text-white">
                      S.No. {replacementModalData.suggested.s_no}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm line-clamp-2">
                    {replacementModalData.suggested.school_name}
                  </h4>
                  <p className="text-slate-500 text-[11px]">
                    {replacementModalData.suggested.area} • {replacementModalData.suggested.school_type || 'Unverified'}
                  </p>
                  <div className="pt-1 flex items-center justify-between">
                    <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900">
                      Score: {replacementModalData.suggested.recommendationScore}/100
                    </span>
                    <span className="text-[10px] font-bold text-emerald-800">
                      {replacementModalData.suggested.distanceFromBaseKm} km
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 italic text-center">
                Never silently changes your selected schools. Click [KEEP CURRENT] to retain your school or [REPLACE] to swap.
              </p>
            </div>

            {/* Modal Footer Buttons */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={handleKeepCurrentSchool}
                className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs transition active:scale-95 shadow-sm"
              >
                KEEP CURRENT
              </button>
              <button
                type="button"
                onClick={() =>
                  handleConfirmReplacement(
                    replacementModalData.current.id,
                    replacementModalData.suggested.id
                  )
                }
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition active:scale-95 shadow-md shadow-emerald-600/20"
              >
                REPLACE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEARBY SCHOOLS PROXIMITY MODAL */}
      <NearbySchoolsModal
        isOpen={isNearbyModalOpen}
        onClose={() => setIsNearbyModalOpen(false)}
        routeStops={displayedStops}
        baseLocation={{ address: baseAddress, lat: baseLat, lng: baseLng }}
        onAddSchool={handleAddNearbySchool}
        selectedSchoolIds={selectedSchoolIds}
        isSaturday={isSaturday}
      />

      {/* EVENING WRAP-UP BATCH COMPLETION MODAL */}
      <EveningWrapUpModal
        isOpen={isEveningWrapUpOpen}
        onClose={() => setIsEveningWrapUpOpen(false)}
        date={date}
        routeStops={displayedStops}
        onSuccess={() => {
          // Re-load route plan to show updated visit status
          checkExistingPlanForDate(date, allSchools);
          setPlanSavedMessage(`Evening wrap-up complete! All visited schools logged for ${date}.`);
        }}
      />

      {/* AI INTELLIGENT VISIT MARKER MODAL */}
      <AIMarkVisitedModal
        isOpen={isAiMarkVisitedOpen}
        onClose={() => setIsAiMarkVisitedOpen(false)}
        initialDate={date}
        onSuccess={() => {
          // Re-load schools and current date's plan
          fetch('/api/schools')
            .then((r) => r.json())
            .then((d) => {
              if (d.schools) {
                setAllSchools(d.schools);
                checkExistingPlanForDate(date, d.schools);
              }
            });
          setPlanSavedMessage('AI batch marking completed successfully! Schools updated in CRM.');
        }}
      />
    </div>
  );
}
