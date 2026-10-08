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
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function main() {
  const unvisited = await prisma.school.findMany({
    where: {
      visited_by_current_user: false,
      visit_status: { not: 'VISITED' }
    },
    orderBy: { s_no: 'asc' }
  });

  console.log(`Total strictly unvisited schools: ${unvisited.length}`);

  // Calculate distance from base for each
  const withDist = unvisited.map(s => ({
    ...s,
    distKm: haversineKm(BASE_LAT, BASE_LNG, s.latitude, s.longitude)
  }));

  withDist.sort((a, b) => a.distKm - b.distKm);

  console.log('\nTop 25 closest unvisited schools to PG Base (Bogadi):');
  withDist.slice(0, 25).forEach((s, idx) => {
    const isStatePre = (s.board || '').toUpperCase().includes('STATE') || ['PRE-SCHOOL', 'PLAY SCHOOL', 'NURSERY', 'MONTESSORI', 'KINDERGARTEN'].includes((s.school_type || '').toUpperCase()) || ['D', 'E'].includes(s.opportunity_type);
    const typeLabel = isStatePre ? 'State/Pre' : (s.board || 'CBSE');
    console.log(`  ${idx + 1}. S.No ${s.s_no} | ${s.school_id} | ${s.school_name} | ${s.board} [${typeLabel}] | ${s.area} | ${s.distKm.toFixed(2)} km`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
