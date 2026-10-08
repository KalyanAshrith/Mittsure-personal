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

async function findMisclassifiedSchools() {
  const PG_LAT = 12.3021;
  const PG_LNG = 76.6178;

  const allSchools = await prisma.school.findMany();
  console.log(`Auditing ${allSchools.length} schools...`);

  const chamarajanagarUpdates = [];
  const mandyaUpdates = [];
  const outlyingUpdates = [];

  for (const s of allSchools) {
    const dist = haversineKm(PG_LAT, PG_LNG, s.latitude, s.longitude);
    const nameLower = s.school_name.toLowerCase();
    const addrLower = s.address.toLowerCase();

    // Check Chamarajanagar
    const isChamarajanagar =
      nameLower.includes('chamarajanagar') ||
      nameLower.includes('chamarjanagar') ||
      addrLower.includes('chamarajanagar') ||
      addrLower.includes('chamarjanagar') ||
      addrLower.includes('571313') ||
      addrLower.includes('571342') ||
      nameLower.includes('kollegal') ||
      addrLower.includes('kollegal') ||
      nameLower.includes('gundlupet') ||
      addrLower.includes('gundlupet') ||
      nameLower.includes('terakanambi') ||
      addrLower.includes('terakanambi');

    // Make sure it's not Avila Convent in Chamarajapuram Mysuru!
    const isChamarajapuramMysuru = nameLower.includes('avila') || addrLower.includes('chamarajapuram');

    if (isChamarajanagar && !isChamarajapuramMysuru) {
      let properArea = 'Chamarajanagara';
      if (nameLower.includes('kollegal') || addrLower.includes('kollegal')) properArea = 'Kollegal';
      else if (nameLower.includes('gundlupet') || addrLower.includes('gundlupet')) properArea = 'Gundlupet';
      else if (nameLower.includes('terakanambi') || addrLower.includes('terakanambi')) properArea = 'Terakanambi';

      chamarajanagarUpdates.push({
        id: s.id,
        s_no: s.s_no,
        name: s.school_name,
        oldDist: s.district,
        oldArea: s.area,
        newDist: 'Chamarajanagar',
        newArea: properArea,
        distKm: Math.round(dist * 10) / 10
      });
      continue;
    }

    // Check Mandya district
    const isMandya =
      nameLower.includes('mandya') ||
      addrLower.includes('mandya') ||
      nameLower.includes('malavalli') ||
      addrLower.includes('malavalli') ||
      nameLower.includes('nagamangala') ||
      addrLower.includes('nagamangala') ||
      nameLower.includes('k r pete') ||
      nameLower.includes('krpete') ||
      addrLower.includes('k r pete') ||
      nameLower.includes('pandavapura') ||
      addrLower.includes('pandavapura') ||
      nameLower.includes('srirangapatna') ||
      addrLower.includes('srirangapatna') ||
      nameLower.includes('maddur') ||
      addrLower.includes('maddur') ||
      nameLower.includes('k m doddi') ||
      addrLower.includes('k m doddi');

    if (isMandya) {
      let properArea = 'Mandya';
      if (nameLower.includes('malavalli') || addrLower.includes('malavalli')) properArea = 'Malavalli';
      else if (nameLower.includes('nagamangala') || addrLower.includes('nagamangala')) properArea = 'Nagamangala';
      else if (nameLower.includes('k r pete') || nameLower.includes('krpete')) properArea = 'K R Pete';
      else if (nameLower.includes('pandavapura') || addrLower.includes('pandavapura')) properArea = 'Pandavapura';
      else if (nameLower.includes('srirangapatna') || addrLower.includes('srirangapatna')) properArea = 'Srirangapatna';
      else if (nameLower.includes('k m doddi') || addrLower.includes('k m doddi')) properArea = 'K M Doddi';

      if (s.district !== 'Mandya' || s.area === 'Mysuru') {
        mandyaUpdates.push({
          id: s.id,
          s_no: s.s_no,
          name: s.school_name,
          oldDist: s.district,
          oldArea: s.area,
          newDist: 'Mandya',
          newArea: properArea,
          distKm: Math.round(dist * 10) / 10
        });
      }
      continue;
    }

    // Check outlying towns in Mysuru district
    if (s.area === 'Mysuru' && dist > 20) {
      let detectedArea = s.area;
      if (nameLower.includes('hunsur') || addrLower.includes('hunsur')) detectedArea = 'Hunsur';
      else if (nameLower.includes('t narasipura') || addrLower.includes('t narasipura')) detectedArea = 'T Narasipura';
      else if (nameLower.includes('k r nagar') || addrLower.includes('k r nagar')) detectedArea = 'K R Nagar';
      else if (nameLower.includes('bannur') || addrLower.includes('bannur')) detectedArea = 'Bannur';
      else if (nameLower.includes('hullahalli') || addrLower.includes('hullahalli')) detectedArea = 'Hullahalli';

      if (detectedArea !== 'Mysuru') {
        outlyingUpdates.push({
          id: s.id,
          s_no: s.s_no,
          name: s.school_name,
          oldArea: s.area,
          newArea: detectedArea,
          distKm: Math.round(dist * 10) / 10
        });
      }
    }
  }

  console.log(`\nFound ${chamarajanagarUpdates.length} Chamarajanagar schools to fix:`);
  chamarajanagarUpdates.forEach(u => {
    console.log(`  #${u.s_no} [${u.distKm} km] ${u.name} | Old: Dist=${u.oldDist}, Area=${u.oldArea} -> New: Dist=${u.newDist}, Area=${u.newArea}`);
  });

  console.log(`\nFound ${mandyaUpdates.length} Mandya schools to fix:`);
  mandyaUpdates.slice(0, 10).forEach(u => {
    console.log(`  #${u.s_no} [${u.distKm} km] ${u.name} | Old: Dist=${u.oldDist}, Area=${u.oldArea} -> New: Dist=${u.newDist}, Area=${u.newArea}`);
  });
  if (mandyaUpdates.length > 10) console.log(`  ... and ${mandyaUpdates.length - 10} more`);

  console.log(`\nFound ${outlyingUpdates.length} outlying Mysuru schools with area='Mysuru' to fix:`);
  outlyingUpdates.forEach(u => {
    console.log(`  #${u.s_no} [${u.distKm} km] ${u.name} | Old: Area=${u.oldArea} -> New: Area=${u.newArea}`);
  });
}

findMisclassifiedSchools().finally(() => prisma.$disconnect());
