const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BASE_LAT = 12.3021;
const BASE_LNG = 76.6178;

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

async function analyzeUpcoming() {
  const unvisited = await prisma.school.findMany({
    where: { visited_by_current_user: false },
    orderBy: { s_no: 'asc' }
  });

  console.log(`Unvisited schools count: ${unvisited.length}`);

  // Inspect Friday 11 Sep candidates
  const fri11Snos = [208, 101, 326, 209, 484, 201, 221];
  const fri11Schools = await prisma.school.findMany({
    where: { s_no: { in: fri11Snos } }
  });
  console.log(`\nFriday 11-Sep Plan schools (all unvisited?):`);
  for (const s of fri11Schools) {
    console.log(`  S.No ${s.s_no} | ${s.school_name} | Board: ${s.board} | Area: ${s.area} | Visited: ${s.visited_by_current_user}`);
  }

  // Find tightest Saturday candidates near Bogadi (5 schools: 3 State/Pre + 2 CBSE)
  const withDist = unvisited
    .filter(s => !fri11Snos.includes(s.s_no))
    .map(s => ({
      ...s,
      distFromBase: haversineKm(BASE_LAT, BASE_LNG, s.latitude, s.longitude)
    }))
    .sort((a, b) => a.distFromBase - b.distFromBase);

  console.log(`\nClosest unvisited schools to Bogadi base:`);
  for (let i = 0; i < 20; i++) {
    const s = withDist[i];
    console.log(`  ${(i+1)}. S.No ${s.s_no} | ${s.school_name} | ${s.board} | ${s.school_type} | ${s.area} | Dist: ${s.distFromBase.toFixed(2)} km`);
  }
}

analyzeUpcoming().catch(console.error).finally(() => prisma['$disconnect']());
