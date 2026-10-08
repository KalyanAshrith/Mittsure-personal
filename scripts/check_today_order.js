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

async function main() {
  const targetSNos = [257, 329, 254, 205, 198, 102, 223];
  
  // Check future overlaps
  const futurePlans = await prisma.routePlan.findMany({
    where: { date: { in: ['2026-09-11', '2026-09-12'] } },
    include: { stops: { include: { school: true } } }
  });

  console.log('--- CHECKING FUTURE OVERLAPS ---');
  let conflictFound = false;
  for (const fp of futurePlans) {
    console.log(fp.date, fp.name);
    fp.stops.forEach(st => {
      if (targetSNos.includes(st.school.s_no)) {
        console.log('  CONFLICT in ' + fp.date + ': #' + st.school.s_no + ' ' + st.school.school_name);
        conflictFound = true;
      }
    });
  }
  if (!conflictFound) {
    console.log('Zero conflicts with future days! All clear.');
  }

  // Now let's apply the exact 7 schools to Today's route plan (2026-09-10)
  const orderedSNos = [257, 329, 254, 205, 198, 102, 223];
  const schools = [];
  for (const sNo of orderedSNos) {
    const s = await prisma.school.findFirst({ where: { s_no: sNo } });
    schools.push(s);
  }

  let plan = await prisma.routePlan.findFirst({
    where: { date: '2026-09-10' },
    include: { stops: true }
  });

  if (plan) {
    await prisma.routeStop.deleteMany({ where: { route_plan_id: plan.id } });
  } else {
    plan = await prisma.routePlan.create({
      data: {
        date: '2026-09-10',
        name: 'Thursday 10 Sep: Saraswathipuram, Kuvempunagar & Srirampura (7 Schools)',
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

  for (let i = 0; i < schools.length; i++) {
    const s = schools[i];
    const legDist = haversineKm(prevLat, prevLng, s.latitude, s.longitude);
    const legSec = Math.round(legDist * 144);
    totalDistKm += legDist;
    totalSec += legSec;

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
        leg_duration_formatted: Math.max(1, Math.ceil(legSec / 60)) + ' min',
        notes: 'Stop #' + (i + 1) + ' (' + s.board + ', ' + s.area + ')',
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
      name: 'Thursday 10 Sep: Saraswathipuram, Kuvempunagar & Srirampura (7 Schools)',
      status: 'PLANNED',
      is_locked: true,
      total_distance_km: Math.round(totalDistKm * 10) / 10,
      total_distance_meters: Math.round(totalDistKm * 1000),
      total_duration_seconds: totalSec,
      total_duration_formatted: totalMin + ' mins',
      optimized_order: JSON.stringify(orderedSNos),
    }
  });

  console.log('\n=== TODAY PLAN UPDATED SUCCESSFULLY ===');
  console.log('Circuit: ' + totalDistKm.toFixed(1) + ' km, ' + totalMin + ' mins');
  schools.forEach((s, idx) => {
    console.log('  Stop #' + (idx + 1) + ': #' + s.s_no + ' ' + s.school_name + ' (' + s.school_id + ') - ' + s.board + ', ' + s.area);
  });
}

main().catch(console.error).finally(() => prisma['$disconnect']());
