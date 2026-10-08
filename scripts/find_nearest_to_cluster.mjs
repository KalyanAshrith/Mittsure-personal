import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

async function findNearest() {
  const currentStops = [67, 157, 329, 205, 254];
  const schools = await prisma.school.findMany({
    where: { s_no: { in: currentStops } }
  });

  const cLat = schools.reduce((sum, s) => sum + s.latitude, 0) / schools.length;
  const cLng = schools.reduce((sum, s) => sum + s.longitude, 0) / schools.length;
  console.log(`Cluster Centroid: lat ${cLat.toFixed(4)}, lng ${cLng.toFixed(4)}`);

  const unvisited = await prisma.school.findMany({
    where: {
      visited_by_current_user: false,
      s_no: { notIn: currentStops }
    }
  });

  const scored = unvisited.map(u => ({
    ...u,
    distFromCentroid: haversine(cLat, cLng, u.latitude, u.longitude)
  })).sort((a, b) => a.distFromCentroid - b.distFromCentroid);

  console.log("\nTop 10 nearest unvisited schools to this 5-school circuit:");
  scored.slice(0, 10).forEach(s => {
    console.log(`  S.No ${s.s_no} | ${s.school_id} | ${s.school_name} | Board: ${s.board} | Area: ${s.area} | Dist: ${s.distFromCentroid.toFixed(2)} km`);
  });
}

findNearest().catch(console.error).finally(() => prisma.$disconnect());
