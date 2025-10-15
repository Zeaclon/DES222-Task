const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let lines = [];
const numLines = 5;
const pointsPerLine = 5;

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Create lines with multiple points
for (let i = 0; i < numLines; i++) {
    let points = [];
    for (let j = 0; j < pointsPerLine; j++) {
        points.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            dx: 0,
            dy: 0
        });
    }
    lines.push({
        points,
        color: `hsl(${Math.random()*360}, 80%, 60%)`
    });
}

// Web Audio setup
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playSound(frequency, duration = 0.2) {
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
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
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 0; i < pts.length - 1; i++) {
            const midX = (pts[i].x + pts[i+1].x)/2;
            const midY = (pts[i].y + pts[i+1].y)/2;
            ctx.quadraticCurveTo(pts[i].x, pts[i].y, midX, midY);
        }
        ctx.strokeStyle = line.color;
        ctx.lineWidth = 2;
        ctx.shadowColor = line.color;
        ctx.shadowBlur = 10;
        ctx.stroke();
    });
}

// Update lines with smooth easing
function updateLines() {
    lines.forEach(line => {
        line.points.forEach(point => {
            point.x += (point.dx - point.x) * 0.05;
            point.y += (point.dy - point.y) * 0.05;

            // Keep inside canvas
            point.x = Math.max(0, Math.min(canvas.width, point.x));
            point.y = Math.max(0, Math.min(canvas.height, point.y));

            // Map speed to sound
            const speed = Math.sqrt(point.dx**2 + point.dy**2);
            if (speed > 0.5) {
                const freq = 200 + speed * 50;
                playSound(freq, 0.05);
            }
        });
    });
}

// Touch input
canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    const touch = e.touches[0];
    lines.forEach(line => {
        line.points.forEach(point => {
            point.dx = touch.clientX;
            point.dy = touch.clientY;
        });
    });
}, { passive: false });

// Device tilt
window.addEventListener('deviceorientation', e => {
    const gamma = e.gamma || 0;
    const beta = e.beta || 0;
    lines.forEach(line => {
        line.points.forEach(point => {
            point.dx = canvas.width/2 + gamma*10;
            point.dy = canvas.height/2 + beta*10;
        });
    });
});

// Animation loop
function animate() {
    updateLines();
    drawLines();
    requestAnimationFrame(animate);
}
animate();