import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const PORT = 3000;

// Serve your static files (frontend)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(path.join(__dirname, "public")));

// Weather endpoint
app.get("/api/weather", async (req, res) => {
    const { lat, lon } = req.query;
    try {
        const r = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${process.env.OPENWEATHER_API_KEY}`
        );
        const data = await r.json();
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch weather" });
    }
});

// Place endpoint
app.get("/api/place", async (req, res) => {
    const { lat, lon } = req.query;
    try {
        const r = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${process.env.GOOGLE_MAPS_API_KEY}`
        );
        const data = await r.json();
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch place" });
    }
});

app.listen(PORT, () => console.log(`Server running → http://localhost:${PORT}`));
