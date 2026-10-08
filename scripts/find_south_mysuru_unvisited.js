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
    }
  });

  const areas = ['Kuvempunagar', 'Saraswathipuram', 'Srirampura', 'Dattagalli', 'Bogadi', 'Janatha Nagar', 'T K Layout', 'TK Layout', 'Sharadadevi Nagar', 'Ramakrishna Nagar', 'J P Nagar'];

  const matched = unvisited.filter(s => {
    return areas.some(a => (s.area || '').toLowerCase().includes(a.toLowerCase()) || (s.address || '').toLowerCase().includes(a.toLowerCase()));
  }).map(s => ({
    ...s,
    distKm: haversineKm(BASE_LAT, BASE_LNG, s.latitude, s.longitude)
  }));

  matched.sort((a, b) => a.distKm - b.distKm);

  console.log(`Found ${matched.length} unvisited schools in south Mysuru areas:`);
  matched.forEach(s => {
    const isStatePre = (s.board || '').toUpperCase().includes('STATE') || ['PRE-SCHOOL', 'PLAY SCHOOL', 'NURSERY', 'MONTESSORI', 'KINDERGARTEN'].includes((s.school_type || '').toUpperCase()) || ['D', 'E'].includes(s.opportunity_type);
    console.log(`  S.No ${s.s_no} | ${s.school_id} | ${s.school_name} | Board: ${s.board} | Area: ${s.area} | Dist: ${s.distKm.toFixed(2)} km | isStatePre: ${isStatePre}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
