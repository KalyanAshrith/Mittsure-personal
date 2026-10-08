import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Mittsure Field Route & School CRM...');

  // 1. Seed or Update Default Settings
  await prisma.settings.upsert({
    where: { id: 'default' },
    update: {
      current_user_id: 'KA-REP-01',
      user_name: 'Nichhenametla Kalyan Ashrith',
      user_role: 'Relationship Manager / School Outreach Representative',
      company: 'Mittsure Technologies LLP',
      default_daily_schools: 5,
      target_schools_per_week: 30,
      target_progress_goal: 300,
      weekly_holiday: 'SUNDAY',
    },
    create: {
      id: 'default',
      current_user_id: 'KA-REP-01',
      user_name: 'Nichhenametla Kalyan Ashrith',
      user_role: 'Relationship Manager / School Outreach Representative',
      company: 'Mittsure Technologies LLP',
      base_address: '661, Sahukar Chennaiah Road, Janatha Nagar, Bogadi 2nd Stage, TK Layout, Mysuru, Karnataka 570009',
      base_latitude: 12.3021,
      base_longitude: 76.6178,
      working_radius_km: 25.0,
      default_daily_schools: 5,
      preferred_travel_mode: 'TWO_WHEELER',
      gps_verification_radius_meters: 150,
      target_total_schools: 487,
      target_schools_per_week: 30,
      target_progress_goal: 300,
      weekly_holiday: 'SUNDAY',
      target_completion_date: '2026-11-30',
      mom_pitch: `Mittsure Olympiad Masters (MOM) is India's premier cognitive & academic assessment for Classes 1–12.
Key Highlights:
- National ranking & detailed diagnostic performance report for each student.
- Cash rewards, tablets, smart trophies & national merit certificates.
- MittStore learning vouchers worth ₹500 for every registered student.
- Free digital teacher-enablement portal and school excellence trophy for host institutions.`,
      junior_quest_pitch: `Junior Power Quest is specifically designed for early childhood learners in Nursery, LKG, and UKG based on the National Education Policy (NEP) & Panchakosha holistic development framework.
Key Highlights:
- Age-appropriate written and activity-based talent rounds.
- Digital Holistic Progress Passport measuring physical, cognitive, emotional, and social development.
- Attractive practice kits, medal of participation, and vibrant certificates.
- Zero burden on school teachers - Mittsure provides full test kits and evaluation support.`,
      faq_objections: JSON.stringify([
        {
          q: "We already participate in SOF / Silverzone Olympiads.",
          a: "MOM complements rather than replaces SOF. Unlike purely competitive exams, MOM provides every participant with a diagnostic skill analysis and ₹500 MittStore voucher, plus schools get institutional analytics and teacher training resources."
        },
        {
          q: "Principal or Trustee is not available today.",
          a: "Leave the official Mittsure brochure and curriculum brief with the Vice-Principal or Admin Coordinator. Note their direct number and schedule a confirmed follow-up for 2 days later."
        },
        {
          q: "Our school parents have tight budgets.",
          a: "Mittsure registration fees are highly accessible (₹150 per student) and include free practice workbooks, digital learning materials, and guaranteed voucher benefits exceeding the entry fee."
        }
      ])
    }
  });

  // 2. Read 487 Schools from data/schools.json
  const schoolsDataRaw = fs.readFileSync(path.join(__dirname, '..', 'data', 'schools.json'), 'utf-8');
  const schools = JSON.parse(schoolsDataRaw);
  console.log(`Loading ${schools.length} schools into database...`);

  // Clear existing to avoid duplicate primary key collisions during development seeding
  await prisma.followUp.deleteMany({});
  await prisma.schoolVisit.deleteMany({});
  await prisma.routeStop.deleteMany({});
  await prisma.routePlan.deleteMany({});
  await prisma.dailySummary.deleteMany({});
  await prisma.school.deleteMany({});

  // Batch insert schools
  for (const s of schools) {
    await prisma.school.create({
      data: {
        school_id: s.school_id,
        s_no: s.s_no,
        school_name: s.school_name,
        school_code: s.school_code,
        board: s.board,
        medium: s.medium,
        school_type: s.school_type,
        category: s.category,
        address: s.address,
        area: s.area,
        taluk: s.taluk,
        district: s.district,
        state: s.state,
        pincode: s.pincode,
        latitude: s.latitude,
        longitude: s.longitude,
        google_place_id: s.google_place_id,
        google_maps_url: s.google_maps_url,
        phone: s.phone,
        email: s.email,
        website: s.website,
        principal_name: s.principal_name,
        contact_person: s.contact_person,
        contact_number: s.contact_number,
        student_strength: s.student_strength,
        classes_available: s.classes_available,
        nursery_available: s.nursery_available,
        lkg_available: s.lkg_available,
        ukg_available: s.ukg_available,
        primary_available: s.primary_available,
        secondary_available: s.secondary_available,
        status: s.status,
        visit_status: s.visit_status,
        priority: s.priority,
        opportunity_type: s.opportunity_type,
        recommended_programme: s.recommended_programme,
        notes: s.notes,
        is_user_school: s.is_user_school
      }
    });
  }

  // 3. Seed exactly 22 visited schools (to fulfill Acceptance Test: 22 completed / 487 -> Remaining = 465, Completion = 4.52%)
  const visitedIndices = [
    52, 57, 67, 86, 87, 97, // Bogadi schools
    109, 147, 182, 197, 413, 481, // Bogadi / Kumarabedu
    72, 107, 223, 242, 258, 282, // Dattagalli
    82, 113, 203, 204 // Kuvempunagar
  ];

  console.log('Seeding 22 completed visits...');
  const today = new Date();
  let visitCount = 0;

  for (const sNo of visitedIndices) {
    const school = await prisma.school.findUnique({ where: { s_no: sNo } });
    if (!school) continue;

    const visitDaysAgo = Math.floor(visitCount / 5) + 1;
    const visitDate = new Date();
    visitDate.setDate(today.getDate() - visitDaysAgo);

    let outcome = "Interested";
    let visitStatus = "INTERESTED";
    let interestLevel = "High";
    let progDiscussed = school.recommended_programme;

    if (visitCount === 0 || visitCount === 6) {
      outcome = "Registration Confirmed";
      visitStatus = "REGISTRATION";
      interestLevel = "Very High";
    } else if (visitCount % 3 === 0) {
      outcome = "Follow-up Required";
      visitStatus = "FOLLOW-UP";
      interestLevel = "High";
    } else if (visitCount % 7 === 0) {
      outcome = "Registration Discussion";
      visitStatus = "INTERESTED";
      interestLevel = "High";
    }

    // Create SchoolVisit record
    const visit = await prisma.schoolVisit.create({
      data: {
        school_id: school.id,
        visit_date: visitDate,
        representative: 'Nichhenametla Kalyan Ashrith',
        representative_id: 'KA-REP-01',
        is_current_representative: true,
        visit_type: 'FIRST_VISIT',
        purpose: 'Field Outreach & Programme Introduction',
        programme_discussed: progDiscussed,
        contact_person: school.principal_name || 'Principal',
        contact_number: school.phone,
        designation: 'Principal',
        interest_level: interestLevel,
        outcome: outcome,
        notes: `Visited school in ${school.area}. Discussed ${progDiscussed}. Outcome: ${outcome}.`,
        latitude: school.latitude + 0.0001,
        longitude: school.longitude + 0.0001,
        distance_from_school: 28.5,
        location_verified: true,
        follow_up_date: outcome === "Follow-up Required" ? new Date(Date.now() + 86400000 * 2) : null
      }
    });

    // Update School status
    await prisma.school.update({
      where: { id: school.id },
      data: {
        visit_status: visitStatus,
        visited_by_current_user: true,
        last_visit_date: visitDate,
        next_followup_date: visit.follow_up_date
      }
    });

    // If follow-up required, create FollowUp record
    if (outcome === "Follow-up Required") {
      await prisma.followUp.create({
        data: {
          school_id: school.id,
          visit_id: visit.id,
          contact_person: school.principal_name || 'Principal',
          contact_number: school.phone,
          due_date: new Date(Date.now() + 86400000 * 2),
          due_time: '11:00 AM',
          status: 'Pending',
          priority: 'HIGH',
          notes: 'Principal requested second meeting with management trust members.'
        }
      });
    }

    visitCount++;
  }

  // Also add 1 Revisit on school 52 (Amrita Vidyalayam) to demonstrate revisit history without overwriting!
  const amrita = await prisma.school.findUnique({ where: { s_no: 52 } });
  if (amrita) {
    await prisma.schoolVisit.create({
      data: {
        school_id: amrita.id,
        visit_date: today,
        representative: 'Nichhenametla Kalyan Ashrith',
        representative_id: 'KA-REP-01',
        is_current_representative: true,
        visit_type: 'REVISIT',
        purpose: 'Follow-up Demo and Registration Kit Handover',
        programme_discussed: 'Both',
        contact_person: 'Virajamrita Chaitanya',
        contact_number: amrita.phone,
        designation: 'Principal',
        interest_level: 'Very High',
        outcome: 'Registration Confirmed',
        notes: 'Second visit. Management signed agreement for MOM & Junior Power Quest for 280 students.',
        latitude: amrita.latitude,
        longitude: amrita.longitude,
        distance_from_school: 15.0,
        location_verified: true,
        registration_status: 'CONFIRMED'
      }
    });
    await prisma.school.update({
      where: { id: amrita.id },
      data: {
        visit_status: 'REGISTRATION',
        visited_by_current_user: true,
        last_visit_date: today
      }
    });
  }

  // Seed 2 schools visited by a PREVIOUS representative (e.g. S.No 12 & 18)
  // These test and prove that visits by other reps do NOT increment Kalyan's 22 completed schools!
  const prevRepSNo = [12, 18];
  for (const sNo of prevRepSNo) {
    const school = await prisma.school.findUnique({ where: { s_no: sNo } });
    if (school) {
      const pastDate = new Date();
      pastDate.setDate(today.getDate() - 45); // 45 days ago
      await prisma.schoolVisit.create({
        data: {
          school_id: school.id,
          visit_date: pastDate,
          representative: 'Ramesh Kumar (Former RM)',
          representative_id: 'PREV-REP-09',
          is_current_representative: false,
          visit_type: 'FIRST_VISIT',
          purpose: 'Previous Session Introduction',
          programme_discussed: 'MOM',
          contact_person: school.principal_name || 'Principal',
          contact_number: school.phone,
          designation: 'Principal',
          interest_level: 'Medium',
          outcome: 'Interested',
          notes: 'Met previous principal. Handover territory note: New representative Kalyan Ashrith must make first personal visit.',
          location_verified: false
        }
      });
      await prisma.school.update({
        where: { id: school.id },
        data: {
          visited_by_current_user: false,
          visited_by_previous_rep: true,
          previous_rep_visit_date: pastDate,
          previous_rep_notes: 'Visited by former RM Ramesh Kumar in previous term. Needs Kalyan Ashrith first personal visit.'
        }
      });
    }
  }

  // 4. Seed Today's Follow-up and an Overdue Follow-up
  const followSchool1 = await prisma.school.findUnique({ where: { s_no: 74 } }); // Mahabodhi School Saraswathipuram
  if (followSchool1) {
    await prisma.followUp.create({
      data: {
        school_id: followSchool1.id,
        contact_person: 'Dwarakeesh P R',
        contact_number: '+91 821 2410000',
        due_date: today,
        due_time: '10:30 AM',
        status: 'Today',
        priority: 'HIGH',
        notes: 'Follow-up on Olympiad student brochure distribution.'
      }
    });
  }

  const followSchool2 = await prisma.school.findUnique({ where: { s_no: 101 } }); // St Josephs Jayalakshmipuram
  if (followSchool2) {
    const overdueDate = new Date();
    overdueDate.setDate(today.getDate() - 2);
    await prisma.followUp.create({
      data: {
        school_id: followSchool2.id,
        contact_person: 'Veena Margaret',
        contact_number: '+91 821 2410000',
        due_date: overdueDate,
        due_time: '02:00 PM',
        status: 'Overdue',
        priority: 'HIGH',
        notes: 'Overdue by 2 days! Call principal regarding Junior Power Quest syllabus query.'
      }
    });
  }

  // 5. Seed 3-Day Rolling Plan (Strictly Mon-Sat working days; Sunday holiday is skipped!)
  const formatDate = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const workingDates = [];
  let checkD = new Date(today);
  // If today is Sunday, skip today for route planning!
  if (checkD.getDay() === 0) {
    checkD.setDate(checkD.getDate() + 1);
  }
  while (workingDates.length < 3) {
    if (checkD.getDay() !== 0) {
      workingDates.push(formatDate(checkD));
    }
    checkD.setDate(checkD.getDate() + 1);
  }

  const [datePlan1, datePlan2, datePlan3] = workingDates;

  // First working day plan (e.g. Monday)
  const todaySNo = [54, 74, 113, 203, 243, 284, 388];
  const todaySchools = await prisma.school.findMany({ where: { s_no: { in: todaySNo } } });

  const planToday = await prisma.routePlan.create({
    data: {
      date: datePlan1,
      name: `Saraswathipuram & Kuvempunagar Circuit (7 Schools)`,
      origin: '661, Sahukar Chennaiah Road, Janatha Nagar, Bogadi 2nd Stage, TK Layout, Mysuru 570009',
      origin_lat: 12.3021,
      origin_lng: 76.6178,
      destination: '661, Sahukar Chennaiah Road, Janatha Nagar, Bogadi 2nd Stage, TK Layout, Mysuru 570009',
      destination_lat: 12.3021,
      destination_lng: 76.6178,
      travel_mode: 'TWO_WHEELER',
      total_distance_meters: 19800,
      total_distance_km: 19.8,
      total_duration_seconds: 3480,
      total_duration_formatted: '58 min',
      optimized_order: JSON.stringify(todaySchools.map(s => s.id)),
      status: 'IN_PROGRESS',
      remarks: 'Covering key Saraswathipuram and Kuvempunagar institutions before 2 PM. Principals available in morning hours.'
    }
  });

  for (let i = 0; i < todaySchools.length; i++) {
    await prisma.routeStop.create({
      data: {
        route_plan_id: planToday.id,
        school_id: todaySchools[i].id,
        stop_number: i + 1,
        optimized_sequence: i + 1,
        leg_distance_km: 2.8,
        leg_distance_meters: 2800,
        leg_duration_formatted: '8 min',
        leg_duration_seconds: 480,
        status: i < 2 ? 'VISITED' : 'PENDING'
      }
    });
  }

  // Tomorrow's 7 schools in Vijayanagar & Hebbal
  const tomSNo = [75, 81, 88, 100, 118, 201, 221];
  const tomSchools = await prisma.school.findMany({ where: { s_no: { in: tomSNo } } });

  const planTomorrow = await prisma.routePlan.create({
    data: {
      date: datePlan2,
      name: `Vijayanagar 2nd to 4th Stage Circuit (7 Schools)`,
      origin: '661, Sahukar Chennaiah Road, Janatha Nagar, Bogadi 2nd Stage, TK Layout, Mysuru 570009',
      origin_lat: 12.3021,
      origin_lng: 76.6178,
      destination: '661, Sahukar Chennaiah Road, Janatha Nagar, Bogadi 2nd Stage, TK Layout, Mysuru 570009',
      destination_lat: 12.3021,
      destination_lng: 76.6178,
      travel_mode: 'TWO_WHEELER',
      total_distance_meters: 23400,
      total_distance_km: 23.4,
      total_duration_seconds: 4020,
      total_duration_formatted: '1 hr 7 min',
      optimized_order: JSON.stringify(tomSchools.map(s => s.id)),
      status: 'PLANNED',
      remarks: 'Focus on CBSE & State Board schools in Vijayanagar Stage 2 & 4. Pitch MOM for senior classes.'
    }
  });

  for (let i = 0; i < tomSchools.length; i++) {
    await prisma.routeStop.create({
      data: {
        route_plan_id: planTomorrow.id,
        school_id: tomSchools[i].id,
        stop_number: i + 1,
        optimized_sequence: i + 1,
        leg_distance_km: 3.3,
        leg_distance_meters: 3300,
        leg_duration_formatted: '9 min',
        leg_duration_seconds: 540,
        status: 'PENDING'
      }
    });
  }

  // Day 3 7 schools in Jayalakshmipuram & Gokulam
  const day3SNo = [55, 77, 101, 143, 207, 208, 209];
  const day3Schools = await prisma.school.findMany({ where: { s_no: { in: day3SNo } } });

  const planDay3 = await prisma.routePlan.create({
    data: {
      date: datePlan3,
      name: `Jayalakshmipuram & Gokulam Central Circuit (7 Schools)`,
      origin: '661, Sahukar Chennaiah Road, Janatha Nagar, Bogadi 2nd Stage, TK Layout, Mysuru 570009',
      origin_lat: 12.3021,
      origin_lng: 76.6178,
      destination: '661, Sahukar Chennaiah Road, Janatha Nagar, Bogadi 2nd Stage, TK Layout, Mysuru 570009',
      destination_lat: 12.3021,
      destination_lng: 76.6178,
      travel_mode: 'TWO_WHEELER',
      total_distance_meters: 21200,
      total_distance_km: 21.2,
      total_duration_seconds: 3720,
      total_duration_formatted: '1 hr 2 min',
      optimized_order: JSON.stringify(day3Schools.map(s => s.id)),
      status: 'PLANNED',
      remarks: 'Gokulam and Jayalakshmipuram corridor. High-opportunity schools. Prepare Junior Power Quest sample booklets.'
    }
  });

  for (let i = 0; i < day3Schools.length; i++) {
    await prisma.routeStop.create({
      data: {
        route_plan_id: planDay3.id,
        school_id: day3Schools[i].id,
        stop_number: i + 1,
        optimized_sequence: i + 1,
        leg_distance_km: 3.0,
        leg_distance_meters: 3000,
        leg_duration_formatted: '9 min',
        leg_duration_seconds: 540,
        status: 'PENDING'
      }
    });
  }

  // 6. Create Daily Summaries
  await prisma.dailySummary.create({
    data: {
      date: dateToday,
      schools_planned: 7,
      schools_visited: 2,
      schools_not_visited: 5,
      revisits: 1,
      interested: 1,
      followups: 1,
      registrations: 1,
      not_interested: 0,
      total_distance_km: 19.8,
      total_travel_time: '58 min',
      remarks: 'Excellent reception at Amrita Vidyalayam with confirmed registration. Continuing Saraswathipuram stops.',
      ai_summary: 'Strong conversion on repeat visit. Prioritize Mahabodhi and Kuvempunagar stops before 1:30 PM dismissal.'
    }
  });

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
