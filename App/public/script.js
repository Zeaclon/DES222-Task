const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let weatherCondition = "clear";
let temperature = 25;

// === Lines ===
let lines = [];
let currentLine = null;
let selectedSoundType = "weather"; // "weather" or "wind"
let selectedColor = "#00ffcc";

// === Playhead ===
let playheadX = 0;
let playheadSpeed = 1;
let animating = false;

// === Audio ===
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let userStarted = false;

// === Preload Audio Files ===
const sounds = {
    weather: {
        clear: "still.wav",
        rain: "rain.wav",
        thunder: "thunder.wav",
        cloudy: "still.wav"
    },
    wind: {
        low: "still.wav",
        medium: "wind.wav",
        high: "wind.wav"
    }
};
const audioBuffers = {};

async function loadSoundFiles() {
    for (const category in sounds) {
        audioBuffers[category] = {};
        for (const key in sounds[category]) {
            const res = await fetch(`sounds/${sounds[category][key]}`);
            const arrayBuffer = await res.arrayBuffer();
            try {
                audioBuffers[category][key] = await audioCtx.decodeAudioData(arrayBuffer);
            } catch (e) {
                console.error(`Failed to decode ${sounds[category][key]}:`, e);
            }
        }
    }
}

// === Canvas Resize ===
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// === Sky Background ===
function getSkyGradient() {
    const hour = new Date().getHours();
    let top, bottom;
    if (hour >= 5 && hour < 8) { top="#ff9966"; bottom="#ff5e62"; }
    else if (hour >= 8 && hour < 17) { top="#87ceeb"; bottom="#afefff"; }
    else if (hour >= 17 && hour < 20) { top="#ff7e5f"; bottom="#feb47b"; }
    else { top="#001F3F"; bottom="#011B2E"; }

    const gradient = ctx.createLinearGradient(0,0,0,canvas.height);
    gradient.addColorStop(0, top);
    gradient.addColorStop(1, bottom);
    return gradient;
}

// === Fetch Weather ===
async function fetchWeather(lat, lon) {
    try {
        const res = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
        const data = await res.json();
        if (data?.main?.temp) temperature = data.main.temp;
        playheadSpeed = Math.max(0.2, temperature / 10);

        const condition = data.weather?.[0]?.main?.toLowerCase() || "";
        if (condition.includes("rain")) weatherCondition = "rain";
        else if (condition.includes("cloud")) weatherCondition = "cloudy";
        else if (condition.includes("thunder")) weatherCondition = "thunder";
        else weatherCondition = "clear";

        updateSoundButtonLabels();
    } catch (err) {
        console.warn("Weather fetch failed", err);
    }
}

// === Update Sound Button Labels ===
function updateSoundButtonLabels() {
    soundBtn1.textContent = `Weather: ${weatherCondition}`;
    soundBtn2.textContent = `Wind: medium`; // placeholder
}

// === Drawing Lines ===
function startLine(x, y) {
    const buffer = selectedSoundType === "weather"
        ? audioBuffers.weather[weatherCondition]
        : audioBuffers.wind["medium"];

    const gainNode = audioCtx.createGain();
    gainNode.gain.value = selectedSoundType === "wind" ? 0.3 : 0.1;
    gainNode.connect(audioCtx.destination);

    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(gainNode);
    source.start();

    currentLine = {
        points: [{x, y}],
        soundType: selectedSoundType,
        color: selectedColor,
        gainNode,
        source
    };
}

function extendLine(x, y) {
    if (!currentLine) return;
    currentLine.points.push({x, y});
    drawScene();
}

function endLine() {
    if (currentLine && currentLine.points.length > 1) lines.push(currentLine);
    currentLine = null;
}

// === Canvas Events ===
canvas.addEventListener("mousedown", e => { if(!userStarted) startUserInteraction(); startLine(e.clientX, e.clientY); });
canvas.addEventListener("mousemove", e => extendLine(e.clientX, e.clientY));
canvas.addEventListener("mouseup", endLine);
canvas.addEventListener("touchstart", e => { e.preventDefault(); if(!userStarted) startUserInteraction(); startLine(e.touches[0].clientX, e.touches[0].clientY); });
canvas.addEventListener("touchmove", e => { e.preventDefault(); extendLine(e.touches[0].clientX, e.touches[0].clientY); });
canvas.addEventListener("touchend", e => { e.preventDefault(); endLine(); });

// === Draw Scene ===
function drawScene() {
    ctx.fillStyle = getSkyGradient();
    ctx.fillRect(0,0,canvas.width,canvas.height);

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 3;

    [...lines, currentLine].forEach(line => {
        if (!line) return;
        ctx.beginPath();
        ctx.moveTo(line.points[0].x, line.points[0].y);
        for (let i=1; i<line.points.length; i++) ctx.lineTo(line.points[i].x, line.points[i].y);
        ctx.strokeStyle = line.color;
        ctx.stroke();
    });

    ctx.strokeStyle = "red";
    ctx.beginPath();
    ctx.moveTo(playheadX,0);
    ctx.lineTo(playheadX,canvas.height);
    ctx.stroke();
}

// === Check Collisions & Adjust Pitch ===
function checkPlayheadCollisions() {
    for (const line of lines) {
        let overlapping = false;
        let collisionY = null;

        // Check if playhead intersects a segment
        for (let i=0; i<line.points.length-1; i++) {
            const p1 = line.points[i], p2 = line.points[i+1];
            if ((p1.x <= playheadX && p2.x >= playheadX) || (p2.x <= playheadX && p1.x >= playheadX)) {
                overlapping = true;

                // Linear interpolation to find Y at playheadX
                const t = (playheadX - p1.x) / (p2.x - p1.x);
                collisionY = p1.y + t * (p2.y - p1.y);
                break;
            }
        }

        if (line.gainNode) {
            line.gainNode.gain.setTargetAtTime(overlapping ? (line.soundType === "wind" ? 0.3 : 0.1) : 0, audioCtx.currentTime, 0.05);
        }

        // Adjust pitch based on collisionY
        if (overlapping && collisionY !== null && line.source) {
            const minPitch = 0.5;
            const maxPitch = 2;
            const pitch = minPitch + (canvas.height - collisionY) / canvas.height * (maxPitch - minPitch);
            line.source.playbackRate.setTargetAtTime(pitch, audioCtx.currentTime, 0.05);
        }
    }
}

// === Animation ===
let animFrame;
function animate() {
    playheadX += playheadSpeed;
    if (playheadX > canvas.width) playheadX = 0;
    drawScene();
    checkPlayheadCollisions();
    animFrame = requestAnimationFrame(animate);
}
function stopAnimation() { cancelAnimationFrame(animFrame); }

// === User Interaction ===
async function startUserInteraction() {
    userStarted = true;
    if (audioCtx.state === "suspended") await audioCtx.resume();
    await loadSoundFiles();
    navigator.geolocation.getCurrentPosition(async pos => {
        await fetchWeather(pos.coords.latitude, pos.coords.longitude);
    });
}

// === Buttons ===
const playBtn = document.getElementById('playBtn');
playBtn.addEventListener('click', async () => {
    if (!userStarted) await startUserInteraction();
    if (animating) { stopAnimation(); animating=false; playBtn.classList.replace("playing","paused"); }
    else { animate(); animating=true; playBtn.classList.replace("paused","playing"); }
});

const clearBtn = document.getElementById('clearBtn');
clearBtn.addEventListener('click', () => {
    lines.forEach(line => { line.source?.stop(); line.gainNode?.disconnect(); });
    lines = [];
    currentLine = null;
    drawScene();
});

const soundBtn1 = document.getElementById("soundBtn1");
const soundBtn2 = document.getElementById("soundBtn2");

soundBtn1.addEventListener("click", () => { selectedSoundType="weather"; selectedColor="#00ffcc"; });
soundBtn2.addEventListener("click", () => { selectedSoundType="wind"; selectedColor="#ffcc00"; });

// === Initial Draw ===
drawScene();