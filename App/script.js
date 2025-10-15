const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let lines = [];
const pointsPerLine = 20;
const lineAmplitudeBase = 30;

// Example dataset: just label + value
const dataItems = [
    { label: "Temperature", value: 25 },
    { label: "Humidity", value: 0.8 },
    { label: "Wind", value: 12 },
    { label: "Pressure", value: 1010 },
    { label: "Cloudiness", value: 0.3 }
];

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Create lines fully on screen, with data
dataItems.forEach((data) => {
    let points = [];
    const maxLineWidth = (pointsPerLine - 1) * 15;
    const startX = Math.random() * (canvas.width - maxLineWidth);
    const startY = Math.random() * canvas.height;
    for (let j = 0; j < pointsPerLine; j++) {
        points.push({
            x0: startX + j*15,
            y0: startY,
            offsetX: 0,
            offsetY: 0
        });
    }

    // Map value to visual properties
    const colorHue = (data.value * 10) % 360; // example: map value to hue
    const amplitude = lineAmplitudeBase + (data.value % 50); // arbitrary mapping
    const lineWidth = 1 + (data.value % 5); // small variation

    lines.push({
        points,
        data,
        color: `hsl(${colorHue}, 80%, 60%)`,
        amplitude,
        lineWidth
    });
});

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

// Draw curved lines with glow
function drawLines() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    lines.forEach(line => {
        ctx.beginPath();
        const pts = line.points;
        ctx.moveTo(pts[0].x0 + pts[0].offsetX, pts[0].y0 + pts[0].offsetY);
        for (let i = 0; i < pts.length - 1; i++) {
            const p1 = pts[i];
            const p2 = pts[i+1];
            const midX = (p1.x0 + p2.x0)/2 + (p1.offsetX + p2.offsetX)/2;
            const midY = (p1.y0 + p2.y0)/2 + (p1.offsetY + p2.offsetY)/2;
            ctx.quadraticCurveTo(
                p1.x0 + p1.offsetX,
                p1.y0 + p1.offsetY,
                midX,
                midY
            );
        }
        ctx.strokeStyle = line.color;
        ctx.lineWidth = line.lineWidth;
        ctx.shadowColor = line.color;
        ctx.shadowBlur = 10;
        ctx.stroke();
    });
}

// Update offsets based on device tilt
let tiltX = 0, tiltY = 0;
window.addEventListener('deviceorientation', e => {
    tiltX = (e.gamma || 0) / 50;
    tiltY = (e.beta || 0) / 50;
});

// Animation loop
function animate() {
    const easing = 0.05;

    lines.forEach(line => {
        line.points.forEach((point, i) => {
            const targetX = Math.sin(Date.now()/500 + i) * line.amplitude * tiltX;
            const targetY = Math.cos(Date.now()/500 + i) * line.amplitude * tiltY;

            point.offsetX += (targetX - point.offsetX) * easing;
            point.offsetY += (targetY - point.offsetY) * easing;

            // Sound: frequency from value only
            const speed = Math.sqrt(tiltX*tiltX + tiltY*tiltY);
            if (speed > 0.1 && i === 0) {
                const freq = 200 + (line.data.value * 10) + tiltX*50;
                playSound(freq, 0.05);
            }
        });
    });

    drawLines();
    requestAnimationFrame(animate);
}
animate();