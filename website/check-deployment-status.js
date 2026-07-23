const https = require('https');

const options = {
  hostname: 'api.github.com',
  path: '/repos/trishnikitha-art/happy-place-platform/deployments/5580918200/statuses',
  method: 'GET',
  headers: {
    'User-Agent': 'node',
    'Accept': 'application/vnd.github.v3+json'
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    const statuses = JSON.parse(data);
    if (statuses.length > 0) {
      const latestStatus = statuses[0];
      console.log('Latest Status:');
      console.log('State:', latestStatus.state);
      console.log('Description:', latestStatus.description);
      console.log('Target URL:', latestStatus.target_url);
      console.log('Created:', latestStatus.created_at);
    } else {
      console.log('No statuses found');
    }
  });
});

req.on('error', (error) => {
  console.error(error);
});

req.end();
