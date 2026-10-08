const http = require('http');

function post(url, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const req = http.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(body) }));
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function testToggle() {
  console.log('=== TESTING QUICK TOGGLE API ===');
  // Toggle school S.No 471 (Lisa 1st Step - currently unvisited)
  const res1 = await post('http://localhost:3000/api/schools/quick-toggle', { s_no: 471, targetStatus: true });
  console.log('Toggle 471 to Visited:', res1.status, res1.data.status, res1.data.counts);

  // Toggle 471 back to unvisited
  const res2 = await post('http://localhost:3000/api/schools/quick-toggle', { s_no: 471, targetStatus: false });
  console.log('Toggle 471 back to Not Visited:', res2.status, res2.data.status, res2.data.counts);

  if (res2.data.counts.completed === 61 && res2.data.counts.remaining === 426) {
    console.log('Test PASSED: exact 61 visited and 426 remaining maintained!');
  } else {
    console.error('Test FAILED: count mismatch', res2.data.counts);
    process.exit(1);
  }
}

testToggle().catch(err => {
  console.error(err);
  process.exit(1);
});
