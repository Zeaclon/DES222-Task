const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let lines = [];
let currentLine = null;

// Playhead
let playheadX = 0;
let playheadSpeed = 1;
let animating = false;

// Weather + audio
let temperature = 25;
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// Track if user started
let userStarted = false;

// === RESIZE CANVAS ===
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// === BACKGROUND ===
function getSkyGradient() {
    const hour = new Date().getHours();
    let top, bottom;

    if (hour >= 5 && hour < 8) { top="#ff9966"; bottom="#ff5e62"; }
    else if (hour >= 8 && hour < 17) { top="#87ceeb"; bottom="#ffffff"; }
    else if (hour >= 17 && hour < 20) { top="#ff7e5f"; bottom="#feb47b"; }
    else { top="#001F3F"; bottom="#011B2E"; }

    const gradient = ctx.createLinearGradient(0,0,0,canvas.height);
    gradient.addColorStop(0, top);
    gradient.addColorStop(1, bottom);
    return gradient;
}

// === WEATHER FETCH ===
async function fetchWeather(lat, lon){
    try {
        const res = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
        const data = await res.json();
        if (data?.main?.temp) temperature = data.main.temp;
        playheadSpeed = Math.max(0.2, temperature / 10);
    } catch(err){
        console.warn("Weather fetch failed", err);
    }
}

// === LINE DRAWING ===
function startLine(x, y){ currentLine = [{x,y}]; }
function extendLine(x, y){ if(currentLine){ currentLine.push({x,y}); drawScene(); } }
function endLine(){ if(currentLine && currentLine.length>1) lines.push(currentLine); currentLine=null; }

// === MOUSE EVENTS ===
canvas.addEventListener("mousedown", e=> { if(!userStarted) startUserInteraction(); startLine(e.clientX, e.clientY); });
canvas.addEventListener("mousemove", e=> extendLine(e.clientX, e.clientY));
canvas.addEventListener("mouseup", endLine);

// === TOUCH EVENTS ===
canvas.addEventListener("touchstart", e=> { e.preventDefault(); if(!userStarted) startUserInteraction(); const touch = e.touches[0]; startLine(touch.clientX, touch.clientY); });
canvas.addEventListener("touchmove", e=> { e.preventDefault(); const touch = e.touches[0]; extendLine(touch.clientX, touch.clientY); });
canvas.addEventListener("touchend", e=> { e.preventDefault(); endLine(); });

// === DRAW SCENE ===
function drawScene(){
    ctx.fillStyle = getSkyGradient();
    ctx.fillRect(0,0,canvas.width,canvas.height);

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 3;

    // Draw all lines
    lines.forEach(line=>{
        ctx.beginPath();
        ctx.moveTo(line[0].x,line[0].y);
        for(let i=1;i<line.length;i++) ctx.lineTo(line[i].x,line[i].y);
        ctx.strokeStyle="rgba(255,255,255,0.8)";
        ctx.stroke();
    });

    // Draw current line
    if(currentLine){
        ctx.beginPath();
        ctx.moveTo(currentLine[0].x,currentLine[0].y);
        for(let i=1;i<currentLine.length;i++) ctx.lineTo(currentLine[i].x,currentLine[i].y);
        ctx.strokeStyle="rgba(255,255,255,0.5)";
        ctx.stroke();
    }

    // Draw playhead
    ctx.strokeStyle = "red";
    ctx.beginPath();
    ctx.moveTo(playheadX,0);
    ctx.lineTo(playheadX,canvas.height);
    ctx.stroke();
}

// === AUDIO ===
function playPitch(y,slope){
    const freq = 200 + ((canvas.height-y)/canvas.height)*1000;
    const mod = slope*300;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type="sine";
    osc.frequency.setValueAtTime(freq+mod,audioCtx.currentTime);
    gain.gain.setValueAtTime(0.1,audioCtx.currentTime);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime+0.1);
}

// === PLAYHEAD COLLISIONS ===
function checkPlayheadCollisions(){
    for(const line of lines){
        for(let i=0;i<line.length-1;i++){
            const p1 = line[i], p2=line[i+1];
            if((p1.x<=playheadX && p2.x>=playheadX) || (p2.x<=playheadX && p1.x>=playheadX)){
                const t = (playheadX-p1.x)/(p2.x-p1.x);
                const y = p1.y + t*(p2.y-p1.y);
                const slope = (p2.y-p1.y)/(p2.x-p1.x);
                playPitch(y,slope);
                break;
            }
        }
    }
}

// === ANIMATE ===
let animFrame;
function animate(){
    playheadX += playheadSpeed;
    if(playheadX>canvas.width) playheadX=0;
    drawScene();
    checkPlayheadCollisions();
    animFrame = requestAnimationFrame(animate);
}

function stopAnimation(){
    cancelAnimationFrame(animFrame);
}

// === START USER INTERACTION ===
async function startUserInteraction(){
    userStarted=true;
    if(audioCtx.state==="suspended") await audioCtx.resume();
    navigator.geolocation.getCurrentPosition(async pos=>{
        await fetchWeather(pos.coords.latitude,pos.coords.longitude);
    });
}

// === PLAY BUTTON ===
const playBtn = document.getElementById('playBtn');
playBtn.addEventListener('click', async ()=>{
    if(!userStarted) await startUserInteraction();

    if(animating){
        stopAnimation();
        animating=false;
        playBtn.classList.remove("playing");
        playBtn.classList.add("paused");
    } else {
        animate();
        animating=true;
        playBtn.classList.remove("paused");
        playBtn.classList.add("playing");
    }
});

const clearBtn = document.getElementById('clearBtn');
clearBtn.addEventListener('click', () => {
    lines = [];       // Clear all drawn lines
    currentLine = null;
    drawScene();      // Re-render the canvas
});

// === INITIAL RENDER ===
drawScene();