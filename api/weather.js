export default async function handler(req, res) {
    const { endpoint, q, lat, lon, units } = req.query;

    // Vercel securely injects this from the Project Settings > Environment Variables
    const API_KEY = process.env.OPENWEATHER_API_KEY;

    if (!API_KEY) {
        return res.status(500).json({ error: 'Server configuration error: API key missing.' });
    }

    if (!endpoint || (endpoint !== 'weather' && endpoint !== 'forecast')) {
        return res.status(400).json({ error: 'Invalid weather endpoint requested.' });
    }

    // Build the secure OpenWeather URL
    let url = `https://api.openweathermap.org/data/2.5/${endpoint}?appid=${API_KEY}`;

    // Append the query parameters sent from the frontend
    if (q) url += `&q=${encodeURIComponent(q)}`;
    if (lat && lon) url += `&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`;
    if (units) url += `&units=${encodeURIComponent(units)}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json(data);
        }

        // Return the clean data to the frontend!
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to communicate with OpenWeather API.' });
    }
}
