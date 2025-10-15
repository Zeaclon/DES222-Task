export default async function handler(req, res) {
    const { lat, lon } = req.query;
    const key = process.env.OPENWEATHER_KEY;

    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${key}`;
    const response = await fetch(url);
    const data = await response.json();

    res.status(200).json(data);
}