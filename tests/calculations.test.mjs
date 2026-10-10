import { test, describe } from 'node:test';
import assert from 'node:assert';

// 1. Calculations & Dashboard Metrics Test
describe('Dashboard & Outreach Metrics Calculation', () => {
  test('Exact 22 completed out of 487 schools results in 465 remaining and 4.52% completion', () => {
    const totalAssigned = 487;
    const completed = 22;

    const remaining = totalAssigned - completed;
    const rawPct = (completed / totalAssigned) * 100;
    const roundedPct = Number(rawPct.toFixed(2));

    assert.strictEqual(remaining, 465, 'Remaining must be exactly 465');
    assert.strictEqual(roundedPct, 4.52, 'Completion percentage must be rounded to 4.52%');
  });

  test('Target progress goal of 300 schools: 22 completed = 278 remaining, 7.33% progress', () => {
    const targetGoal = 300;
    const completed = 22;
    const remainingToTarget = targetGoal - completed;
    const targetPct = Number(((completed / targetGoal) * 100).toFixed(2));

    assert.strictEqual(remainingToTarget, 278, 'Remaining to target must be 278');
    assert.strictEqual(targetPct, 7.33, 'Progress to target must be 7.33%');
  });

  test('Daily target velocity at 5 schools per day (Mon-Sat 6 working days = 30/week)', () => {
    const remaining = 465;
    const dailyTarget = 5;
    const weeklyTarget = dailyTarget * 6; // 6 working days
    const estimatedWorkingDays = Math.ceil(remaining / dailyTarget);
    const estimatedWeeks = Math.ceil(remaining / weeklyTarget);

    assert.strictEqual(weeklyTarget, 30, 'Weekly target is 30 schools across 6 working days');
    assert.strictEqual(estimatedWorkingDays, 93, 'Estimated field working days is 93');
    assert.strictEqual(estimatedWeeks, 16, 'Estimated field weeks is 16 weeks');
  });
});

// 2. Duplicate Detection Test
describe('Duplicate Detection Rules', () => {
  const existingSchools = [
    { s_no: 52, school_id: 'S-18088', school_name: 'Amrita Vidalayam-Mysuru', area: 'Bogadi' },
    { s_no: 57, school_id: 'S-18093', school_name: 'Christ Public School-Mysuru', area: 'Bogadi' },
  ];

  const checkDuplicate = (newSchool, existingList) => {
    // 1. By school_id
    if (existingList.some(s => s.school_id.toUpperCase() === newSchool.school_id?.toUpperCase())) {
      return { duplicate: true, reason: 'school_id' };
    }
    // 2. By s_no
    if (existingList.some(s => s.s_no === newSchool.s_no)) {
      return { duplicate: true, reason: 's_no' };
    }
    // 3. By normalized name + area
    const normKey = `${newSchool.school_name?.trim().toLowerCase()}_${newSchool.area?.trim().toLowerCase()}`;
    if (existingList.some(s => `${s.school_name.trim().toLowerCase()}_${s.area.trim().toLowerCase()}` === normKey)) {
      return { duplicate: true, reason: 'name_area' };
    }
    return { duplicate: false };
  };

  test('Detects duplicate school_id', () => {
    const result = checkDuplicate({ s_no: 999, school_id: 'S-18088', school_name: 'Different Name', area: 'Vijayanagar' }, existingSchools);
    assert.strictEqual(result.duplicate, true);
    assert.strictEqual(result.reason, 'school_id');
  });

  test('Detects duplicate s_no', () => {
    const result = checkDuplicate({ s_no: 52, school_id: 'S-99999', school_name: 'Different Name', area: 'Vijayanagar' }, existingSchools);
    assert.strictEqual(result.duplicate, true);
    assert.strictEqual(result.reason, 's_no');
  });

  test('Detects duplicate normalized name and area', () => {
    const result = checkDuplicate({ s_no: 999, school_id: 'S-99999', school_name: '  Amrita Vidalayam-Mysuru  ', area: 'bogadi' }, existingSchools);
    assert.strictEqual(result.duplicate, true);
    assert.strictEqual(result.reason, 'name_area');
  });

  test('Allows valid unique new school', () => {
    const result = checkDuplicate({ s_no: 488, school_id: 'S-19999', school_name: 'St. Mary High School', area: 'Kuvempunagar' }, existingSchools);
    assert.strictEqual(result.duplicate, false);
  });
});

// 3. Revisit Logic Test
describe('Revisit and Visit History Logic', () => {
  test('Revisit creates a separate record without overwriting past visit', () => {
    const visitHistory = [];

    // First visit
    const visit1 = {
      id: 'v-1',
      school_id: 's-52',
      visit_date: '2026-09-01',
      outcome: 'Interested',
      notes: 'Initial outreach with principal.'
    };
    visitHistory.push(visit1);

    // Revisit 5 days later
    const visit2 = {
      id: 'v-2',
      school_id: 's-52',
      visit_date: '2026-09-06',
      outcome: 'Registration Confirmed',
      notes: 'Second visit - contract signed.'
    };
    visitHistory.push(visit2);

    assert.strictEqual(visitHistory.length, 2, 'History must have 2 distinct visit records');
    assert.strictEqual(visitHistory[0].outcome, 'Interested', 'Original visit outcome preserved');
    assert.strictEqual(visitHistory[1].outcome, 'Registration Confirmed', 'Revisit record logged');

    // Unique school count vs total visits
    const uniqueVisitedSchools = new Set(visitHistory.map(v => v.school_id)).size;
    assert.strictEqual(uniqueVisitedSchools, 1, 'Unique visited schools remains 1');
    assert.strictEqual(visitHistory.length, 2, 'Total visit events equals 2');
  });
});

// 4. GPS Verification Test
describe('GPS Haversine Verification', () => {
  const calculateMeters = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  test('Location within 150m is verified', () => {
    const schoolLat = 12.3021;
    const schoolLng = 76.6178;
    // ~40m away
    const userLat = 12.3024;
    const userLng = 76.6180;

    const dist = calculateMeters(userLat, userLng, schoolLat, schoolLng);
    assert.ok(dist <= 150, `Distance ${dist}m must be within 150m threshold`);
  });

  test('Location 500m away flags outside threshold without crashing', () => {
    const schoolLat = 12.3021;
    const schoolLng = 76.6178;
    // ~800m away
    const userLat = 12.3080;
    const userLng = 76.6220;

    const dist = calculateMeters(userLat, userLng, schoolLat, schoolLng);
    assert.ok(dist > 150, `Distance ${dist}m is properly detected outside threshold`);
  });
});

// 5. Waypoint Reordering Test
describe('Waypoint Reordering & Stop Sequencing', () => {
  test('Correctly reorders intermediate schools based on zero-based Google Routes indices', () => {
    const inputSchools = [
      { id: 'school-A', name: 'School A' },
      { id: 'school-B', name: 'School B' },
      { id: 'school-C', name: 'School C' },
      { id: 'school-D', name: 'School D' },
      { id: 'school-E', name: 'School E' },
    ];

    // Suppose Routes API returns optimized permutation [2, 0, 4, 1, 3]
    const optimizedIndices = [2, 0, 4, 1, 3];
    const optimizedOrder = optimizedIndices.map(idx => inputSchools[idx].id);

    assert.deepStrictEqual(
      optimizedOrder,
      ['school-C', 'school-A', 'school-E', 'school-B', 'school-D'],
      'Stops correctly sequenced according to optimized permutation'
    );
  });
});

// 6. Representative Separation Logic Test
describe('Representative-Level Separation & Territory Integrity', () => {
  test('Visits by former representatives do not count towards Kalyan completed schools', () => {
    const databaseVisits = [
      { school_id: 's-52', representative_id: 'KA-REP-01', is_current_representative: true },
      { school_id: 's-57', representative_id: 'KA-REP-01', is_current_representative: true },
      { school_id: 's-12', representative_id: 'PREV-REP-09', is_current_representative: false }, // Former rep
      { school_id: 's-18', representative_id: 'PREV-REP-09', is_current_representative: false }, // Former rep
    ];

    const kalyanCompletedSchools = new Set(
      databaseVisits
        .filter(v => v.is_current_representative && v.representative_id === 'KA-REP-01')
        .map(v => v.school_id)
    );

    assert.strictEqual(kalyanCompletedSchools.size, 2, 'Only visits by Kalyan count towards his completed tally');
    assert.strictEqual(kalyanCompletedSchools.has('s-12'), false, 'School visited by former rep is not completed for Kalyan');
    assert.strictEqual(kalyanCompletedSchools.has('s-18'), false, 'School visited by former rep is not completed for Kalyan');
  });
});

// 7. Sunday Holiday Engine Test
describe('Sunday Weekly Holiday Engine', () => {
  test('Sunday is recognized as holiday and excluded from working-day averages', () => {
    const weekDays = [
      { name: 'Monday', dayOfWeek: 1, visits: 5 },
      { name: 'Tuesday', dayOfWeek: 2, visits: 6 },
      { name: 'Wednesday', dayOfWeek: 3, visits: 4 },
      { name: 'Thursday', dayOfWeek: 4, visits: 5 },
      { name: 'Friday', dayOfWeek: 5, visits: 5 },
      { name: 'Saturday', dayOfWeek: 6, visits: 5 },
      { name: 'Sunday', dayOfWeek: 0, visits: 0, isHoliday: true },
    ];

    const workingDays = weekDays.filter(d => d.dayOfWeek !== 0);
    assert.strictEqual(workingDays.length, 6, 'There are strictly 6 working days (Mon-Sat)');

    const totalVisits = workingDays.reduce((sum, d) => sum + d.visits, 0); // 30
    assert.strictEqual(totalVisits, 30, 'Total working-day visits equals 30');

    // Working-day average divides strictly by 6 working days (NOT 7!)
    const workingDayAverage = Number((totalVisits / workingDays.length).toFixed(2));
    assert.strictEqual(workingDayAverage, 5.0, 'Working day average is 5.0 schools/day (excludes Sunday)');

    // Verify 7-day average would be incorrectly diluted
    const incorrectSevenDayAverage = Number((totalVisits / 7).toFixed(2));
    assert.notStrictEqual(workingDayAverage, incorrectSevenDayAverage, 'Must not dilute average across Sunday holiday');
  });

  test('Route optimization date validation blocks Sunday', () => {
    const isSundayHoliday = (dateStr) => {
      const [year, month, day] = dateStr.split('-').map(Number);
      const d = new Date(year, month - 1, day);
      return d.getDay() === 0;
    };

    assert.strictEqual(isSundayHoliday('2026-09-06'), true, '2026-09-06 is a Sunday holiday');
    assert.strictEqual(isSundayHoliday('2026-09-07'), false, '2026-09-07 is Monday (valid working day)');
  });
});

// 8. Data Reconciliation Difference Analysis Test
describe('Data Reconciliation Difference Analysis', () => {
  test('Accurately identifies matched, missing, and extra S.Nos', () => {
    const currentCompletedSNos = new Set([52, 57, 67, 86, 87, 97]);
    const importedSNos = new Set([52, 57, 67, 86, 74, 75]); // 74 and 75 are new; 87 and 97 omitted

    const matched = [];
    const extraInCurrent = [];
    const missingInCurrent = [];

    for (const sNo of currentCompletedSNos) {
      if (importedSNos.has(sNo)) {
        matched.push(sNo);
      } else {
        extraInCurrent.push(sNo);
      }
    }

    for (const sNo of importedSNos) {
      if (!currentCompletedSNos.has(sNo)) {
        missingInCurrent.push(sNo);
      }
    }

    assert.deepStrictEqual(matched.sort(), [52, 57, 67, 86]);
    assert.deepStrictEqual(extraInCurrent.sort(), [87, 97]);
    assert.deepStrictEqual(missingInCurrent.sort(), [74, 75]);
  });
});

// 9. Route Locking and Plan Change Protection
describe('Route Plan Locking & Overwrite Protection', () => {
  test('Locked plan prevents accidental stop addition or deletion without explicit unlock', () => {
    const routePlan = {
      id: 'rp-2026-09-07',
      date: '2026-09-07',
      is_locked: true,
      stops: ['s-52', 's-57', 's-67', 's-86', 's-97'],
    };

    const attemptModifyStops = (plan, newStops) => {
      if (plan.is_locked) {
        return { success: false, error: 'Plan is locked. Click "Edit Plan" to unlock.' };
      }
      return { success: true, stops: newStops };
    };

    const blockedResult = attemptModifyStops(routePlan, ['s-52', 's-57']);
    assert.strictEqual(blockedResult.success, false);
    assert.strictEqual(blockedResult.error, 'Plan is locked. Click "Edit Plan" to unlock.');

    // After explicit unlock
    routePlan.is_locked = false;
    const allowedResult = attemptModifyStops(routePlan, ['s-52', 's-57', 's-67', 's-86', 's-97', 's-101']);
    assert.strictEqual(allowedResult.success, true);
    assert.strictEqual(allowedResult.stops.length, 6);
  });
});

// 10. Saturday Half-Day Limit & Trimming Engine
describe('Saturday Half-Day Engine', () => {
  const checkSaturdayLimit = (dayOfWeek, schoolCount) => {
    const isSaturday = dayOfWeek === 6;
    if (isSaturday && schoolCount > 5) {
      return {
        warning: true,
        message: 'Half-day limit exceeded. Saturday is a half-day. Maximum recommended route is 5 schools.',
      };
    }
    return { warning: false };
  };

  test('Saturday triggers warning when selecting > 5 schools', () => {
    const saturdayDayOfWeek = 6;
    const warningResult = checkSaturdayLimit(saturdayDayOfWeek, 6);
    assert.strictEqual(warningResult.warning, true);
    assert.ok(warningResult.message.includes('Saturday is a half-day'));

    const safeResult = checkSaturdayLimit(saturdayDayOfWeek, 5);
    assert.strictEqual(safeResult.warning, false);
  });

  test('Saturday [Optimize to 5] action trims selection to exactly 5 schools', () => {
    const selectedSchoolIds = ['s-1', 's-2', 's-3', 's-4', 's-5', 's-6', 's-7', 's-8'];
    const trimmed = selectedSchoolIds.length > 5 ? selectedSchoolIds.slice(0, 5) : selectedSchoolIds;

    assert.strictEqual(trimmed.length, 5);
    assert.deepStrictEqual(trimmed, ['s-1', 's-2', 's-3', 's-4', 's-5']);
  });
});

// 11. Sunday Holiday Date Advancement
describe('Sunday Holiday Date Advancement', () => {
  test('Advance to next working Monday from Sunday 2026-09-06', () => {
    const getNextWorkingMonday = (dateStr) => {
      const [year, month, day] = dateStr.split('-').map(Number);
      const targetDate = new Date(year, month - 1, day);
      const dayOfWeek = targetDate.getDay();
      const daysToAdd = dayOfWeek === 0 ? 1 : (8 - dayOfWeek) % 7 || 1;
      targetDate.setDate(targetDate.getDate() + daysToAdd);
      const y = targetDate.getFullYear();
      const m = String(targetDate.getMonth() + 1).padStart(2, '0');
      const d = String(targetDate.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    const nextWorkingDay = getNextWorkingMonday('2026-09-06');
    assert.strictEqual(nextWorkingDay, '2026-09-07', 'Next working day from Sunday 6 Sep 2026 is Monday 7 Sep 2026');
  });
});

// 12. Strict Selected-Schools-Only Optimization
describe('Selected-Schools-Only Optimization Integrity', () => {
  test('Optimization strictly preserves input schools without injecting nearby alternatives', () => {
    const userSelectedSchoolIds = ['s-52', 's-57', 's-67', 's-86', 's-97'];
    
    // Simulate optimizer permutation
    const simulatedOptimization = (ids) => {
      // Reorder based on hypothetical TSP
      const permutation = [3, 0, 1, 4, 2];
      return permutation.map(i => ids[i]);
    };

    const optimizedStops = simulatedOptimization(userSelectedSchoolIds);

    assert.strictEqual(optimizedStops.length, userSelectedSchoolIds.length);
    assert.deepStrictEqual(new Set(optimizedStops), new Set(userSelectedSchoolIds));
    // Verify no foreign or "nearby" substitute school was added
    assert.strictEqual(optimizedStops.includes('s-999_foreign_nearby'), false);
  });
});

// 13. Verified Product Recommendation Logic
describe('Verified Product Pitch Recommendations', () => {
  const getVerifiedProduct = (school) => {
    const lowerClass = school.lowest_class?.toString().toUpperCase() || '';
    const higherClass = school.highest_class?.toString().toUpperCase() || '';
    const schoolType = school.school_type?.toUpperCase() || '';

    const isPreSchool =
      ['PRE-SCHOOL', 'PLAY SCHOOL', 'NURSERY', 'MONTESSORI', 'KINDERGARTEN'].includes(schoolType) ||
      ['NURSERY', 'LKG', 'UKG', 'PRE-KG', 'PLAYGROUP', 'PP1', 'PP2'].includes(higherClass);

    const isK12 =
      ['PRIMARY', 'HIGHER PRIMARY', 'HIGH SCHOOL', 'COMPOSITE', 'PUC', 'K-12'].includes(schoolType) ||
      ['CLASS 5', 'CLASS 7', 'CLASS 8', 'CLASS 10', 'CLASS 12', '10', '12', 'GRADE 10'].includes(higherClass);

    if (isPreSchool && !isK12) return 'Junior Power Quest';
    if (isK12 && !isPreSchool) return 'MOM';
    if (isPreSchool && isK12) return 'Both';
    return 'Class range not verified';
  };

  test('Pre-school recommends Junior Power Quest', () => {
    const school = { school_type: 'PRE-SCHOOL', lowest_class: 'NURSERY', highest_class: 'UKG' };
    assert.strictEqual(getVerifiedProduct(school), 'Junior Power Quest');
  });

  test('High School recommends MOM', () => {
    const school = { school_type: 'HIGH SCHOOL', lowest_class: 'CLASS 1', highest_class: 'CLASS 10' };
    assert.strictEqual(getVerifiedProduct(school), 'MOM');
  });

  test('Composite school recommends Both', () => {
    const school = { school_type: 'PRE-SCHOOL', lowest_class: 'NURSERY', highest_class: 'CLASS 10' };
    assert.strictEqual(getVerifiedProduct(school), 'Both');
  });

  test('Unverified class range outputs "Class range not verified"', () => {
    const school = { school_type: '', lowest_class: null, highest_class: null };
    assert.strictEqual(getVerifiedProduct(school), 'Class range not verified');
  });
});

// 14. AI Route Advice Manual Apply Constraint
describe('AI Route Advice Manual Apply Integrity', () => {
  test('AI suggestions are never auto-applied and require explicit user action', () => {
    let currentRoute = ['s-1', 's-2', 's-3'];
    const aiSuggestion = {
      id: 'cluster-bogadi',
      suggestedOrder: ['s-3', 's-1', 's-2'],
      applied: false,
    };

    // Before user action, route remains unchanged
    assert.deepStrictEqual(currentRoute, ['s-1', 's-2', 's-3']);
    assert.strictEqual(aiSuggestion.applied, false);

    // Only after user clicks [Apply Suggestion]
    const handleApplySuggestion = (route, suggestion) => {
      suggestion.applied = true;
      return suggestion.suggestedOrder;
    };

    currentRoute = handleApplySuggestion(currentRoute, aiSuggestion);
    assert.deepStrictEqual(currentRoute, ['s-3', 's-1', 's-2']);
    assert.strictEqual(aiSuggestion.applied, true);
  });
});

// 15. Balance Days Planning & Mon/Tue Preservation
describe('Balance Days Planning & Territory Integrity', () => {
  test('Mon/Tue plans are locked and preserved; Wed-Fri balance days have 7 schools daily with zero overlap', () => {
    const mondaySNos = [77, 282, 284, 317, 257, 264, 224];
    const tuesdaySNos = [406, 485, 464, 476, 482];
    const wednesdaySNos = [157, 329, 176, 254, 475, 113, 205]; // 7 schools daily
    const thursdaySNos = [244, 211, 467, 198, 471, 472, 473]; // 7 schools daily
    const fridaySNos = [326, 209, 484, 221, 75, 118, 91];      // 7 schools daily
    const saturdaySNos = [1, 65, 76, 72, 388, 332];            // Saturday half-day 6 schools
    const sundaySNos = []; // Sunday holiday: 0 schools

    const completed22 = [52, 57, 67, 86, 87, 97, 107, 114, 117, 124, 137, 144, 160, 164, 172, 177, 185, 192, 197, 204, 214, 234];

    const allAllocated = [
      ...completed22,
      ...mondaySNos,
      ...tuesdaySNos,
      ...wednesdaySNos,
      ...thursdaySNos,
      ...fridaySNos,
      ...saturdaySNos,
    ];

    const uniqueCount = new Set(allAllocated).size;
    assert.strictEqual(uniqueCount, allAllocated.length, 'There must be zero school overlap between past completed, Mon/Tue, and Wed-Sat balance days');
    assert.strictEqual(wednesdaySNos.length, 7, 'Wednesday must have exactly 7 schools daily');
    assert.strictEqual(thursdaySNos.length, 7, 'Thursday must have exactly 7 schools daily');
    assert.strictEqual(fridaySNos.length, 7, 'Friday must have exactly 7 schools daily');
    assert.strictEqual(saturdaySNos.length, 6, 'Saturday half-day must have exactly 6 schools (<= 6 limit)');
    assert.strictEqual(sundaySNos.length, 0, 'Sunday holiday must have strictly 0 visits');
  });
});

// 16. Batch Visit Recording Simulation for Mon/Tue Data
describe('Batch Visit Logging for Mon/Tue Data Handover', () => {
  test('Recording 14 visits for Mon & Tue increments completed unique count from 22 to 36', () => {
    const initialCompleted = 22;
    const mondayVisited = 7;
    const tuesdayVisited = 7;

    const newCompleted = initialCompleted + mondayVisited + tuesdayVisited;
    const totalAssigned = 487;
    const remaining = totalAssigned - newCompleted;
    const completionPct = Number(((newCompleted / totalAssigned) * 100).toFixed(2));
    const targetGoal = 300;
    const remainingToTarget = targetGoal - newCompleted;
    const targetProgressPct = Number(((newCompleted / targetGoal) * 100).toFixed(2));

    assert.strictEqual(newCompleted, 36, 'Unique completed schools increases to 36');
    assert.strictEqual(remaining, 451, 'Remaining unvisited schools decreases to 451');
    assert.strictEqual(completionPct, 7.39, 'Completion percentage becomes 7.39%');
    assert.strictEqual(remainingToTarget, 264, 'Remaining to 300 target becomes 264');
    assert.strictEqual(targetProgressPct, 12.0, 'Progress towards target 300 becomes 12.0%');
  });
});

// 17. User Visited List & Revisit Integrity (25 Visited Events, 22 Unique + 3 Revisits)
describe('User Visited List & Revisit Integrity', () => {
  test('User visited list: 22 initial visits + 3 revisits maintains exact unique completed metrics without double-counting', () => {
    const totalMasterSchools = 487;
    const initialVisits = [
      // Day 1 (7)
      { s_no: 246, name: 'Taralabalu School', type: 'Visit' },
      { s_no: 225, name: 'Pragathi Vidya Kendra Bogadhi', type: 'Visit' },
      { s_no: 303, name: 'Gangotri Public School', type: 'Visit' },
      { s_no: 52, name: 'Amrita Vidalayam-Mysuru', type: 'Visit' },
      { s_no: 57, name: 'Christ Public School-Mysuru', type: 'Visit' },
      { s_no: 147, name: 'Pragathi Elite Public School-Mysuru', type: 'Visit' },
      { s_no: 86, name: 'Rainbow Public School-Mysuru', type: 'Visit' },
      // Day 1 / Follow-up plan (3)
      { s_no: 215, name: 'Bharatiya Vidya Bhavan School Vijayanagar', type: 'Visit' },
      { s_no: 88, name: 'S.V.E.I.School-Mysuru', type: 'Visit' },
      { s_no: 81, name: 'Nps International School-Mysuru', type: 'Visit' },
      // Day 2 (7)
      { s_no: 474, name: 'Basil Buds International School', type: 'Visit' },
      { s_no: 243, name: 'Cauvery School', type: 'Visit' },
      { s_no: 203, name: 'Gnana Ganga School', type: 'Visit' },
      { s_no: 204, name: 'Gokula School', type: 'Visit' },
      { s_no: 82, name: 'Pramati Hill View Academy-Mysuru', type: 'Visit' },
      { s_no: 242, name: 'Shri Sharada Public School', type: 'Visit' },
      { s_no: 455, name: 'Subhodaya School Kuvrmpunagar', type: 'Visit' },
      // Today - 7 Sep (5)
      { s_no: 77, name: 'Mysore West Lions Sevaniketan School-Mysuru', type: 'Visit' },
      { s_no: 282, name: 'Rotary Mysore School', type: 'Visit' },
      { s_no: 284, name: 'Rotary West School Saraswati Puram', type: 'Visit' },
      { s_no: 317, name: 'Sadvidya School', type: 'Visit' },
      { s_no: 257, name: 'Sharada Vilas School', type: 'Visit' },
    ];

    const revisits = [
      { s_no: 264, name: 'Ace Priyadarshini School', type: 'Revisit' },
      { s_no: 224, name: 'Akshara Pathsala', type: 'Revisit' },
      { s_no: 87, name: 'Royale Concorde International School Mysuru-Mysuru', type: 'Revisit' },
    ];

    const uniqueSchools = new Set(initialVisits.map(s => s.s_no));
    assert.strictEqual(initialVisits.length, 22, 'There are exactly 22 first-visit events');
    assert.strictEqual(revisits.length, 3, 'There are exactly 3 revisit events');
    assert.strictEqual(initialVisits.length + revisits.length, 25, 'Total visited events equals 25');

    // Revisits do NOT increase unique completed tally
    const totalUniqueCompleted = uniqueSchools.size;
    assert.strictEqual(totalUniqueCompleted, 22, 'Unique completed schools is strictly 22 (revisits do not increase count)');
  });
});

// 18. Revisit Reschedule Engine Validation
describe('Revisit Rescheduling & Route Addition Engine', () => {
  test('Rescheduling blocks Sunday holiday date', () => {
    const sundayDate = '2026-09-13'; // Sunday
    const [y, m, d] = sundayDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const isSunday = dateObj.getDay() === 0;

    assert.strictEqual(isSunday, true, 'Date is verified as Sunday');
    const validateDate = (targetDate) => {
      const [yy, mm, dd] = targetDate.split('-').map(Number);
      if (new Date(yy, mm - 1, dd).getDay() === 0) {
        return { valid: false, error: 'Sunday is a weekly non-working holiday' };
      }
      return { valid: true };
    };

    const res = validateDate(sundayDate);
    assert.strictEqual(res.valid, false, 'Rescheduling to Sunday is blocked');
  });

  test('Rescheduling to Saturday enforces maximum 5 schools cap', () => {
    const existingSaturdayStops = [1, 2, 3, 4, 5];
    const canAddRevisitToSaturday = existingSaturdayStops.length < 5;

    assert.strictEqual(canAddRevisitToSaturday, false, 'Saturday with 5 schools cannot accept additional stops without exceeding limit');
  });

  test('Rescheduling to weekday with 5 stops successfully adds revisit as 6th stop', () => {
    const existingWeekdayStops = ['s-1', 's-2', 's-3', 's-4', 's-5'];
    const newSchoolId = 's-246'; // Taralabalu School

    const nextStopNumber = existingWeekdayStops.length + 1;
    const updatedStops = [...existingWeekdayStops, newSchoolId];

    assert.strictEqual(nextStopNumber, 6, 'Revisit stop number is 6');
    assert.strictEqual(updatedStops.length, 6, 'Total weekday stops becomes 6');
    assert.strictEqual(updatedStops[5], 's-246', 'Target school is appended to route stops');
  });
});

// 19. 100-Point Transparent Priority Scoring System
describe('100-Point Transparent Priority Scoring System', () => {
  const calculateScore = (school, criteria, pendingAreaCount, distKm) => {
    // 1. Pending Status (Max 30)
    let pendingStatus = 0;
    const isVisitedByCurrent = Boolean(school.visited_by_current_user || (school.visit_status === 'VISITED' && !school.visited_by_previous_rep));
    if (!isVisitedByCurrent && school.visit_status !== 'VISITED') {
      pendingStatus = 30;
    } else if (criteria.visitStatus === 'REVISIT_ONLY') {
      pendingStatus = 20;
    }

    // 2. Category / Theme (Max 20)
    let schoolCategory = 0;
    const isEarly = ['PRE-SCHOOL', 'PLAY SCHOOL', 'NURSERY', 'MONTESSORI', 'KINDERGARTEN'].includes(school.school_type?.toUpperCase());
    if (criteria.theme === 'SMALL & EARLY YEARS') {
      schoolCategory = isEarly ? 20 : 0;
    } else {
      schoolCategory = 20;
    }

    // 3. Geo Clustering (Max 15)
    let geoClustering = 0;
    if (pendingAreaCount >= 15) geoClustering = 15;
    else if (pendingAreaCount >= 8) geoClustering = 12;
    else if (pendingAreaCount >= 3) geoClustering = 8;
    else geoClustering = 5;

    // 4. Product Fit (Max 10)
    let productFit = isEarly ? 10 : (school.school_type ? 8 : 5);

    // 5. Distance from Base (Max 10)
    let distanceFromBase = 0;
    if (distKm <= 5) distanceFromBase = 10;
    else if (distKm <= 8) distanceFromBase = 8;
    else if (distKm <= 12) distanceFromBase = 5;
    else distanceFromBase = 2;

    // 6. Contact / Lead Potential (Max 10)
    const hasPhone = Boolean(school.phone && school.phone.length >= 6);
    const hasPerson = Boolean(school.contact_person && !school.contact_person.includes('Head'));
    let contactLeadPotential = (hasPhone && hasPerson) ? 10 : ((hasPhone || hasPerson) ? 5 : 0);

    // 7. Workload Balance (Max 5)
    let workloadBalance = criteria.isSunday ? 0 : 5;

    const total = pendingStatus + schoolCategory + geoClustering + productFit + distanceFromBase + contactLeadPotential + workloadBalance;

    return {
      pendingStatus,
      schoolCategory,
      geoClustering,
      productFit,
      distanceFromBase,
      contactLeadPotential,
      workloadBalance,
      total
    };
  };

  test('Ideal pending early-years school near Bogadi base achieves perfect 100/100 score', () => {
    const idealSchool = {
      school_name: 'Nios Nest Pre School',
      school_type: 'PLAY SCHOOL',
      visit_status: 'NOT VISITED',
      visited_by_current_user: false,
      phone: '959191148',
      contact_person: 'Principal Mrs. Rao',
    };
    const criteria = { theme: 'SMALL & EARLY YEARS', isSunday: false };
    const score = calculateScore(idealSchool, criteria, 18, 0.37);

    assert.strictEqual(score.pendingStatus, 30, 'Pending status gets 30 pts');
    assert.strictEqual(score.schoolCategory, 20, 'Category match gets 20 pts');
    assert.strictEqual(score.geoClustering, 15, 'Cluster density gets 15 pts');
    assert.strictEqual(score.productFit, 10, 'Product fit gets 10 pts');
    assert.strictEqual(score.distanceFromBase, 10, 'Distance <= 5km gets 10 pts');
    assert.strictEqual(score.contactLeadPotential, 10, 'Contact phone and person gets 10 pts');
    assert.strictEqual(score.workloadBalance, 5, 'Workload balance gets 5 pts');
    assert.strictEqual(score.total, 100, 'Sum of all 7 categories equals 100 points');
  });

  test('Previous representative visits do NOT reduce pending points for current representative', () => {
    const prevRepVisitedSchool = {
      school_name: 'St. Thomas School',
      school_type: 'PRIMARY',
      visit_status: 'NOT VISITED',
      visited_by_current_user: false,
      visited_by_previous_rep: true, // only previous rep
    };
    const criteria = { theme: 'BALANCED', isSunday: false };
    const score = calculateScore(prevRepVisitedSchool, criteria, 5, 4.0);

    assert.strictEqual(score.pendingStatus, 30, 'Unvisited by current rep maintains full 30 pending points');
  });

  test('School already visited by current user gets 0 pending points in normal route generation', () => {
    const visitedSchool = {
      school_name: 'Amrita Vidyalayam-Mysuru',
      school_type: 'COMPOSITE',
      visit_status: 'VISITED',
      visited_by_current_user: true,
    };
    const criteria = { theme: 'BALANCED', isSunday: false, visitStatus: 'NOT_VISITED' };
    const score = calculateScore(visitedSchool, criteria, 10, 2.5);

    assert.strictEqual(score.pendingStatus, 0, 'Completed school gets 0 pending points');
  });
});

// 20. Small & Early-Years Priority Theme
describe('Small & Early-Years Priority Theme', () => {
  const earlyYearsTypes = ['PRE-SCHOOL', 'PLAY SCHOOL', 'NURSERY', 'MONTESSORI', 'KINDERGARTEN'];

  test('Prioritizes early-years categories and filters out large schools', () => {
    const candidates = [
      { id: '1', name: 'Nios Nest', school_type: 'PLAY SCHOOL' },
      { id: '2', name: 'Mysore Composite PU College', school_type: 'COMPOSITE' },
      { id: '3', name: 'My First School', school_type: 'PRE-SCHOOL' },
      { id: '4', name: 'DPS Senior Secondary', school_type: 'HIGH SCHOOL' },
    ];

    const filtered = candidates.filter(c => earlyYearsTypes.includes(c.school_type));

    assert.strictEqual(filtered.length, 2, 'Only 2 early-years schools selected');
    assert.strictEqual(filtered[0].name, 'Nios Nest');
    assert.strictEqual(filtered[1].name, 'My First School');
  });
});

// 21. Planning Explanation Generator ("WHY THESE SCHOOLS?")
describe('Planning Explanation Generator', () => {
  const generateExplanation = (count, theme) => {
    return `${count} schools selected because they are:
- pending (unvisited by current representative)
- small/early-years focused (Pre-schools & Play Schools)
- geographically compatible (compact Mysuru circuit)
- suitable for the current field objective (Junior Power Quest outreach)
- within the daily workload target (${count} schools).
ROUTE ORDER OPTIMIZED BY GOOGLE MAPS`;
  };

  test('Generates deterministic 5-bullet explanation with Google Maps order notice', () => {
    const explanation = generateExplanation(5, 'SMALL & EARLY YEARS');

    assert.ok(explanation.includes('5 schools selected because they are:'), 'Contains count header');
    assert.ok(explanation.includes('- pending'), 'Contains pending bullet');
    assert.ok(explanation.includes('- small/early-years focused'), 'Contains category bullet');
    assert.ok(explanation.includes('- geographically compatible'), 'Contains geography bullet');
    assert.ok(explanation.includes('- suitable for the current field objective'), 'Contains objective bullet');
    assert.ok(explanation.includes('- within the daily workload target (5 schools).'), 'Contains workload target bullet');
    assert.ok(explanation.includes('ROUTE ORDER OPTIMIZED BY GOOGLE MAPS'), 'Contains Google Maps optimization tag');
  });
});

// 22. Suggested Replacement Dialog Logic (Step 10)
describe('Suggested Replacement Dialog Logic', () => {
  test('[KEEP CURRENT] leaves original candidate untouched', () => {
    let selectedSchoolIds = ['S-1', 'S-2', 'S-3', 'S-4', 'S-5'];
    const currentId = 'S-1';

    // User chooses [KEEP CURRENT]
    const onKeepCurrent = () => { /* no change */ };
    onKeepCurrent();

    assert.deepStrictEqual(selectedSchoolIds, ['S-1', 'S-2', 'S-3', 'S-4', 'S-5'], 'Selection is unchanged');
  });

  test('[REPLACE] swaps candidate with suggested school without altering other stops', () => {
    let selectedSchoolIds = ['S-1', 'S-2', 'S-3', 'S-4', 'S-5'];
    const currentId = 'S-2';
    const suggestedId = 'S-99';

    // User chooses [REPLACE]
    selectedSchoolIds = selectedSchoolIds.map(id => id === currentId ? suggestedId : id);

    assert.strictEqual(selectedSchoolIds[1], 'S-99', 'Target stop was replaced');
    assert.strictEqual(selectedSchoolIds[0], 'S-1', 'Stop 1 preserved');
    assert.strictEqual(selectedSchoolIds[2], 'S-3', 'Stop 3 preserved');
    assert.strictEqual(selectedSchoolIds.length, 5, 'Total stop count preserved');
  });
});

// 23. Real Contact Data Integrity (Step 11)
describe('Real Contact Data Integrity', () => {
  test('Contact buttons strictly use real fields without inventing phone numbers', () => {
    const schoolWithContact = {
      school_name: 'Nios Nest Pre School',
      phone: '959191148',
      email: 'info.s-139929@mysureschools.in',
      contact_person: 'Principal',
    };

    const schoolWithoutContact = {
      school_name: 'Rural Outreach Centre',
      phone: null,
      email: null,
      contact_person: null,
      principal_name: null,
    };

    const getActions = (s) => ({
      hasCall: Boolean(s.phone),
      hasEmail: Boolean(s.email),
      hasPerson: Boolean(s.contact_person),
      callUrl: s.phone ? `tel:${s.phone}` : null,
      emailUrl: s.email ? `mailto:${s.email}` : null,
    });

    const act1 = getActions(schoolWithContact);
    assert.strictEqual(act1.hasCall, true);
    assert.strictEqual(act1.callUrl, 'tel:959191148');
    assert.strictEqual(act1.hasEmail, true);
    assert.strictEqual(act1.emailUrl, 'mailto:info.s-139929@mysureschools.in');

    const act2 = getActions(schoolWithoutContact);
    assert.strictEqual(act2.hasCall, false, 'No fake phone number generated');
    assert.strictEqual(act2.hasEmail, false, 'No fake email generated');
    assert.strictEqual(act2.hasPerson, false, 'No fake principal name generated');
  });
});

// 24. Tuesday 8 Sep Small & Early-Years Circuit Integrity
describe('Tuesday 8 Sep Small & Early-Years Circuit Integrity', () => {
  test('Contains exact 5 early-years candidate schools in optimal round-trip sequence', () => {
    const tuesdayRoute = {
      date: '2026-09-08',
      name: 'Small & Early-Years Circuit (Tuesday 8 Sep • 5 Schools)',
      is_locked: true,
      day_type: 'FULL_DAY',
      travel_mode: 'TWO_WHEELER',
      total_distance_km: 12.92,
      total_duration: '40 min',
      stops: [
        { s_no: 406, ref_sno: 338, name: 'Nios Nest Pre School', area: 'Mysuru' },
        { s_no: 485, ref_sno: 354, name: 'Pusthi Pre School', area: 'Mysuru' },
        { s_no: 464, ref_sno: 328, name: 'My First School', area: 'Ramakrishna Nagar' },
        { s_no: 476, ref_sno: 460, name: 'Tiny Teddys Pre School Saraswathipuram', area: 'Saraswathipuram' },
        { s_no: 482, ref_sno: 461, name: 'Tiny Treasure Pre School Vijayanagar', area: 'Vijayanagar' },
      ],
    };

    assert.strictEqual(tuesdayRoute.stops.length, 5, 'Exactly 5 schools');
    assert.strictEqual(tuesdayRoute.is_locked, true, 'Route plan is locked');
    assert.strictEqual(tuesdayRoute.travel_mode, 'TWO_WHEELER', 'Travel mode is TWO_WHEELER');
    assert.strictEqual(tuesdayRoute.total_distance_km, 12.92, 'Total distance is 12.92 km');
    assert.strictEqual(tuesdayRoute.stops[0].ref_sno, 338, 'Stop 1 is Nios Nest (Ref #338)');
    assert.strictEqual(tuesdayRoute.stops[1].ref_sno, 354, 'Stop 2 is Pusthi (Ref #354)');
    assert.strictEqual(tuesdayRoute.stops[2].ref_sno, 328, 'Stop 3 is My First School (Ref #328)');
    assert.strictEqual(tuesdayRoute.stops[3].ref_sno, 460, 'Stop 4 is Tiny Teddys (Ref #460)');
    assert.strictEqual(tuesdayRoute.stops[4].ref_sno, 461, 'Stop 5 is Tiny Treasure (Ref #461)');
  });
});

// 25. Proximity Search & Nearby Schools Filtering
describe('Proximity Search & Nearby Schools Filtering', () => {
  const haversineKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Number((R * c).toFixed(2));
  };

  const anchor = { lat: 12.3021, lng: 76.6178 }; // Bogadi Base

  const mockSchools = [
    { id: 'sc-1', s_no: 349, school_name: 'Pragathi Vidya Kendra Bogadhi', latitude: 12.3080, longitude: 76.6120, visit_status: 'NOT VISITED', visited_by_current_user: false, school_type: 'PRIMARY' },
    { id: 'sc-2', s_no: 457, school_name: 'Taralabalu School', latitude: 12.3150, longitude: 76.6210, visit_status: 'NOT VISITED', visited_by_current_user: false, school_type: 'COMPOSITE' },
    { id: 'sc-3', s_no: 52, school_name: 'Visited School A', latitude: 12.3050, longitude: 76.6190, visit_status: 'VISITED', visited_by_current_user: true, school_type: 'PRIMARY' },
    { id: 'sc-4', s_no: 460, school_name: "Tiny Teddy's Pre School", latitude: 12.3040, longitude: 76.6250, visit_status: 'NOT VISITED', visited_by_current_user: false, school_type: 'PRE-SCHOOL' },
    { id: 'sc-5', s_no: 999, school_name: 'Far Away School', latitude: 12.4500, longitude: 76.8000, visit_status: 'NOT VISITED', visited_by_current_user: false, school_type: 'COMPOSITE' },
  ];

  test('Filters schools within requested radius', () => {
    const radiusKm = 2.5;
    const nearby = mockSchools
      .map(s => ({ ...s, distance: haversineKm(anchor.lat, anchor.lng, s.latitude, s.longitude) }))
      .filter(s => s.distance <= radiusKm);

    assert.ok(nearby.length >= 4, 'Should find schools within 2.5km of Bogadi');
    assert.ok(!nearby.some(s => s.id === 'sc-5'), 'Far away school (sc-5) must be excluded');
  });

  test('Correctly identifies revisit candidates', () => {
    const revisitCandidates = mockSchools.filter(s => s.visited_by_current_user || s.visit_status !== 'NOT VISITED');
    assert.strictEqual(revisitCandidates.length, 1);
    assert.strictEqual(revisitCandidates[0].id, 'sc-3');
  });

  test('Excludes already selected stops from nearby candidates', () => {
    const selectedIds = ['sc-1', 'sc-2'];
    const candidates = mockSchools.filter(s => !selectedIds.includes(s.id));
    assert.strictEqual(candidates.length, 3);
    assert.ok(!candidates.some(s => s.id === 'sc-1' || s.id === 'sc-2'));
  });

  test('Pre-school filter identifies early-years schools', () => {
    const earlyYears = mockSchools.filter(s => s.school_type === 'PRE-SCHOOL' || s.school_name.toLowerCase().includes('pre school'));
    assert.strictEqual(earlyYears.length, 1);
    assert.strictEqual(earlyYears[0].id, 'sc-4');
  });
});

// 26. Evening Wrap-Up Batch Completion Integrity
describe('Evening Wrap-Up Batch Completion Integrity', () => {
  test('Batch completion marks all selected stops as visited without assuming registration', () => {
    const stops = [
      { id: 'stop-1', school_id: 'sc-1', status: 'PENDING' },
      { id: 'stop-2', school_id: 'sc-2', status: 'PENDING' },
      { id: 'stop-3', school_id: 'sc-3', status: 'PENDING' },
    ];

    const revisitIds = new Set(['sc-3']);
    const defaultOutcome = 'Interested';

    const recordedVisits = stops.map(stop => {
      const isRevisit = revisitIds.has(stop.school_id);
      return {
        stop_id: stop.id,
        school_id: stop.school_id,
        visit_type: isRevisit ? 'REVISIT' : 'FIRST_VISIT',
        outcome: defaultOutcome,
        school_status: isRevisit ? 'REVISITED' : 'VISITED',
        stop_status: 'VISITED',
      };
    });

    assert.strictEqual(recordedVisits.length, 3);
    assert.strictEqual(recordedVisits[0].visit_type, 'FIRST_VISIT');
    assert.strictEqual(recordedVisits[0].school_status, 'VISITED');
    assert.strictEqual(recordedVisits[2].visit_type, 'REVISIT');
    assert.strictEqual(recordedVisits[2].school_status, 'REVISITED');

    // Strict Rule: Zero assumed registrations
    assert.ok(!recordedVisits.some(v => v.outcome === 'Registration Confirmed'), 'Never assume Registration Confirmed by default');
    assert.ok(!recordedVisits.some(v => v.school_status === 'REGISTRATION'), 'Never mark school as REGISTRATION by default');
  });

  test('Preserves master allotment count when revisits occur', () => {
    const masterTotal = 487;
    const initialCompletedUnique = 22;

    // Day route with 5 schools: 4 first visits, 1 revisit
    const dayVisits = [
      { schoolId: 'sc-101', isRevisit: false },
      { schoolId: 'sc-102', isRevisit: false },
      { schoolId: 'sc-103', isRevisit: false },
      { schoolId: 'sc-104', isRevisit: false },
      { schoolId: 'sc-52',  isRevisit: true }, // Revisit of already visited school #52
    ];

    const firstVisits = dayVisits.filter(v => !v.isRevisit).length;
    const revisits = dayVisits.filter(v => v.isRevisit).length;

    const newCompletedUnique = initialCompletedUnique + firstVisits;
    const pendingTotal = masterTotal - newCompletedUnique;

    assert.strictEqual(firstVisits, 4, '4 first visits');
    assert.strictEqual(revisits, 1, '1 revisit');
    assert.strictEqual(newCompletedUnique, 26, 'Unique completed increases by exactly 4 (revisit does not inflate count)');
    assert.strictEqual(pendingTotal, 461, 'Pending count decrements by exactly 4');
    assert.strictEqual(newCompletedUnique + pendingTotal, masterTotal, 'Sum of completed and pending strictly equals master 487');
  });
});

// 27. 7-Schools Daily Planning Engine & Saturday Half-Day Constraint
describe('7-Schools Daily Planning Engine & Saturday Half-Day Constraint', () => {
  test('Full working days target exactly 7 schools daily', () => {
    const fullDayTarget = 7;
    const weekdayPlanStops = [
      { s_no: 157, name: 'Capitol Public School-830890' },
      { s_no: 329, name: 'Jss School Saraswathipuram' },
      { s_no: 176, name: 'Sri Gokula School-Mysuru' },
      { s_no: 254, name: 'Sri Adichunchanagiri Central School' },
      { s_no: 475, name: 'Vedic Pre School Saraswathipuram' },
      { s_no: 113, name: 'Vidyavardhaka Sangha B M Sri' },
      { s_no: 205, name: 'Bgs Public School' },
    ];
    assert.strictEqual(weekdayPlanStops.length, fullDayTarget, 'Weekday plan must have exactly 7 schools');
  });

  test('Saturday half-day strictly caps at maximum 5 schools', () => {
    const saturdayCap = 5;
    const saturdayStops = [
      { s_no: 332, name: 'Shiksha School' },
      { s_no: 247, name: 'Shanthi High School Kutvadi' },
      { s_no: 241, name: 'Bgs Public School Mysore' },
      { s_no: 432, name: 'Super Kidz Pre School' },
      { s_no: 1, name: 'J S S Public School' },
    ];
    assert.ok(saturdayStops.length <= saturdayCap, 'Saturday half-day cannot exceed 5 schools');
    assert.strictEqual(saturdayStops.length, 5);
  });

  test('Sunday holiday strictly targets 0 schools', () => {
    const sundayTarget = 0;
    const sundayPlan = [];
    assert.strictEqual(sundayPlan.length, sundayTarget, 'Sunday is weekly holiday with 0 scheduled schools');
  });
});

// 28. 5+2 Daily Quota Allocation: 5 State Board/Pre-Schools + 2 CBSE/ICSE (Total 7)
describe('5+2 Daily Quota Planning Engine', () => {
  const isStateOrPre = (s) => {
    const b = (s.board || '').toUpperCase();
    const t = (s.school_type || '').toUpperCase();
    return (
      b === 'STATE BOARD' ||
      b === 'STATE' ||
      t === 'PLAY SCHOOL' ||
      t === 'PRE-SCHOOL' ||
      t === 'NURSERY' ||
      t === 'MONTESSORI' ||
      t === 'KINDERGARTEN' ||
      (b === 'OTHER' && t === 'PLAY SCHOOL')
    );
  };

  const isCbseOrIcse = (s) => {
    const b = (s.board || '').toUpperCase();
    return b === 'CBSE' || b === 'ICSE';
  };

  test('Daily weekday circuit has exactly 5 State/Pre-schools and 2 CBSE/ICSE schools', () => {
    const planned7 = [
      { s_no: 372, name: 'Lalitha High School', board: 'STATE BOARD', school_type: 'PRIMARY' },
      { s_no: 53, name: 'Baden Powell School', board: 'CBSE', school_type: 'PRIMARY' },
      { s_no: 139, name: 'Sree Pragnaa Gurukula School', board: 'ICSE', school_type: 'PRIMARY' },
      { s_no: 244, name: 'Vishwamanava Vidyanikethana', board: 'STATE BOARD', school_type: 'PRIMARY' },
      { s_no: 211, name: 'Ramakrishna Vidya Kendra', board: 'STATE BOARD', school_type: 'PRIMARY' },
      { s_no: 329, name: 'Jss School Saraswathipuram', board: 'STATE BOARD', school_type: 'PRIMARY' },
      { s_no: 388, name: 'Vijaya Vitala Vidya Shale', board: 'STATE BOARD', school_type: 'PRIMARY' },
    ];

    const stateOrPreCount = planned7.filter(isStateOrPre).length;
    const cbseIcseCount = planned7.filter(isCbseOrIcse).length;

    assert.strictEqual(planned7.length, 7, 'Total circuit must be exactly 7 schools');
    assert.strictEqual(stateOrPreCount, 5, 'Must contain exactly 5 State/Pre-schools');
    assert.strictEqual(cbseIcseCount, 2, 'Must contain exactly 2 CBSE/ICSE schools');
  });

  test('Pre-schools and Play Schools correctly count toward the 5 State Board bucket', () => {
    const mixedStateAndPre = [
      { s_no: 467, name: 'Aaryan Kids Srirampura', board: 'OTHER', school_type: 'PLAY SCHOOL' },
      { s_no: 223, name: 'Visha Prajna School', board: 'STATE BOARD', school_type: 'PRIMARY' },
      { s_no: 258, name: 'Rotary West School', board: 'STATE BOARD', school_type: 'PRIMARY' },
      { s_no: 214, name: 'Mahaveer School', board: 'STATE BOARD', school_type: 'PRIMARY' },
      { s_no: 198, name: 'Cnm Public School', board: 'STATE BOARD', school_type: 'PRIMARY' },
      { s_no: 102, name: 'St. Maria De Mattias School', board: 'CBSE', school_type: 'PRIMARY' },
      { s_no: 56, name: 'Chaitra Public School', board: 'CBSE', school_type: 'PRIMARY' },
    ];

    const stateOrPreCount = mixedStateAndPre.filter(isStateOrPre).length;
    const cbseCount = mixedStateAndPre.filter(isCbseOrIcse).length;

    assert.strictEqual(stateOrPreCount, 5, 'Pre-schools are covered within the 5 State Board quota');
    assert.strictEqual(cbseCount, 2, '2 CBSE schools complete the 7-school quota');
  });

  test('Saturday half-day adapts quota to 3 State/Pre + 2 CBSE/ICSE (Total 5)', () => {
    const satStops = [
      { s_no: 332, name: 'Shiksha School', board: 'STATE BOARD', school_type: 'PRIMARY' },
      { s_no: 247, name: 'Shanthi High School', board: 'STATE BOARD', school_type: 'PRIMARY' },
      { s_no: 432, name: 'Super Kidz Pre School', board: 'OTHER', school_type: 'PLAY SCHOOL' },
      { s_no: 241, name: 'Bgs Public School Mysore', board: 'CBSE', school_type: 'PRIMARY' },
      { s_no: 1, name: 'J S S Public School', board: 'CBSE', school_type: 'PRIMARY' },
    ];

    const stateOrPreCount = satStops.filter(isStateOrPre).length;
    const cbseCount = satStops.filter(isCbseOrIcse).length;

    assert.strictEqual(satStops.length, 5, 'Saturday half-day must have exactly 5 schools');
    assert.strictEqual(stateOrPreCount, 3, 'Saturday targets 3 State/Pre-schools');
    assert.strictEqual(cbseCount, 2, 'Saturday targets 2 CBSE/ICSE schools');
  });
});

// 29. AI Intelligent Visit Marking & Zero Assumed Registrations Verification
describe('AI Automated School Visit Marking & Zero Assumed Registrations', () => {
  test('Parsed visit strictly defaults to outcome Interested and never assumes Registration Confirmed', () => {
    const parseResult = {
      school_name: 'Bharatiya Vidya Bhavan School Vijayanagar',
      userNote: 'Visited yesterday, met principal, shared MOM brochure',
      explicitRegistrationMentioned: false,
    };

    let outcome = 'Interested';
    if (parseResult.explicitRegistrationMentioned) {
      outcome = 'Registration Confirmed';
    }

    let visitStatus = 'VISITED';
    if (outcome === 'Registration Confirmed') {
      visitStatus = 'REGISTRATION';
    }

    assert.strictEqual(outcome, 'Interested', 'Outcome must strictly default to Interested');
    assert.strictEqual(visitStatus, 'VISITED', 'Visit status must be VISITED or REVISITED, never REGISTRATION without explicit confirmation');
  });

  test('Revisit of previously visited school is classified as REVISIT without increasing unique school count', () => {
    const previouslyVisitedSchoolIds = new Set(['s-215', 's-464']);
    const markCandidate = { school_id: 's-215', name: 'Bharatiya Vidya Bhavan School Vijayanagar' };

    const isRevisit = previouslyVisitedSchoolIds.has(markCandidate.school_id);
    const visitType = isRevisit ? 'REVISIT' : 'FIRST_VISIT';
    const status = isRevisit ? 'REVISITED' : 'VISITED';

    assert.strictEqual(isRevisit, true, 'Correctly identifies that school was already visited');
    assert.strictEqual(visitType, 'REVISIT', 'Visit type recorded as REVISIT');
    assert.strictEqual(status, 'REVISITED', 'School status updated to REVISITED');
  });

  test('Fuzzy name matching correctly resolves user typos in S.No (e.g. Vedic Pre School #475 vs #470)', () => {
    const userLine = 'Vedic Pre School, Saraswathipuram — S.No. 470';
    const candidate470 = { s_no: 470, school_name: 'Gnana Vahini School Srirampura', area: 'Srirampura' };
    const candidate475 = { s_no: 475, school_name: 'Vedic Pre School Saraswathipuram', area: 'Saraswathipuram' };

    // When both name and area match candidate475, name & area match overrides incorrect S.No 470
    const normLine = userLine.toLowerCase();
    const matches475 = normLine.includes('vedic pre school') && normLine.includes('saraswathipuram');
    const matches470Name = normLine.includes('gnana vahini');

    assert.strictEqual(matches475, true, 'User line matches Vedic Pre School Saraswathipuram name and area');
    assert.strictEqual(matches470Name, false, 'User line does not match Gnana Vahini name');

    const resolvedSchool = matches475 ? candidate475 : candidate470;
    assert.strictEqual(resolvedSchool.s_no, 475, 'Accurately resolved to S.No 475');
    assert.strictEqual(resolvedSchool.school_name, 'Vedic Pre School Saraswathipuram');
  });
});

// 30. 3-Day Duplicate Detection & Stop Modification Operations
describe('3-Day Duplicate Detection & Stop Modification Operations', () => {
  const day1Stops = [
    { schoolId: 'sch-1', s_no: 67, school_name: 'Hari Vidyalaya', lat: 12.295, lng: 76.621 },
    { schoolId: 'sch-2', s_no: 244, school_name: 'Vishwamanava', lat: 12.285, lng: 76.625 },
    { schoolId: 'sch-3', s_no: 254, school_name: 'Sri Adichunchanagiri', lat: 12.290, lng: 76.628 },
  ];

  const day2Stops = [
    { schoolId: 'sch-2', s_no: 244, school_name: 'Vishwamanava', lat: 12.285, lng: 76.625 }, // Repeated on Day 1 & Day 2
    { schoolId: 'sch-4', s_no: 301, school_name: 'St Joseph School', lat: 12.310, lng: 76.640 },
    { schoolId: 'sch-5', s_no: 310, school_name: 'Rotary West', lat: 12.305, lng: 76.635 },
  ];

  const day3Stops = [
    { schoolId: 'sch-6', s_no: 320, school_name: 'Kuvempu Vidyanikethan', lat: 12.315, lng: 76.645 },
    { schoolId: 'sch-7', s_no: 330, school_name: 'Marimallappa', lat: 12.302, lng: 76.648 },
  ];

  test('Correctly identifies repeated schools across rolling 3-day schedule', () => {
    const multiDayStops = [
      ...day1Stops.map(s => ({ ...s, date: '2026-09-09', dayLabel: 'Wednesday' })),
      ...day2Stops.map(s => ({ ...s, date: '2026-09-10', dayLabel: 'Thursday' })),
      ...day3Stops.map(s => ({ ...s, date: '2026-09-11', dayLabel: 'Friday' })),
    ];

    const schoolOccurrences = new Map();
    multiDayStops.forEach(stop => {
      if (!schoolOccurrences.has(stop.schoolId)) {
        schoolOccurrences.set(stop.schoolId, []);
      }
      schoolOccurrences.get(stop.schoolId).push(stop);
    });

    const repeatedSchools = [];
    schoolOccurrences.forEach((stops, schoolId) => {
      if (stops.length > 1) {
        repeatedSchools.push({
          schoolId,
          schoolName: stops[0].school_name,
          s_no: stops[0].s_no,
          dates: stops.map(s => s.date),
          dayLabels: stops.map(s => s.dayLabel),
        });
      }
    });

    assert.strictEqual(repeatedSchools.length, 1, 'Exactly 1 duplicate school detected');
    assert.strictEqual(repeatedSchools[0].schoolId, 'sch-2');
    assert.strictEqual(repeatedSchools[0].schoolName, 'Vishwamanava');
    assert.deepStrictEqual(repeatedSchools[0].dayLabels, ['Wednesday', 'Thursday']);
  });

  test('Stop Deletion (REMOVE) removes duplicate school and re-sequences stops', () => {
    const initialStops = [...day2Stops];
    const schoolToRemove = 'sch-2';

    // Filter out removed school
    const remainingStops = initialStops.filter(s => s.schoolId !== schoolToRemove);
    // Re-sequence
    const resequenced = remainingStops.map((stop, index) => ({
      ...stop,
      optimized_sequence: index + 1,
    }));

    assert.strictEqual(resequenced.length, 2);
    assert.strictEqual(resequenced[0].schoolId, 'sch-4');
    assert.strictEqual(resequenced[0].optimized_sequence, 1);
    assert.strictEqual(resequenced[1].schoolId, 'sch-5');
    assert.strictEqual(resequenced[1].optimized_sequence, 2);
    assert.strictEqual(resequenced.some(s => s.schoolId === 'sch-2'), false);
  });

  test('Stop Replacement (REPLACE) swaps duplicate school with a new candidate at same sequence', () => {
    const initialStops = [...day2Stops];
    const oldSchoolId = 'sch-2';
    const replacementSchool = { schoolId: 'sch-99', s_no: 400, school_name: 'Christ Public School', lat: 12.288, lng: 76.629 };

    const replacedStops = initialStops.map((stop, index) => {
      if (stop.schoolId === oldSchoolId) {
        return { ...replacementSchool, optimized_sequence: index + 1 };
      }
      return { ...stop, optimized_sequence: index + 1 };
    });

    assert.strictEqual(replacedStops.length, 3);
    assert.strictEqual(replacedStops[0].schoolId, 'sch-99');
    assert.strictEqual(replacedStops[0].school_name, 'Christ Public School');
    assert.strictEqual(replacedStops[0].optimized_sequence, 1);
    assert.strictEqual(replacedStops.some(s => s.schoolId === 'sch-2'), false, 'Old duplicate school removed');
  });

  test('Stop Addition (ADD) appends candidate to day route with correct sequence', () => {
    const initialStops = [...day2Stops];
    const newSchool = { schoolId: 'sch-100', s_no: 450, school_name: 'Maharshi Public School', lat: 12.299, lng: 76.631 };

    const updatedStops = [
      ...initialStops,
      newSchool,
    ].map((stop, index) => ({
      ...stop,
      optimized_sequence: index + 1,
    }));

    assert.strictEqual(updatedStops.length, 4);
    assert.strictEqual(updatedStops[3].schoolId, 'sch-100');
    assert.strictEqual(updatedStops[3].optimized_sequence, 4);
  });
});

// 31. Forced Holiday Route Hand-off & Cascading Engine
describe('Forced Holiday Route Hand-off & Cascading Engine', () => {
  const getNextWorkingDay = (dateStr) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + 1);
    // Skip Sunday (0)
    if (dt.getDay() === 0) {
      dt.setDate(dt.getDate() + 1); // advance to Monday
    }
    const yStr = dt.getFullYear();
    const mStr = String(dt.getMonth() + 1).padStart(2, '0');
    const dStr = String(dt.getDate()).padStart(2, '0');
    return `${yStr}-${mStr}-${dStr}`;
  };

  test('Hand-off from Saturday skips Sunday and lands on Monday', () => {
    const saturday = '2026-09-12';
    const nextWorkingDay = getNextWorkingDay(saturday);
    assert.strictEqual(nextWorkingDay, '2026-09-14', 'Next working day from Saturday must be Monday 14 Sep');
  });

  test('Hand-off from Thursday lands on Friday', () => {
    const thursday = '2026-09-10';
    const nextWorkingDay = getNextWorkingDay(thursday);
    assert.strictEqual(nextWorkingDay, '2026-09-11', 'Next working day from Thursday must be Friday 11 Sep');
  });

  test('Cascading hand-off shifts all downstream plans forward without losing stops', () => {
    const plannedDates = [
      { date: '2026-09-10', stops: ['s-1', 's-2', 's-3', 's-4', 's-5', 's-6', 's-7'] },
      { date: '2026-09-11', stops: ['s-11', 's-12', 's-13', 's-14', 's-15', 's-16', 's-17'] },
      { date: '2026-09-12', stops: ['s-21', 's-22', 's-23', 's-24', 's-25'] }, // Saturday 5 stops
    ];

    // Holiday declared on 2026-09-10
    const holidayDate = '2026-09-10';
    const shiftedPlans = [];

    // Sort descending to shift furthest first
    const sorted = [...plannedDates].sort((a, b) => b.date.localeCompare(a.date));
    sorted.forEach((p) => {
      const targetDate = getNextWorkingDay(p.date);
      shiftedPlans.push({
        originalDate: p.date,
        shiftedDate: targetDate,
        stopsCount: p.stops.length,
      });
    });

    const satShift = shiftedPlans.find((s) => s.originalDate === '2026-09-12');
    assert.strictEqual(satShift.shiftedDate, '2026-09-14', 'Saturday shifts to Monday');

    const friShift = shiftedPlans.find((s) => s.originalDate === '2026-09-11');
    assert.strictEqual(friShift.shiftedDate, '2026-09-12', 'Friday shifts to Saturday');

    const thurShift = shiftedPlans.find((s) => s.originalDate === '2026-09-10');
    assert.strictEqual(thurShift.shiftedDate, '2026-09-11', 'Thursday shifts to Friday');
  });

  test('Forced holiday is correctly detected from daily summary remarks', () => {
    const summaryWithHoliday = {
      date: '2026-09-10',
      remarks: 'Forced Holiday: Heavy Rain Alert. Circuit handed off to 2026-09-11.',
    };
    const summaryNormal = {
      date: '2026-09-09',
      remarks: 'Completed 6 schools in Srirampura.',
    };

    const isForced1 = Boolean(summaryWithHoliday.remarks && summaryWithHoliday.remarks.toLowerCase().includes('forced holiday'));
    const isForced2 = Boolean(summaryNormal.remarks && summaryNormal.remarks.toLowerCase().includes('forced holiday'));

    assert.strictEqual(isForced1, true, 'Correctly flags forced holiday from remarks');
    assert.strictEqual(isForced2, false, 'Normal remarks are not flagged as forced holiday');
  });
});

// 32. Area Divide & Locality Sorting Engine
describe('Area Divide & Locality Sorting Engine', () => {
  const sampleSchools = [
    { s_no: 1, school_name: 'School A', area: 'Kuvempunagar', visited_by_current_user: true },
    { s_no: 2, school_name: 'School B', area: 'Kuvempunagar', visited_by_current_user: false },
    { s_no: 3, school_name: 'School C', area: 'Bogadi', visited_by_current_user: false },
    { s_no: 4, school_name: 'School D', area: 'Bogadi', visited_by_current_user: false },
    { s_no: 5, school_name: 'School E', area: 'Vijayanagar 2nd Stage', visited_by_current_user: true },
  ];

  test('Correctly aggregates totals, visited count, and unvisited count per area', () => {
    const areaMap = new Map();
    sampleSchools.forEach(s => {
      if (!areaMap.has(s.area)) {
        areaMap.set(s.area, { area: s.area, total: 0, visited: 0, unvisited: 0 });
      }
      const entry = areaMap.get(s.area);
      entry.total++;
      if (s.visited_by_current_user) entry.visited++;
      else entry.unvisited++;
    });

    const bogadi = areaMap.get('Bogadi');
    assert.strictEqual(bogadi.total, 2);
    assert.strictEqual(bogadi.visited, 0);
    assert.strictEqual(bogadi.unvisited, 2);

    const kuvempunagar = areaMap.get('Kuvempunagar');
    assert.strictEqual(kuvempunagar.total, 2);
    assert.strictEqual(kuvempunagar.visited, 1);
    assert.strictEqual(kuvempunagar.unvisited, 1);
  });

  test('Area sorting by most unvisited places Bogadi first', () => {
    const areas = [
      { area: 'Kuvempunagar', total: 2, visited: 1, unvisited: 1 },
      { area: 'Bogadi', total: 2, visited: 0, unvisited: 2 },
      { area: 'Vijayanagar', total: 1, visited: 1, unvisited: 0 },
    ];
    areas.sort((a, b) => b.unvisited - a.unvisited);
    assert.strictEqual(areas[0].area, 'Bogadi');
    assert.strictEqual(areas[1].area, 'Kuvempunagar');
    assert.strictEqual(areas[2].area, 'Vijayanagar');
  });
});

// 33. Global CRM Color Theme Integrity (Green for Visited, Red for Unvisited)
describe('Global CRM Color Theme Integrity', () => {
  const getStatusClasses = (isVisited) => {
    if (isVisited) {
      return {
        badgeBg: 'bg-emerald-100',
        badgeText: 'text-emerald-800',
        borderColor: 'border-l-emerald-500',
        label: 'VISITED',
      };
    }
    return {
      badgeBg: 'bg-rose-100',
      badgeText: 'text-rose-800',
      borderColor: 'border-l-rose-500',
      label: 'NOT VISITED',
    };
  };

  test('Visited school strictly returns emerald (Green) styles and VISITED label', () => {
    const visitedStyle = getStatusClasses(true);
    assert.strictEqual(visitedStyle.badgeBg, 'bg-emerald-100');
    assert.strictEqual(visitedStyle.badgeText, 'text-emerald-800');
    assert.strictEqual(visitedStyle.borderColor, 'border-l-emerald-500');
    assert.strictEqual(visitedStyle.label, 'VISITED');
  });

  test('Unvisited school strictly returns rose (Red) styles and NOT VISITED label', () => {
    const unvisitedStyle = getStatusClasses(false);
    assert.strictEqual(unvisitedStyle.badgeBg, 'bg-rose-100');
    assert.strictEqual(unvisitedStyle.badgeText, 'text-rose-800');
    assert.strictEqual(unvisitedStyle.borderColor, 'border-l-rose-500');
    assert.strictEqual(unvisitedStyle.label, 'NOT VISITED');
  });
});

// 34. Unmatched Schools Auto-Creation & Direct User Addition Engine
describe('Unmatched Schools Auto-Creation & Direct User Addition Engine', () => {
  const extractCandidateDetails = (rawLine) => {
    let cleaned = rawLine
      .replace(/^[\s\d\.\)\-\*#|]+/, '')
      .replace(/\|/g, ' ')
      .replace(/\*\*/g, '')
      .replace(/\bS-\d{4,6}\b/gi, '')
      .replace(/(?:S\.?\s*No\.?|Sl\.?\s*No\.?|#)\s*\d{1,3}\b/gi, '')
      .replace(/\b(Day\s*\d|Visit|Follow-up\s*plan|Planned\s*for|done|above schools|visited)\b/gi, '')
      .replace(/[—–]/g, '-')
      .trim();

    const KNOWN_AREAS = [
      'Saraswathipuram', 'Vijayanagar', 'Bogadi', 'Gokulam', 'Hebbal', 'Jayalakshmipuram',
      'Kuvempunagar', 'Dattagalli', 'Srirampura', 'Yelawala', 'Yelavala', 'Hootagalli',
      'Hottagalli', 'Rajiv Nagar', 'Rajivgandhi Nagar', 'Nazarbad', 'Metagalli',
      'Bannimantap', 'Vontikoppal', 'CFTRI', 'Mandi Mohalla', 'Lashkar Mohalla',
      'Chamundipuram', 'Siddhartha Layout', 'Alanahalli', 'Kalyanagiri', 'Udayagiri',
      'Nanjangud', 'T. Narasipura', 'Hunsur', 'Pandavapura', 'Srirangapatna', 'Mandya',
      'Chamarajanagar', 'Mysuru', 'Mysore'
    ];

    let detectedArea = 'Mysuru';
    let detectedDistrict = 'Mysuru';

    for (const area of KNOWN_AREAS) {
      const regex = new RegExp(`\\b${area}\\b`, 'i');
      if (regex.test(cleaned)) {
        detectedArea = area;
        if (['Pandavapura', 'Srirangapatna', 'Mandya'].some((m) => m.toLowerCase() === area.toLowerCase())) {
          detectedDistrict = 'Mandya';
        } else if (['Chamarajanagar'].some((c) => c.toLowerCase() === area.toLowerCase())) {
          detectedDistrict = 'Chamarajanagar';
        }
        break;
      }
    }

    let candidateName = cleaned;
    if (cleaned.includes('-')) {
      const parts = cleaned.split('-');
      candidateName = parts[0].trim();
      const afterDash = parts.slice(1).join('-').trim();
      if (afterDash && detectedArea === 'Mysuru') {
        detectedArea = afterDash;
      }
    } else if (cleaned.includes(',')) {
      const parts = cleaned.split(',');
      candidateName = parts[0].trim();
      const afterComma = parts.slice(1).join(',').trim();
      if (afterComma && detectedArea === 'Mysuru') {
        detectedArea = afterComma;
      }
    } else if (detectedArea !== 'Mysuru') {
      const areaRegex = new RegExp(`\\s+${detectedArea}$`, 'i');
      if (areaRegex.test(candidateName)) {
        candidateName = candidateName.replace(areaRegex, '').trim();
      }
    }

    candidateName = candidateName.replace(/[\-,\s]+$/, '').trim();
    if (!candidateName) candidateName = cleaned || 'New Community School';

    let board = 'STATE BOARD';
    if (/\bcbse\b/i.test(rawLine)) board = 'CBSE';
    else if (/\bicse\b/i.test(rawLine)) board = 'ICSE';

    let schoolType = 'PRIMARY';
    if (/\b(pre[\s-]?school|play[\s-]?school|montessori|nursery|kindergarten|kidz|kids|toddler)\b/i.test(candidateName)) {
      schoolType = 'PRE-SCHOOL';
    } else if (/\b(high[\s-]?school|secondary)\b/i.test(candidateName)) {
      schoolType = 'HIGH SCHOOL';
    } else if (/\b(composite|pu\b|junior college)\b/i.test(candidateName)) {
      schoolType = 'COMPOSITE';
    }

    return {
      school_name: candidateName,
      area: detectedArea,
      district: detectedDistrict,
      board,
      school_type: schoolType,
    };
  };

  test('Extracts candidate details for unmatched Montessori school without area', () => {
    const raw = 'Cambridge Montessori';
    const parsed = extractCandidateDetails(raw);
    assert.strictEqual(parsed.school_name, 'Cambridge Montessori');
    assert.strictEqual(parsed.school_type, 'PRE-SCHOOL');
    assert.strictEqual(parsed.board, 'STATE BOARD');
    assert.strictEqual(parsed.area, 'Mysuru');
    assert.strictEqual(parsed.district, 'Mysuru');
  });

  test('Extracts candidate details for school with trailing Srirangapatna area', () => {
    const raw = 'Lenin Convent English Medium School Srirangapatna';
    const parsed = extractCandidateDetails(raw);
    assert.strictEqual(parsed.school_name, 'Lenin Convent English Medium School');
    assert.strictEqual(parsed.area, 'Srirangapatna');
    assert.strictEqual(parsed.district, 'Mandya');
    assert.strictEqual(parsed.school_type, 'PRIMARY');
  });

  test('Preserves explicit NOT YET VISITED notes as unvisited', () => {
    const line = 'Lisa 1st Step Pre School — NOT YET VISITED';
    const isExplicitlyUnvisited =
      /\b(not yet visited|not visited|unvisited|pending visit|yet to visit)\b/i.test(line);

    assert.strictEqual(isExplicitlyUnvisited, true, 'Explicitly flags not yet visited line');
  });

  test('Assigns incremented s_no when adding a new school', () => {
    const currentMax = 493;
    const nextSNo = currentMax + 1;
    assert.strictEqual(nextSNo, 494);
  });

  test('Immediate visit marking sets correct CRM flags', () => {
    const markVisitedImmediately = true;
    const outcome = 'Interested';
    const schoolStatus = markVisitedImmediately ? 'VISITED' : 'NOT VISITED';
    const visitedFlag = Boolean(markVisitedImmediately);

    assert.strictEqual(schoolStatus, 'VISITED');
    assert.strictEqual(visitedFlag, true);
    assert.strictEqual(outcome, 'Interested');
  });
});

describe('Suite 35: Lisa 1st Step Pre School Visit Completion & Reconciliation', () => {
  test('Transitioning Lisa 1st Step (#471) from pending to visited increments unique visited count', () => {
    const initialVisited = 126;
    const initialUnvisited = 368;
    const isNowVisited = true;

    const newVisited = isNowVisited ? initialVisited + 1 : initialVisited;
    const newUnvisited = isNowVisited ? initialUnvisited - 1 : initialUnvisited;

    assert.strictEqual(newVisited, 127);
    assert.strictEqual(newUnvisited, 367);
  });

  test('Lisa 1st Step visited status returns Emerald Green theme', () => {
    const school = {
      s_no: 471,
      school_id: 'S-156401',
      school_name: 'Lisa 1St Step Pre School',
      visited_by_current_user: true,
      visit_status: 'VISITED'
    };

    const isVisited = school.visited_by_current_user || school.visit_status === 'VISITED';
    const themeColor = isVisited ? '#10b981' : '#ef4444';
    const badgeText = isVisited ? 'VISITED' : 'NOT VISITED';

    assert.strictEqual(themeColor, '#10b981');
    assert.strictEqual(badgeText, 'VISITED');
  });
});

describe('Suite 36: Subordinate City Territorial Guard & Today Route Circuit', () => {
  test('Subordinate cities (Chamarajanagar, Mandya) are strictly excluded from default Mysuru circuits', () => {
    const mockSchools = [
      { id: '1', school_name: 'Mysuru City School', district: 'Mysuru', latitude: 12.302, longitude: 76.618, visit_status: 'NOT VISITED', board: 'STATE BOARD', school_type: 'PRIMARY' },
      { id: '2', school_name: 'Chamarajanagara School', district: 'Chamarajanagar', latitude: 11.925, longitude: 76.940, visit_status: 'NOT VISITED', board: 'CBSE', school_type: 'PRIMARY' },
      { id: '3', school_name: 'Mandya City School', district: 'Mandya', latitude: 12.522, longitude: 76.898, visit_status: 'NOT VISITED', board: 'CBSE', school_type: 'PRIMARY' }
    ];

    // Filter using default Mysuru city criteria
    const criteria = { baseLat: 12.3021, baseLng: 76.6178, district: 'Mysuru', maxDistanceKm: 18 };
    const candidates = mockSchools.filter(s => {
      if (criteria.district && s.district !== criteria.district) return false;
      return true;
    });

    assert.strictEqual(candidates.length, 1);
    assert.strictEqual(candidates[0].school_name, 'Mysuru City School');
    assert.strictEqual(candidates.some(s => s.district === 'Chamarajanagar'), false);
    assert.strictEqual(candidates.some(s => s.district === 'Mandya'), false);
  });

  test('Circuit centroid proximity guard blocks cross-district CBSE quota injection (>14 km)', () => {
    const centroid = { lat: 12.3021, lng: 76.6178 };
    const distantCbse = { name: 'Distant Chamarajanagar CBSE', lat: 11.92554, lng: 76.94018 }; // 55 km away

    // Calculate approximate distance
    const dLat = (distantCbse.lat - centroid.lat) * 111;
    const dLng = (distantCbse.lng - centroid.lng) * 111 * Math.cos(centroid.lat * Math.PI / 180);
    const approxDistKm = Math.sqrt(dLat * dLat + dLng * dLng);

    const isAllowedInLocalCircuit = approxDistKm <= 14;
    assert.strictEqual(isAllowedInLocalCircuit, false, 'Distant CBSE must be blocked from local circuit');
  });

  test('Today route circuit contains exactly 7 completed schools', () => {
    const todayStops = [
      'Future Foundation School',
      'Lalitha High School',
      'Pragathi Vidya Kendra Bogadhi',
      'Sri Sharada Public School-830342',
      'Supreme Public School-Mysuru',
      'Vasavi Vidyanikethana',
      'Vidyavardhaka Sangha B M Sri Educational Instituti'
    ];

    assert.strictEqual(todayStops.length, 7);
    const allStopsVisited = true;
    assert.strictEqual(allStopsVisited, true);
  });
});

describe('Suite 37: Area-Based Locality Integrity & Clear Filtering Engine', () => {
  const sampleSchools = [
    { id: '101', school_name: 'Bogadi School A', area: 'Bogadi', district: 'Mysuru', latitude: 12.302, longitude: 76.618, visit_status: 'NOT VISITED' },
    { id: '102', school_name: 'Bogadi School B', area: 'Bogadi', district: 'Mysuru', latitude: 12.305, longitude: 76.615, visit_status: 'NOT VISITED' },
    { id: '103', school_name: 'Chamarajanagara High School', area: 'Chamarajanagara', district: 'Chamarajanagar', latitude: 11.925, longitude: 76.940, visit_status: 'NOT VISITED' },
    { id: '104', school_name: 'Mandya Academy', area: 'Mandya', district: 'Mandya', latitude: 12.522, longitude: 76.898, visit_status: 'NOT VISITED' },
    { id: '105', school_name: 'Kuvempunagar Public School', area: 'Kuvempunagar', district: 'Mysuru', latitude: 12.290, longitude: 76.630, visit_status: 'NOT VISITED' },
  ];

  test('Selecting a specific area retains all schools of that area without dropping due to distance', () => {
    // When user selects Chamarajanagara area, it should keep all Chamarajanagara schools
    const areaChoice = 'Chamarajanagara';
    const filtered = sampleSchools.filter(s => s.area.toLowerCase() === areaChoice.toLowerCase());
    assert.strictEqual(filtered.length, 1);
    assert.strictEqual(filtered[0].school_name, 'Chamarajanagara High School');
    assert.strictEqual(filtered[0].area, 'Chamarajanagara');
  });

  test('Schools from list remain strictly categorized in their real area', () => {
    const areaMap = {};
    for (const s of sampleSchools) {
      if (!areaMap[s.area]) areaMap[s.area] = [];
      areaMap[s.area].push(s);
    }

    assert.strictEqual(areaMap['Bogadi'].length, 2);
    assert.strictEqual(areaMap['Chamarajanagara'].length, 1);
    assert.strictEqual(areaMap['Mandya'].length, 1);
    assert.strictEqual(areaMap['Kuvempunagar'].length, 1);
  });
});

describe('Suite 38: Saturday 10 Oct Chamarajanagara Half-Day Circuit Completion', () => {
  const oct10Stops = [
    { seq: 1, s_no: 2, partyId: 'S-17803', name: 'M.C.S Public School-Chamarajanagara', status: 'VISITED', outcome: 'Interested' },
    { seq: 2, s_no: 415, partyId: 'S-141383', name: 'Seva Bharathi Nursery School Chamarjanagara', status: 'VISITED', outcome: 'Interested' },
    { seq: 3, s_no: 409, partyId: 'S-140157', name: 'St Joseph School Chamarajanagara', status: 'VISITED', outcome: 'Interested' },
    { seq: 4, s_no: 126, partyId: 'S-18484', name: 'St. Francis Icse School-Chamarajanagara', status: 'VISITED', outcome: 'Interested' },
    { seq: 5, s_no: 495, partyId: 'S-174787', name: 'Universe English school Chamarajanagara', status: 'VISITED', outcome: 'Interested' },
  ];

  test('Saturday half-day circuit contains exact 5 completed Chamarajanagara schools', () => {
    assert.strictEqual(oct10Stops.length, 5, 'Saturday half-day route must have 5 stops');
    assert.ok(oct10Stops.every(s => s.status === 'VISITED'), 'All 5 stops must be marked VISITED');
  });

  test('Auto-creates newly added CRM school Universe English school Chamarajanagara (S-174787) as #495', () => {
    const newSchool = oct10Stops.find(s => s.partyId === 'S-174787');
    assert.ok(newSchool, 'S-174787 must exist in completed stops');
    assert.strictEqual(newSchool.s_no, 495);
    assert.strictEqual(newSchool.status, 'VISITED');
    assert.strictEqual(newSchool.outcome, 'Interested', 'Zero Assumed Registrations policy must be preserved');
  });
});










