const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BASE_LAT = 12.3021;
const BASE_LNG = 76.6178;

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

async function updateTodayPlan() {
  const todayDate = '2026-09-10';
  const targetSNos = [244, 223, 102, 414, 471, 198, 254];

  const schools = [];
  for (const sNo of targetSNos) {
    const s = await prisma.school.findFirst({ where: { s_no: sNo } });
    if (!s) throw new Error(`School #${sNo} not found`);
    schools.push(s);
  }

  // Nearest neighbour ordering starting from Bogadi base
  const orderedSchools = [];
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
    orderedSchools.push(chosen);
    currLat = chosen.latitude;
    currLng = chosen.longitude;
  }

  let plan = await prisma.routePlan.findFirst({
    where: { date: todayDate },
    include: { stops: true }
  });

  if (plan) {
    await prisma.routeStop.deleteMany({ where: { route_plan_id: plan.id } });
  } else {
    plan = await prisma.routePlan.create({
      data: {
        date: todayDate,
        name: 'Thursday 10 Sep: Ramakrishna Nagar & Srirampura (5+2 Quota)',
        origin: '661, Sahukar Chennaiah Road, Janatha Nagar, Bogadi 2nd Stage, TK Layout, Mysuru 570009',
        origin_lat: BASE_LAT,
        origin_lng: BASE_LNG,
        destination: '661, Sahukar Chennaiah Road, Janatha Nagar, Bogadi 2nd Stage, TK Layout, Mysuru 570009',
        destination_lat: BASE_LAT,
        destination_lng: BASE_LNG,
        travel_mode: 'TWO_WHEELER',
        day_type: 'FULL_DAY',
        status: 'PLANNED',
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

    await prisma.routeStop.create({
      data: {
        route_plan_id: plan.id,
        school_id: s.id,
        stop_number: i + 1,
        optimized_sequence: i + 1,
        status: 'PENDING',
        leg_distance_km: Math.round(legDist * 10) / 10,
        leg_distance_meters: Math.round(legDist * 1000),
        leg_duration_seconds: legSec,
        leg_duration_formatted: `${Math.max(1, Math.ceil(legSec / 60))} min`,
        notes: `Planned stop #${i + 1} (${s.board})`,
      }
    });

    prevLat = s.latitude;
    prevLng = s.longitude;
  }

  // Return leg
  const returnDist = haversineKm(prevLat, prevLng, BASE_LAT, BASE_LNG);
  const returnSec = Math.round(returnDist * 144);
  totalDistKm += returnDist;
  totalSec += returnSec;

  const totalMin = Math.round(totalSec / 60);

  await prisma.routePlan.update({
    where: { id: plan.id },
    data: {
      name: 'Thursday 10 Sep: Ramakrishna Nagar & Srirampura (5+2 Quota)',
      status: 'PLANNED',
      total_distance_km: Math.round(totalDistKm * 10) / 10,
      total_distance_meters: Math.round(totalDistKm * 1000),
      total_duration_seconds: totalSec,
      total_duration_formatted: `${totalMin} mins`,
      optimized_order: JSON.stringify(orderedSNos),
    }
  });

  console.log(`Updated Thursday 10 Sep Plan: ${totalDistKm.toFixed(1)} km, ${totalMin} mins`);
  orderedSchools.forEach((s, idx) => {
    console.log(`  Stop #${idx + 1}: #${s.s_no} ${s.school_name} (${s.board}, ${s.category}, ${s.area})`);
  });
}

updateTodayPlan().catch(console.error).finally(() => prisma.$disconnect());
