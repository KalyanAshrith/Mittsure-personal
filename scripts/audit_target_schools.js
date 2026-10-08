const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const targets = [
  { dbSno: 280, label: 'DGTM English Medium School', crm: 'S-116933' },
  { dbSno: 329, label: 'JSS School Saraswathipuram', crm: 'S-125355' },
  { dbSno: 58,  label: 'Christ The King Convent Public School', crm: 'S-18094' },
  { dbSno: 1,   label: 'JSS Public School, JSS Institutions Campus, B.R.', crm: 'S-17802' },
  { dbSno: 432, label: 'Super Kidz Pre School', crm: 'S-143362' },
  { dbSno: 244, label: 'Vishwamanava Vidyanikethana', crm: 'S-76584' },
  { dbSno: 211, label: 'Ramakrishna Vidya Kendra', crm: 'S-74915' },
  { dbSno: 404, label: 'Sri Ranga Gurukula', crm: 'S-137127' },
  { dbSno: 402, label: 'Tree Top Pre School Mysuru', crm: 'S-137103' },
  { dbSno: 107, label: 'Supreme Public School-Mysuru', crm: 'S-18149' },
  { dbSno: 264, label: 'Ace Priyadarshini School', userSno: 181 },
  { dbSno: 224, label: 'Akshara Pathshala', userSno: 187 },
  { dbSno: 52,  label: 'Amrita Vidyalayam-Mysuru', userSno: 191 },
  { dbSno: 474, label: 'Basil Buds International School', userSno: 201 },
  { dbSno: 215, label: 'Bharatiya Vidya Bhavan School Vijayanagar', userSno: 211 },
  { dbSno: 243, label: 'Cauvery School', userSno: 223 },
  { dbSno: 57,  label: 'Christ Public School-Mysuru', userSno: 229 },
  { dbSno: 203, label: 'Gnana Ganga School', userSno: 260 },
  { dbSno: 204, label: 'Gokula School', userSno: 263 },
  { dbSno: 120, label: 'Mysore Public School-Mysuru', userSno: 330 },
  { dbSno: 77,  label: 'Mysore West Lions Sevaniketan School', userSno: 331 },
  { dbSno: 81,  label: 'NPS International School-Mysuru', userSno: 342 },
  { dbSno: 147, label: 'Pragathi Elite Public School-Mysuru', userSno: 347 },
  { dbSno: 82,  label: 'Pramati Hill View Academy-Mysuru', userSno: 350 },
  { dbSno: 84,  label: 'Purna Chetana Public School-Mysuru', userSno: 352 },
  { dbSno: 282, label: 'Rotary Mysore School', userSno: 360 },
  { dbSno: 284, label: 'Rotary West School Saraswathi Puram', userSno: 365 },
  { dbSno: 87,  label: 'Royale Concord International School-Mysuru', userSno: 366 },
  { dbSno: 88,  label: 'S.V.E.I. School-Mysuru', userSno: 367 },
  { dbSno: 317, label: 'Sadvidya School', userSno: 368 },
  { dbSno: 444, label: 'Sharada Vidya Samsthe B Metagere', userSno: 381 },
  { dbSno: 257, label: 'Sharada Vilas School', userSno: 382 },
  { dbSno: 242, label: 'Shri Sharada Public School', userSno: 396 },
  { dbSno: 254, label: 'Sri Adichunchanagiri Central School', userSno: 409 },
  { dbSno: 304, label: 'Sri Adichunchanagiri Higher Primary & High School Gungralchatra', userSno: 410 },
  { dbSno: 102, label: 'St. Maria De Mattias School-Mysuru', userSno: 439 },
  { dbSno: 455, label: 'Subhodaya School', userSno: 445 },
  { dbSno: 246, label: 'Taralabalu School', userSno: 457 },
  { dbSno: 197, label: 'Intelligent Public School-Mysuru', userSno: 'intelligent' }
];

async function checkStatus() {
  console.log(`Auditing ${targets.length} target schools...\n`);
  let alreadyVisited = 0;
  let notVisited = 0;

  for (const t of targets) {
    const s = await prisma.school.findUnique({
      where: { s_no: t.dbSno },
      include: {
        visits: {
          where: { representative_id: 'KA-REP-01' },
          orderBy: { visit_date: 'desc' }
        }
      }
    });

    if (!s) {
      console.log(`ERROR: School not found for S.No ${t.dbSno} (${t.label})`);
      continue;
    }

    if (s.visited_by_current_user) {
      alreadyVisited++;
      console.log(`[ALREADY VISITED] S.No ${s.s_no} | ${s.school_id} | "${s.school_name}" (${s.area}) | Status: ${s.visit_status} | Visits: ${s.visits.length}`);
    } else {
      notVisited++;
      console.log(`[NOT YET VISITED] S.No ${s.s_no} | ${s.school_id} | "${s.school_name}" (${s.area}) | Status: ${s.visit_status}`);
    }
  }

  console.log(`\nSummary: Already Visited = ${alreadyVisited}, Not Yet Visited = ${notVisited}, Total Unique = ${targets.length}`);
}

checkStatus().catch(console.error).finally(() => prisma['$disconnect']());
