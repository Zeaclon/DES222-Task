const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let lines = [];
const numLines = 5;
const pointsPerLine = 20; // longer line
const lineAmplitude = 50; // max distortion from tilt

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Create lines with multiple points
for (let i = 0; i < numLines; i++) {
    let points = [];
    const startX = Math.random() * canvas.width;
    const startY = Math.random() * canvas.height;
    for (let j = 0; j < pointsPerLine; j++) {
        points.push({
            x0: startX + j*15, // base position
            y0: startY,
            offsetX: 0,         // distortion applied by tilt
            offsetY: 0
        });
    }
    lines.push({
        points,
        color: `hsl(${Math.random()*360}, 80%, 60%)`
    });
}

// Web Audio setup
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playSound(frequency, duration = 0.1) {
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
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
        ctx.lineWidth = 2;
        ctx.shadowColor = line.color;
        ctx.shadowBlur = 10;
        ctx.stroke();
    });
}

// Update offsets based on device tilt
let tiltX = 0, tiltY = 0;
window.addEventListener('deviceorientation', e => {
    tiltX = (e.gamma || 0) / 50; // left-right tilt
    tiltY = (e.beta || 0) / 50;  // front-back tilt
});

// Animation loop
function animate() {
    lines.forEach(line => {
        line.points.forEach((point, i) => {
            // Sinusoidal distortion along the line + tilt influence
            point.offsetX = Math.sin(Date.now()/500 + i) * lineAmplitude * tiltX;
            point.offsetY = Math.cos(Date.now()/500 + i) * lineAmplitude * tiltY;

            // Optional: play sound based on tilt magnitude
            const speed = Math.sqrt(tiltX*tiltX + tiltY*tiltY);
            if (speed > 0.1 && i === 0) { // only once per line
                const freq = 200 + speed * 800;
                playSound(freq, 0.05);
            }
        });
    });

    drawLines();
    requestAnimationFrame(animate);
}
animate();