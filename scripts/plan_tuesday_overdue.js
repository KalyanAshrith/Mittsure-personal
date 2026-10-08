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

// Compute total route length for an array of schools starting and ending at base
function computeRouteLength(schools) {
  let prevLat = BASE_LAT;
  let prevLng = BASE_LNG;
  let totalDist = 0;
  for (const s of schools) {
    totalDist += haversineKm(prevLat, prevLng, s.latitude, s.longitude);
    prevLat = s.latitude;
    prevLng = s.longitude;
  }
  totalDist += haversineKm(prevLat, prevLng, BASE_LAT, BASE_LNG);
  return totalDist;
}

// Generate all permutations for small n=7
function permute(arr) {
  if (arr.length <= 1) return [arr];
  const result = [];
  for (let i = 0; i < arr.length; i++) {
    const current = arr[i];
    const remaining = arr.slice(0, i).concat(arr.slice(i + 1));
    const perms = permute(remaining);
    for (const p of perms) {
      result.push([current, ...p]);
    }
  }
  return result;
}

async function planTuesdayOverdue() {
  const targetSNos = [197, 86, 74, 72, 242, 204, 82];
  const schools = [];
  for (const sNo of targetSNos) {
    const s = await prisma.school.findFirst({
      where: { s_no: sNo },
      include: {
        followups: { where: { status: { not: 'Completed' } } },
        visits: { orderBy: { visit_date: 'desc' }, take: 1 }
      }
    });
    if (!s) {
      throw new Error(`School #${sNo} not found in DB`);
    }
    schools.push(s);
  }

  console.log(`Loaded ${schools.length} overdue candidate schools for Tuesday.`);

  // Find exact globally optimal permutation among all 7! = 5,040 paths
  const allPerms = permute(schools);
  let bestOrder = allPerms[0];
  let bestDist = computeRouteLength(bestOrder);

  for (const p of allPerms) {
    const d = computeRouteLength(p);
    if (d < bestDist) {
      bestDist = d;
      bestOrder = p;
    }
  }

  console.log(`Optimal Route Distance: ${bestDist.toFixed(2)} km`);

  const tuesdayDate = '2026-09-15';
  const planName = 'Tuesday 15 Sep: Overdue Follow-ups Circuit (Bogadi, Dattagalli & Kuvempunagar)';

  // Check if a plan already exists for this date
  let plan = await prisma.routePlan.findFirst({
    where: { date: tuesdayDate },
    include: { stops: true }
  });

  if (plan) {
    console.log(`Existing plan found for ${tuesdayDate} (${plan.id}). Replacing stops...`);
    await prisma.routeStop.deleteMany({ where: { route_plan_id: plan.id } });
  } else {
    console.log(`Creating new RoutePlan for ${tuesdayDate}...`);
    plan = await prisma.routePlan.create({
      data: {
        date: tuesdayDate,
        name: planName,
        origin: BASE_ADDR,
        origin_lat: BASE_LAT,
        origin_lng: BASE_LNG,
        destination: BASE_ADDR,
        destination_lat: BASE_LAT,
        destination_lng: BASE_LNG,
        travel_mode: 'TWO_WHEELER',
        day_type: 'FULL_DAY',
        status: 'PLANNED',
        remarks: 'Targeted overdue follow-ups circuit: Resolves all 7 pending overdue follow-up visits across Bogadi, Dattagalli, and Kuvempunagar clusters.',
        optimized_order: '[]',
      }
    });
  }

  let prevLat = BASE_LAT;
  let prevLng = BASE_LNG;
  let totalDistKm = 0;
  let totalSec = 0;
  const orderedSNos = [];

  console.log('\n--- SEQUENCE DETAILS ---');
  for (let i = 0; i < bestOrder.length; i++) {
    const s = bestOrder[i];
    const legDist = haversineKm(prevLat, prevLng, s.latitude, s.longitude);
    const legSec = Math.round(legDist * 144);
    totalDistKm += legDist;
    totalSec += legSec;
    orderedSNos.push(s.s_no);

    const fu = s.followups[0];
    const contactPerson = fu?.contact_person || s.contact_person || s.principal_name || 'Principal';
    const contactNumber = fu?.contact_number || s.contact_number || s.phone || 'N/A';
    const origDue = fu?.due_date ? fu.due_date.toISOString().split('T')[0] : 'Past Due';

    const stopNote = `[Overdue Follow-up] Due: ${origDue} | Contact: ${contactPerson} (${contactNumber}) | Topic: ${fu?.notes || 'Management discussion'}`;

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
        notes: stopNote
      }
    });

    // Update follow-up status note if exists
    if (fu) {
      await prisma.followUp.update({
        where: { id: fu.id },
        data: {
          notes: `${fu.notes ? fu.notes.replace(/\s*\(Rescheduled to [^)]+\)/, '') : ''} (Rescheduled to Tuesday 15-Sep Route Circuit)`
        }
      });
    }

    console.log(`Stop #${i + 1}: S.No ${s.s_no} - ${s.school_name}`);
    console.log(`  Area: ${s.area} | Board: ${s.board} | Contact: ${contactPerson} (${contactNumber})`);
    console.log(`  Leg: ${legDist.toFixed(2)} km, ${Math.max(1, Math.ceil(legSec / 60))} min | Due: ${origDue}`);

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
      name: planName,
      status: 'PLANNED',
      total_distance_km: Math.round(totalDistKm * 10) / 10,
      total_distance_meters: Math.round(totalDistKm * 1000),
      total_duration_seconds: totalSec,
      total_duration_formatted: `${totalMin} mins`,
      optimized_order: JSON.stringify(orderedSNos),
      remarks: 'Targeted overdue follow-ups circuit: Resolves all 7 pending overdue follow-up visits across Bogadi, Dattagalli, and Kuvempunagar clusters.',
    }
  });

  await prisma.dailySummary.upsert({
    where: { date: tuesdayDate },
    update: {
      schools_planned: orderedSNos.length,
      total_distance_km: Math.round(totalDistKm * 10) / 10,
      total_travel_time: `${totalMin} mins`,
      remarks: 'Targeted overdue follow-ups circuit (Bogadi, Dattagalli & Kuvempunagar)',
      ai_summary: `Optimal 7-school circuit resolving 100% of pending overdue visits. Total riding distance is ${totalDistKm.toFixed(1)} km (~${totalMin} mins). All schools are within 2.5 km of base.`
    },
    create: {
      date: tuesdayDate,
      schools_planned: orderedSNos.length,
      total_distance_km: Math.round(totalDistKm * 10) / 10,
      total_travel_time: `${totalMin} mins`,
      remarks: 'Targeted overdue follow-ups circuit (Bogadi, Dattagalli & Kuvempunagar)',
      ai_summary: `Optimal 7-school circuit resolving 100% of pending overdue visits. Total riding distance is ${totalDistKm.toFixed(1)} km (~${totalMin} mins). All schools are within 2.5 km of base.`
    }
  });

  console.log(`\nReturn to Base: ${returnDist.toFixed(2)} km, ${Math.ceil(returnSec / 60)} min`);
  console.log(`TOTAL CIRCUIT: ${totalDistKm.toFixed(1)} km, ${totalMin} mins total riding time.`);
  console.log(`Successfully saved Tuesday 15 Sep Overdue Plan into SQLite!`);
}

planTuesdayOverdue().catch(console.error).finally(() => prisma['$disconnect']());
