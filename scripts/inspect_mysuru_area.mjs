import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

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

async function inspectMysuruArea() {
  const PG_LAT = 12.3021;
  const PG_LNG = 76.6178;

  const mysuruAreaSchools = await prisma.school.findMany({
    where: { area: 'Mysuru' }
  });

  console.log(`Schools with area='Mysuru': ${mysuruAreaSchools.length}`);

  const farUnderMysuru = [];
  for (const s of mysuruAreaSchools) {
    const dist = haversineKm(PG_LAT, PG_LNG, s.latitude, s.longitude);
    if (dist > 15) {
      farUnderMysuru.push({
        s_no: s.s_no,
        name: s.school_name,
        address: s.address,
        distKm: Math.round(dist * 10) / 10,
        lat: s.latitude,
        lng: s.longitude
      });
    }
  }

  console.log(`Far schools (>15km) labeled as area='Mysuru': ${farUnderMysuru.length}`);
  farUnderMysuru.forEach(f => {
    console.log(`  #${f.s_no} [${f.distKm} km] ${f.name} | ${f.address}`);
  });
}

inspectMysuruArea().finally(() => prisma.$disconnect());
