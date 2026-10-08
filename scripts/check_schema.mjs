import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkSchema() {
  const sample = await prisma.routePlan.findFirst({
    include: { stops: true }
  });
  console.log("RoutePlan fields:", Object.keys(sample));
  if (sample.stops.length > 0) {
    console.log("RouteStop fields:", Object.keys(sample.stops[0]));
  }
}

checkSchema().catch(console.error).finally(() => prisma.$disconnect());
