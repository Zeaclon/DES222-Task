const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let lines = [];
let currentLine = null;

// Playhead properties
let playheadX = 0;
let playheadSpeed = 1;

// Weather + audio
let temperature = 25; // default
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// === WEATHER FETCH ===
async function fetchWeather(lat, lon) {
    const res = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
    if (!res.ok) throw new Error("Failed to fetch weather data");
    const data = await res.json();
    console.log("Weather:", data);

    if (data?.main?.temp) temperature = data.main.temp;
    playheadSpeed = Math.max(0.2, (temperature / 10)); // temp affects speed
}

// === BACKGROUND COLOR ===
function getSkyGradient() {
    const hour = new Date().getHours();
    let top, bottom;

    if (hour >= 5 && hour < 8) {
        // Sunrise
        top = "#ff9966";
        bottom = "#ff5e62";
    } else if (hour >= 8 && hour < 17) {
        // Daytime
        top = "#87ceeb";
        bottom = "#ffffff";
    } else if (hour >= 17 && hour < 20) {
        // Sunset
        top = "#ff7e5f";
        bottom = "#feb47b";
    } else {
        // Night
        top = "#001F3F";
        bottom = "#011B2E";
    }

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, top);
    gradient.addColorStop(1, bottom);
    return gradient;
}

// === CANVAS SETUP ===
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// === DRAW LINE ===
canvas.addEventListener("mousedown", (e) => {
    currentLine = [{ x: e.clientX, y: e.clientY }];
});

canvas.addEventListener("mousemove", (e) => {
    if (currentLine) {
        currentLine.push({ x: e.clientX, y: e.clientY });
        drawScene();
    }
});

canvas.addEventListener("mouseup", () => {
    if (currentLine && currentLine.length > 1) lines.push(currentLine);
    currentLine = null;
});

// === TOUCH EVENTS ===
canvas.addEventListener("touchstart", (e) => {
    e.preventDefault(); // stop scrolling/zooming
    const touch = e.touches[0];
    currentLine = [{ x: touch.clientX, y: touch.clientY }];
});

canvas.addEventListener("touchmove", (e) => {
    e.preventDefault();
    if (!currentLine) return;
    const touch = e.touches[0];
    currentLine.push({ x: touch.clientX, y: touch.clientY });
    drawScene();
});

canvas.addEventListener("touchend", (e) => {
    e.preventDefault();
    if (currentLine && currentLine.length > 1) lines.push(currentLine);
    currentLine = null;
});

// === DRAW EVERYTHING ===
function drawScene() {
    ctx.fillStyle = getSkyGradient();
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw lines
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 3;

    lines.forEach((line) => {
        ctx.beginPath();
        ctx.moveTo(line[0].x, line[0].y);
        for (let i = 1; i < line.length; i++) ctx.lineTo(line[i].x, line[i].y);
        ctx.strokeStyle = "rgba(255,255,255,0.8)";
        ctx.stroke();
    });

    // Draw current line
    if (currentLine) {
        ctx.beginPath();
        ctx.moveTo(currentLine[0].x, currentLine[0].y);
        for (let i = 1; i < currentLine.length; i++) ctx.lineTo(currentLine[i].x, currentLine[i].y);
        ctx.strokeStyle = "rgba(255,255,255,0.5)";
        ctx.stroke();
    }

    // Draw playhead
    ctx.strokeStyle = "red";
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, canvas.height);
    ctx.stroke();
}

// === AUDIO ===
function playPitch(y, slope) {
    const freq = 200 + ((canvas.height - y) / canvas.height) * 1000; // y → pitch
    const mod = slope * 300; // slope adds glide flavor

    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(freq + mod, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.1);
}

// === DETECT INTERSECTION ===
function checkPlayheadCollisions() {
    for (const line of lines) {
        for (let i = 0; i < line.length - 1; i++) {
            const p1 = line[i];
            const p2 = line[i + 1];

            if ((p1.x <= playheadX && p2.x >= playheadX) || (p2.x <= playheadX && p1.x >= playheadX)) {
                const t = (playheadX - p1.x) / (p2.x - p1.x);
                const y = p1.y + t * (p2.y - p1.y);
                const slope = (p2.y - p1.y) / (p2.x - p1.x);
                playPitch(y, slope);
                break;
            }
        }
    }
}

// === ANIMATE ===
function animate() {
    playheadX += playheadSpeed;
    if (playheadX > canvas.width) playheadX = 0;

    drawScene();
    checkPlayheadCollisions();

    requestAnimationFrame(animate);
}

// === INIT ===
navigator.geolocation.getCurrentPosition(async (pos) => {
    await fetchWeather(pos.coords.latitude, pos.coords.longitude);
    animate();
});