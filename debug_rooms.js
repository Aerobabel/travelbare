
const https = require('https');

function fetch(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let body = '';
            res.on('data', d => body += d);
            res.on('end', () => resolve(JSON.parse(body)));
        }).on('error', reject);
    });
}

(async () => {
    try {
        console.log('Fetching hotels...');
        const hotelsRes = await fetch('https://travelapi-34zi.onrender.com/hotels?destination=Paris');
        const hotels = hotelsRes.hotels || [];

        if (hotels.length === 0) {
            console.log('No hotels found.');
            return;
        }

        const hotelId = hotels[0].id;
        console.log(`Checking rooms for hotel: ${hotels[0].title} (${hotelId})`);

        const roomsRes = await fetch(`https://travelapi-34zi.onrender.com/hotels/${hotelId}/rooms`);
        const rooms = roomsRes.rooms || [];

        console.log(`Found ${rooms.length} rooms.`);
        rooms.forEach((r, i) => {
            console.log(`[${i}] ${r.name} - $${r.price}`);
        });

    } catch (e) {
        console.error(e);
    }
})();
