
const https = require('https');

const data = JSON.stringify({
    from: "IST",
    to: "CDG",
    departDate: "2026-01-20",
    tripType: "oneway",
    passengers: { adults: 1, children: 0, infants: 0 },
    travelClass: "ECONOMY",
    currencyCode: "USD"
});

const options = {
    hostname: 'travelapi-34zi.onrender.com',
    path: '/flights/search',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = https.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(body);
            console.log("Status:", res.statusCode);
            if (json.offers && json.offers.length > 0) {
                const offer = json.offers[0];
                console.log("First offer keys:", Object.keys(offer));
                console.log("Has _raw?", offer._raw ? "YES" : "NO");
            } else {
                console.log("No offers returned", json);
            }
        } catch (e) {
            console.error(e);
            console.log("Raw body:", body);
        }
    });
});

req.on('error', (error) => {
    console.error(error);
});

req.write(data);
req.end();
