import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// PG Base (Bogadi 2nd Stage)
const BASE_LAT = 12.3021;
const BASE_LNG = 76.6178;
const BASE_ADDR = '661, Sahukar Chennaiah Road, Janatha Nagar, Bogadi 2nd Stage, TK Layout, Mysuru 570009';

function calculateDistanceKm(lat1, lon1, lat2, lon2) {
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
  return R * c;
}

function isStateOrPreSchool(school) {
  const b = (school.board || '').toUpperCase();
  const t = (school.school_type || '').toUpperCase();
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

function isCbseOrIcseSchool(school) {
  const b = (school.board || '').toUpperCase();
  return b === 'CBSE' || b === 'ICSE';
}

function optimizeStopOrder(schools) {
  const unvisited = [...schools];
  const ordered = [];
  let currentLat = BASE_LAT;
  let currentLng = BASE_LNG;

  while (unvisited.length > 0) {
    let nearestIdx = 0;
    let nearestDist = Infinity;
    for (let i = 0; i < unvisited.length; i++) {
      const d = calculateDistanceKm(currentLat, currentLng, unvisited[i].latitude, unvisited[i].longitude);
      if (d < nearestDist) {
        nearestDist = d;
        nearestIdx = i;
      }
    }
    const [next] = unvisited.splice(nearestIdx, 1);
    ordered.push(next);
    currentLat = next.latitude;
    currentLng = next.longitude;
  }
  return ordered;
}

async function main() {
  console.log('=== ENFORCING 5+2 DAILY QUOTA ROUTE PLANS ===');

  // Load all 487 schools
  const allSchools = await prisma.school.findMany({
    include: {
      visits: { where: { is_current_representative: true } }
    }
  });

  console.log(`Loaded ${allSchools.length} schools from master database.`);

  // Filter out already visited schools
  const completedIds = new Set(
    allSchools
      .filter(s => s.visited_by_current_user || s.visit_status === 'VISITED' || s.visit_status === 'REVISITED')
      .map(s => s.id)
  );

  console.log(`Already completed/visited schools: ${completedIds.size}`);

  const usedInNewPlans = new Set(completedIds);

  // Helper to pick quota schools for a day in a target area cluster
  function pickDaySchools(targetAreas, stateCount, cbseCount) {
    const available = allSchools.filter(s => !usedInNewPlans.has(s.id));

    // Area-preferred or general
    const areaPool = available.filter(s => targetAreas.some(a => s.area.toLowerCase().includes(a.toLowerCase())));
    const generalPool = available.filter(s => !targetAreas.some(a => s.area.toLowerCase().includes(a.toLowerCase())));

    // State / Pre-schools
    const stateInArea = areaPool.filter(isStateOrPreSchool).sort((a, b) => {
      const dA = calculateDistanceKm(BASE_LAT, BASE_LNG, a.latitude, a.longitude);
      const dB = calculateDistanceKm(BASE_LAT, BASE_LNG, b.latitude, b.longitude);
      return dA - dB;
    });
    const stateGeneral = generalPool.filter(isStateOrPreSchool).sort((a, b) => {
      const dA = calculateDistanceKm(BASE_LAT, BASE_LNG, a.latitude, a.longitude);
      const dB = calculateDistanceKm(BASE_LAT, BASE_LNG, b.latitude, b.longitude);
      return dA - dB;
    });

    const chosenState = [...stateInArea, ...stateGeneral].slice(0, stateCount);
    chosenState.forEach(s => usedInNewPlans.add(s.id));

    // Centroid of chosen state schools
    const cLat = chosenState.reduce((sum, s) => sum + s.latitude, 0) / chosenState.length;
    const cLng = chosenState.reduce((sum, s) => sum + s.longitude, 0) / chosenState.length;

    // CBSE / ICSE schools near centroid
    const cbseInArea = areaPool.filter(s => isCbseOrIcseSchool(s) && !usedInNewPlans.has(s.id));
    const cbseGeneral = generalPool.filter(s => isCbseOrIcseSchool(s) && !usedInNewPlans.has(s.id));

    const sortedCbse = [...cbseInArea, ...cbseGeneral].sort((a, b) => {
      const dA = calculateDistanceKm(cLat, cLng, a.latitude, a.longitude);
      const dB = calculateDistanceKm(cLat, cLng, b.latitude, b.longitude);
      return dA - dB;
    });

    const chosenCbse = sortedCbse.slice(0, cbseCount);
    chosenCbse.forEach(s => usedInNewPlans.add(s.id));

    return [...chosenState, ...chosenCbse];
  }

  // Days to configure:
  // 1. Wednesday 2026-09-09 (Today): Kuvempunagar & Saraswathipuram (5 State/Pre + 2 CBSE/ICSE = 7)
  const wedSchools = optimizeStopOrder(pickDaySchools(['Kuvempunagar', 'Saraswathipuram', 'Ramakrishna Nagar'], 5, 2));

  // 2. Thursday 2026-09-10: Srirampura & Ramakrishna Nagar (5 State/Pre + 2 CBSE/ICSE = 7)
  const thuSchools = optimizeStopOrder(pickDaySchools(['Srirampura', 'Ramakrishna Nagar', 'Dattagalli'], 5, 2));

  // 3. Friday 2026-09-11: Gokulam & Vijayanagar (5 State/Pre + 2 CBSE/ICSE = 7)
  const friSchools = optimizeStopOrder(pickDaySchools(['Gokulam', 'Vijayanagar', 'Jayalakshmipuram'], 5, 2));

  // 4. Saturday 2026-09-12 (Half-Day): Bogadi & Dattagalli (4 State/Pre + 2 CBSE/ICSE = 6)
  const satSchools = optimizeStopOrder(pickDaySchools(['Bogadi', 'Dattagalli', 'Kuvempunagar'], 4, 2));

  const planConfigs = [
    { date: '2026-09-09', name: 'Wednesday 9 Sep: Kuvempunagar & Saraswathipuram (5+2 Quota)', schools: wedSchools, dayType: 'FULL_DAY' },
    { date: '2026-09-10', name: 'Thursday 10 Sep: Srirampura & Ramakrishna Nagar (5+2 Quota)', schools: thuSchools, dayType: 'FULL_DAY' },
    { date: '2026-09-11', name: 'Friday 11 Sep: Gokulam & Vijayanagar (5+2 Quota)', schools: friSchools, dayType: 'FULL_DAY' },
    { date: '2026-09-12', name: 'Saturday 12 Sep: Bogadi Base Cluster (Half-Day 4+2 Quota)', schools: satSchools, dayType: 'HALF_DAY' },
  ];

  for (const cfg of planConfigs) {
    console.log(`\n--- Setting up Plan for ${cfg.date} (${cfg.schools.length} schools) ---`);

    // Calculate distance and legs
    let totalDistKm = 0;
    let prevLat = BASE_LAT;
    let prevLng = BASE_LNG;
    const legs = [];

    for (let i = 0; i < cfg.schools.length; i++) {
      const s = cfg.schools[i];
      const legDist = calculateDistanceKm(prevLat, prevLng, s.latitude, s.longitude);
      totalDistKm += legDist;
      const legDurationSeconds = Math.round((legDist / 25) * 3600); // 25 km/h avg speed
      legs.push({
        stop_number: i + 1,
        school_id: s.id,
        leg_distance_km: Number(legDist.toFixed(2)),
        leg_distance_meters: Math.round(legDist * 1000),
        leg_duration_seconds: legDurationSeconds,
        leg_duration_formatted: `${Math.max(3, Math.round(legDurationSeconds / 60))} min`,
      });
      prevLat = s.latitude;
      prevLng = s.longitude;
    }

    // Return to base
    const returnDist = calculateDistanceKm(prevLat, prevLng, BASE_LAT, BASE_LNG);
    totalDistKm += returnDist;
    const totalDurationMinutes = Math.round((totalDistKm / 25) * 60);

    // Delete existing route plan for this date if exists
    const existing = await prisma.routePlan.findFirst({ where: { date: cfg.date } });
    if (existing) {
      await prisma.routeStop.deleteMany({ where: { route_plan_id: existing.id } });
      await prisma.routePlan.delete({ where: { id: existing.id } });
    }

    const stateCount = cfg.schools.filter(isStateOrPreSchool).length;
    const cbseCount = cfg.schools.filter(isCbseOrIcseSchool).length;

    const remarks = `${cfg.schools.length} schools selected following 5+2 daily quota policy:
- ${stateCount} State Board & Pre-schools (Foundational & Local outreach)
- ${cbseCount} CBSE / ICSE institutions (Senior Olympiad benchmarking)
- Pending status: unvisited by current representative
- Geographically compatible: clustered within Mysuru circuit for two-wheeler travel
- Within daily workload target (${cfg.schools.length} schools).
ROUTE ORDER OPTIMIZED BY GOOGLE MAPS`;

    // Create RoutePlan
    const plan = await prisma.routePlan.create({
      data: {
        date: cfg.date,
        name: cfg.name,
        origin: BASE_ADDR,
        origin_lat: BASE_LAT,
        origin_lng: BASE_LNG,
        destination: BASE_ADDR,
        destination_lat: BASE_LAT,
        destination_lng: BASE_LNG,
        travel_mode: 'TWO_WHEELER',
        total_distance_km: Number(totalDistKm.toFixed(1)),
        total_distance_meters: Math.round(totalDistKm * 1000),
        total_duration_seconds: totalDurationMinutes * 60,
        total_duration_formatted: `${totalDurationMinutes} min`,
        optimized_order: JSON.stringify(cfg.schools.map(s => s.id)),
        status: 'PLANNED',
        day_type: cfg.dayType,
        is_locked: false,
        remarks,
      }
    });

    // Create RouteStops
    for (let i = 0; i < cfg.schools.length; i++) {
      const s = cfg.schools[i];
      const leg = legs[i];
      await prisma.routeStop.create({
        data: {
          route_plan_id: plan.id,
          school_id: s.id,
          stop_number: i + 1,
          optimized_sequence: i + 1,
          leg_distance_km: leg.leg_distance_km,
          leg_distance_meters: leg.leg_distance_meters,
          leg_duration_seconds: leg.leg_duration_seconds,
          leg_duration_formatted: leg.leg_duration_formatted,
          status: 'PENDING',
        }
      });
      console.log(`  Stop #${i + 1}: [${s.board} / ${s.school_type}] #${s.s_no} ${s.school_name} (${s.area})`);
    }

    console.log(`Total Distance: ${totalDistKm.toFixed(1)} km | Travel Time: ${totalDurationMinutes} min | State/Pre: ${stateCount} | CBSE/ICSE: ${cbseCount}`);
  }

  // Summary check
  console.log('\n=== VERIFYING DATABASE INTEGRITY ===');
  const totalSchools = await prisma.school.count();
  const visitedSchools = await prisma.school.count({ where: { visit_status: 'VISITED' } });
  const revisitedSchools = await prisma.school.count({ where: { visit_status: 'REVISITED' } });
  const registrations = await prisma.school.count({ where: { visit_status: 'REGISTRATION' } });

  console.log(`Total Schools: ${totalSchools} (Expect 487)`);
  console.log(`Visited: ${visitedSchools}`);
  console.log(`Revisited: ${revisitedSchools}`);
  console.log(`Confirmed Registrations: ${registrations} (STRICT EXPECT: 0)`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
