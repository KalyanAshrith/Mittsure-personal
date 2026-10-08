import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

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

async function fixDistrictsAndAreas() {
  console.log('=== FIXING DISTRICTS AND AREAS FOR SUBORDINATE CITIES ===');
  const PG_LAT = 12.3021;
  const PG_LNG = 76.6178;

  const schools = await prisma.school.findMany();
  let chamarajanagarCount = 0;
  let mandyaCount = 0;
  let outlyingAreaCount = 0;

  for (const s of schools) {
    const nameLower = s.school_name.toLowerCase();
    const addrLower = s.address.toLowerCase();
    const dist = haversineKm(PG_LAT, PG_LNG, s.latitude, s.longitude);

    // Skip school #1 (which is at 12.3017, 76.6157 right in Mysuru) and Avila Convent in Chamarajapuram
    if (s.s_no === 1 || nameLower.includes('avila') || addrLower.includes('chamarajapuram')) {
      continue;
    }

    // 1. Chamarajanagar Identification
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
      addrLower.includes('terakanambi') ||
      (dist > 45 && s.latitude < 12.05); // Geographically in Chamarajanagar

    if (isChamarajanagar) {
      let area = 'Chamarajanagara';
      if (nameLower.includes('kollegal') || addrLower.includes('kollegal')) area = 'Kollegal';
      else if (nameLower.includes('gundlupet') || addrLower.includes('gundlupet')) area = 'Gundlupet';
      else if (nameLower.includes('terakanambi') || addrLower.includes('terakanambi')) area = 'Terakanambi';

      await prisma.school.update({
        where: { id: s.id },
        data: {
          district: 'Chamarajanagar',
          taluk: area,
          area: area
        }
      });
      chamarajanagarCount++;
      console.log(`[Chamarajanagar] #${s.s_no} ${s.school_name} -> District: Chamarajanagar, Area: ${area} (${dist.toFixed(1)} km)`);
      continue;
    }

    // 2. Mandya Identification
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
      addrLower.includes('kr pete') ||
      nameLower.includes('pandavapura') ||
      addrLower.includes('pandavapura') ||
      nameLower.includes('srirangapatna') ||
      addrLower.includes('srirangapatna') ||
      nameLower.includes('maddur') ||
      addrLower.includes('maddur') ||
      nameLower.includes('k m doddi') ||
      addrLower.includes('k m doddi') ||
      (dist > 30 && s.longitude > 76.75 && s.latitude > 12.35); // Geographically in Mandya

    if (isMandya) {
      let area = 'Mandya';
      if (nameLower.includes('malavalli') || addrLower.includes('malavalli')) area = 'Malavalli';
      else if (nameLower.includes('nagamangala') || addrLower.includes('nagamangala')) area = 'Nagamangala';
      else if (nameLower.includes('k r pete') || nameLower.includes('krpete')) area = 'K R Pete';
      else if (nameLower.includes('pandavapura') || addrLower.includes('pandavapura')) area = 'Pandavapura';
      else if (nameLower.includes('srirangapatna') || addrLower.includes('srirangapatna')) area = 'Srirangapatna';
      else if (nameLower.includes('k m doddi') || addrLower.includes('k m doddi')) area = 'K M Doddi';
      else if (nameLower.includes('maddur') || addrLower.includes('maddur')) area = 'Maddur';

      await prisma.school.update({
        where: { id: s.id },
        data: {
          district: 'Mandya',
          taluk: area,
          area: area
        }
      });
      mandyaCount++;
      continue;
    }

    // 3. Outlying Mysuru taluks (Hunsur, T Narasipura, K R Nagar, Hullahalli, Bannur)
    if (s.area === 'Mysuru' && dist > 20) {
      let detectedArea = null;
      if (nameLower.includes('hunsur') || addrLower.includes('hunsur')) detectedArea = 'Hunsur';
      else if (nameLower.includes('t narasipura') || addrLower.includes('t narasipura') || nameLower.includes('t narsipura')) detectedArea = 'T Narasipura';
      else if (nameLower.includes('k r nagar') || addrLower.includes('k r nagar') || nameLower.includes('kr nagar')) detectedArea = 'K R Nagar';
      else if (nameLower.includes('bannur') || addrLower.includes('bannur')) detectedArea = 'Bannur';
      else if (nameLower.includes('hullahalli') || addrLower.includes('hullahalli')) detectedArea = 'Hullahalli';

      if (detectedArea) {
        await prisma.school.update({
          where: { id: s.id },
          data: {
            area: detectedArea,
            taluk: detectedArea
          }
        });
        outlyingAreaCount++;
      }
    }
  }

  console.log(`\nUpdated ${chamarajanagarCount} schools to District: Chamarajanagar`);
  console.log(`Updated ${mandyaCount} schools to District: Mandya`);
  console.log(`Updated ${outlyingAreaCount} outlying schools to their specific taluks`);

  // Update data/schools.json
  const schoolsJsonPath = path.resolve(process.cwd(), 'data/schools.json');
  if (fs.existsSync(schoolsJsonPath)) {
    try {
      const allUpdated = await prisma.school.findMany();
      const map = new Map(allUpdated.map(s => [s.school_id, s]));
      const data = JSON.parse(fs.readFileSync(schoolsJsonPath, 'utf-8'));
      for (const item of data) {
        if (map.has(item.school_id)) {
          const u = map.get(item.school_id);
          item.district = u.district;
          item.taluk = u.taluk;
          item.area = u.area;
        }
      }
      fs.writeFileSync(schoolsJsonPath, JSON.stringify(data, null, 2), 'utf-8');
      console.log('Synchronized data/schools.json with corrected districts and areas.');
    } catch (e) {
      console.warn('Could not update schools.json:', e.message);
    }
  }
}

fixDistrictsAndAreas().catch(console.error).finally(() => prisma.$disconnect());
