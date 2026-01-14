
const fetch = require('node-fetch'); // User might not have node-fetch, use native if node 18+ or standard https

const https = require('https');

const data = JSON.stringify({
    type: 'hotel',
    itemId: 'test-hotel-id',
    subId: 'test-room-id',
    price: 150,
    checkIn: new Date(),
    checkOut: new Date(Date.now() + 86400000),
    guests: { adults: 1, children: [] }
});

const options = {
    hostname: 'travelapi-34zi.onrender.com',
    port: 443,
    path: '/bookings',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = https.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    let body = '';
    res.on('data', (d) => { body += d; });
    res.on('end', () => {
        console.log('BODY:', body);
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.write(data);
req.end();
