const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const HASSAN_TALUKS = ['Hassan', 'Channarayapatna'];
const KODAGU_TALUKS = ['Madikeri', 'Virajpet', 'Kushalnagar', 'Gonikoppal', 'Napoklu', 'Siddapur', 'Somwarapet'];
const MYSURU_RURAL_TALUKS = ['Hunsur', 'K R Nagar', 'Nanjangud', 'T Narasipura', 'Bannur', 'Periyapatna', 'Bettadapura', 'Sargur', 'Hullahalli', 'Hampapura'];

async function main() {
  console.log('--- Starting Database Normalization and Product Seeding ---');

  // 1. Normalize Hassan schools
  const hassanRes = await prisma.school.updateMany({
    where: {
      OR: [
        { taluk: { in: HASSAN_TALUKS } },
        { area: { in: HASSAN_TALUKS } }
      ]
    },
    data: {
      district: 'Hassan',
      is_city_school: false,
      zone_type: 'OUTSTATION'
    }
  });
  console.log(`Updated Hassan schools: ${hassanRes.count}`);

  // 2. Normalize Kodagu schools
  const kodaguRes = await prisma.school.updateMany({
    where: {
      OR: [
        { taluk: { in: KODAGU_TALUKS } },
        { area: { in: KODAGU_TALUKS } }
      ]
    },
    data: {
      district: 'Kodagu',
      is_city_school: false,
      zone_type: 'OUTSTATION'
    }
  });
  console.log(`Updated Kodagu schools: ${kodaguRes.count}`);

  // 3. Normalize Chamarajanagar & Mandya
  await prisma.school.updateMany({
    where: { district: 'Chamarajanagar' },
    data: {
      is_city_school: false,
      zone_type: 'OUTSTATION'
    }
  });
  await prisma.school.updateMany({
    where: { district: 'Mandya' },
    data: {
      is_city_school: false,
      zone_type: 'OUTSTATION'
    }
  });

  // 4. Normalize Mysuru Rural Taluks
  const ruralRes = await prisma.school.updateMany({
    where: {
      district: 'Mysuru',
      OR: [
        { taluk: { in: MYSURU_RURAL_TALUKS } },
        { area: { in: MYSURU_RURAL_TALUKS } }
      ]
    },
    data: {
      is_city_school: false,
      zone_type: 'MYSURU_RURAL'
    }
  });
  console.log(`Updated Mysuru Rural schools: ${ruralRes.count}`);

  // 5. Normalize Mysuru Urban Core
  const urbanRes = await prisma.school.updateMany({
    where: {
      district: 'Mysuru',
      is_city_school: true,
      NOT: {
        OR: [
          { taluk: { in: MYSURU_RURAL_TALUKS } },
          { area: { in: MYSURU_RURAL_TALUKS } }
        ]
      }
    },
    data: {
      is_city_school: true,
      zone_type: 'MYSURU_URBAN'
    }
  });
  console.log(`Updated Mysuru Urban schools: ${urbanRes.count}`);

  // 6. Set Lifecycle Status
  const visitedRes = await prisma.school.updateMany({
    where: {
      OR: [
        { visit_status: { in: ['VISITED', 'COMPLETED'] } },
        { visited_by_current_user: true }
      ]
    },
    data: { lifecycle_status: 'VISITED' }
  });
  console.log(`Lifecycle status VISITED: ${visitedRes.count}`);

  const followupRes = await prisma.school.updateMany({
    where: {
      lifecycle_status: { not: 'VISITED' },
      OR: [
        { visit_status: 'FOLLOW-UP' },
        { next_followup_date: { not: null } }
      ]
    },
    data: { lifecycle_status: 'FOLLOW_UP' }
  });
  console.log(`Lifecycle status FOLLOW_UP: ${followupRes.count}`);

  const pendingRes = await prisma.school.updateMany({
    where: {
      lifecycle_status: { notIn: ['VISITED', 'FOLLOW_UP'] }
    },
    data: { lifecycle_status: 'PENDING' }
  });
  console.log(`Lifecycle status PENDING: ${pendingRes.count}`);

  // 7. Seed Products and Campaigns
  const productsData = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'data', 'products.json'), 'utf-8')
  );

  for (const prod of productsData.products) {
    const createdProduct = await prisma.product.upsert({
      where: { code: prod.code },
      update: {
        name: prod.name,
        category: prod.category,
        series: prod.series,
        target_grades: prod.target_grades,
        description: prod.description
      },
      create: {
        code: prod.code,
        name: prod.name,
        category: prod.category,
        series: prod.series,
        target_grades: prod.target_grades,
        description: prod.description
      }
    });

    // Delete existing books for clean seed
    await prisma.bookItem.deleteMany({ where: { product_id: createdProduct.id } });

    if (prod.books && prod.books.length > 0) {
      for (const b of prod.books) {
        await prisma.bookItem.create({
          data: {
            product_id: createdProduct.id,
            title: b.title,
            grade: b.grade,
            subject: b.subject,
            curriculum_claims: b.curriculum_claims || null
          }
        });
      }
    }
  }
  console.log(`Seeded ${productsData.products.length} products with books.`);

  for (const camp of productsData.campaigns) {
    await prisma.olympiadCampaign.upsert({
      where: { code: camp.code },
      update: {
        name: camp.name,
        programme: camp.programme,
        academic_year: camp.academic_year
      },
      create: {
        code: camp.code,
        name: camp.name,
        programme: camp.programme,
        academic_year: camp.academic_year
      }
    });
  }
  console.log(`Seeded ${productsData.campaigns.length} Olympiad campaigns.`);

  // Final sanity checks
  const totalSchools = await prisma.school.count();
  const districtCounts = await prisma.school.groupBy({
    by: ['district'],
    _count: { id: true },
    orderBy: { district: 'asc' }
  });
  const zoneCounts = await prisma.school.groupBy({
    by: ['zone_type'],
    _count: { id: true },
    orderBy: { zone_type: 'asc' }
  });
  const lifecycleCounts = await prisma.school.groupBy({
    by: ['lifecycle_status'],
    _count: { id: true },
    orderBy: { lifecycle_status: 'asc' }
  });
  const totalProducts = await prisma.product.count();
  const totalBooks = await prisma.bookItem.count();
  const totalCampaigns = await prisma.olympiadCampaign.count();

  console.log('Sanity verification results:', {
    totalSchools,
    districtCounts,
    zoneCounts,
    lifecycleCounts,
    totalProducts,
    totalBooks,
    totalCampaigns
  });

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});
