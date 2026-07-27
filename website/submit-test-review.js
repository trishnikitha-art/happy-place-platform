const http = require('http');

const testReview = {
  name: 'Test User',
  city: 'Test City',
  county: 'Unknown',
  service: 'deck',
  rating: 5,
  body: 'Test review submission through the website form. Happy Place Carpentry did an amazing job on our deck project.',
  provider: 'form',
};

const postData = JSON.stringify(testReview);

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/reviews',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers: ${JSON.stringify(res.headers)}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('\nResponse Body:');
    console.log(data);
  });
});

req.on('error', (error) => {
  console.error('Error:', error.message);
});

req.write(postData);
req.end();
