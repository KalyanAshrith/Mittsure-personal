import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function syncCrmVisits() {
  console.log('--- Starting CRM Visits Synchronization ---');

  // 1. Auto-create Hemavathi School (S-174389) if not exists
  let hemavathi = await prisma.school.findFirst({
    where: {
      OR: [
        { school_id: 'S-174389' },
        { school_name: { contains: 'Hemavathi' } }
      ]
    }
  });

  if (!hemavathi) {
    const maxSchool = await prisma.school.findFirst({
      orderBy: { s_no: 'desc' },
      select: { s_no: true }
    });
    const nextSNo = (maxSchool?.s_no || 493) + 1;

    hemavathi = await prisma.school.create({
      data: {
        s_no: nextSNo,
        school_id: 'S-174389',
        school_name: 'Hemavathi School',
        school_code: 'S-174389',
        board: 'STATE BOARD',
        medium: 'English',
        school_type: 'PRIMARY',
        category: 'Primary',
        address: 'Hemavathi School, Mysuru',
        area: 'Mysuru',
        taluk: 'Mysuru',
        district: 'Mysuru',
        state: 'Karnataka',
        pincode: '570001',
        latitude: 12.3021,
        longitude: 76.6178,
        principal_name: 'Head / Principal',
        contact_person: 'Principal',
        student_strength: 200,
        status: 'ACTIVE',
        visit_status: 'VISITED',
        visited_by_current_user: true,
        last_visit_date: new Date('2026-10-07T16:30:00.000Z'),
        priority: 'MEDIUM',
        opportunity_type: 'C',
        recommended_programme: 'MOM',
        notes: 'Newly confirmed visit from CRM Report for 7 Oct 2026.'
      }
    });
    console.log(`Auto-created school #${hemavathi.s_no} ${hemavathi.school_name} (${hemavathi.school_id})`);
  }

  // 2. Newly confirmed schools to mark visited
  const schoolsToMark = [
    // 4 Sep
    { code: 'S-156335', date: '2026-09-04', notes: 'CRM Report: Visited on 4 Sep 2026 (Party ID S-171432)' }, // Kidzee Pre School
    // 5 Sep
    { code: 'S-131608', date: '2026-09-05', notes: 'CRM Report: Visited on 5 Sep 2026' }, // SVEI CBSE School
    { code: 'S-18719', date: '2026-09-05', notes: 'CRM Report: Visited on 5 Sep 2026' },  // Nypunya School Of Excellence
    { code: 'S-18113', date: '2026-09-05', notes: 'CRM Report: Visited on 5 Sep 2026' },  // Mysore International School
    { code: 'S-117035', date: '2026-09-05', notes: 'CRM Report: Visited on 5 Sep 2026' }, // Future Foundation School
    { code: 'S-113523', date: '2026-09-05', notes: 'CRM Report: Visited on 5 Sep 2026' }, // Sudarshan School
    // 6 Sep
    { code: 'S-18152', date: '2026-09-06', notes: 'CRM Report: Visited on 6 Sep 2026' },  // Thirumala Public School
    { code: 'S-155271', date: '2026-09-06', notes: 'CRM Report: Visited on 6 Sep 2026' }, // Floriana School T Narasipura
    { code: 'S-145315', date: '2026-09-06', notes: 'CRM Report: Visited on 6 Sep 2026' }, // Vasavi School T Narsipura
    { code: 'S-18148', date: '2026-09-06', notes: 'CRM Report: Visited on 6 Sep 2026' },  // St. Norbert School
    { code: 'S-125594', date: '2026-09-06', notes: 'CRM Report: Visited on 6 Sep 2026' }, // Shiksha School
    // 7 Oct
    { code: 'S-18090', date: '2026-10-07', notes: 'CRM Report: Visited on 7 Oct 2026' },  // Balodyana English School
    { code: 'S-143894', date: '2026-10-07', notes: 'CRM Report: Visited on 7 Oct 2026' }, // BSS Vidyodaya
    { code: 'S-80220', date: '2026-10-07', notes: 'CRM Report: Visited on 7 Oct 2026' },  // Avila Convent
    { code: 'S-131629', date: '2026-10-07', notes: 'CRM Report: Visited on 7 Oct 2026' }, // Sharada School SD Nagar
    { code: 'S-174389', date: '2026-10-07', notes: 'CRM Report: Visited on 7 Oct 2026' }  // Hemavathi School
  ];

  let markedCount = 0;
  for (const item of schoolsToMark) {
    const s = await prisma.school.findFirst({
      where: {
        OR: [
          { school_id: item.code },
          { school_code: item.code }
        ]
      }
    });

    if (!s) {
      console.warn(`School ${item.code} not found!`);
      continue;
    }

    const visitDateTime = new Date(`${item.date}T16:30:00.000Z`);

    // Update School record
    await prisma.school.update({
      where: { id: s.id },
      data: {
        visit_status: 'VISITED',
        visited_by_current_user: true,
        last_visit_date: visitDateTime
      }
    });

    // Check if visit record already exists for this date
    const existingVisit = await prisma.schoolVisit.findFirst({
      where: {
        school_id: s.id,
        is_current_representative: true,
        visit_date: {
          gte: new Date(`${item.date}T00:00:00.000Z`),
          lte: new Date(`${item.date}T23:59:59.999Z`)
        }
      }
    });

    if (!existingVisit) {
      await prisma.schoolVisit.create({
        data: {
          school_id: s.id,
          visit_date: visitDateTime,
          representative: 'Nichhenametla Kalyan Ashrith',
          representative_id: 'KA-REP-01',
          is_current_representative: true,
          visit_type: 'FIRST_VISIT',
          purpose: 'Field Outreach & Programme Introduction',
          programme_discussed: s.recommended_programme || 'Both',
          contact_person: s.principal_name || 'Principal',
          contact_number: s.phone || s.contact_number,
          designation: 'Principal',
          interest_level: 'High',
          outcome: 'Interested', // STRICT Zero Assumed Registrations
          notes: item.notes,
          location_verified: true
        }
      });
      console.log(`Recorded visit for #${s.s_no} ${s.school_name} on ${item.date}`);
    }

    // Purge from future route plans
    const purged = await prisma.routeStop.deleteMany({
      where: {
        school_id: s.id,
        route_plan: {
          date: { gt: item.date }
        }
      }
    });
    if (purged.count > 0) {
      console.log(`Purged #${s.s_no} ${s.school_name} from ${purged.count} future route stops.`);
    }

    markedCount++;
  }

  // 3. Revisits logging
  const revisits = [
    { code: 'S-75024', date: '2026-09-05', notes: 'CRM Report Revisit: Bharatiya Vidya Bhavan School Vijayanagar' },
    { code: 'S-75434', date: '2026-09-05', notes: 'CRM Report Revisit: Akshara Pathsala' },
    { code: 'S-74732', date: '2026-10-07', notes: 'CRM Report Revisit: Nirmala Public School' }
  ];

  for (const rev of revisits) {
    const s = await prisma.school.findFirst({
      where: {
        OR: [
          { school_id: rev.code },
          { school_code: rev.code }
        ]
      }
    });

    if (s) {
      const visitDateTime = new Date(`${rev.date}T16:30:00.000Z`);
      const existingRev = await prisma.schoolVisit.findFirst({
        where: {
          school_id: s.id,
          is_current_representative: true,
          visit_date: {
            gte: new Date(`${rev.date}T00:00:00.000Z`),
            lte: new Date(`${rev.date}T23:59:59.999Z`)
          }
        }
      });

      if (!existingRev) {
        await prisma.schoolVisit.create({
          data: {
            school_id: s.id,
            visit_date: visitDateTime,
            representative: 'Nichhenametla Kalyan Ashrith',
            representative_id: 'KA-REP-01',
            is_current_representative: true,
            visit_type: 'REVISIT',
            purpose: 'Field Revisit & Continuous Engagement',
            programme_discussed: s.recommended_programme || 'Both',
            contact_person: s.principal_name || 'Principal',
            contact_number: s.phone || s.contact_number,
            designation: 'Principal',
            interest_level: 'High',
            outcome: 'Interested',
            notes: rev.notes,
            location_verified: true
          }
        });
        console.log(`Recorded revisit for #${s.s_no} ${s.school_name} on ${rev.date}`);
      }
    }
  }

  // 4. Confirm Lisa 1st Step Pre School status
  const lisa = await prisma.school.findFirst({
    where: {
      OR: [
        { s_no: 471 },
        { school_name: { contains: 'Lisa 1St Step' } }
      ]
    }
  });
  if (lisa) {
    console.log(`Lisa 1st Step Pre School status: ${lisa.visit_status} (visited: ${lisa.visited_by_current_user})`);
  }

  // Final Counts
  const finalTotal = await prisma.school.count();
  const finalVisited = await prisma.school.count({ where: { visited_by_current_user: true } });
  const finalUnvisited = finalTotal - finalVisited;
  const finalVisits = await prisma.schoolVisit.count();

  console.log('\n--- Final Database Status ---');
  console.log(`Total Master Allotment: ${finalTotal}`);
  console.log(`Visited Schools: ${finalVisited} (Emerald Green)`);
  console.log(`Unvisited Schools: ${finalUnvisited} (Rose Red)`);
  console.log(`Total Visit Records: ${finalVisits}`);
  console.log(`Completion Percentage: ${((finalVisited / finalTotal) * 100).toFixed(2)}%`);
}

syncCrmVisits().catch(console.error).finally(() => prisma.$disconnect());
