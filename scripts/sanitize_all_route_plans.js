const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BASE_LAT = 12.3021;
const BASE_LNG = 76.6178;
const BASE_ADDR = '661, Sahukar Chennaiah Road, Janatha Nagar, Bogadi 2nd Stage, TK Layout, Mysuru, Karnataka 570009';

function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Nearest-neighbor route order optimization
function optimizeRouteSequence(schools, startLat, startLng) {
  const ordered = [];
  const remaining = [...schools];
  let currLat = startLat;
  let currLng = startLng;

  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversineMeters(currLat, currLng, remaining[i].latitude, remaining[i].longitude);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    const chosen = remaining.splice(bestIdx, 1)[0];
    ordered.push(chosen);
    currLat = chosen.latitude;
    currLng = chosen.longitude;
  }
  return ordered;
}

async function buildAndSavePlan(dateStr, planName, targetSNos, dayType, remarks) {
  console.log(`\n======================================================`);
  console.log(`Building Route Plan for ${dateStr}: ${planName}`);
  console.log(`Target S.Nos (${targetSNos.length}): ${targetSNos.join(', ')}`);

  // Verify all schools exist and are UNVISITED
  const schools = await prisma.school.findMany({
    where: { s_no: { in: targetSNos } }
  });

  if (schools.length !== targetSNos.length) {
    throw new Error(`Expected ${targetSNos.length} schools, found ${schools.length} in DB!`);
  }

  // Strict assertion: zero visited schools
  const visited = schools.filter(s => s.visited_by_current_user || s.visit_status === 'VISITED');
  if (visited.length > 0) {
    throw new Error(`FATAL: Route for ${dateStr} contains visited schools: ${visited.map(s => s.s_no).join(', ')}`);
  }

  // Optimize sequence
  const orderedSchools = optimizeRouteSequence(schools, BASE_LAT, BASE_LNG);

  // Calculate legs & Google Maps URL
  let totalDistMeters = 0;
  let totalDurationSec = 0;
  let prevLat = BASE_LAT;
  let prevLng = BASE_LNG;

  const stopsData = [];
  const waypoints = [];

  for (let i = 0; i < orderedSchools.length; i++) {
    const s = orderedSchools[i];
    waypoints.push(`${s.latitude},${s.longitude}`);

    const legMeters = Math.round(haversineMeters(prevLat, prevLng, s.latitude, s.longitude));
    const legSec = Math.round((legMeters / 1000) * 144); // ~25 km/h city riding
    totalDistMeters += legMeters;
    totalDurationSec += legSec;

    const stopNumber = i + 1;
    const legDistKm = Math.round((legMeters / 1000) * 10) / 10;
    const legMin = Math.max(1, Math.ceil(legSec / 60));

    stopsData.push({
      school_id: s.id,
      stop_number: stopNumber,
      optimized_sequence: stopNumber,
      leg_distance_km: legDistKm,
      leg_distance_meters: legMeters,
      leg_duration_seconds: legSec,
      leg_duration_formatted: `${legMin} min`,
      status: 'PENDING',
      notes: `Stop ${stopNumber} of ${orderedSchools.length}: ${s.school_name} (${s.board}, ${s.area})`
    });

    prevLat = s.latitude;
    prevLng = s.longitude;
  }

  // Return leg to base
  const returnMeters = Math.round(haversineMeters(prevLat, prevLng, BASE_LAT, BASE_LNG));
  const returnSec = Math.round((returnMeters / 1000) * 144);
  totalDistMeters += returnMeters;
  totalDurationSec += returnSec;

  const totalDistKm = Math.round((totalDistMeters / 1000) * 10) / 10;
  const totalMin = Math.round(totalDurationSec / 60);

  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(BASE_ADDR)}&destination=${encodeURIComponent(BASE_ADDR)}&waypoints=${waypoints.join('|')}&travelmode=motorcycle`;

  // Delete existing plan and stops for this date
  const existingPlan = await prisma.routePlan.findFirst({
    where: { date: dateStr },
    include: { stops: true }
  });

  if (existingPlan) {
    await prisma.routeStop.deleteMany({
      where: { route_plan_id: existingPlan.id }
    });
    await prisma.routePlan.delete({
      where: { id: existingPlan.id }
    });
    console.log(`Deleted previous existing route plan for ${dateStr}`);
  }

  // Create clean route plan
  const plan = await prisma.routePlan.create({
    data: {
      date: dateStr,
      name: planName,
      day_type: dayType,
      is_locked: false,
      status: 'PLANNED',
      origin: BASE_ADDR,
      origin_lat: BASE_LAT,
      origin_lng: BASE_LNG,
      destination: BASE_ADDR,
      destination_lat: BASE_LAT,
      destination_lng: BASE_LNG,
      travel_mode: 'TWO_WHEELER',
      total_distance_km: totalDistKm,
      total_distance_meters: totalDistMeters,
      total_duration_seconds: totalDurationSec,
      total_duration_formatted: `${totalMin} mins`,
      optimized_order: JSON.stringify(orderedSchools.map(s => s.s_no)),
      remarks: remarks,
      stops: {
        create: stopsData
      }
    },
    include: {
      stops: {
        include: { school: true },
        orderBy: { stop_number: 'asc' }
      }
    }
  });

  // Sync DailySummary
  await prisma.dailySummary.upsert({
    where: { date: dateStr },
    update: {
      schools_planned: orderedSchools.length,
      schools_visited: 0,
      schools_not_visited: orderedSchools.length,
      total_distance_km: totalDistKm,
      total_travel_time: `${totalMin} mins`,
      remarks: remarks,
      ai_summary: `Optimal route circuit: ${orderedSchools.length} unvisited schools (${orderedSchools.filter(s => s.board === 'CBSE' || s.board === 'ICSE').length} CBSE/ICSE, ${orderedSchools.filter(s => s.board !== 'CBSE' && s.board !== 'ICSE').length} State/Pre).`
    },
    create: {
      date: dateStr,
      schools_planned: orderedSchools.length,
      schools_visited: 0,
      schools_not_visited: orderedSchools.length,
      total_distance_km: totalDistKm,
      total_travel_time: `${totalMin} mins`,
      remarks: remarks,
      ai_summary: `Optimal route circuit: ${orderedSchools.length} unvisited schools (${orderedSchools.filter(s => s.board === 'CBSE' || s.board === 'ICSE').length} CBSE/ICSE, ${orderedSchools.filter(s => s.board !== 'CBSE' && s.board !== 'ICSE').length} State/Pre).`
    }
  });

  console.log(`Successfully created Plan ID: ${plan.id}`);
  console.log(`Total Distance: ${totalDistKm} km | Total Time: ${totalMin} mins`);
  plan.stops.forEach(st => {
    console.log(`  Stop ${st.stop_number}: S.No ${st.school.s_no} - ${st.school.school_name} [${st.school.board}] (${st.school.area}) -> ${st.leg_distance_km} km`);
  });

  return plan;
}

async function main() {
  console.log('=== RUNNING COMPLETE SANITIZATION OF ALL ROUTE PLANS ===');

  // 0. Clean up erroneous past Tuesday 2026-09-15 plan
  const plan15 = await prisma.routePlan.findFirst({
    where: { date: '2026-09-15' },
    include: { stops: true }
  });
  if (plan15) {
    await prisma.routeStop.deleteMany({ where: { route_plan_id: plan15.id } });
    await prisma.routePlan.delete({ where: { id: plan15.id } });
    console.log('Deleted erroneous 2026-09-15 plan.');
  }

  // Clean up FollowUps for visited schools
  const visitedSchoolIds = await prisma.school.findMany({
    where: { visited_by_current_user: true },
    select: { id: true }
  });
  const vIds = visitedSchoolIds.map(s => s.id);
  const updatedFollowups = await prisma.followUp.updateMany({
    where: {
      school_id: { in: vIds },
      status: { not: 'Completed' }
    },
    data: { status: 'Completed', outcome: 'Completed during rep visit' }
  });
  console.log(`Marked ${updatedFollowups.count} follow-ups as Completed for visited schools.`);

  // 1. TODAY: Thursday 17 Sep (7 schools: Dattagalli, Kuvempunagar & Srirampura - 5 State/Pre + 2 CBSE)
  await buildAndSavePlan(
    '2026-09-17',
    'Thursday 17 Sep: Dattagalli, Kuvempunagar & Srirampura Circuit (5+2 Quota)',
    [223, 258, 205, 198, 471, 472, 72],
    'FULL_DAY',
    'Thursday 5+2 Quota Circuit: 5 State/Pre-schools (Visha Prajna, Rotary West, CNM Public, Lisa 1st Step, Divine Kids) + 2 CBSE (BGS Public, Kautilya Vidyalaya). 100% unvisited.'
  );

  // 2. TOMORROW: Friday 18 Sep (7 schools: Gokulam, Jayalakshmipuram & Vijayanagar - 5 State/Pre + 2 CBSE)
  await buildAndSavePlan(
    '2026-09-18',
    'Friday 18 Sep: Gokulam, Jayalakshmipuram & Vijayanagar (5+2 Quota)',
    [208, 101, 326, 209, 484, 201, 221],
    'FULL_DAY',
    'Friday 5+2 Quota Circuit: 5 State/Pre-schools (Sai Baba, Shree Gokulam, Marimallappa, Kids Academy, Mest Pre School) + 2 CBSE (St. Josephs, Nirmala). 100% unvisited.'
  );

  // 3. SATURDAY: 19 Sep (5 schools strictly: Bogadi Base Vicinity - 3 State + 2 CBSE)
  await buildAndSavePlan(
    '2026-09-19',
    'Saturday 19 Sep: Bogadi Base Vicinity Half-Day Circuit (Strictly 5 Schools)',
    [372, 65, 332, 247, 241],
    'HALF_DAY',
    'Saturday Half-Day Circuit: Strictly 5 schools (3 State + 2 CBSE) within 200m of Bogadi Base (Lalitha High, Eshwar Vidyalaya, Shiksha School, Shanthi High, BGS Public Mysore). 100% unvisited.'
  );

  // 4. MONDAY: 21 Sep (7 fresh schools: North-West Mysuru Circuit - 5 State/Pre + 2 CBSE)
  await buildAndSavePlan(
    '2026-09-21',
    'Monday 21 Sep: North-West Mysuru Circuit (5+2 Quota)',
    [305, 255, 481, 104, 230, 320, 278],
    'FULL_DAY',
    'Monday 5+2 Quota Circuit: 5 State/Pre-schools (B S Madappa, Bizi Brain Pre, Sri Adhichunchanagiri Balajagath, GSSSS School, Kalabharathi) + 2 CBSE (Saint Philemeno, St. Rosollos Central). 100% unvisited.'
  );

  // 5. UPCOMING TUESDAY: 22 Sep (7 schools: Overdue Follow-ups & Priority Circuit - 5 State/Pre + 2 CBSE)
  await buildAndSavePlan(
    '2026-09-22',
    'Tuesday 22 Sep: Overdue Follow-ups & Priority Circuit (5+2 Quota)',
    [74, 85, 395, 364, 428, 412, 331],
    'FULL_DAY',
    'Tuesday Overdue Circuit: Resolves overdue follow-up on Mahabodhi School (#74) + 1 CBSE (#85 Pushpa) + 5 State/Pre-schools (Sri Guru Renuka Devi, St Joseph Convent, Gurukul School, Vasavi Vidyanikethana, Sri Rama Vidya Kula). 100% unvisited.'
  );

  console.log('\n=== ALL 5 ROUTE PLANS SANITIZED & SAVED TO DATABASE ===\n');
}

main().catch(console.error).finally(() => prisma.$disconnect());
