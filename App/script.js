const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let lines = [];
let numLines = 5;

// Resize canvas to fit window
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Create initial lines
for (let i = 0; i < numLines; i++) {
    lines.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        dx: 0,
        dy: 0,
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

// Draw lines
function drawLines() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    lines.forEach(line => {
        ctx.beginPath();
        ctx.moveTo(line.x, line.y);
        ctx.lineTo(line.x + line.dx*50, line.y + line.dy*50);
        ctx.strokeStyle = line.color;
        ctx.lineWidth = 5;
        ctx.stroke();
    });
}

// Update lines based on gestures
function updateLines() {
    lines.forEach(line => {
        line.x += line.dx * 5;
        line.y += line.dy * 5;

        // Keep lines inside canvas
        if (line.x < 0) line.x = 0;
        if (line.x > canvas.width) line.x = canvas.width;
        if (line.y < 0) line.y = 0;
        if (line.y > canvas.height) line.y = canvas.height;

        // Map movement to sound
        const speed = Math.sqrt(line.dx**2 + line.dy**2);
        if (speed > 0.01) {
            const freq = 200 + speed * 800;
            playSound(freq, 0.1);
        }
    });
}

// Touch input
canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    const touch = e.touches[0];
    lines.forEach(line => {
        line.dx = (touch.clientX - line.x) / 100;
        line.dy = (touch.clientY - line.y) / 100;
    });
}, { passive: false });

// Device tilt
window.addEventListener('deviceorientation', e => {
    const gamma = e.gamma || 0; // left-right tilt
    const beta = e.beta || 0;   // front-back tilt

    lines.forEach(line => {
        line.dx = gamma / 50;
        line.dy = beta / 50;
    });
});

// Animation loop
function animate() {
    updateLines();
    drawLines();
    requestAnimationFrame(animate);
}
animate();