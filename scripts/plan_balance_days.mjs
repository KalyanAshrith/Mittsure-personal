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

async function planBalanceDays() {
  const excludedSNos = [
    // Completed 22
    52, 57, 67, 86, 87, 97, 107, 114, 117, 124, 137, 144, 160, 164, 172, 177, 185, 192, 197, 204, 214, 234,
    // Monday 7
    75, 81, 88, 100, 118, 201, 221,
    // Tuesday 7
    55, 77, 101, 143, 207, 208, 209
  ];

  const allRemaining = await prisma.school.findMany({
    where: {
      s_no: { notIn: excludedSNos },
      visited_by_current_user: false,
    },
  });

  const withDist = allRemaining.map((s) => ({
    ...s,
    distKm: Number(haversineKm(baseLat, baseLng, s.latitude, s.longitude).toFixed(1)),
  }));

  // Wednesday (9 Sep): Kuvempunagar, Saraswathipuram & TK Layout Corridor (5 schools)
  const wedPool = withDist
    .filter(s => ['Kuvempunagar', 'Saraswathipuram', 'TK Layout', 'Sharadadevi Nagar'].includes(s.area) || s.distKm <= 5.5)
    .sort((a, b) => a.distKm - b.distKm);

  const wedSelected = wedPool.slice(0, 6);
  const wedIds = new Set(wedSelected.map(s => s.s_no));

  // Thursday (10 Sep): Srirampura, Ramakrishna Nagar & J P Nagar South Circuit (5 schools)
  const thuPool = withDist
    .filter(s => !wedIds.has(s.s_no))
    .filter(s => ['Srirampura', 'Ramakrishna Nagar', 'J P Nagar', 'Vidyaranyapuram'].includes(s.area) || (s.distKm > 4 && s.distKm <= 8.5))
    .sort((a, b) => a.distKm - b.distKm);

  const thuSelected = thuPool.slice(0, 6);
  const thuIds = new Set(thuSelected.map(s => s.s_no));

  // Friday (11 Sep): Hebbal, Hootagalli & Belavadi Industrial / Tech Corridor (5 schools)
  const friPool = withDist
    .filter(s => !wedIds.has(s.s_no) && !thuIds.has(s.s_no))
    .filter(s => ['Hebbal', 'Hootagalli', 'Belavadi', 'Vijayanagar'].includes(s.area) || (s.latitude > 12.33 && s.distKm <= 10))
    .sort((a, b) => a.distKm - b.distKm);

  const friSelected = friPool.slice(0, 6);
  const friIds = new Set(friSelected.map(s => s.s_no));

  // Saturday (12 Sep - HALF DAY): Bogadi Base & Ring Road Nearby Circuit (strictly 5 schools, max 6)
  const satPool = withDist
    .filter(s => !wedIds.has(s.s_no) && !thuIds.has(s.s_no) && !friIds.has(s.s_no))
    .filter(s => s.distKm <= 6.0)
    .sort((a, b) => a.distKm - b.distKm);

  const satSelected = satPool.slice(0, 5); // Exactly 5 schools for half day!

  console.log('=== Wednesday 9 Sep (6 schools) ===');
  wedSelected.forEach((s, i) => console.log(`  Stop #${i+1} • S.No.${s.s_no} • ${s.school_name} (${s.area}) [${s.distKm} km]`));

  console.log('\n=== Thursday 10 Sep (6 schools) ===');
  thuSelected.forEach((s, i) => console.log(`  Stop #${i+1} • S.No.${s.s_no} • ${s.school_name} (${s.area}) [${s.distKm} km]`));

  console.log('\n=== Friday 11 Sep (6 schools) ===');
  friSelected.forEach((s, i) => console.log(`  Stop #${i+1} • S.No.${s.s_no} • ${s.school_name} (${s.area}) [${s.distKm} km]`));

  console.log('\n=== Saturday 12 Sep (HALF-DAY: 5 schools) ===');
  satSelected.forEach((s, i) => console.log(`  Stop #${i+1} • S.No.${s.s_no} • ${s.school_name} (${s.area}) [${s.distKm} km]`));

  await prisma.$disconnect();
}

planBalanceDays().catch(console.error);
