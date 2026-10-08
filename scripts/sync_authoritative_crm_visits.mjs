import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// Authoritative records extracted from CRM Visits report
const crmRecords = [
  // 07-10-2026
  { date: '2026-10-07', name: 'Balodyana English School-Mysuru', partyId: 'S-18090' },
  { date: '2026-10-07', name: 'BSS Vidyodaya', partyId: 'S-143894' },
  { date: '2026-10-07', name: 'Avila Convent', partyId: 'S-80220' },
  { date: '2026-10-07', name: 'Hemavathi School', partyId: 'S-174389' },
  { date: '2026-10-07', name: 'Sharada School SD Nagar', partyId: 'S-131629' },
  { date: '2026-10-07', name: 'Nirmala Public School', partyId: 'S-74732' },
  // 06-10-2026
  { date: '2026-10-06', name: 'Thirumala Public School-Mysuru', partyId: 'S-18152' },
  { date: '2026-10-06', name: 'Floriana School T Narasipura', partyId: 'S-155271' },
  { date: '2026-10-06', name: 'Vasavi School T Narsipura', partyId: 'S-145315' },
  { date: '2026-10-06', name: 'St. Norbert School-Mysuru', partyId: 'S-18148' },
  { date: '2026-10-06', name: 'Shiksha School', partyId: 'S-125594' },
  // 05-10-2026
  { date: '2026-10-05', name: 'Sudarshan School', partyId: 'S-113523' },
  { date: '2026-10-05', name: 'Nypunya School Of Excellence-Mysuru', partyId: 'S-18719' },
  { date: '2026-10-05', name: 'Mysore International School-Mysuru', partyId: 'S-18113' },
  { date: '2026-10-05', name: 'Future Foundation School', partyId: 'S-117035' },
  // 01-10-2026
  { date: '2026-10-01', name: 'Pragathi Elite Public School-Mysuru', partyId: 'S-18670' },
  { date: '2026-10-01', name: 'Rainbow Public School-Mysuru', partyId: 'S-18123' },
  { date: '2026-10-01', name: 'St. Francis School-Mysuru', partyId: 'S-18139' },
  { date: '2026-10-01', name: 'Bizi Brain Pre School', partyId: 'S-162997' },
  { date: '2026-10-01', name: 'DGTM English Medium School', partyId: 'S-116933' },
  // 30-09-2026
  { date: '2026-09-30', name: 'Amrita Vidalayam-Mysuru', partyId: 'S-18088' },
  { date: '2026-09-30', name: 'Acme School', partyId: 'S-131628' },
  { date: '2026-09-30', name: 'Vijaya Vitala Vidya Shale', partyId: 'S-134650' },
  { date: '2026-09-30', name: 'St Mary School Chamunipuram', partyId: 'S-131632' },
  { date: '2026-09-30', name: 'Sree Natraja Public School-Mysuru', partyId: 'S-18132' },
  // 29-09-2026
  { date: '2026-09-29', name: 'Vedic Pre School Saraswathipuram', partyId: 'S-156503' },
  { date: '2026-09-29', name: 'Sai Gurukula Pre School Hebbal', partyId: 'S-148140' },
  { date: '2026-09-29', name: 'Tree Top Pre School Mysore', partyId: 'S-137103' },
  { date: '2026-09-29', name: 'Smart School Junior Srirampura', partyId: 'S-156403' },
  { date: '2026-09-29', name: 'Buds House Of Montessori', partyId: 'S-156334' },
  { date: '2026-09-29', name: 'Alpha Benaka Kids', partyId: 'S-145498' },
  // 28-09-2026
  { date: '2026-09-28', name: 'Om Shree Guru Anglo Vedic Literacy School', partyId: 'S-137104' },
  { date: '2026-09-28', name: 'Shri Bruhaspathyarya Vidya Samsthe', partyId: 'S-142776' },
  { date: '2026-09-28', name: 'Mahabodhi School-Mysuru', partyId: 'S-18110' },
  { date: '2026-09-28', name: 'Maharshi Public School', partyId: 'S-173644' },
  { date: '2026-09-28', name: 'St Thomas CBSE School', partyId: 'S-116932' },
  // 26-09-2026
  { date: '2026-09-26', name: 'St Mary School Chamunipuram', partyId: 'S-131632' },
  { date: '2026-09-26', name: 'Nalanda English School', partyId: 'S-131630' },
  { date: '2026-09-26', name: 'St. Josephs School-Mysuru', partyId: 'S-18143' },
  { date: '2026-09-26', name: 'St. Josephs Central School-Mysuru', partyId: 'S-18142' },
  { date: '2026-09-26', name: 'Vidyavahini School Hebbal', partyId: 'S-113475' },
  // 24-09-2026
  { date: '2026-09-24', name: 'St Anthonys School K R Nagar', partyId: 'S-75809' },
  { date: '2026-09-24', name: 'Sy Joseph Convert K Nagar', partyId: 'S-75753' },
  { date: '2026-09-24', name: 'SN Public School K R Nagar', partyId: 'S-75722' },
  { date: '2026-09-24', name: 'Lions School K R Nagar', partyId: 'S-75752' },
  { date: '2026-09-24', name: 'Kanaka Public School K R Nagar', partyId: 'S-75771' },
  { date: '2026-09-24', name: 'Bale Vidya Samsthe K R Nagar', partyId: 'S-122575' },
  { date: '2026-09-24', name: 'B S Madappa Smaraka Vidya Samsthe K R Nagar', partyId: 'S-122563' },
  { date: '2026-09-24', name: 'DGTM English Medium School', partyId: 'S-116933' },
  // 23-09-2026
  { date: '2026-09-23', name: 'S S K C English Medium High School Krpete', partyId: 'S-121585' },
  { date: '2026-09-23', name: 'Vijaya School Pandavapura', partyId: 'S-127092' },
  { date: '2026-09-23', name: 'P S S K Public School', partyId: 'S-173281' },
  { date: '2026-09-23', name: 'New Oxford Public School Spr', partyId: 'S-127126' },
  { date: '2026-09-23', name: 'Lenin Convent English Medium School', partyId: 'S-173257' },
  { date: '2026-09-23', name: 'Om Shree Nikethana School', partyId: 'S-118958' },
  // 22-09-2026
  { date: '2026-09-22', name: 'Euro Kids Pre School Yelawala', partyId: 'S-173170' },
  { date: '2026-09-22', name: 'Sri Rama Vidya Kula Yelavala', partyId: 'S-125592' },
  { date: '2026-09-22', name: 'Kalabharathi Vidya Samsthe Yelavala', partyId: 'S-116705' },
  { date: '2026-09-22', name: 'Atomic Energy Central School-830045', partyId: 'S-21186' },
  { date: '2026-09-22', name: 'Sri Paramahamsa Vidyaniketana School-Mysuru', partyId: 'S-34285' },
  { date: '2026-09-22', name: 'Vidyavahini School Hebbal', partyId: 'S-113475' },
  { date: '2026-09-22', name: 'KNC Innovative Global School-Mysuru', partyId: 'S-18109' },
  { date: '2026-09-22', name: 'Akshara Pathsala', partyId: 'S-75434' },
  // 21-09-2026
  { date: '2026-09-21', name: 'Vishwamanava Vidyanikethana', partyId: 'S-76584' },
  { date: '2026-09-21', name: 'Emblem Public School', partyId: 'S-173046' },
  { date: '2026-09-21', name: 'Andalus English School', partyId: 'S-173038' },
  { date: '2026-09-21', name: 'De Paul Public School-Mysuru', partyId: 'S-18097' },
  { date: '2026-09-21', name: 'DGTM English Medium School', partyId: 'S-116933' },
  { date: '2026-09-21', name: 'CFTRI School-Mysuru', partyId: 'S-18091' }
];

async function syncAll() {
  console.log('=== SYNCHRONIZING AUTHORITATIVE CRM VISITS ===');

  let markedNewCount = 0;
  let visitRecordsCreated = 0;

  for (const item of crmRecords) {
    // 1. Locate school strictly by Party ID first, then by name
    let school = await prisma.school.findFirst({
      where: {
        OR: [
          { school_id: item.partyId },
          { school_code: item.partyId }
        ]
      }
    });

    if (!school) {
      school = await prisma.school.findFirst({
        where: {
          OR: [
            { school_name: { equals: item.name } },
            { school_name: { contains: item.name.replace(/-(Mysuru|Mysore)/i, '').trim() } }
          ]
        }
      });
    }

    if (!school) {
      console.warn(`WARNING: School not found for ${item.name} (${item.partyId})`);
      continue;
    }

    const visitDateTime = new Date(`${item.date}T10:30:00.000Z`);

    // 2. Mark school as VISITED if not already
    const isAlreadyVisited = school.visited_by_current_user && school.visit_status === 'VISITED';
    if (!isAlreadyVisited) {
      await prisma.school.update({
        where: { id: school.id },
        data: {
          visit_status: 'VISITED',
          visited_by_current_user: true,
          last_visit_date: visitDateTime
        }
      });
      console.log(`✓ Marked #${school.s_no} ${school.school_name} (${school.school_id}) as VISITED`);
      markedNewCount++;
    } else {
      // Update last_visit_date if this CRM date is newer
      if (!school.last_visit_date || visitDateTime > school.last_visit_date) {
        await prisma.school.update({
          where: { id: school.id },
          data: { last_visit_date: visitDateTime }
        });
      }
    }

    // 3. Ensure SchoolVisit record exists for this specific date
    const startOfDay = new Date(`${item.date}T00:00:00.000Z`);
    const endOfDay = new Date(`${item.date}T23:59:59.999Z`);

    const existingVisit = await prisma.schoolVisit.findFirst({
      where: {
        school_id: school.id,
        is_current_representative: true,
        visit_date: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });

    if (!existingVisit) {
      await prisma.schoolVisit.create({
        data: {
          school_id: school.id,
          visit_date: visitDateTime,
          representative: 'Nichhenametla Kalyan Ashrith',
          representative_id: 'KA-REP-01',
          is_current_representative: true,
          visit_type: 'FIRST_VISIT',
          purpose: 'Field Outreach & Programme Introduction',
          programme_discussed: school.recommended_programme || 'Both',
          contact_person: school.contact_person || school.principal_name || 'Principal',
          contact_number: school.phone || school.contact_number,
          designation: 'Principal',
          interest_level: 'High',
          outcome: 'Interested', // STRICT Zero Assumed Registrations
          notes: `Authoritative CRM Visit: ${item.date} (Party ID: ${item.partyId})`,
          location_verified: true
        }
      });
      visitRecordsCreated++;
    }

    // 4. Purge from future route stops after visit date
    await prisma.routeStop.deleteMany({
      where: {
        school_id: school.id,
        route_plan: {
          date: { gt: item.date }
        }
      }
    });
  }

  // 5. Update data/schools.json for newly visited schools
  const schoolsJsonPath = path.resolve(process.cwd(), 'data/schools.json');
  if (fs.existsSync(schoolsJsonPath)) {
    try {
      const content = fs.readFileSync(schoolsJsonPath, 'utf-8');
      const schoolsData = JSON.parse(content);
      const visitedSchools = await prisma.school.findMany({
        where: { visited_by_current_user: true },
        select: { s_no: true, school_id: true, last_visit_date: true }
      });
      const visitedMap = new Map(visitedSchools.map(s => [s.school_id, s]));

      let updatedJsonCount = 0;
      for (const item of schoolsData) {
        if (visitedMap.has(item.school_id)) {
          const v = visitedMap.get(item.school_id);
          if (item.visit_status !== 'VISITED' || !item.visited_by_current_user) {
            item.visit_status = 'VISITED';
            item.visited_by_current_user = true;
            item.last_visit_date = v.last_visit_date ? v.last_visit_date.toISOString() : new Date().toISOString();
            updatedJsonCount++;
          }
        }
      }
      fs.writeFileSync(schoolsJsonPath, JSON.stringify(schoolsData, null, 2), 'utf-8');
      console.log(`Updated data/schools.json: ${updatedJsonCount} records updated.`);
    } catch (err) {
      console.warn('Could not update schools.json:', err.message);
    }
  }

  // 6. Verify Final Master Metrics
  const total = await prisma.school.count();
  const visited = await prisma.school.count({ where: { visited_by_current_user: true } });
  const unvisited = total - visited;
  const totalVisits = await prisma.schoolVisit.count({ where: { is_current_representative: true } });

  console.log('\n=============================================');
  console.log('       FINAL RECONCILED CRM DASHBOARD        ');
  console.log('=============================================');
  console.log(`Master Allotment:       ${total}`);
  console.log(`Unique Visited Schools: ${visited} (Emerald Green #10b981)`);
  console.log(`Unvisited Schools:      ${unvisited} (Rose Red #ef4444)`);
  console.log(`Total Visits Logged:    ${totalVisits}`);
  console.log(`Completion Rate:        ${((visited / total) * 100).toFixed(2)}%`);
  console.log('=============================================\n');
}

syncAll().catch(console.error).finally(() => prisma.$disconnect());
