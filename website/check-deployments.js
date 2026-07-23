const https = require('https');

const options = {
  hostname: 'api.github.com',
  path: '/repos/trishnikitha-art/happy-place-platform/deployments',
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
    const deployments = JSON.parse(data);
    if (deployments.length > 0) {
      const latest = deployments[0];
      console.log('Latest Deployment:');
      console.log('SHA:', latest.sha);
      console.log('Status URL:', latest.statuses_url);
      console.log('Created:', latest.created_at);
      console.log('Environment:', latest.environment);
    } else {
      console.log('No deployments found');
    }
  });
});

req.on('error', (error) => {
  console.error(error);
});

req.end();
