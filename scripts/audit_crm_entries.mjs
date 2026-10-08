import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const rawEntries = [
  { date: '2026-10-07', name: 'Balodyana English School-Mysuru', partyId: 'S-18090' },
  { date: '2026-10-07', name: 'BSS Vidyodaya', partyId: 'S-143894' },
  { date: '2026-10-07', name: 'Avila Convent', partyId: 'S-80220' },
  { date: '2026-10-07', name: 'Hemavathi School', partyId: 'S-174389' },
  { date: '2026-10-07', name: 'Sharada School SD Nagar', partyId: 'S-131629' },
  { date: '2026-10-07', name: 'Nirmala Public School', partyId: 'S-74732' },
  { date: '2026-10-06', name: 'Thirumala Public School-Mysuru', partyId: 'S-18152' },
  { date: '2026-10-06', name: 'Floriana School T Narasipura', partyId: 'S-155271' },
  { date: '2026-10-06', name: 'Vasavi School T Narsipura', partyId: 'S-145315' },
  { date: '2026-10-06', name: 'St. Norbert School-Mysuru', partyId: 'S-18148' },
  { date: '2026-10-06', name: 'Shiksha School', partyId: 'S-125594' },
  { date: '2026-10-05', name: 'Sudarshan School', partyId: 'S-113523' },
  { date: '2026-10-05', name: 'Nypunya School Of Excellence-Mysuru', partyId: 'S-18719' },
  { date: '2026-10-05', name: 'Mysore International School-Mysuru', partyId: 'S-18113' },
  { date: '2026-10-05', name: 'Future Foundation School', partyId: 'S-117035' },
  { date: '2026-10-01', name: 'Pragathi Elite Public School-Mysuru', partyId: 'S-18670' },
  { date: '2026-10-01', name: 'Rainbow Public School-Mysuru', partyId: 'S-18123' },
  { date: '2026-10-01', name: 'St. Francis School-Mysuru', partyId: 'S-18139' },
  { date: '2026-10-01', name: 'Bizi Brain Pre School', partyId: 'S-162997' },
  { date: '2026-10-01', name: 'DGTM English Medium School', partyId: 'S-116933' },
  { date: '2026-09-30', name: 'Amrita Vidalayam-Mysuru', partyId: 'S-18088' },
  { date: '2026-09-30', name: 'Acme School', partyId: 'S-131628' },
  { date: '2026-09-30', name: 'Vijaya Vitala Vidya Shale', partyId: 'S-134650' },
  { date: '2026-09-30', name: 'St Mary School Chamunipuram', partyId: 'S-131632' },
  { date: '2026-09-30', name: 'Sree Natraja Public School-Mysuru', partyId: 'S-18132' },
  { date: '2026-09-29', name: 'Vedic Pre School Saraswathipuram', partyId: 'S-156503' },
  { date: '2026-09-29', name: 'Sai Gurukula Pre School Hebbal', partyId: 'S-148140' },
  { date: '2026-09-29', name: 'Tree Top Pre School Mysore', partyId: 'S-137103' },
  { date: '2026-09-29', name: 'Smart School Junior Srirampura', partyId: 'S-156403' },
  { date: '2026-09-29', name: 'Buds House Of Montessori', partyId: 'S-156334' },
  { date: '2026-09-29', name: 'Alpha Benaka Kids', partyId: 'S-145498' },
  { date: '2026-09-28', name: 'Om Shree Guru Anglo Vedic Literacy School', partyId: 'S-137104' },
  { date: '2026-09-28', name: 'Shri Bruhaspathyarya Vidya Samsthe', partyId: 'S-142776' },
  { date: '2026-09-28', name: 'Mahabodhi School-Mysuru', partyId: 'S-18110' },
  { date: '2026-09-28', name: 'Maharshi Public School', partyId: 'S-173644' },
  { date: '2026-09-28', name: 'St Thomas CBSE School', partyId: 'S-116932' },
  { date: '2026-09-26', name: 'St Mary School Chamunipuram', partyId: 'S-131632' },
  { date: '2026-09-26', name: 'Nalanda English School', partyId: 'S-131630' },
  { date: '2026-09-26', name: 'St. Josephs School-Mysuru', partyId: 'S-18143' },
  { date: '2026-09-26', name: 'St. Josephs Central School-Mysuru', partyId: 'S-18142' },
  { date: '2026-09-26', name: 'Vidyavahini School Hebbal', partyId: 'S-113475' },
  { date: '2026-09-24', name: 'St Anthonys School K R Nagar', partyId: 'S-75809' },
  { date: '2026-09-24', name: 'Sy Joseph Convert K Nagar', partyId: 'S-75753' },
  { date: '2026-09-24', name: 'SN Public School K R Nagar', partyId: 'S-75722' },
  { date: '2026-09-24', name: 'Lions School K R Nagar', partyId: 'S-75752' },
  { date: '2026-09-24', name: 'Kanaka Public School K R Nagar', partyId: 'S-75771' },
  { date: '2026-09-24', name: 'Bale Vidya Samsthe K R Nagar', partyId: 'S-122575' },
  { date: '2026-09-24', name: 'B S Madappa Smaraka Vidya Samsthe K R Nagar', partyId: 'S-122563' },
  { date: '2026-09-24', name: 'DGTM English Medium School', partyId: 'S-116933' },
  { date: '2026-09-23', name: 'S S K C English Medium High School Krpete', partyId: 'S-121585' },
  { date: '2026-09-23', name: 'Vijaya School Pandavapura', partyId: 'S-127092' },
  { date: '2026-09-23', name: 'P S S K Public School', partyId: 'S-173281' },
  { date: '2026-09-23', name: 'New Oxford Public School Spr', partyId: 'S-127126' },
  { date: '2026-09-23', name: 'Lenin Convent English Medium School', partyId: 'S-173257' },
  { date: '2026-09-23', name: 'Om Shree Nikethana School', partyId: 'S-118958' },
  { date: '2026-09-22', name: 'Euro Kids Pre School Yelawala', partyId: 'S-173170' },
  { date: '2026-09-22', name: 'Sri Rama Vidya Kula Yelavala', partyId: 'S-125592' },
  { date: '2026-09-22', name: 'Kalabharathi Vidya Samsthe Yelavala', partyId: 'S-116705' },
  { date: '2026-09-22', name: 'Atomic Energy Central School-830045', partyId: 'S-21186' },
  { date: '2026-09-22', name: 'Sri Paramahamsa Vidyaniketana School-Mysuru', partyId: 'S-34285' },
  { date: '2026-09-22', name: 'Vidyavahini School Hebbal', partyId: 'S-113475' },
  { date: '2026-09-22', name: 'KNC Innovative Global School-Mysuru', partyId: 'S-18109' },
  { date: '2026-09-22', name: 'Akshara Pathsala', partyId: 'S-75434' },
  { date: '2026-09-21', name: 'Vishwamanava Vidyanikethana', partyId: 'S-76584' },
  { date: '2026-09-21', name: 'Emblem Public School', partyId: 'S-173046' },
  { date: '2026-09-21', name: 'Andalus English School', partyId: 'S-173038' },
  { date: '2026-09-21', name: 'De Paul Public School-Mysuru', partyId: 'S-18097' },
  { date: '2026-09-21', name: 'DGTM English Medium School', partyId: 'S-116933' },
  { date: '2026-09-21', name: 'CFTRI School-Mysuru', partyId: 'S-18091' }
];

async function checkCRMRecords() {
  console.log(`Analyzing ${rawEntries.length} CRM entries...`);

  const uniquePartyIds = new Set();
  const duplicateVisits = [];
  const matched = [];
  const unmatched = [];
  const alreadyVisited = [];
  const newlyToMarkVisited = [];

  for (const entry of rawEntries) {
    if (uniquePartyIds.has(entry.partyId)) {
      duplicateVisits.push(entry);
    } else {
      uniquePartyIds.add(entry.partyId);
    }

    // Find school in DB by partyId or name
    let school = await prisma.school.findFirst({
      where: {
        OR: [
          { school_id: entry.partyId },
          { school_code: entry.partyId },
          { school_name: { equals: entry.name } },
          { school_name: { contains: entry.name.replace(/-(Mysuru|Mysore)/i, '').trim() } }
        ]
      },
      include: { visits: true }
    });

    if (school) {
      matched.push({ entry, school });
      if (school.visited_by_current_user || school.visit_status === 'VISITED') {
        alreadyVisited.push({ entry, school });
      } else {
        newlyToMarkVisited.push({ entry, school });
      }
    } else {
      unmatched.push(entry);
    }
  }

  console.log(`Total entries: ${rawEntries.length}`);
  console.log(`Unique Party IDs: ${uniquePartyIds.size}`);
  console.log(`Duplicate visits in this list: ${duplicateVisits.length}`);
  console.log(`Matched schools in DB: ${matched.length}`);
  console.log(`Unmatched schools: ${unmatched.length}`);
  console.log(`Already marked VISITED: ${alreadyVisited.length}`);
  console.log(`Currently UNVISITED (ready to mark): ${newlyToMarkVisited.length}`);

  if (unmatched.length > 0) {
    console.log('\n--- UNMATCHED SCHOOLS ---');
    unmatched.forEach(u => console.log(`- ${u.date} | ${u.name} | ${u.partyId}`));
  }

  if (newlyToMarkVisited.length > 0) {
    console.log('\n--- NEWLY TO MARK VISITED ---');
    newlyToMarkVisited.forEach(n => console.log(`- #${n.school.s_no} ${n.school.school_name} (${n.school.school_id}) [CRM: ${n.entry.partyId}] Date: ${n.entry.date}`));
  }

  if (duplicateVisits.length > 0) {
    console.log('\n--- REVISITS / DUPLICATE VISITS IN LIST ---');
    duplicateVisits.forEach(d => console.log(`- ${d.date} | ${d.name} (${d.partyId})`));
  }
}

checkCRMRecords().catch(console.error).finally(() => prisma.$disconnect());
