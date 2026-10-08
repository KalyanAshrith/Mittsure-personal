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
  // Already allocated schools for Today (17-Sep), Tomorrow (18-Sep), Saturday (19-Sep)
  const allocated = new Set([
    // Today 17-Sep:
    205, 72, 223, 258, 198, 471, 472,
    // Tomorrow 18-Sep:
    208, 101, 326, 209, 484, 201, 221,
    // Saturday 19-Sep:
    372, 65, 332, 247, 241
  ]);

  const unvisited = await prisma.school.findMany({
    where: {
      visited_by_current_user: false,
      visit_status: { not: 'VISITED' }
    }
  });

  const available = unvisited.filter(s => !allocated.has(s.s_no)).map(s => {
    const isStatePre = (s.board || '').toUpperCase().includes('STATE') || ['PRE-SCHOOL', 'PLAY SCHOOL', 'NURSERY', 'MONTESSORI', 'KINDERGARTEN'].includes((s.school_type || '').toUpperCase()) || ['D', 'E'].includes(s.opportunity_type);
    return {
      ...s,
      isStatePre,
      distKm: haversineKm(BASE_LAT, BASE_LNG, s.latitude, s.longitude)
    };
  });

  console.log(`Remaining unvisited available schools: ${available.length}`);

  // Let's inspect closest schools for Monday (21-Sep):
  available.sort((a, b) => a.distKm - b.distKm);
  console.log('\nTop 20 closest for Monday (21-Sep):');
  available.slice(0, 20).forEach((s, idx) => {
    console.log(`  ${idx + 1}. S.No ${s.s_no} | ${s.school_id} | ${s.school_name} | ${s.board} [${s.isStatePre ? 'State/Pre' : 'CBSE/ICSE'}] | ${s.area} | ${s.distKm.toFixed(2)} km`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
