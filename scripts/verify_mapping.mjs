import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const mapping = [
  { userSno: 457, dbSno: 246, name: 'Taralabalu School', area: 'Mysuru (TK Layout)', day: 'Day 1', type: 'Visit' },
  { userSno: 349, dbSno: 225, name: 'Pragathi Vidya Kendra Bogadhi', area: 'Bogadi', day: 'Day 1', type: 'Visit' },
  { userSno: 258, dbSno: 303, name: 'Gangotri Public School', area: 'Bogadi', day: 'Day 1', type: 'Visit' },
  { userSno: 191, dbSno: 52, name: 'Amrita Vidyalayam-Mysuru', area: 'Bogadi', day: 'Day 1', type: 'Visit' },
  { userSno: 229, dbSno: 57, name: 'Christ Public School-Mysuru', area: 'Bogadi', day: 'Day 1', type: 'Visit' },
  { userSno: 347, dbSno: 147, name: 'Pragathi Elite Public School-Mysuru', area: 'Bogadi', day: 'Day 1', type: 'Visit' },
  { userSno: 355, dbSno: 86, name: 'Rainbow Public School-Mysuru', area: 'Bogadi', day: 'Day 1', type: 'Visit' },
  { userSno: 211, dbSno: 215, name: 'Bharatiya Vidya Bhavan School Vijayanagar', area: 'Vijayanagar', day: 'Day 1/Follow-up plan', type: 'Visit' },
  { userSno: 367, dbSno: 88, name: 'S.V.E.I. School-Mysuru', area: 'Vijayanagar', day: 'Day 1/Follow-up plan', type: 'Visit' },
  { userSno: 342, dbSno: 81, name: 'NPS International School-Mysuru', area: 'Vijayanagar', day: 'Day 1/Follow-up plan', type: 'Visit' },
  { userSno: 201, dbSno: 474, name: 'Basil Buds International School', area: 'Mysuru', day: 'Day 2', type: 'Visit' },
  { userSno: 223, dbSno: 243, name: 'Cauvery School', area: 'Mysuru', day: 'Day 2', type: 'Visit' },
  { userSno: 260, dbSno: 203, name: 'Gnana Ganga School', area: 'Mysuru', day: 'Day 2', type: 'Visit' },
  { userSno: 263, dbSno: 204, name: 'Gokula School', area: 'Kuvempunagar', day: 'Day 2', type: 'Visit' },
  { userSno: 350, dbSno: 82, name: 'Pramati Hill View Academy-Mysuru', area: 'Kuvempunagar', day: 'Day 2', type: 'Visit' },
  { userSno: 396, dbSno: 242, name: 'Shri Sharada Public School', area: 'Dattagalli', day: 'Day 2', type: 'Visit' },
  { userSno: 445, dbSno: 455, name: 'Subhodaya School Kuvempunagar', area: 'Mysuru', day: 'Day 2', type: 'Visit' },
  { userSno: 181, dbSno: 264, name: 'Ace Priyadarshini School', area: 'Hebbal', day: 'Saturday / Today', type: 'Revisit' },
  { userSno: 187, dbSno: 224, name: 'Akshara Pathshala', area: 'Hebbal', day: 'Saturday / Today', type: 'Revisit' },
  { userSno: 366, dbSno: 87, name: 'Royale Concord International School-Mysuru', area: 'Mysuru', day: 'Saturday', type: 'Revisit' },
  { userSno: 331, dbSno: 77, name: 'Mysore West Lions Sevaniketan School', area: 'Gokulam', day: 'Today – 7 Sep', type: 'Visit' },
  { userSno: 360, dbSno: 282, name: 'Rotary Mysore School', area: 'Dattagalli', day: 'Today – 7 Sep', type: 'Visit' },
  { userSno: 365, dbSno: 284, name: 'Rotary West School Saraswathi Puram', area: 'Saraswathipuram', day: 'Today – 7 Sep', type: 'Visit' },
  { userSno: 368, dbSno: 317, name: 'Sadvidya School', area: 'Mysuru', day: 'Today – 7 Sep', type: 'Visit' },
  { userSno: 382, dbSno: 257, name: 'Sharada Vilas School', area: 'Mysuru', day: 'Today – 7 Sep', type: 'Visit' },
];

async function verify() {
  console.log('Verifying mapped schools in database:');
  for (const m of mapping) {
    const s = await prisma.school.findUnique({ where: { s_no: m.dbSno } });
    console.log(`[User S.No ${m.userSno} -> DB S.No ${m.dbSno}] ${s?.school_name} | Area: ${s?.area} | ID: ${s?.school_id}`);
  }
}

verify().catch(console.error).finally(() => prisma.$disconnect());
