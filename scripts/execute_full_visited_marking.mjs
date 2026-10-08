import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const visitedSNos = [
  208, // Sri Sathya Sai Baba School
  484, // Kids Academy Gokulam
  280, // DGTM English Medium School (D G T M)
  101, // St. Josephs School-Mysuru
  268, // Ramakrishna Vidya Kula Hottagalli
  221, // Marimallapa English School Vijayanagar (Marimallappa)
  244, // Vishwamanava Vidyanikethana
  432, // Super Kidz Pre School
  109, // The Orchids Public School-Mysuru
  197, // Intelligent Public School-Mysuru
  329, // JSS School Saraswathipuram
  1,   // JSS Public School, JSS Institutions Campus, B.R.
  58,  // Christ The King Convent Public School-Mysuru
  72,  // Kautilya Vidyalaya-Mysuru
  205, // BGS Public School
  424, // BGS Balajagath School Srirampura
  472, // Divine Kids Pre School Srirampura
  // 471 Lisa 1st Step Pre School is EXPLICITLY NOT VISITED
  53,  // Baden Powell School (R) Mysore-Mysuru
  258, // Rotary West School Dattagalli
  104, // St. Rosollos Central School-Mysuru
  320, // Gsss School
  488, // Cambridge Montessori
  481, // Bizi Brain Pre School
  223, // Visha Prajna School
  61,  // De Paul Public School-Mysuru
  55,  // CFTRI School-Mysuru
  331, // Sri Rama Vidya Kula Yelavala
  278, // Kalabharathi Vidya Samsthe Yelavala
  156, // Atomic Energy Central School-830045
  196, // Sri Paramahamsa Vidyaniketana School-Mysuru
  265, // Vidyavahini School Hebbal
  73,  // KNC Innovative Global School-Mysuru
  224, // Akshara Pathsala
  298, // Archaya Vidya Shala K R Pete
  351, // Vijaya School Pandavapura
  353, // New Oxford Public School SPR
  287, // Om Shree Nikethana School
  299, // SSK C English Medium High School KRPete (Sskc)
  233, // Sy Joseph Convent K Nagar
  231, // SN Public School K R Nagar
  232, // Lions School K R Nagar
  234, // Kanaka Public School K R Nagar
  306, // Bale Vidya Samsthe K R Nagar
  305, // B S Madappa Smaraka Vidya Samsthe K R Nagar
  236, // St Anthony's School K R Nagar
  380, // St Mary School Chamunipuram
  378, // Nalanda English School (Nalanda)
  99,  // St. Josephs Central School-Mysuru
  94,  // St Thomas English Medium Higher Primary School-Mys
  403, // Om Shree Guru Anglo Vedic Literacy School
  425, // Shri Bruhaspathyarya Vidya Samsthe
  74,  // Mahabodhi School-Mysuru
  210, // Maharshi Public School
  279  // St Thomas CBSE School
];

const newSchoolsToCreate = [
  {
    school_id: 'S-EMBLEM',
    s_no: 489,
    school_name: 'Emblem Public School',
    area: 'Rajiv Nagar',
    district: 'Mysuru',
    address: 'Christian Colony, Rajiv Nagar, Mysuru, Karnataka 570019',
    latitude: 12.3312,
    longitude: 76.6854,
    board: 'STATE BOARD',
    school_type: 'PRIMARY',
    opportunity_type: 'C',
    recommended_programme: 'MOM',
    phone: '8197001474'
  },
  {
    school_id: 'S-ANDALUS',
    s_no: 490,
    school_name: 'Andalus English School',
    area: 'Rajiv Nagar',
    district: 'Mysuru',
    address: 'No 548/549, 2nd Stage, Rajiv Nagar, Mysuru, Karnataka 570019',
    latitude: 12.3298,
    longitude: 76.6842,
    board: 'STATE BOARD',
    school_type: 'PRIMARY',
    opportunity_type: 'C',
    recommended_programme: 'MOM',
    phone: '0821-2454611'
  },
  {
    school_id: 'S-PSSK',
    s_no: 491,
    school_name: 'P S S K Public School',
    area: 'Pandavapura',
    district: 'Mandya',
    address: 'Mysore Road, Kennalu, Pandavapura RS, Mandya, Karnataka 571435',
    latitude: 12.4985,
    longitude: 76.6712,
    board: 'STATE BOARD',
    school_type: 'COMPOSITE',
    opportunity_type: 'B',
    recommended_programme: 'Both'
  },
  {
    school_id: 'S-LENIN',
    s_no: 492,
    school_name: 'Lenin Convent English Medium School',
    area: 'Srirangapatna',
    district: 'Mandya',
    address: 'Srirangapatna Fort, Srirangapatna, Mandya, Karnataka 571438',
    latitude: 12.4182,
    longitude: 76.6948,
    board: 'STATE BOARD',
    school_type: 'PRIMARY',
    opportunity_type: 'C',
    recommended_programme: 'MOM'
  },
  {
    school_id: 'S-EUROKIDS-YEL',
    s_no: 493,
    school_name: 'Euro Kids Pre School Yelawala',
    area: 'Yelwal',
    district: 'Mysuru',
    address: 'Yelwala Main Road, Yelwal, Mysuru, Karnataka 571130',
    latitude: 12.3524,
    longitude: 76.5367,
    board: 'PRE-SCHOOL',
    school_type: 'PRE-SCHOOL',
    opportunity_type: 'D',
    recommended_programme: 'Junior Power Quest'
  }
];

async function main() {
  console.log('=== EXECUTING FULL USER VISITED SCHOOLS SYNC ===');
  const visitDate = new Date('2026-10-07T12:00:00.000Z');

  // 1. Create or update the 5 new schools
  for (const ns of newSchoolsToCreate) {
    let existing = await prisma.school.findFirst({
      where: {
        OR: [
          { school_id: ns.school_id },
          { school_name: ns.school_name }
        ]
      }
    });

    if (!existing) {
      existing = await prisma.school.create({
        data: {
          s_no: ns.s_no,
          school_id: ns.school_id,
          school_name: ns.school_name,
          school_code: ns.school_id,
          board: ns.board,
          medium: 'English',
          school_type: ns.school_type,
          category: 'Primary',
          address: ns.address,
          area: ns.area,
          taluk: ns.area,
          district: ns.district,
          state: 'Karnataka',
          pincode: '570001',
          latitude: ns.latitude,
          longitude: ns.longitude,
          phone: ns.phone || '+91 821 2410000',
          contact_number: ns.phone || '+91 821 2410000',
          principal_name: 'Head / Principal',
          contact_person: 'Principal',
          student_strength: 150,
          status: 'ACTIVE',
          visit_status: 'VISITED',
          visited_by_current_user: true,
          last_visit_date: visitDate,
          priority: 'HIGH',
          opportunity_type: ns.opportunity_type,
          recommended_programme: ns.recommended_programme,
          notes: 'Added from representative field visited report.'
        }
      });
      console.log(`Created new school #${existing.s_no} ${existing.school_name} (${existing.area})`);
    } else {
      await prisma.school.update({
        where: { id: existing.id },
        data: {
          visited_by_current_user: true,
          visit_status: 'VISITED',
          last_visit_date: visitDate
        }
      });
      console.log(`Updated existing new school #${existing.s_no} ${existing.school_name}`);
    }

    // Ensure SchoolVisit record exists
    const hasVisit = await prisma.schoolVisit.findFirst({
      where: { school_id: existing.id, is_current_representative: true }
    });
    if (!hasVisit) {
      await prisma.schoolVisit.create({
        data: {
          school_id: existing.id,
          visit_date: visitDate,
          representative: 'Nichhenametla Kalyan Ashrith',
          representative_id: 'KA-REP-01',
          is_current_representative: true,
          visit_type: 'FIRST_VISIT',
          purpose: 'Field Outreach & Programme Introduction',
          programme_discussed: existing.recommended_programme || 'Both',
          contact_person: 'Principal',
          contact_number: existing.phone,
          designation: 'Principal',
          interest_level: 'High',
          outcome: 'Interested',
          notes: 'Field outreach visit logged and confirmed.',
          location_verified: true
        }
      });
    }

    // Add to visitedSNos if not present
    if (!visitedSNos.includes(existing.s_no)) {
      visitedSNos.push(existing.s_no);
    }
  }

  // 2. Mark all existing visited schools
  console.log(`\nMarking ${visitedSNos.length} schools as VISITED...`);
  for (const sno of visitedSNos) {
    const school = await prisma.school.findFirst({
      where: { s_no: sno }
    });

    if (!school) {
      console.error(`ERROR: School S.No #${sno} not found!`);
      continue;
    }

    await prisma.school.update({
      where: { id: school.id },
      data: {
        visited_by_current_user: true,
        visit_status: 'VISITED',
        last_visit_date: school.last_visit_date || visitDate
      }
    });

    // Check if visit record exists
    const existingVisit = await prisma.schoolVisit.findFirst({
      where: { school_id: school.id, is_current_representative: true }
    });

    if (!existingVisit) {
      await prisma.schoolVisit.create({
        data: {
          school_id: school.id,
          visit_date: visitDate,
          representative: 'Nichhenametla Kalyan Ashrith',
          representative_id: 'KA-REP-01',
          is_current_representative: true,
          visit_type: 'FIRST_VISIT',
          purpose: 'Field Outreach & Programme Introduction',
          programme_discussed: school.recommended_programme || 'Both',
          contact_person: (school.principal_name && !school.principal_name.includes('Head'))
            ? school.principal_name
            : school.contact_person || 'Principal',
          contact_number: school.phone || school.contact_number,
          designation: 'Principal',
          interest_level: 'High',
          outcome: 'Interested',
          notes: 'Field outreach visit confirmed from representative master report.',
          location_verified: true
        }
      });
    }
  }

  // 3. STRICT ENFORCEMENT: Lisa 1st Step Pre School (#471) MUST BE NOT VISITED
  console.log('\nEnforcing Lisa 1st Step Pre School (#471) as NOT YET VISITED...');
  const lisa = await prisma.school.findFirst({
    where: { s_no: 471 }
  });

  if (lisa) {
    await prisma.school.update({
      where: { id: lisa.id },
      data: {
        visited_by_current_user: false,
        visit_status: 'NOT VISITED',
        last_visit_date: null
      }
    });

    // Remove any visits logged by Kalyan for Lisa 1st Step
    await prisma.schoolVisit.deleteMany({
      where: {
        school_id: lisa.id,
        is_current_representative: true
      }
    });
    console.log('Successfully set Lisa 1st Step Pre School (#471) to NOT VISITED.');
  }

  // 4. "didnt plan for this schools": Remove visited schools from all planned route plans
  console.log('\nPurging visited schools from upcoming/planned routes...');
  const plannedRoutes = await prisma.routePlan.findMany({
    where: { status: 'PLANNED' },
    include: {
      stops: {
        include: { school: true },
        orderBy: { stop_number: 'asc' }
      }
    }
  });

  const visitedSchoolIds = new Set();
  const allVisited = await prisma.school.findMany({
    where: { visited_by_current_user: true },
    select: { id: true, s_no: true }
  });
  allVisited.forEach(s => visitedSchoolIds.add(s.id));

  for (const route of plannedRoutes) {
    let removedCount = 0;
    const remainingStops = [];

    for (const stop of route.stops) {
      if (visitedSchoolIds.has(stop.school_id)) {
        await prisma.routeStop.delete({ where: { id: stop.id } });
        removedCount++;
      } else {
        remainingStops.push(stop);
      }
    }

    if (removedCount > 0) {
      // Re-sequence remaining stops
      for (let i = 0; i < remainingStops.length; i++) {
        await prisma.routeStop.update({
          where: { id: remainingStops[i].id },
          data: {
            stop_number: i + 1,
            optimized_sequence: i + 1
          }
        });
      }
      console.log(`Plan ${route.date}: Removed ${removedCount} visited stops. Remaining: ${remainingStops.length}`);
    }
  }

  // 5. Final Metrics
  const totalSchools = await prisma.school.count();
  const visitedTotal = await prisma.school.count({ where: { visited_by_current_user: true } });
  const unvisitedTotal = await prisma.school.count({ where: { visited_by_current_user: false } });
  const totalVisitRecords = await prisma.schoolVisit.count({ where: { is_current_representative: true } });

  console.log('\n=== FINAL SYSTEM STATE ===');
  console.log(`Total Master Allotment: ${totalSchools}`);
  console.log(`Visited Schools:        ${visitedTotal} (Emerald Green)`);
  console.log(`Unvisited Schools:      ${unvisitedTotal} (Rose Red)`);
  console.log(`Total Visit Records:    ${totalVisitRecords}`);
  console.log(`Completion Rate:        ${((visitedTotal / totalSchools) * 100).toFixed(2)}%`);

  const lisaCheck = await prisma.school.findFirst({
    where: { s_no: 471 },
    select: { s_no: true, school_name: true, visited_by_current_user: true, visit_status: true }
  });
  console.log('Lisa 1st Step Status:', lisaCheck);
}

main().catch(console.error).finally(() => prisma.$disconnect());
