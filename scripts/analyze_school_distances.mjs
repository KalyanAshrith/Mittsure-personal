import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Haversine distance in km
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function analyzeDistances() {
  const PG_LAT = 12.3021;
  const PG_LNG = 76.6178;

  const schools = await prisma.school.findMany();

  const farSchools = [];
  const areaStats = {};

  for (const s of schools) {
    const dist = haversineKm(PG_LAT, PG_LNG, s.latitude, s.longitude);
    if (dist > 25) { // More than 25 km away from Bogadi PG base
      farSchools.push({
        s_no: s.s_no,
        name: s.school_name,
        area: s.area,
        taluk: s.taluk,
        district: s.district,
        distKm: Math.round(dist * 10) / 10,
        lat: s.latitude,
        lng: s.longitude,
        visited: s.visited_by_current_user
      });
    }

    if (!areaStats[s.area]) {
      areaStats[s.area] = { count: 0, maxDist: 0, minDist: 999 };
    }
    areaStats[s.area].count++;
    areaStats[s.area].maxDist = Math.max(areaStats[s.area].maxDist, dist);
    areaStats[s.area].minDist = Math.min(areaStats[s.area].minDist, dist);
  }

  console.log(`Total schools: ${schools.length}`);
  console.log(`Schools > 25km away from Mysuru PG base: ${farSchools.length}`);

  // Group far schools by detected region/subordinate city
  console.log('\n--- FAR SCHOOLS (>25km from Bogadi base) ---');
  farSchools.sort((a, b) => b.distKm - a.distKm);
  farSchools.forEach(f => {
    console.log(`  #${f.s_no} [${f.distKm} km] ${f.name} | Area: ${f.area} | Taluk: ${f.taluk} | Dist: ${f.district} | Visited: ${f.visited}`);
  });
}

analyzeDistances().finally(() => prisma.$disconnect());
