import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const BASE_LAT = 12.3021;
const BASE_LNG = 76.6178;

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function solveTSP(schools) {
  let unvisited = [...schools];
  let curLat = BASE_LAT;
  let curLng = BASE_LNG;
  let ordered = [];
  let totalDist = 0;

  while (unvisited.length > 0) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < unvisited.length; i++) {
      const d = haversine(curLat, curLng, unvisited[i].latitude, unvisited[i].longitude);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    totalDist += bestDist;
    const next = unvisited.splice(bestIdx, 1)[0];
    ordered.push(next);
    curLat = next.latitude;
    curLng = next.longitude;
  }
  // Return to base
  totalDist += haversine(curLat, curLng, BASE_LAT, BASE_LNG);
  return { ordered, totalDist };
}

async function testCombinations() {
  const base5SNos = [67, 157, 329, 205, 254];
  const candidates = [
    { label: "Pair 1: S.No 388 (Vijaya Vitala) + S.No 372 (Lalitha High)", snos: [...base5SNos, 388, 372] },
    { label: "Pair 2: S.No 388 (Vijaya Vitala) + S.No 244 (Vishwamanava)", snos: [...base5SNos, 388, 244] },
    { label: "Pair 3: S.No 388 (Vijaya Vitala) + S.No 277 (Vanitha Sadana)", snos: [...base5SNos, 388, 277] },
    { label: "Pair 4: S.No 244 (Vishwamanava) + S.No 211 (Ramakrishna VK)", snos: [...base5SNos, 244, 211] },
    { label: "Pair 5: S.No 113 (Vidyavardhaka) + S.No 388 (Vijaya Vitala)", snos: [...base5SNos, 113, 388] },
  ];

  for (const c of candidates) {
    const schools = await prisma.school.findMany({ where: { s_no: { in: c.snos } } });
    const { ordered, totalDist } = solveTSP(schools);
    console.log(`\n=== ${c.label} ===`);
    console.log(`Total Round-Trip Distance: ${totalDist.toFixed(1)} km (~${Math.round(totalDist * 2.4)} mins ride)`);
    ordered.forEach((s, idx) => {
      console.log(`  Stop #${idx + 1}: S.No ${s.s_no} - ${s.school_name} [${s.board}] (${s.area})`);
    });
  }
}

testCombinations().catch(console.error).finally(() => prisma.$disconnect());
