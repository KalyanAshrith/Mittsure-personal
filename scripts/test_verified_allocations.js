const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BASE_LAT = 12.3021;
const BASE_LNG = 76.6178;
const BASE_ADDR = '661, Sahukar Chennaiah Road, Janatha Nagar, Bogadi 2nd Stage, TK Layout, Mysuru, Karnataka 570009';

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

// Check allocations
const allocations = {
  // Today 17 Sep (Thu): Dattagalli, Srirampura, Kuvempunagar (5 State/Pre + 2 CBSE)
  '2026-09-17': [72, 223, 258, 471, 472, 198, 205],

  // Tomorrow 18 Sep (Fri): Jayalakshmipuram, Gokulam & Vijayanagar (5 State/Pre + 2 CBSE)
  '2026-09-18': [208, 101, 326, 209, 484, 201, 221],

  // Saturday 19 Sep: Chamarajapuram, Jayalakshmipuram & Srirampura (3 State/Pre + 2 CBSE)
  '2026-09-19': [260, 207, 75, 473, 424],

  // Monday 21 Sep: Vidyaranyapuram & JP Nagar (5 State/Pre + 2 CBSE)
  '2026-09-21': [330, 378, 279, 379, 210, 70, 461],

  // Tuesday 22 Sep: Hebbal & Hootagalli (5 State/Pre + 2 CBSE, includes overdue Mahabodhi #74)
  '2026-09-22': [74, 265, 64, 454, 196, 73, 200]
};

async function main() {
  const allSNos = Object.values(allocations).flat();
  console.log(`Total stops planned: ${allSNos.length}`);
  const uniqueSNos = new Set(allSNos);
  console.log(`Unique stops: ${uniqueSNos.size}`);

  const schools = await prisma.school.findMany({
    where: { s_no: { in: allSNos } }
  });

  const visited = schools.filter(s => s.visited_by_current_user || s.visit_status === 'VISITED');
  if (visited.length > 0) {
    console.error('FATAL: Visited schools found:', visited.map(s => s.s_no));
    process.exit(1);
  }

  console.log('\n--- VERIFIED DISTANCES FROM PG BASE (Bogadi 2nd Stage) ---');
  for (const [date, snos] of Object.entries(allocations)) {
    console.log(`\nDate: ${date}`);
    for (const sno of snos) {
      const s = schools.find(sc => sc.s_no === sno);
      const d = haversineKm(BASE_LAT, BASE_LNG, s.latitude, s.longitude);
      const estRoadKm = Math.round(d * 1.25 * 10) / 10;
      console.log(`  S.No ${s.s_no} - ${s.school_name} [${s.board}] (${s.area}) | Direct: ${d.toFixed(2)} km | Est Road from PG: ${estRoadKm} km`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
