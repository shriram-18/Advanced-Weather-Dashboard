const https = require('https');

module.exports = function handler(req, res) {
    const { endpoint, q, lat, lon, units } = req.query;

    const API_KEY = process.env.OPENWEATHER_API_KEY;

    if (!API_KEY) {
        return res.status(500).json({ error: 'Server configuration error: API key missing.' });
    }

    if (!endpoint || (endpoint !== 'weather' && endpoint !== 'forecast')) {
        return res.status(400).json({ error: 'Invalid weather endpoint requested.' });
    }

    let url = `https://api.openweathermap.org/data/2.5/${endpoint}?appid=${API_KEY}`;

    if (q) url += `&q=${encodeURIComponent(q)}`;
    if (lat && lon) url += `&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`;
    if (units) url += `&units=${encodeURIComponent(units)}`;

    https.get(url, (apiRes) => {
        let data = '';

        apiRes.on('data', (chunk) => {
            data += chunk;
        });

        apiRes.on('end', () => {
            try {
                const parsedData = JSON.parse(data);
                if (apiRes.statusCode !== 200) {
                    return res.status(apiRes.statusCode).json(parsedData);
                }
                res.status(200).json(parsedData);
            } catch (e) {
                res.status(500).json({ error: 'Failed to parse OpenWeather API response.' });
            }
        });
    }).on('error', (err) => {
        res.status(500).json({ error: 'Network error communicating with OpenWeather.', details: err.message });
    });
};
