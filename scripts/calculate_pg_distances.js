const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const PG_LAT = 12.3021;
const PG_LNG = 76.6178;
const PG_ADDR = '661, Sahukar Chennaiah Road, Janatha Nagar, Bogadi 2nd Stage, TK Layout, Mysuru, Karnataka 570009';

function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
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

// Urban road factor in Mysuru: ~1.25x - 1.35x crow-flies distance
function estimateRoadKm(lat1, lon1, lat2, lon2) {
  const straightKm = haversineMeters(lat1, lon1, lat2, lon2) / 1000;
  return straightKm * 1.30;
}

function estimateTwoWheelerMinutes(roadKm) {
  // Average city two-wheeler speed ~ 25-30 km/h -> 2.4 min per km
  return Math.max(1, Math.round(roadKm * 2.4));
}

function getGoogleMapsDirectUrl(lat, lng) {
  return `https://www.google.com/maps/dir/?api=1&origin=${PG_LAT},${PG_LNG}&destination=${lat},${lng}&travelmode=two-wheeler`;
}

async function main() {
  console.log('=== DISTANCES FROM PG LOCATION TO FURTHER SCHOOLS ===\n');
  console.log(`PG Origin: ${PG_ADDR}`);
  console.log(`Coordinates: (${PG_LAT}, ${PG_LNG})\n`);

  // 1. Tomorrow: Friday 18 Sep
  const friPlan = await prisma.routePlan.findFirst({
    where: { date: '2026-09-18' },
    include: { stops: { include: { school: true }, orderBy: { optimized_sequence: 'asc' } } }
  });

  console.log(`--- 1. TOMORROW (FRIDAY 18 SEP): GOKULAM & VIJAYANAGAR ---`);
  if (friPlan) {
    for (const st of friPlan.stops) {
      const s = st.school;
      const straightM = haversineMeters(PG_LAT, PG_LNG, s.latitude, s.longitude);
      const roadKm = estimateRoadKm(PG_LAT, PG_LNG, s.latitude, s.longitude);
      const mins = estimateTwoWheelerMinutes(roadKm);
      const mapUrl = getGoogleMapsDirectUrl(s.latitude, s.longitude);
      console.log(`Stop #${st.stop_number}: S.No ${s.s_no} - ${s.school_name}`);
      console.log(`  Area: ${s.area} | Board: ${s.board} | Straight: ${(straightM/1000).toFixed(2)} km | Est Road: ${roadKm.toFixed(2)} km | 2-Wheeler: ~${mins} mins`);
      console.log(`  Maps URL: ${mapUrl}`);
    }
  }

  // 2. Day After Tomorrow: Saturday 19 Sep
  const satPlan = await prisma.routePlan.findFirst({
    where: { date: '2026-09-19' },
    include: { stops: { include: { school: true }, orderBy: { optimized_sequence: 'asc' } } }
  });

  console.log(`\n--- 2. DAY AFTER TOMORROW (SATURDAY 19 SEP): BOGADI BASE CLUSTER ---`);
  if (satPlan) {
    for (const st of satPlan.stops) {
      const s = st.school;
      const straightM = haversineMeters(PG_LAT, PG_LNG, s.latitude, s.longitude);
      const roadKm = estimateRoadKm(PG_LAT, PG_LNG, s.latitude, s.longitude);
      const mins = estimateTwoWheelerMinutes(roadKm);
      const mapUrl = getGoogleMapsDirectUrl(s.latitude, s.longitude);
      console.log(`Stop #${st.stop_number}: S.No ${s.s_no} - ${s.school_name}`);
      console.log(`  Area: ${s.area} | Board: ${s.board} | Straight: ${(straightM/1000).toFixed(2)} km (${straightM.toFixed(0)}m) | Est Road: ${roadKm.toFixed(2)} km | 2-Wheeler: ~${mins} mins`);
      console.log(`  Maps URL: ${mapUrl}`);
    }
  }

  // 3. Further Unvisited Schools by Major Cluster / Zone
  const unvisited = await prisma.school.findMany({
    where: { visited_by_current_user: false }
  });

  const clusters = [
    { zone: 'Bogadi & Janatha Nagar (Immediate Base)', areas: ['Bogadi', 'Mysuru'] },
    { zone: 'Saraswathipuram & TK Layout', areas: ['Saraswathipuram'] },
    { zone: 'Kuvempunagar & Ramakrishna Nagar', areas: ['Kuvempunagar', 'Ramakrishna Nagar'] },
    { zone: 'Jayalakshmipuram & Gokulam', areas: ['Jayalakshmipuram', 'Gokulam'] },
    { zone: 'Vijayanagar & Hebbal', areas: ['Vijayanagar', 'Hebbal'] },
    { zone: 'Dattagalli & Srirampura', areas: ['Dattagalli', 'Srirampura'] },
    { zone: 'J P Nagar & Vidyaranyapuram', areas: ['J P Nagar', 'Vidyaranyapuram'] },
  ];

  console.log(`\n--- 3. DISTANCE BREAKDOWN FROM PG TO MAJOR MYSORE CLUSTERS ---`);
  for (const c of clusters) {
    const inCluster = unvisited.filter(s => c.areas.includes(s.area));
    if (inCluster.length > 0) {
      let sumDist = 0;
      let minDist = Infinity;
      let maxDist = 0;
      for (const s of inCluster) {
        const d = estimateRoadKm(PG_LAT, PG_LNG, s.latitude, s.longitude);
        sumDist += d;
        if (d < minDist) minDist = d;
        if (d > maxDist) maxDist = d;
      }
      const avgDist = sumDist / inCluster.length;
      console.log(`Cluster: ${c.zone} (${inCluster.length} unvisited schools)`);
      console.log(`  Distance from PG: ${minDist.toFixed(1)} km to ${maxDist.toFixed(1)} km (Avg: ${avgDist.toFixed(1)} km, ~${estimateTwoWheelerMinutes(avgDist)} mins on two-wheeler)`);
    }
  }
}

main().catch(console.error).finally(() => prisma['$disconnect']());
