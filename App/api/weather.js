export default async function handler(req, res) {
    const { lat, lon } = req.query;

    if (!lat || !lon) {
        return res.status(400).json({ error: "Missing latitude or longitude" });
    }

    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
        console.error("Missing OPENWEATHER_API_KEY environment variable");
        return res.status(500).json({ error: "Server missing API key" });
    }

    try {
        const response = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`
        );
        const data = await response.json();

        if (data.cod === 401) {
            console.error("Invalid OpenWeather API key:", data);
        }

        res.status(200).json(data);
    } catch (err) {
        console.error("Weather API error:", err);
        res.status(500).json({ error: "Failed to fetch weather data" });
    }
}