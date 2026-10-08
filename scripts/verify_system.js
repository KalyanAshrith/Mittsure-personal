const http = require('http');

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    }).on('error', reject);
  });
}

function post(url, body) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(body);
    const parsed = new URL(url);
    const req = http.request({
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function testAll() {
  console.log('=== SYSTEM VERIFICATION SUITE ===\n');

  // 1. Check Dashboard
  console.log('1. Verifying /api/dashboard...');
  const dash = await get('http://localhost:3000/api/dashboard');
  if (dash.status !== 200) throw new Error(`Dashboard failed with status ${dash.status}`);
  const todayRoute = dash.body.todayRoute;
  if (!todayRoute) throw new Error('todayRoute is missing from dashboard!');
  console.log(`  todayRoute found for date ${todayRoute.date}, stops: ${todayRoute.stops.length}`);
  const dashVisited = todayRoute.stops.filter(s => s.school.visited_by_current_user && s.status !== 'VISITED');
  if (dashVisited.length > 0) {
    throw new Error(`FATAL: Dashboard todayRoute has ${dashVisited.length} pending visited stops!`);
  }
  console.log('  ✅ Dashboard todayRoute has ZERO pending visited schools.');

  // 2. Check Calendar
  console.log('\n2. Verifying /api/calendar?days=6...');
  const cal = await get('http://localhost:3000/api/calendar?days=6');
  if (cal.status !== 200) throw new Error(`Calendar failed with status ${cal.status}`);
  const schedule = cal.body.schedule;
  console.log(`  Schedule has ${schedule.length} days.`);

  const seenSchools = new Map();

  for (const day of schedule) {
    console.log(`\n  Day: ${day.date} (${day.dayLabel}) | Holiday: ${day.isHoliday}`);
    if (day.routePlan && day.routePlan.stops) {
      console.log(`    Stops: ${day.routePlan.stops.length} | Plan: ${day.routePlan.name}`);
      for (const st of day.routePlan.stops) {
        const sc = st.school;
        if (sc.visited_by_current_user && st.status !== 'VISITED') {
          throw new Error(`FATAL: Day ${day.date} has pending stop with visited school: S.No ${sc.s_no} - ${sc.school_name}`);
        }
        if (seenSchools.has(sc.id)) {
          throw new Error(`FATAL: Duplicate school ${sc.school_name} found on ${day.date} and ${seenSchools.get(sc.id)}`);
        }
        seenSchools.set(sc.id, day.date);
        console.log(`      Stop #${st.stop_number}: S.No ${sc.s_no} - ${sc.school_name} [${sc.board}] (${sc.area})`);
      }
    }
  }
  console.log('\n  ✅ Calendar schedule has ZERO visited schools and ZERO cross-day duplicates.');

  // 3. Test Modify-Stop Security Guard against adding visited school (S.No 257: S-80185)
  console.log('\n3. Testing Modify-Stop Security Guard against adding visited school...');
  const modifyAttempt = await post('http://localhost:3000/api/routes/modify-stop', {
    action: 'ADD',
    date: '2026-09-17',
    schoolId: 'S-80185' // S.No 257 Sharada Vilas (visited)
  });
  console.log(`  Modify-stop response status: ${modifyAttempt.status}`);
  console.log(`  Modify-stop response body:`, modifyAttempt.body);
  if (modifyAttempt.status !== 400 || !modifyAttempt.body.error || !modifyAttempt.body.error.includes('already been visited')) {
    throw new Error('FAILED: modify-stop should have rejected adding a visited school with 400 status!');
  }
  console.log('  ✅ Modify-stop successfully blocked adding a visited school!');

  console.log('\n=== ALL VERIFICATIONS PASSED WITH 100% SUCCESS ===');
}

testAll().catch(e => {
  console.error('\n❌ Verification Failed:', e);
  process.exit(1);
});
