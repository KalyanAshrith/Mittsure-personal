import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const baseLat = 12.3021;
const baseLng = 76.6178;

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
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

async function suggestBalanceDays() {
  const excludedSNos = [
    52, 57, 67, 86, 87, 97, 107, 114, 117, 124, 137, 144, 160, 164, 172, 177, 185, 192, 197, 204, 214, 234,
    75, 81, 88, 100, 118, 201, 221,
    55, 77, 101, 143, 207, 208, 209
  ];

  const schools = await prisma.school.findMany({
    where: {
      s_no: { notIn: excludedSNos },
      visited_by_current_user: false,
    },
  });

  const withDist = schools.map((s) => ({
    ...s,
    distKm: Number(haversineKm(baseLat, baseLng, s.latitude, s.longitude).toFixed(1)),
  }));

  // Filter within 15km of Mysuru PG base for daily two-wheeler circuits
  const mysuruNear = withDist.filter((s) => s.distKm <= 12).sort((a, b) => a.distKm - b.distKm);
  console.log(`Schools within 12km of PG base: ${mysuruNear.length}`);

  // Group by specific clusters in Mysuru
  const saraswathiKuvempu = mysuruNear.filter(s =>
    ['Saraswathipuram', 'Kuvempunagar', 'TK Layout', 'Janatha Nagar', 'Sharadadevi Nagar'].includes(s.area) ||
    s.school_name.toLowerCase().includes('saraswathi') || s.school_name.toLowerCase().includes('kuvempu')
  );

  const bogadiVijayanagar = mysuruNear.filter(s =>
    ['Bogadi', 'Vijayanagar', 'Hootagalli', 'Belavadi'].includes(s.area)
  );

  const centralMysore = mysuruNear.filter(s =>
    ['Lashkar Mohalla', 'Mandi Mohalla', 'Devaraja Mohalla', 'Agrahara', 'Chamarajapuram', 'Krishnamurthypuram'].includes(s.area)
  );

  const eastMysore = mysuruNear.filter(s =>
    ['Siddartha Layout', 'Alanahalli', 'Kalyanagiri', 'Nazarbad', 'Udayagiri'].includes(s.area)
  );

  console.log('Saraswathi / Kuvempunagar area schools:', saraswathiKuvempu.length);
  console.log('Central Mysore schools:', centralMysore.length);
  console.log('East Mysore schools:', eastMysore.length);
  console.log('Bogadi / Nearby base schools:', bogadiVijayanagar.length);

  await prisma.$disconnect();
}

suggestBalanceDays().catch(console.error);
