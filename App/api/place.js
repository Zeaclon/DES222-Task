export default async function handler(req, res) {
    const { lat, lon } = req.query;
    const key = process.env.GOOGLE_MAPS_KEY;

    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${key}`;
    const response = await fetch(url);
    const data = await response.json();

    res.status(200).json(data);
}