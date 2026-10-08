import { PrismaClient } from '@prisma/client';

function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
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

const prisma = new PrismaClient();

const base = { lat: 12.3021, lng: 76.6178, name: 'Bogadi 2nd Stage PG' };

const schoolIds = ['S-156333', 'S-139929', 'S-163331', 'S-156504', 'S-162998'];

async function optimizeTomorrowRoute() {
  const schools = await prisma.school.findMany({
    where: { school_id: { in: schoolIds } }
  });

  console.log(`Found ${schools.length} schools for Tuesday:`);
  for (const s of schools) {
    const dist = calculateDistanceKm(base.lat, base.lng, s.latitude, s.longitude);
    console.log(`  S.No ${s.s_no}: ${s.school_name} (${s.area}) [${s.latitude}, ${s.longitude}] -> ${dist.toFixed(2)} km from PG`);
  }

  // Nearest neighbour round trip starting and ending at base
  let current = base;
  let remaining = [...schools];
  const ordered = [];

  while (remaining.length > 0) {
    let nearestIdx = 0;
    let minD = 999999;
    for (let i = 0; i < remaining.length; i++) {
      const d = calculateDistanceKm(current.lat, current.lng, remaining[i].latitude, remaining[i].longitude);
      if (d < minD) {
        minD = d;
        nearestIdx = i;
      }
    }
    const nextSchool = remaining.splice(nearestIdx, 1)[0];
    ordered.push({
      school: nextSchool,
      legDistanceKm: Number(minD.toFixed(2)),
      legDistanceMeters: Math.round(minD * 1000),
      durationMinutes: Math.max(4, Math.round((minD / 25) * 60)) // ~25 km/h motorcycle speed in Mysuru city
    });
    current = { lat: nextSchool.latitude, lng: nextSchool.longitude, name: nextSchool.school_name };
  }

  // Final leg back to base
  const returnDist = calculateDistanceKm(current.lat, current.lng, base.lat, base.lng);
  const returnMins = Math.max(4, Math.round((returnDist / 25) * 60));

  console.log('\n=== OPTIMAL TWO-WHEELER ROUND TRIP SEQUENCE ===');
  console.log(`START: ${base.name} [${base.lat}, ${base.lng}]`);
  let totalKm = 0;
  let totalMins = 0;

  ordered.forEach((stop, idx) => {
    totalKm += stop.legDistanceKm;
    totalMins += stop.durationMinutes;
    console.log(`Stop #${idx + 1}: S.No ${stop.school.s_no} - "${stop.school.school_name}" (${stop.school.area}) | Leg: ${stop.legDistanceKm} km (${stop.durationMinutes} min)`);
  });

  totalKm += Number(returnDist.toFixed(2));
  totalMins += returnMins;
  console.log(`RETURN: -> ${base.name} | Leg: ${returnDist.toFixed(2)} km (${returnMins} min)`);
  console.log(`TOTAL DISTANCE: ${totalKm.toFixed(2)} km`);
  console.log(`TOTAL ESTIMATED TRAVEL TIME: ${totalMins} min`);
}

optimizeTomorrowRoute().catch(console.error).finally(() => prisma.$disconnect());
