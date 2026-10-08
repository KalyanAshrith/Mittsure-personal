const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BASE_LAT = 12.3021;
const BASE_LNG = 76.6178;
const BASE_ADDR = '661, Sahukar Chennaiah Road, Janatha Nagar, Bogadi 2nd Stage, TK Layout, Mysuru, Karnataka 570009';

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Order schools starting from base
function orderSchools(schools) {
  const ordered = [];
  const remaining = [...schools];
  let currLat = BASE_LAT;
  let currLng = BASE_LNG;

  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversineKm(currLat, currLng, remaining[i].latitude, remaining[i].longitude);
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

async function createPlanForDate(dateStr, planName, sNos, dayType, remarks) {
  const schools = [];
  for (const sNo of sNos) {
    const s = await prisma.school.findUnique({ where: { s_no: sNo } });
    if (!s) throw new Error(`School #${sNo} not found`);
    schools.push(s);
  }

  const orderedSchools = orderSchools(schools);

  // Check existing plan
  let plan = await prisma.routePlan.findFirst({
    where: { date: dateStr }
  });

  if (plan) {
    await prisma.routeStop.deleteMany({ where: { route_plan_id: plan.id } });
  } else {
    plan = await prisma.routePlan.create({
      data: {
        date: dateStr,
        name: planName,
        origin: BASE_ADDR,
        origin_lat: BASE_LAT,
        origin_lng: BASE_LNG,
        destination: BASE_ADDR,
        destination_lat: BASE_LAT,
        destination_lng: BASE_LNG,
        travel_mode: 'TWO_WHEELER',
        day_type: dayType,
        status: 'PLANNED',
        remarks: remarks,
        optimized_order: '[]',
      }
    });
  }

  let prevLat = BASE_LAT;
  let prevLng = BASE_LNG;
  let totalDistKm = 0;
  let totalSec = 0;
  const orderedSNos = [];

  for (let i = 0; i < orderedSchools.length; i++) {
    const s = orderedSchools[i];
    const legDist = haversineKm(prevLat, prevLng, s.latitude, s.longitude);
    const legSec = Math.round(legDist * 144);
    totalDistKm += legDist;
    totalSec += legSec;
    orderedSNos.push(s.s_no);

    const isAlreadyVisited = s.visited_by_current_user;

    await prisma.routeStop.create({
      data: {
        route_plan_id: plan.id,
        school_id: s.id,
        stop_number: i + 1,
        optimized_sequence: i + 1,
        status: isAlreadyVisited ? 'VISITED' : 'PENDING',
        leg_distance_km: Math.round(legDist * 10) / 10,
        leg_distance_meters: Math.round(legDist * 1000),
        leg_duration_seconds: legSec,
        leg_duration_formatted: `${Math.max(1, Math.ceil(legSec / 60))} min`,
        notes: `Stop #${i + 1} • ${s.board} • ${s.category || s.school_type} • Contact: ${s.contact_person || s.principal_name || 'Principal'}`
      }
    });

    prevLat = s.latitude;
    prevLng = s.longitude;
  }

  const retDist = haversineKm(prevLat, prevLng, BASE_LAT, BASE_LNG);
  totalDistKm += retDist;
  totalSec += Math.round(retDist * 144);
  const totalMin = Math.round(totalSec / 60);

  await prisma.routePlan.update({
    where: { id: plan.id },
    data: {
      name: planName,
      status: 'PLANNED',
      total_distance_km: Math.round(totalDistKm * 10) / 10,
      total_distance_meters: Math.round(totalDistKm * 1000),
      total_duration_seconds: totalSec,
      total_duration_formatted: `${totalMin} mins`,
      optimized_order: JSON.stringify(orderedSNos),
      remarks: remarks
    }
  });

  await prisma.dailySummary.upsert({
    where: { date: dateStr },
    update: {
      schools_planned: orderedSNos.length,
      total_distance_km: Math.round(totalDistKm * 10) / 10,
      total_travel_time: `${totalMin} mins`,
      remarks: remarks
    },
    create: {
      date: dateStr,
      schools_planned: orderedSNos.length,
      total_distance_km: Math.round(totalDistKm * 10) / 10,
      total_travel_time: `${totalMin} mins`,
      remarks: remarks
    }
  });

  console.log(`Saved Route Plan for ${dateStr}: ${planName}`);
  console.log(`  Stops: ${orderedSchools.length}, Distance: ${totalDistKm.toFixed(1)} km, Time: ${totalMin} mins`);
  orderedSchools.forEach((s, idx) => {
    console.log(`    Stop #${idx + 1}: S.No ${s.s_no} - ${s.school_name} [${s.board}] (${s.area})`);
  });
}

async function main() {
  console.log('=== SETTING UP ROUTE PLANS FOR TODAY, TOMORROW & DAY AFTER TOMORROW ===\n');

  // 1. TODAY: Thursday 17 Sep (7 schools: Saraswathipuram, Kuvempunagar & Srirampura)
  await createPlanForDate(
    '2026-09-17',
    'Thursday 17 Sep: Saraswathipuram, Kuvempunagar & Srirampura (7 Schools)',
    [257, 329, 254, 205, 198, 102, 223],
    'FULL_DAY',
    'Thursday Plan: 7 schools across Saraswathipuram, Kuvempunagar, and Srirampura.'
  );

  console.log('');

  // 2. TOMORROW: Friday 18 Sep (7 schools: 5 State/Pre + 2 CBSE - Gokulam, Jayalakshmipuram & Vijayanagar)
  await createPlanForDate(
    '2026-09-18',
    'Friday 18 Sep: Gokulam, Jayalakshmipuram & Vijayanagar (5+2 Quota)',
    [208, 101, 326, 209, 484, 201, 221],
    'FULL_DAY',
    'Friday 5+2 Quota Circuit: 5 State/Pre-schools (Sai Baba, Shree Gokulam, Marimallappa, Kids Academy, Mest Pre School) + 2 CBSE (St. Josephs, Nirmala).'
  );

  console.log('');

  // 3. DAY AFTER TOMORROW: Saturday 19 Sep (5 schools: Saturday Half-Day - 3 State/Pre + 2 CBSE)
  await createPlanForDate(
    '2026-09-19',
    'Saturday 19 Sep: Bogadi Base Cluster (Half-Day 5 Schools)',
    [372, 332, 247, 65, 241],
    'HALF_DAY',
    'Saturday Half-Day Circuit: Strictly 5 schools (3 State/Pre + 2 CBSE) within 200m of Bogadi Base.'
  );

  console.log('\nAll 3 route plans created and saved successfully!');
}

main().catch(console.error).finally(() => prisma['$disconnect']());
