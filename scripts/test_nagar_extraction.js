const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const mysuruSchools = await prisma.school.findMany({
    where: { area: 'Mysuru' },
    select: { s_no: true, school_name: true, address: true, area: true }
  });

  console.log(`Schools with area 'Mysuru': ${mysuruSchools.length}`);
  
  // Test extracting nagar / layout / locality from address
  const nagarKeywords = [
    'Kuvempunagar', 'Kuvempu Nagar', 'Jayalakshmipuram', 'Saraswathipuram', 'Vidyaranyapuram',
    'Chamarajapuram', 'Lakshmipuram', 'Ramakrishna Nagar', 'J P Nagar', 'JP Nagar', 'Siddartha Nagar',
    'Siddhartha Nagar', 'Janatha Nagar', 'Sharadadevi Nagar', 'Shakthi Nagar', 'Shakti Nagar', 'Gokulam',
    'Vijayanagar', 'Vijaya Nagar', 'Bogadi', 'Dattagalli', 'Srirampura', 'Hebbal', 'Hootagalli',
    'Metagalli', 'Yadavagiri', 'Bannimantap', 'Bannimantapa', 'Nazarbad', 'Agrahara', 'Subhash Nagar',
    'Tilak Nagar', 'Gandhinagar', 'Gandhi Nagar', 'Ashok Nagar', 'Vontikoppal', 'CFTRI', 'Alanahalli',
    'Yelwal', 'Yelawala', 'Belavadi', 'TK Layout', 'T.K. Layout', 'Roopa Nagar', 'Kalyanagiri'
  ];

  let identified = 0;
  const extractedBuckets = {};

  for (const s of mysuruSchools) {
    const fullText = `${s.school_name} ${s.address}`;
    let matched = 'Mysuru Central / General';
    for (const kw of nagarKeywords) {
      const regex = new RegExp(`\\b${kw}\\b`, 'i');
      if (regex.test(fullText)) {
        matched = kw.replace(/\s+/g, ' '); // normalize
        break;
      }
    }
    if (matched !== 'Mysuru Central / General') identified++;
    extractedBuckets[matched] = (extractedBuckets[matched] || 0) + 1;
  }

  console.log(`Identified specific Nagar/Layout for ${identified} out of ${mysuruSchools.length} 'Mysuru' schools:`);
  Object.entries(extractedBuckets).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
    console.log(`  ${k}: ${v}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
