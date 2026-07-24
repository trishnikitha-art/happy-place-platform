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
      const latestDeployment = deployments[0];
      console.log('Latest Deployment ID:', latestDeployment.id);
      console.log('State:', latestDeployment.state);
      console.log('Created:', latestDeployment.created_at);
    } else {
      console.log('No deployments found');
    }
  });
});

req.on('error', (error) => {
  console.error(error);
});

req.end();
