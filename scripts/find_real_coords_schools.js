const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BASE_LAT = 12.3021;
const BASE_LNG = 76.6178;

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const cVal = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * cVal;
}

async function main() {
  const unvisited = await prisma.school.findMany({
    where: {
      visited_by_current_user: false,
      visit_status: { not: 'VISITED' }
    }
  });

  console.log(`Total unvisited schools: ${unvisited.length}`);

  // Schools with real coordinates (> 0.4 km from base, within 25 km of Mysuru)
  const realMysuruSchools = unvisited.filter(s => {
    const d = haversineKm(BASE_LAT, BASE_LNG, s.latitude, s.longitude);
    return d >= 0.4 && d <= 25;
  }).map(s => ({
    ...s,
    distFromBaseKm: haversineKm(BASE_LAT, BASE_LNG, s.latitude, s.longitude)
  }));

  console.log(`Unvisited schools with real distinct coordinates in Mysuru (0.4 km - 25 km): ${realMysuruSchools.length}`);

  realMysuruSchools.sort((a, b) => a.distFromBaseKm - b.distFromBaseKm);

  console.log('\nClosest 30 unvisited schools with real coordinates from PG Base:');
  realMysuruSchools.slice(0, 30).forEach((s, i) => {
    const isStatePre = (s.board || '').toUpperCase().includes('STATE') || ['PRE-SCHOOL', 'PLAY SCHOOL', 'NURSERY', 'MONTESSORI', 'KINDERGARTEN'].includes((s.school_type || '').toUpperCase()) || ['D', 'E'].includes(s.opportunity_type);
    console.log(`  ${i+1}. S.No ${s.s_no} | ${s.school_name} | Board: ${s.board} [${isStatePre ? 'State/Pre' : 'CBSE/ICSE'}] | Area: ${s.area} | Dist from PG: ${s.distFromBaseKm.toFixed(2)} km`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
