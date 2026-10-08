import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const BASE_LAT = 12.3021;
const BASE_LNG = 76.6178;
const BASE_ADDR = '661, Sahukar Chennaiah Road, Janatha Nagar, Bogadi 2nd Stage, TK Layout, Mysuru 570009';

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

async function updateTodayPlan() {
  // Ordered sequence of 7 schools
  const targetSNos = [67, 244, 254, 205, 329, 388, 157];

  const schools = [];
  for (const sNo of targetSNos) {
    const s = await prisma.school.findFirst({ where: { s_no: sNo } });
    if (!s) throw new Error(`School with S.No ${sNo} not found!`);
    schools.push(s);
  }

  // Find existing plan for 2026-09-09
  let plan = await prisma.routePlan.findFirst({ where: { date: '2026-09-09' } });
  if (!plan) {
    plan = await prisma.routePlan.create({
      data: {
        date: '2026-09-09',
        name: 'Wednesday 9 Sep: Kuvempunagar & Saraswathipuram (Updated 7-School Plan)',
        origin: BASE_ADDR,
        origin_lat: BASE_LAT,
        origin_lng: BASE_LNG,
        destination: BASE_ADDR,
        destination_lat: BASE_LAT,
        destination_lng: BASE_LNG,
        travel_mode: 'TWO_WHEELER',
        status: 'PLANNED',
        day_type: 'FULL_DAY',
        is_locked: true,
      }
    });
  } else {
    // Delete existing stops
    await prisma.routeStop.deleteMany({ where: { route_plan_id: plan.id } });
  }

  // Calculate legs
  let prevLat = BASE_LAT;
  let prevLng = BASE_LNG;
  let totalDistKm = 0;
  let totalSec = 0;

  for (let i = 0; i < schools.length; i++) {
    const s = schools[i];
    const legDist = haversine(prevLat, prevLng, s.latitude, s.longitude);
    const legSec = Math.round(legDist * 144); // ~2.4 mins per km (25 km/h avg)
    totalDistKm += legDist;
    totalSec += legSec;

    await prisma.routeStop.create({
      data: {
        route_plan_id: plan.id,
        school_id: s.id,
        stop_number: i + 1,
        optimized_sequence: i + 1,
        leg_distance_km: Math.round(legDist * 10) / 10,
        leg_distance_meters: Math.round(legDist * 1000),
        leg_duration_seconds: legSec,
        leg_duration_formatted: `${Math.ceil(legSec / 60)} min`,
        status: 'PENDING',
        notes: i < 5 ? 'From Assigned Route Items' : 'Added to Complete 7-School Target'
      }
    });

    prevLat = s.latitude;
    prevLng = s.longitude;
  }

  // Return leg
  const returnDist = haversine(prevLat, prevLng, BASE_LAT, BASE_LNG);
  const returnSec = Math.round(returnDist * 144);
  totalDistKm += returnDist;
  totalSec += returnSec;

  const totalMin = Math.round(totalSec / 60);

  await prisma.routePlan.update({
    where: { id: plan.id },
    data: {
      name: 'Wednesday 9 Sep: Kuvempunagar & Saraswathipuram (Updated 7-School Plan)',
      total_distance_km: Math.round(totalDistKm * 10) / 10,
      total_distance_meters: Math.round(totalDistKm * 1000),
      total_duration_seconds: totalSec,
      total_duration_formatted: `${totalMin} mins`,
      optimized_order: JSON.stringify(targetSNos),
      is_locked: true,
      status: 'PLANNED',
      remarks: 'Updated today route based on assigned Route Items (BGS, Capitol, Hari Vidyalaya, JSS, Sri Adichunchanagiri, minus Sri Gokula) + 2 contiguous cluster schools (Vishwamanava & Vijaya Vitala) to complete the 7-school target.'
    }
  });

  console.log(`\nSuccessfully updated today's plan (2026-09-09)!`);
  console.log(`Plan Name: Wednesday 9 Sep: Kuvempunagar & Saraswathipuram (Updated 7-School Plan)`);
  console.log(`Total Distance: ${(Math.round(totalDistKm * 10) / 10)} km | Time: ${totalMin} mins | Locked: true`);
  console.log(`Stops:`);
  schools.forEach((s, idx) => {
    console.log(`  Stop #${idx + 1}: S.No ${s.s_no} • ${s.school_name} (${s.board}, ${s.area})`);
  });
}

updateTodayPlan().catch(console.error).finally(() => prisma.$disconnect());
