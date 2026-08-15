PokiSDK.init().then(() => {
    console.log("Poki SDK Berhasil Dimuat");
    PokiSDK.gameLoadingFinished();
}).catch(() => {
    console.log("Poki SDK Gagal Dimuat");
    PokiSDK.gameLoadingFinished();
});

// =============================
// ========================================================
// BAGIAN 1 DARI 20: ELEMEN UI KANVAS & VARIABEL DOM UTAMA
// ========================================================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Element UI Utama & HUD Game
const loadingScreen = document.getElementById('loadingScreen');
const menu = document.getElementById('menu');
const hud = document.getElementById('hud');
const gameOverScreen = document.getElementById('gameOver');
const playBtn = document.getElementById('playBtn');
const restartBtn = document.getElementById('restartBtn');
const reviveBtn = document.getElementById('reviveBtn'); // Tombol baru untuk Revive
const scoreEl = document.getElementById('score');
const finalScoreEl = document.getElementById('finalScore');
const leadersEl = document.getElementById('leaders');
const boostEl = document.getElementById('boost');
const levelEl = document.getElementById('level');

// Elemen Jendela Pop-up Skins & Settings
const skinBtn = document.getElementById('skinBtn');
const settingBtn = document.getElementById('settingBtn');
const skinModal = document.getElementById('skinModal');
const settingModal = document.getElementById('settingModal');
const closeSkinBtn = document.getElementById('closeSkinBtn');
const closeSettingBtn = document.getElementById('closeSettingBtn');
// ========================================================
// BAGIAN 2 DARI 20: KONFIGURASI GLOBAL & KONSTRUKSI PARTIKEL
// ========================================================
// Ukuran Arena Dunia
const MAP_WIDTH = 3000;
const MAP_HEIGHT = 3000;

// Sistem Efek Suara Lokal
const eatSound = new Audio('makan.mp3');
eatSound.volume = 0.8;

const musikLatar = document.getElementById("bgMusic");
window.addEventListener("click", () => { 
    if(musikLatar && musikLatar.paused && systemPause === false) { 
        musikLatar.volume = 0.4; 
        musikLatar.play(); 
    } 
}, { once: true });

// Kelas Efek Ledakan Partikel Neon
let particles = [];
class NeonParticle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 4 + 2;
        this.speedX = (Math.random() * 2 - 1) * (Math.random() * 4 + 2);
        this.speedY = (Math.random() * 2 - 1) * (Math.random() * 4 + 2);
        this.color = color;
        this.alpha = 1;
        this.decay = Math.random() * 0.02 + 0.015;
    }
    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.alpha -= this.decay;
    }
    draw() {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}
// ========================================================
// BAGIAN 3 DARI 20: INTEGRASI POKI SDK & VARIABEL KONTROL AUDIO
// ========================================================
let systemPause = false; // Flag wajib untuk menghentikan game saat iklan Poki aktif
let canRevive = true;     // Menentukan apakah pemain bisa menggunakan fitur revive (1x per sesi)

// Fungsi mematikan audio game saat iklan komersial
function mutingAudioPoki() {
    if (musikLatar) musikLatar.volume = 0;
    eatSound.volume = 0;
}

// Fungsi menghidupkan kembali audio game setelah iklan selesai
function unmutingAudioPoki() {
    if (musikLatar) musikLatar.volume = 0.4;
    eatSound.volume = 0.8;
}

// Fungsi memicu ledakan partikel di koordinat tertentu
function createExplosion(x, y, color, count = 15) {
    for (let i = 0; i < count; i++) {
        particles.push(new NeonParticle(x, y, color));
    }
}
// ========================================================
// BAGIAN 4 DARI 20: VARIABEL INTI GAME & PENYIMPANAN DATA
// ========================================================
let gameActive = false;
let score = 0;
let playerColorInner = '#00ffff'; 
let playerColorOuter = '#0033aa'; 
let magnetActive = true;       
let magnetRadius = 150;        
let magnetSpeed = 8;           
let highscore = localStorage.getItem('neonWormHighscore') || 0;
let currentLevel = 1;

// Variabel Penyaluran Waktu (Skor Berkala & Progresi)
let survivalTimer = 0;
let lastTime = 0;

let mouse = { x: 0, y: 0 };
let worm = [];
let foods = [];
let wormLength = 40; 
const wormRadius = 12;

let boostButton = {
    x: 0, 
    y: 0,
    radius: 35,
    active: false,
    pointerId: null
};

let magnetTimer = 0;
let shakeIntensity = 0;
// ========================================================
// BAGIAN 5 DARI 20: VARIABEL BOT, KAMERA, DAN RESPONSIVE CANVAS
// ========================================================
let bots = [];
const TOTAL_BOTS = 15; 
let playerGlow = true;
let camera = { x: 0, y: 0 };
let isBoosting = false;
let boostEnergy = 100;

// Variabel kontrol virtual untuk layar sentuh HP
let joystick = {
    x: 100,
    y: 0, 
    radius: 50,
    stickX: 100,
    stickY: 0,
    stickRadius: 20,
    active: false,
    pointerId: null
};

// Event Window Load & Pengaturan Ukuran Kanvas
window.onload = () => {
    if (loadingScreen) loadingScreen.style.display = 'none';
    resizeCanvas();
    const menuHighscoreEl = document.getElementById('menuHighscore');
    if (menuHighscoreEl) menuHighscoreEl.innerText = highscore;
};

window.addEventListener('resize', resizeCanvas);
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Penyesuaian tata letak kontrol ponsel agar adaptif dan stabil
    joystick.y = canvas.height - 120;
    if (!joystick.active) {
        joystick.stickX = joystick.x;
        joystick.stickY = joystick.y;
    }
    boostButton.x = canvas.width - 70;
    boostButton.y = canvas.height - 210; 
}
// ========================================================
// BAGIAN 6 DARI 20: EVENT LISTENER INPUT DEVICE MOUSE & SENTUHAN
// ========================================================
window.addEventListener('mousemove', (e) => {
    if (systemPause) return; 
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});

window.addEventListener('mousedown', () => { 
    if (gameActive && boostEnergy > 5 && !systemPause) isBoosting = true; 
});
window.addEventListener('mouseup', () => { isBoosting = false; });

// LOGIKA INPUT SENTUHAN JARI (HP)
window.addEventListener('touchstart', function(e) {
    if (!gameActive || systemPause) return; 
    
    for (let i = 0; i < e.changedTouches.length; i++) {
        let touch = e.changedTouches[i];
        let rect = canvas.getBoundingClientRect();
        let touchX = touch.clientX - rect.left;
        let touchY = touch.clientY - rect.top;

        if (getTouchDist(touchX, touchY, joystick.x, joystick.y) < joystick.radius + 20) {
            joystick.active = true;
            joystick.pointerId = touch.identifier;
            handleJoystickMove(touchX, touchY);
        }

        if (getTouchDist(touchX, touchY, boostButton.x, boostButton.y) < boostButton.radius) {
            boostButton.active = true;
            boostButton.pointerId = touch.identifier;
            if (boostEnergy > 10) {
                isBoosting = true; 
            }
        }
    }
}, { passive: false });
// ========================================================
// BAGIAN 7 DARI 20: TOUCHMOVE, TOUCHEND & KONTROL ITERASI JOYSTICK
// ========================================================
window.addEventListener('touchmove', function(e) {
    if (systemPause) return; 
    e.preventDefault(); 
    
    for (let i = 0; i < e.touches.length; i++) {
        let touch = e.touches[i];
        let rect = canvas.getBoundingClientRect();
        let touchX = touch.clientX - rect.left;
        let touchY = touch.clientY - rect.top;

        if (joystick.active && touch.identifier === joystick.pointerId) {
            handleJoystickMove(touchX, touchY);
        }
    }
}, { passive: false });

function handleJoystickMove(touchX, touchY) {
    let dx = touchX - joystick.x;
    let dy = touchY - joystick.y;
    let dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > joystick.radius) {
        dx = (dx / dist) * joystick.radius;
        dy = (dy / dist) * joystick.radius;
    }

    joystick.stickX = joystick.x + dx;
    joystick.stickY = joystick.y + dy;

    let centerX = window.innerWidth / 2;
    let centerY = window.innerHeight / 2;
    
    mouse.x = centerX + (dx / joystick.radius) * 300;
    mouse.y = centerY + (dy / joystick.radius) * 300;
}

window.addEventListener('touchend', function(e) {
    for (let i = 0; i < e.changedTouches.length; i++) {
        let touch = e.changedTouches[i];

        if (touch.identifier === joystick.pointerId) {
            joystick.active = false;
            joystick.pointerId = null;
            joystick.stickX = joystick.x;
            joystick.stickY = joystick.y;
        }
        if (touch.identifier === boostButton.pointerId) {
            boostButton.active = false;
            boostButton.pointerId = null;
            isBoosting = false; 
        }
    }
});
// ========================================================
// BAGIAN 8 DARI 20: TOMBOL UTAMA START GAME (STANDAR POKI NO-ADS)
// ========================================================
function startGame() {
    // Kepatuhan Aturan Poki: Sesi pertama menekan tombol Play wajib langsung masuk game tanpa iklan komersial
    canRevive = true; // Reset status revive untuk sesi baru
    eksekusiStartGame();
}

function eksekusiStartGame() {
    if (menu) menu.style.display = 'none';
    if (gameOverScreen) gameOverScreen.style.display = 'none';
    if (hud) hud.style.display = 'flex';
    
    score = 0;
    currentLevel = 1;
    survivalTimer = 0;
    lastTime = performance.now();
    
    if (scoreEl) scoreEl.innerText = score;
    if (levelEl) levelEl.innerText = currentLevel;
    
    wormLength = 40; 
    boostEnergy = 100;
    if (boostEl) boostEl.innerText = "100%";
    isBoosting = false;
    
    let startX = MAP_WIDTH / 2;
    let startY = MAP_HEIGHT / 2;
    
    worm = [];
    for (let i = 0; i < wormLength; i++) { worm.push({ x: startX, y: startY }); }
    foods = [];
    for (let i = 0; i < 300; i++) spawnFood(); 
    bots = [];
    for (let i = 0; i < TOTAL_BOTS; i++) { spawnBot(i); }
    
    particles = []; // Bersihkan sisa partikel ledakan sesi sebelumnya
    
    updateLeaderboard();
    if (typeof PokiSDK !== 'undefined') {
        PokiSDK.gameplayStart(); 
    }
    gameActive = true;
    animate();
}
// ========================================================
// BAGIAN 9 DARI 20: PEMBUATAN MAKANAN & GENERATOR VARIASI MUSUH
// ========================================================
function spawnFood() {
    const foodTypes = ['donut', 'cherry', 'cookie', 'neon_dot'];
    let randomType = foodTypes[Math.floor(Math.random() * foodTypes.length)];
    
    foods.push({
        x: Math.random() * MAP_WIDTH,
        y: Math.random() * MAP_HEIGHT,
        radius: randomType === 'donut' ? 10 : (randomType === 'cherry' ? 8 : 7),
        type: randomType,
        color: `hsl(${Math.random() * 360}, 100%, 60%)`
    });
}

function spawnBot(index) {
    const botNames = ['Ujang_Gaming', 'Siti_Neon', 'Cacing_Balap', 'Raja_Sawah', 'Kang_Bakso', 'Indo_Jawara', 'Garuda_Worm', 'Nusantara_Pro', 'Laga_Master', 'Bukan_Bot', 'Cacing_Ngepot', 'Cacing_GlowUp', 'Naga_Imut', 'Cacing_Sakti'];
    // Pembagian tipe kepribadian AI Bot: Aggressive, Chaser, Passive
    const botTypes = ['Aggressive', 'Chaser', 'Passive'];
    
    let randomName = botNames[Math.floor(Math.random() * botNames.length)];
    let uniqueName = `${randomName}_${Math.floor(Math.random() * 90 + 10)}`;
    let randomType = botTypes[Math.floor(Math.random() * botTypes.length)];
    
    let bX = Math.random() * (MAP_WIDTH - 200) + 100;
    let bY = Math.random() * (MAP_HEIGHT - 200) + 100;
    let bLength = Math.floor(Math.random() * 20) + 25;
    let botWorm = [];
    for (let k = 0; k < bLength; k++) { botWorm.push({ x: bX, y: bY }); }
    
    bots[index] = {
        name: uniqueName,
        type: randomType,
        worm: botWorm,
        wormLength: bLength,
        score: (bLength - 25) * 5,
        angle: Math.random() * Math.PI * 2,
        color: `hsl(${Math.random() * 360}, 100%, 50%)`,
        changeDirTimer: 0
    };
}
// ========================================================
// BAGIAN 10 DARI 20: FUNGSI PEMBANTU & DISTRIBUSI KEMATIAN
// ========================================================
function dropFoodFromDeadWorm(wormSegments, color) {
    wormSegments.forEach((part, index) => {
        if (index % 4 === 0) { 
            // Pemicu partikel ledakan kecil neon di setiap segmen tubuh yang hancur
            createExplosion(part.x, part.y, color, 3);
            
            foods.push({
                x: part.x + (Math.random() * 10 - 5),
                y: part.y + (Math.random() * 10 - 5),
                radius: 7,
                type: 'neon_dot',
                color: color
            });
        }
    });
}

function updateLeaderboard() {
    const nameEl = document.getElementById('playerName');
    const name = (nameEl && nameEl.value) ? nameEl.value : 'Player';
    let list = [{ name: name, score: score }];
    bots.forEach(b => list.push({ name: b.name, score: b.score }));
    list.sort((a, b) => b.score - a.score);
    if (leadersEl) {
        leadersEl.innerHTML = '';
        for (let i = 0; i < Math.min(4, list.length); i++) {
            leadersEl.innerHTML += `<li><strong>${list[i].name}</strong> - ${list[i].score}</li>`;
        }
    }
}

function getDist(x1, y1, x2, y2) { return Math.hypot(x1 - x2, y1 - y2); }

function checkLevelAndHighscore() {
    // Sistem Pencapaian Level Dinamis: Batas kenaikan level semakin bertambah sulit
    let targetScoreForNextLevel = currentLevel * 150;
    if (score >= targetScoreForNextLevel) {
        currentLevel++;
        if (levelEl) levelEl.innerText = currentLevel;
        // Efek ledakan selebrasi naik level di tengah layar kamera player
        createExplosion(worm[0].x, worm[0].y, '#00ffff', 40);
    }
    if (score > highscore) {
        highscore = score;
        localStorage.setItem('neonWormHighscore', highscore);
    }
}
// ========================================================
// BAGIAN 11 DARI 20: LOOP ANIMATE & LOGIKA SKOR BERBASIS WAKTU
// ========================================================
function animate() {
    if (!gameActive) return;
    if (typeof systemPause !== 'undefined' && systemPause) {
        requestAnimationFrame(animate);
        return;
    }
    
    // Perhitungan Waktu Nyata untuk Skor Berkala Berdasarkan Waktu
    let currentTime = performance.now();
    let deltaTime = (currentTime - lastTime) / 1000;
    lastTime = currentTime;
    
    survivalTimer += deltaTime;
    if (survivalTimer >= 2.0) { // Setiap 2 detik bertahan hidup
        score += 5; // Dapatkan bonus skor tambahan
        survivalTimer = 0;
        if (scoreEl) scoreEl.innerText = score;
        checkLevelAndHighscore();
    }
    
    ctx.clearRect(0, 0, canvas.width, canvas.height); 
    
    let head = { x: worm[0].x, y: worm[0].y };
    let centerX = canvas.width / 2;
    let centerY = canvas.height / 2;
    let angle = Math.atan2(mouse.y - centerY, mouse.x - centerX);
    
    let speed = isBoosting && boostEnergy > 0 ? 8 : 5.5;
    if (isBoosting && boostEnergy > 0) {
        boostEnergy -= 0.3;
        if (boostEnergy <= 0) { boostEnergy = 0; isBoosting = false; }
    } else if (!isBoosting && boostEnergy < 100) { boostEnergy += 0.1; }
    if (boostEl) boostEl.innerText = Math.floor(boostEnergy) + "%";
    
    head.x += Math.cos(angle) * speed;
    head.y += Math.sin(angle) * speed;
    
    if (head.x < 0 || head.x > MAP_WIDTH || head.y < 0 || head.y > MAP_HEIGHT) { pemicuLayarKalah(); return; }
    worm.unshift(head);
    if (worm.length > wormLength) { worm.pop(); }
    
    foods.forEach(food => {
        let d = Math.hypot(head.x - food.x, head.y - food.y);
        if (magnetActive && d < magnetRadius) {
            let anglePlayer = Math.atan2(head.y - food.y, head.x - food.x);
            food.x += Math.cos(anglePlayer) * magnetSpeed;
            food.y += Math.sin(anglePlayer) * magnetSpeed;
        }
    });
// ========================================================
// BAGIAN 12 DARI 20: TINGKAH LAKU AI BOT BERDASARKAN VARIASI TIPE
// ========================================================
    for (let bIndex = bots.length - 1; bIndex >= 0; bIndex--) {
        let bot = bots[bIndex];
        let bHead = { x: bot.worm[0].x, y: bot.worm[0].y };
        
        let targetAngle = bot.angle;
        let closestFood = null;
        let minDist = bot.type === 'Chaser' ? 600 : 450; // Tipe Chaser memiliki jarak pandang radar makanan lebih jauh
        let botSpeed = 5.0; 

        foods.forEach(food => {
            let d = Math.hypot(bHead.x - food.x, bHead.y - food.y);
            if (d < minDist) { minDist = d; closestFood = food; }

            if (magnetActive && d < magnetRadius) {
                let angle = Math.atan2(bHead.y - food.y, bHead.x - food.x);
                food.x += Math.cos(angle) * (magnetSpeed * 0.7); 
                food.y += Math.sin(angle) * (magnetSpeed * 0.7);
            }
        });

        if (closestFood && bot.type !== 'Passive') {
            targetAngle = Math.atan2(closestFood.y - bHead.y, closestFood.x - bHead.x);
            if (minDist < 150 && bot.type === 'Chaser') botSpeed = 8.0; // Chaser mengebut jika dekat makanan
        } else {
            bot.changeDirTimer++;
            if (bot.changeDirTimer > 120 + Math.random() * 60) {
                targetAngle = Math.random() * Math.PI * 2;
                bot.changeDirTimer = 0;
            }
        }

        // Taktik Khusus Tipe Aggressive (Suka Memotong Jalan)
        let huntZone = 250; 
        let dToPlayer = Math.hypot(bHead.x - head.x, bHead.y - head.y);
        if (dToPlayer < huntZone && bot.type === 'Aggressive' && bot.worm.length > worm.length) { 
            targetAngle = Math.atan2(head.y - bHead.y, head.x - bHead.x) + 0.45;
            botSpeed = 8.5; // Mengaktifkan aggro boost penuh
        }

        for (let i = 0; i < bots.length; i++) {
            if (i === bIndex) continue;
            let otherBot = bots[i];
            let dToOtherBot = Math.hypot(bHead.x - otherBot.worm[0].x, bHead.y - otherBot.worm[0].y);
            if (dToOtherBot < huntZone && bot.type === 'Aggressive' && bot.worm.length > otherBot.worm.length) {
                targetAngle = Math.atan2(otherBot.worm[0].y - bHead.y, otherBot.worm[0].x - bHead.x) + 0.45;
                botSpeed = 8.5; 
                break;
            }
        }
// ========================================================
// BAGIAN 13 DARI 20: INTEGRASI LOGIKA SENSOR MENGHINDAR BOT
// ========================================================
        let dangerZone = bot.type === 'Passive' ? 140 : 90; // Tipe Passive mengerem/menghindar lebih awal
        let sensorX = bHead.x + Math.cos(bot.angle) * dangerZone;
        let sensorY = bHead.y + Math.sin(bot.angle) * dangerZone;

        for (let j = 0; j < worm.length; j += 2) {
            let d = Math.hypot(sensorX - worm[j].x, sensorY - worm[j].y);
            if (d < dangerZone) {
                let escapeAngle = Math.atan2(bHead.y - worm[j].y, bHead.x - worm[j].x);
                targetAngle = escapeAngle + (Math.sin(bot.angle - escapeAngle) > 0 ? 0.6 : -0.6);
                botSpeed = 3.5; 
                break;
            }
        }

        for (let i = 0; i < bots.length; i++) {
            if (i === bIndex) continue;
            let otherBot = bots[i];
            for (let j = 0; j < otherBot.worm.length; j += 2) {
                let d = Math.hypot(sensorX - otherBot.worm[j].x, sensorY - otherBot.worm[j].y);
                if (d < dangerZone) {
                    let escapeAngle = Math.atan2(bHead.y - otherBot.worm[j].y, bHead.x - otherBot.worm[j].x);
                    targetAngle = escapeAngle + (Math.sin(bot.angle - escapeAngle) > 0 ? 0.6 : -0.6);
                    botSpeed = 3.5; 
                    break;
                }
            }
        }

        let angleDiff = targetAngle - bot.angle;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        bot.angle += angleDiff * 0.28; 

        bHead.x += Math.cos(bot.angle) * botSpeed;
        bHead.y += Math.sin(bot.angle) * botSpeed;

        if (bHead.x < 100 || bHead.x > MAP_WIDTH - 100 || bHead.y < 100 || bHead.y > MAP_HEIGHT - 100) {
            bot.angle = Math.atan2(MAP_HEIGHT/2 - bHead.y, MAP_WIDTH/2 - bHead.x);
        }

        bot.worm.unshift(bHead);
        if (bot.worm.length > bot.wormLength) bot.worm.pop();
// ========================================================
// BAGIAN 14 DARI 20: DETEKSI KEMATIAN BOT VS SEGMEN TUBUH
// ========================================================
        let botDied = false;
        for (let j = 5; j < worm.length; j++) {
            if (getDist(bHead.x, bHead.y, worm[j].x, worm[j].y) < wormRadius + 6) {
                score += 50; 
                wormLength += 10; 
                if (scoreEl) scoreEl.innerText = score;
                checkLevelAndHighscore(); 
                
                // Memicu efek ledakan partikel besar di lokasi kepala bot yang mati
                createExplosion(bHead.x, bHead.y, bot.color, 25);
                
                dropFoodFromDeadWorm(bot.worm, bot.color); 
                spawnBot(bIndex); 
                updateLeaderboard(); 
                botDied = true; 
                break;
            }
        }
        if (botDied) continue;

        for (let i = 0; i < bots.length; i++) {
            if (i === bIndex) continue;
            let otherBot = bots[i];
            for (let j = 5; j < otherBot.worm.length; j++) {
                if (getDist(bHead.x, bHead.y, otherBot.worm[j].x, otherBot.worm[j].y) < wormRadius + 6) {
                    otherBot.score += 50; 
                    otherBot.wormLength += 10;
                    
                    createExplosion(bHead.x, bHead.y, bot.color, 25);
                    
                    dropFoodFromDeadWorm(bot.worm, bot.color); 
                    spawnBot(bIndex); 
                    updateLeaderboard(); 
                    botDied = true; 
                    break;
                }
            }
            if (botDied) break;
        }
        if (botDied) continue;
    }
// ========================================================
// BAGIAN 15 DARI 20: DETEKSI KEMATIAN PLAYER & TRANSLASI KAMERA
// ========================================================
    for (let i = 0; i < bots.length; i++) {
        let bot = bots[i];
        for (let j = 5; j < bot.worm.length; j++) {
            if (getDist(head.x, head.y, bot.worm[j].x, bot.worm[j].y) < wormRadius + 6) { 
                // Efek ledakan besar neon saat tubuh player menabrak musuh
                createExplosion(head.x, head.y, playerColorInner, 35);
                pemicuLayarKalah(); 
                return; 
            }
        }
    }
    
    camera.x = head.x - canvas.width / 2;
    camera.y = head.y - canvas.height / 2;
    
    ctx.save();
    ctx.translate(-camera.x, -camera.y);
    drawGrid();
    
    // Batas dinding arena dinamis mengikuti level (semakin tinggi level, warna borders semakin menyala)
    ctx.strokeStyle = currentLevel % 2 === 0 ? '#ff0055' : '#00ffcc'; 
    ctx.lineWidth = 8;
    ctx.strokeRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
// ========================================================
// BAGIAN 16 DARI 20: HITBOX DAN KONSUMSI MAKANAN CAMILAN
// ========================================================
    for (let index = foods.length - 1; index >= 0; index--) {
        let food = foods[index];
        let fr = food.radius;

        ctx.save(); ctx.translate(food.x, food.y);

        if (food.type === 'donut') {
            ctx.beginPath(); ctx.arc(0, 0, fr, 0, Math.PI * 2); ctx.fillStyle = '#d35400'; ctx.fill(); 
            ctx.beginPath(); ctx.arc(0, 0, fr * 0.8, 0, Math.PI * 2); ctx.fillStyle = '#ff66cc'; ctx.fill(); 
            ctx.beginPath(); ctx.arc(0, 0, fr * 0.35, 0, Math.PI * 2); ctx.fillStyle = '#0b0b1a'; ctx.fill();
            ctx.fillStyle = '#ffff00'; ctx.fillRect(-fr * 0.4, -fr * 0.4, fr * 0.15, fr * 0.1);
            ctx.fillStyle = '#00ffff'; ctx.fillRect(fr * 0.3, fr * 0.2, fr * 0.1, fr * 0.15);
        } 
        else if (food.type === 'cherry') {
            ctx.strokeStyle = '#2ecc71'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(0, -fr); ctx.quadraticCurveTo(-fr * 0.5, -fr * 0.5, -fr * 0.4, 0); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, -fr); ctx.quadraticCurveTo(fr * 0.5, -fr * 0.5, fr * 0.4, 0); ctx.stroke();
            ctx.fillStyle = '#ff0033';
            ctx.beginPath(); ctx.arc(-fr * 0.4, 0, fr * 0.5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(fr * 0.4, 0, fr * 0.5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.arc(-fr * 0.5, -fr * 0.1, fr * 0.1, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(fr * 0.3, -fr * 0.1, fr * 0.1, 0, Math.PI * 2); ctx.fill();
        } 
        else if (food.type === 'cookie') {
            ctx.beginPath(); ctx.arc(0, 0, fr, 0, Math.PI * 2); ctx.fillStyle = '#f39c12'; ctx.fill(); 
            ctx.fillStyle = '#4a2c0f';
            ctx.beginPath(); ctx.arc(-fr * 0.3, -fr * 0.2, fr * 0.15, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(fr * 0.4, fr * 0.2, fr * 0.15, 0, Math.PI * 2); ctx.fill();
        } 
        else {
            ctx.beginPath(); ctx.arc(0, 0, fr, 0, Math.PI * 2); ctx.fillStyle = food.color; ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(0, 0, fr * 0.6, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.restore(); 

        let dist = Math.hypot(head.x - food.x, head.y - food.y);
        if (dist < wormRadius + fr) {
            // Memicu percikan kecil partikel kilau saat player makan makanan
            createExplosion(food.x, food.y, food.color, 4);
            
            foods.splice(index, 1); eatSound.cloneNode(true).play();
            score += food.type === 'donut' ? 25 : 10; 
            wormLength += food.type === 'donut' ? 6 : 3; 
            if (scoreEl) scoreEl.innerText = score; 
            checkLevelAndHighscore(); updateLeaderboard(); spawnFood(); continue;
        }
        
        for (let b = 0; b < bots.length; b++) {
            let bot = bots[b];
            let bHeadPoint = bot.worm[0];
            if (getDist(bHeadPoint.x, bHeadPoint.y, food.x, food.y) < wormRadius + fr) {
                foods.splice(index, 1); bot.score += food.type === 'donut' ? 25 : 10; bot.wormLength += 2;
                updateLeaderboard(); spawnFood(); break;
            }
        }
    }
// ========================================================
// BAGIAN 17 DARI 20: UPDATING & RENDERING PARTIKEL & BOT
// ========================================================
    // Proses pembaruan dan penggambaran efek ledakan partikel neon
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        if (particles[i].alpha <= 0) {
            particles.splice(i, 1);
        } else {
            particles[i].draw();
        }
    }

    // Menggambar Badan Seluruh Musuh (Bot) Berwajah & Menyatu Montok 3D Neon
    bots.forEach(bot => {
        let baseColor = bot.color; 
        let darkColor = baseColor.replace('50%)', '20%)'); 
        const bSpacing = 2;

        for (let index = bot.worm.length - 1; index >= 0; index--) {
            if (index % bSpacing !== 0 && index !== 0) continue;
            
            let isBotHead = (index === 0);
            let r = isBotHead ? wormRadius + 1 : wormRadius - (index * 0.03);
            if (r < 5) r = 5;

            ctx.save();
            ctx.translate(bot.worm[index].x, bot.worm[index].y);

            let isBotEven = (Math.floor(index / bSpacing) % 2 === 0);
            let botOuter = isBotEven ? darkColor : '#111111';
            let botInner = isBotEven ? baseColor : darkColor;

            let botGradient = ctx.createRadialGradient(-r * 0.15, -r * 0.15, r * 0.1, 0, 0, r);
            botGradient.addColorStop(0, '#ffffff');
            botGradient.addColorStop(0.2, botInner);
            botGradient.addColorStop(0.8, botOuter);
            botGradient.addColorStop(1, '#000000');

            ctx.beginPath(); ctx.arc(0, 0, Math.max(4, r), 0, Math.PI * 2);
            ctx.fillStyle = botGradient; ctx.fill();

            if (isBotHead) {
                ctx.rotate(bot.angle);
                ctx.fillStyle = '#ffffff';
                ctx.beginPath(); ctx.arc(r * 0.35, -r * 0.35, r * 0.35, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(r * 0.35, r * 0.35, r * 0.35, 0, Math.PI * 2); ctx.fill();

                ctx.fillStyle = '#000000';
                ctx.beginPath(); ctx.arc(r * 0.45, -r * 0.35, r * 0.18, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(r * 0.45, r * 0.35, r * 0.18, 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();
        }
    });
// ========================================================
// BAGIAN 18 DARI 20: MENGGAMBAR TUBUH PLAYER & SISTEM MINIMAP
// ========================================================
    const spacing = 2; 
    for (let i = worm.length - 1; i >= 0; i--) {
        if (i % spacing !== 0 && i !== 0) continue; 
        
        let isHead = (i === 0);
        let r = isHead ? wormRadius + 1 : wormRadius - (i * 0.02); 
        if (r < 6) r = 6; 
        
        ctx.save();
        ctx.translate(worm[i].x, worm[i].y);

        let isEven = (Math.floor(i / spacing) % 2 === 0);
        let colorInner = isEven ? playerColorInner : playerColorOuter; 
        let colorOuter = isEven ? playerColorOuter : playerColorInner; 

        let gradient = ctx.createRadialGradient(0, 0, r * 0.1, 0, 0, r);
        gradient.addColorStop(0, '#ffffff');       
        gradient.addColorStop(0.3, colorInner);    
        gradient.addColorStop(0.8, colorOuter);    
        gradient.addColorStop(1, 'rgba(2, 2, 21, 0.6)'); 

        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fillStyle = gradient; ctx.fill();

        if (isHead) {
            let currentCenterX = canvas.width / 2;
            let currentCenterY = canvas.height / 2;
            let faceAngle = Math.atan2(mouse.y - currentCenterY, mouse.x - currentCenterX);
            ctx.rotate(faceAngle);

            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.arc(r * 0.35, -r * 0.35, r * 0.35, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(r * 0.35, r * 0.35, r * 0.35, 0, Math.PI * 2); ctx.fill();

            ctx.fillStyle = '#000000';
            ctx.beginPath(); ctx.arc(r * 0.45, -r * 0.35, r * 0.18, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(r * 0.45, r * 0.35, r * 0.18, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    }
    ctx.restore(); 

    // Menggambar Komponen Minimap Game (Kanan Bawah)
    const miniMapSize = 120; 
    const miniMapX = canvas.width - miniMapSize - 25; 
    const miniMapY = canvas.height - miniMapSize - 25; 
    ctx.fillStyle = 'rgba(20, 20, 45, 0.7)'; ctx.fillRect(miniMapX, miniMapY, miniMapSize, miniMapSize);
    ctx.strokeStyle = '#00ffff'; ctx.lineWidth = 2; ctx.strokeRect(miniMapX, miniMapY, miniMapSize, miniMapSize);
    
    const nameEl = document.getElementById('playerName');
    const pName = (nameEl && nameEl.value) ? nameEl.value : 'Player';
    let rankList = [{ name: pName, isPlayer: true, x: head.x, y: head.y, score: score }];
    bots.forEach(bot => { rankList.push({ name: bot.name, isPlayer: false, botObj: bot, score: bot.score }); });
    rankList.sort((a, b) => b.score - a.score);

    rankList.forEach((char, rankIndex) => {
        let charX = char.isPlayer ? head.x : char.botObj.worm[0].x;
        let charY = char.isPlayer ? head.y : char.botObj.worm[0].y;
        let miniX = miniMapX + (charX / MAP_WIDTH) * miniMapSize;
        let miniY = miniMapY + (charY / MAP_HEIGHT) * miniMapSize;
        
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

        if (rankIndex === 0) { ctx.font = '14px Arial'; ctx.fillText('🥇', miniX, miniY); } 
        else if (rankIndex === 1) { ctx.font = '13px Arial'; ctx.fillText('🥈', miniX, miniY); } 
        else if (rankIndex === 2) { ctx.font = '12px Arial'; ctx.fillText('🥉', miniX, miniY); } 
        else if (rankIndex === 3) { ctx.font = '12px Arial'; ctx.fillText('🎖️', miniX, miniY); } 
        else if (rankIndex === 4) { ctx.font = '12px Arial'; ctx.fillText('🏅', miniX, miniY); } 
        else {
            ctx.beginPath(); ctx.arc(miniX, miniY, 2, 0, Math.PI * 2);
            ctx.fillStyle = char.isPlayer ? '#ff00ff' : '#ffffff'; ctx.fill();
        }
    });
// ========================================================
// BAGIAN 19 DARI 20: PENUTUP LOOP ANIMASI & MANAJEMEN EVENT LAYAR KALAH
// ========================================================
    drawMobileControls();
    requestAnimationFrame(animate);
}

function pemicuLayarKalah() {
    gameActive = false;
    if (typeof PokiSDK !== 'undefined') {
        PokiSDK.gameplayStop();
    }
    
    if (hud) hud.style.display = 'none';
    if (finalScoreEl) finalScoreEl.innerText = `Score : ${score}`;
    if (gameOverScreen) gameOverScreen.style.display = 'flex';
    
    const finalHighscoreEl = document.getElementById('finalHighscore');
    if (finalHighscoreEl) finalHighscoreEl.innerText = highscore;

    // Manajemen Tombol Revive (Hanya muncul jika pemain belum menggunakannya di sesi ini)
    if (reviveBtn) {
        if (canRevive) {
            reviveBtn.style.display = 'inline-block';
        } else {
            reviveBtn.style.display = 'none';
        }
    }
}

// Interaksi Tombol Pop-up Menu Utama
if(skinBtn) skinBtn.addEventListener('click', () => { skinModal.style.display = 'flex'; });
if(settingBtn) settingBtn.addEventListener('click', () => { settingModal.style.display = 'flex'; });
if(closeSkinBtn) closeSkinBtn.addEventListener('click', () => { skinModal.style.display = 'none'; });
if(closeSettingBtn) {
    closeSettingBtn.addEventListener('click', () => {
        settingModal.style.display = 'none';
        playerGlow = (document.getElementById('graphicQuality').value === 'high'); 
    });
}
// ========================================================
// BAGIAN 20 DARI 20: INTEGRASI SKIN OPTION, COMMERCIAL & REWARDED ADS
// ========================================================
function dapatkanWarnaTepi(warnaPusat) {
    const petaWarna = {
        '#00ffff': '#0033aa', 
        '#ff00ff': '#880088', 
        '#00ff00': '#005500', 
        '#ffff00': '#cc6600', 
        '#ff3300': '#660000', 
        '#ff9900': '#ff3300', 
        '#9900ff': '#4400aa', 
        '#ffffff': '#555555'  
    };
    return petaWarna[warnaPusat] || '#111111';
}

document.querySelectorAll('.skin-opt').forEach(optButton => {
    optButton.addEventListener('click', (event) => {
        const warnaDipilih = event.target.getAttribute('data-color');
        playerColorInner = warnaDipilih;
        playerColorOuter = dapatkanWarnaTepi(warnaDipilih);
        skinModal.style.display = 'none';
    });
});

if(playBtn) playBtn.addEventListener('click', startGame);

// Kepatuhan Aturan Poki: Iklan Commercial Break dipasang di tombol RESTART
if(restartBtn) {
    restartBtn.addEventListener('click', () => {
        if (typeof PokiSDK !== 'undefined') {
            systemPause = true;
            mutingAudioPoki();

            PokiSDK.commercialBreak(() => {
                mutingAudioPoki();
            }).then(() => {
                systemPause = false;
                unmutingAudioPoki();
                eksekusiStartGame();
            });
        } else {
            eksekusiStartGame();
        }
    });
}

// LOGIKA TOMBOL REVIVE (FITUR UTAMA REWARDED BREAK POKI)
if(reviveBtn) {
    reviveBtn.addEventListener('click', () => {
        if (typeof PokiSDK !== 'undefined') {
            systemPause = true;
            mutingAudioPoki();

            PokiSDK.rewardedBreak().then((withReward) => {
                systemPause = false;
                unmutingAudioPoki();

                if (withReward) {
                    // Berhasil menonton iklan: Hidup kembali dengan skor yang dipertahankan
                    canRevive = false; // Matikan fitur agar hanya bisa 1x per game
                    if (gameOverScreen) gameOverScreen.style.display = 'none';
                    if (hud) hud.style.display = 'flex';
                    
                    // Reset posisi cacing ke tengah map tanpa merusak data skor & panjang
                    let startX = MAP_WIDTH / 2;
                    let startY = MAP_HEIGHT / 2;
                    worm = [];
                    for (let i = 0; i < wormLength; i++) { worm.push({ x: startX, y: startY }); }
                    
                    lastTime = performance.now();
                    PokiSDK.gameplayStart();
                    gameActive = true;
                    animate();
                } else {
                    alert("Gagal memuat video hadiah, Anda harus menonton iklan sampai selesai.");
                }
            });
        } else {
            // Cadangan offline / lokal dev
            canRevive = false;
            if (gameOverScreen) gameOverScreen.style.display = 'none';
            if (hud) hud.style.display = 'flex';
            let startX = MAP_WIDTH / 2;
            let startY = MAP_HEIGHT / 2;
            worm = [];
            for (let i = 0; i < wormLength; i++) { worm.push({ x: startX, y: startY }); }
            lastTime = performance.now();
            gameActive = true;
            animate();
        }
    });
}

function drawGrid() {
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.15)'; 
    ctx.lineWidth = 1;
    let gridSize = 50; 
    
    for (let x = 0; x < MAP_WIDTH; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, MAP_HEIGHT); ctx.stroke();
    }
    for (let y = 0; y < MAP_HEIGHT; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(MAP_WIDTH, y); ctx.stroke();
    }
    ctx.restore();
}

function drawMobileControls() {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0); 

    // --- GAMBAR JOYSTICK NEON CYAN ---
    ctx.beginPath();
    ctx.arc(joystick.x, joystick.y, joystick.radius, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(0, 255, 255, 0.4)";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(joystick.stickX, joystick.stickY, joystick.stickRadius, 0, Math.PI * 2);
    ctx.fillStyle = joystick.active ? "rgba(0, 255, 255, 0.7)" : "rgba(0, 255, 255, 0.4)";
    ctx.fill();

    // --- GAMBAR TOMBOL BOOST NEON PINK ---
    ctx.beginPath();
    ctx.arc(boostButton.x, boostButton.y, boostButton.radius, 0, Math.PI * 2);
    ctx.fillStyle = boostButton.active ? "rgba(255, 0, 128, 0.8)" : "rgba(255, 0, 128, 0.4)";
    ctx.strokeStyle = "#ff0080";
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 13px Arial";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText("BOOST", boostButton.x, boostButton.y);
    
    ctx.restore();
}
function getTouchDist(x1, y1, x2, y2) {
    let dx = x1 - x2;
    let dy = y1 - y2;
    return Math.sqrt(dx * dx + dy * dy);
}
