const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let lines = [];
const pointsPerLine = 20;
const lineAmplitudeBase = 30;

// Resize canvas
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Web Audio setup
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playSound(frequency, gainValue = 0.05, duration = 0.1) {
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(gainValue, audioCtx.currentTime);
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + duration);
}

// --- Fetch weather data from your API route ---
async function fetchWeather(lat, lon) {
    const res = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
    if (!res.ok) throw new Error("Failed to fetch weather data");
    const data = await res.json();

    console.log("Weather API response:", data);

    if (!data.main) {
        console.error("Weather data missing `main`", data);
        return {
            location: "Unknown",
            temperature: 0,
            humidity: 0,
            wind: 0,
            pressure: 0,
            cloudiness: 0
        };
    }

    return {
        location: data.name || 'Unknown',
        temperature: data.main.temp,
        humidity: data.main.humidity / 100,
        wind: data.wind.speed,
        pressure: data.main.pressure,
        cloudiness: data.clouds.all / 100
    };
}

// --- Fetch place info from your API route ---
async function fetchPlace(lat, lon) {
    const res = await fetch(`/api/place?lat=${lat}&lon=${lon}`);
    if (!res.ok) throw new Error("Failed to fetch place data");
    const data = await res.json();

    if (!data.results || !data.results.length) {
        return { name: 'Unknown', type: 'Unknown' };
    }

    const place = data.results[0];
    const components = place.address_components.map(c => c.types).flat();

    let type = 'Unknown';
    if (components.includes('natural_feature')) type = 'Nature';
    else if (components.includes('locality')) type = 'City';
    else if (components.includes('route')) type = 'Road';
    else if (components.includes('establishment')) type = 'Man-made';

    return {
        name: place.formatted_address,
        type
    };
}

// --- Visual line creation ---
function createLineFromWeather(weather) {
    const points = [];
    const maxLineWidth = (pointsPerLine - 1) * 15;
    const startX = (canvas.width - maxLineWidth) / 2;
    const startY = canvas.height / 2;

    for (let j = 0; j < pointsPerLine; j++) {
        points.push({ x0: startX + j * 15, y0: startY, offsetX: 0, offsetY: 0 });
    }

    const colorHue = (weather.temperature * 10) % 360;
    const amplitude = lineAmplitudeBase + weather.wind;
    const lineWidth = 1 + weather.humidity * 5;

    lines.push({
        points,
        data: weather,
        color: `hsl(${colorHue}, 80%, 60%)`,
        amplitude,
        lineWidth
    });
}

// --- Draw animated lines ---
function drawLines() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    lines.forEach(line => {
        const pts = line.points;

        // Flowy line path
        ctx.beginPath();
        ctx.moveTo(pts[0].x0 + pts[0].offsetX, pts[0].y0 + pts[0].offsetY);

        for (let i = 1; i < pts.length; i++) {
            const p = pts[i];
            const prev = pts[i - 1];
            const midX = (p.x0 + prev.x0) / 2 + (p.offsetX + prev.offsetX) / 2;
            const midY = (p.y0 + prev.y0) / 2 + (p.offsetY + prev.offsetY) / 2;
            ctx.quadraticCurveTo(prev.x0 + prev.offsetX, prev.y0 + prev.offsetY, midX, midY);
        }

        // Glow if upside down
        const isUpsideDown = effectiveBeta >= 150 || effectiveBeta <= -150;
        ctx.strokeStyle = isUpsideDown ? `hsl(${(line.data.temperature*10)%360}, 100%, 70%)` : line.color;
        ctx.lineWidth = line.lineWidth + (isUpsideDown ? 1.5 : 0);
        ctx.shadowColor = isUpsideDown ? ctx.strokeStyle : 'transparent';
        ctx.shadowBlur = isUpsideDown ? 20 : 0;
        ctx.stroke();

        // Draw dots along the line
        pts.forEach((p, i) => {
            ctx.beginPath();
            const dotX = p.x0 + p.offsetX;
            const dotY = p.y0 + p.offsetY;
            ctx.arc(dotX, dotY, isUpsideDown ? 6 : 3, 0, Math.PI*2);
            ctx.fillStyle = isUpsideDown ? `hsl(${(line.data.temperature*10 + i*10)%360}, 100%, 80%)` : line.color;
            ctx.shadowColor = isUpsideDown ? ctx.fillStyle : 'transparent';
            ctx.shadowBlur = isUpsideDown ? 15 : 0;
            ctx.fill();
        });
    });
}

// --- Handle device tilt ---
let tiltX = 0, tiltY = 0, effectiveBeta = 0;
window.addEventListener('deviceorientation', e => {
    tiltX = (e.gamma || 0) / 50;
    tiltY = (e.beta || 0) / 50;
    effectiveBeta = e.beta || 0;
    // Debug
    console.log("Beta:", effectiveBeta, "Gamma:", e.gamma);
});

// --- Animate visual + audio ---
function animate() {
    const easing = 0.05;

    lines.forEach(line => {
        line.points.forEach((point, i) => {
            // Flowy offsets
            const targetX = Math.sin(Date.now()/1000 + i) * line.amplitude * tiltX;
            const targetY = Math.cos(Date.now()/1000 + i) * line.amplitude * tiltY;
            point.offsetX += (targetX - point.offsetX) * easing;
            point.offsetY += (targetY - point.offsetY) * easing;

            // Sound
            const isUpsideDown = effectiveBeta >= 150 || effectiveBeta <= -150;
            if (isUpsideDown && i === 0) {
                const freq = 200 + (line.data.temperature * 10) + tiltX*50;
                const gain = 0.05 + line.data.humidity*0.1;
                playSound(freq, gain);
            }
        });
    });

    drawLines();
    requestAnimationFrame(animate);
}

// --- App start ---
function startApp() {
    navigator.geolocation.getCurrentPosition(async pos => {
        const { latitude, longitude } = pos.coords;

        try {
            // Fetch both from our secure API routes
            const [weather, place] = await Promise.all([
                fetchWeather(latitude, longitude),
                fetchPlace(latitude, longitude)
            ]);

            console.log('Location info:', place);
            console.log('Weather info:', weather);

            createLineFromWeather({
                ...weather,
                location: place.name,
                environment: place.type
            });

            animate();
        } catch (err) {
            console.error('Error fetching data:', err);
        }
    }, err => {
        console.error('Geolocation failed:', err);
    });
}

startApp();