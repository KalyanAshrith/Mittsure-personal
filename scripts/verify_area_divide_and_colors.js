const http = require('http');

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  console.log('=== VERIFYING AREA DIVIDE API & COUNTS ===');
  const res = await get('http://localhost:3000/api/schools/area-breakdown');
  console.log('API Status:', res.status);
  
  if (res.status !== 200) {
    console.error('FAILED: API returned status', res.status);
    process.exit(1);
  }

  const { summary, areas } = res.body;
  console.log(`Summary: Total=${summary.totalSchools}, Visited=${summary.totalVisited} (Green), Unvisited=${summary.totalUnvisited} (Red), Completion=${summary.overallCompletionRate}%`);
  console.log(`Distinct Areas Count: ${areas.length}`);

  let sumSchools = 0;
  let sumVisited = 0;
  let sumUnvisited = 0;

  for (const area of areas) {
    sumSchools += area.totalSchools;
    sumVisited += area.visitedCount;
    sumUnvisited += area.unvisitedCount;
  }

  console.log(`Sum from areas: Total=${sumSchools}, Visited=${sumVisited}, Unvisited=${sumUnvisited}`);

  if (summary.totalSchools !== 487) {
    console.error(`FAILED: Expected 487 total master schools, got ${summary.totalSchools}`);
    process.exit(1);
  }

  if (sumSchools !== 487) {
    console.error(`FAILED: Sum of schools across areas is ${sumSchools}, expected 487`);
    process.exit(1);
  }

  if (summary.totalVisited !== 55 || summary.totalUnvisited !== 432) {
    console.error(`FAILED: Expected 55 visited / 432 unvisited, got ${summary.totalVisited}/${summary.totalUnvisited}`);
    process.exit(1);
  }

  console.log('Top 5 Areas by Unvisited Schools:');
  const sorted = [...areas].sort((a, b) => b.unvisitedCount - a.unvisitedCount);
  sorted.slice(0, 5).forEach((a, idx) => {
    console.log(`  ${idx + 1}. ${a.areaName}: ${a.unvisitedCount} unvisited / ${a.totalSchools} total (${a.visitedCount} visited) - ${a.minDistFromPgKm} km from Bogadi PG`);
  });

  console.log('\nAll Area Divide verifications PASSED successfully!');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
