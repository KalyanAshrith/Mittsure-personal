import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('=== MARKING LISA 1ST STEP PRE SCHOOL AS VISITED ===');

  const lisa = await prisma.school.findFirst({
    where: {
      OR: [
        { school_id: 'S-156401' },
        { s_no: 471 },
        { school_name: { contains: 'Lisa 1St Step' } }
      ]
    },
    include: { visits: true }
  });

  if (!lisa) {
    console.error('Lisa 1st Step Pre School not found in database!');
    return;
  }

  console.log(`Found school #${lisa.s_no} - ${lisa.school_name} (${lisa.school_id})`);

  const visitDate = new Date('2026-10-08T08:30:00.000Z');

  // 1. Update School Status to VISITED
  const updatedSchool = await prisma.school.update({
    where: { id: lisa.id },
    data: {
      visit_status: 'VISITED',
      visited_by_current_user: true,
      last_visit_date: visitDate
    }
  });

  console.log(`Updated School #${updatedSchool.s_no} visit_status: ${updatedSchool.visit_status}, visited_by_current_user: ${updatedSchool.visited_by_current_user}`);

  // 2. Create or Update SchoolVisit record
  const existingVisit = await prisma.schoolVisit.findFirst({
    where: {
      school_id: lisa.id,
      is_current_representative: true
    }
  });

  let visitRecord;
  if (!existingVisit) {
    visitRecord = await prisma.schoolVisit.create({
      data: {
        school_id: lisa.id,
        visit_date: visitDate,
        representative: 'Nichhenametla Kalyan Ashrith',
        representative_id: 'KA-REP-01',
        is_current_representative: true,
        visit_type: 'FIRST_VISIT',
        purpose: 'Field Outreach & Programme Introduction',
        programme_discussed: lisa.recommended_programme || 'Junior Power Quest',
        contact_person: lisa.contact_person || lisa.principal_name || 'Principal',
        contact_number: lisa.phone || lisa.contact_number || '924307848',
        designation: 'Principal',
        interest_level: 'High',
        outcome: 'Interested', // Strictly Interested
        notes: 'Field visit completed and verified by Kalyan Ashrith.',
        location_verified: true
      }
    });
    console.log(`Created new SchoolVisit record: ${visitRecord.id}`);
  } else {
    visitRecord = await prisma.schoolVisit.update({
      where: { id: existingVisit.id },
      data: {
        visit_date: visitDate,
        outcome: 'Interested',
        notes: 'Field visit completed and verified by Kalyan Ashrith.'
      }
    });
    console.log(`Updated existing SchoolVisit record: ${visitRecord.id}`);
  }

  // 3. Purge from future route plans (if any exist)
  const purged = await prisma.routeStop.deleteMany({
    where: {
      school_id: lisa.id,
      route_plan: {
        date: { gt: '2026-10-08' }
      }
    }
  });
  if (purged.count > 0) {
    console.log(`Purged from ${purged.count} future route stops.`);
  }

  // 4. Update or Upsert DailySummary for 2026-10-08
  const todaySummary = await prisma.dailySummary.findUnique({
    where: { date: '2026-10-08' }
  });

  if (!todaySummary) {
    await prisma.dailySummary.create({
      data: {
        date: '2026-10-08',
        schools_planned: 1,
        schools_visited: 1,
        revisits: 0,
        total_distance_km: 3.4,
        total_travel_time: '15 mins',
        remarks: 'Thursday 8 Oct: Completed field visit to Lisa 1st Step Pre School.'
      }
    });
    console.log('Created DailySummary for 2026-10-08');
  } else {
    await prisma.dailySummary.update({
      where: { date: '2026-10-08' },
      data: {
        schools_visited: { increment: 1 },
        remarks: (todaySummary.remarks ? todaySummary.remarks + ' ' : '') + 'Completed field visit to Lisa 1st Step Pre School.'
      }
    });
    console.log('Updated DailySummary for 2026-10-08');
  }

  // 5. Update data/schools.json
  const schoolsJsonPath = path.resolve(process.cwd(), 'data/schools.json');
  if (fs.existsSync(schoolsJsonPath)) {
    try {
      const content = fs.readFileSync(schoolsJsonPath, 'utf-8');
      const schoolsData = JSON.parse(content);
      const idx = schoolsData.findIndex(s => s.s_no === 471 || s.school_id === 'S-156401');
      if (idx !== -1) {
        schoolsData[idx].visit_status = 'VISITED';
        schoolsData[idx].visited_by_current_user = true;
        schoolsData[idx].last_visit_date = '2026-10-08T08:30:00.000Z';
        fs.writeFileSync(schoolsJsonPath, JSON.stringify(schoolsData, null, 2), 'utf-8');
        console.log('Updated data/schools.json entry for Lisa 1st Step Pre School.');
      }
    } catch (err) {
      console.warn('Could not update schools.json:', err.message);
    }
  }

  // 6. Print final database metrics
  const total = await prisma.school.count();
  const visited = await prisma.school.count({ where: { visited_by_current_user: true } });
  const unvisited = total - visited;
  const visits = await prisma.schoolVisit.count();

  console.log('\n=== RECONCILED METRICS ===');
  console.log(`Total Master Allotment: ${total}`);
  console.log(`Visited Schools: ${visited} (Emerald Green)`);
  console.log(`Unvisited Schools: ${unvisited} (Rose Red)`);
  console.log(`Total Visits Logged: ${visits}`);
  console.log(`Completion Rate: ${((visited / total) * 100).toFixed(2)}%`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
