const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Element UI Utama
const loadingScreen = document.getElementById('loadingScreen');
const menu = document.getElementById('menu');
const hud = document.getElementById('hud');
const gameOverScreen = document.getElementById('gameOver');
const playBtn = document.getElementById('playBtn');
const restartBtn = document.getElementById('restartBtn');
const scoreEl = document.getElementById('score');
const finalScoreEl = document.getElementById('finalScore');
const leadersEl = document.getElementById('leaders');
const boostEl = document.getElementById('boost');
// Elemen Jendela Pop-up Skins & Settings
const skinBtn = document.getElementById('skinBtn');
const settingBtn = document.getElementById('settingBtn');
const skinModal = document.getElementById('skinModal');
const settingModal = document.getElementById('settingModal');
const closeSkinBtn = document.getElementById('closeSkinBtn');
const closeSettingBtn = document.getElementById('closeSettingBtn');

// UKURAN PETA DUNIA (Sangat Luas)
const MAP_WIDTH = 3000;
const MAP_HEIGHT = 3000;

// Efek suara makan lokal
const eatSound = new Audio('makan.mp3');
eatSound.volume = 0.8;
// Pemicu musik latar (Tambahkan ini)
const musikLatar = document.getElementById("bgMusic");
window.addEventListener("click", () => { if(musikLatar && musikLatar.paused) { musikLatar.volume = 0.4; musikLatar.play(); } }, { once: true });
// Konfigurasi Inti Game
let gameActive = false;
let score = 0;
let playerColorInner = '#00ffff'; 
let magnetActive = true;       // Setel true untuk mengaktifkan magnet sepanjang waktu
let magnetRadius = 150;        // Jarak jangkauan magnet menarik makanan (bisa diperbesar)
let magnetSpeed = 8;           // Kecepatan makanan terbang mendekati cacing
let playerColorOuter = '#0033aa'; 
let highscore = localStorage.getItem('neonWormHighscore') || 0;
let currentLevel = 1;
const levelEl = document.getElementById('level');

let mouse = { x: 0, y: 0 };
let worm = [];
let foods = [];
let wormLength = 40; 
const wormRadius = 12;

let boostButton = {
    x: 0, // diatur otomatis di fungsi draw
    y: 0,
    radius: 35,
    active: false,
    pointerId: null
};

let magnetTimer = 0;
let shakeIntensity = 0;
window.onload = () => {
    if (loadingScreen) loadingScreen.style.display = 'none';
    resizeCanvas();
    const menuHighscoreEl = document.getElementById('menuHighscore');
    if (menuHighscoreEl) menuHighscoreEl.innerText = highscore;
};
// Sistem Kamera, Musuh Bot, Boost, dan Kosmetik
let bots = [];
const TOTAL_BOTS = 15; 
let playerColor = '#00ffff';
let playerGlow = true;
let camera = { x: 0, y: 0 };
let isBoosting = false;
let boostEnergy = 100;
// Variabel kontrol virtual untuk layar sentuh HP
let joystick = {
    x: 120,
    y: 0, // diatur otomatis di fungsi draw
    radius: 50,
    stickX: 120,
    stickY: 0,
    stickRadius: 20,
    active: false,
    pointerId: null
};
// Event Window Load & Resize Canvas
window.onload = () => {
    if (loadingScreen) loadingScreen.style.display = 'none';
    resizeCanvas();
};

window.addEventListener('resize', resizeCanvas);
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});

window.addEventListener('mousedown', () => { if (gameActive && boostEnergy > 5) isBoosting = true; });
window.addEventListener('mouseup', () => { isBoosting = false; });
// ========================================================
// LOGIKA SENTUHAN JARI (SIMPAN DI SINI)
// ========================================================

// Fungsi pembantu menghitung jarak titik sentuhan
function getTouchDist(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

// Deteksi awal saat jari menyentuh layar HP
window.addEventListener('touchstart', function(e) {
    if (!gameActive) return; // Hanya merespons jika game sudah mulai
    
    for (let i = 0; i < e.changedTouches.length; i++) {
        let touch = e.changedTouches[i];
        let rect = canvas.getBoundingClientRect();
        let touchX = touch.clientX - rect.left;
        let touchY = touch.clientY - rect.top;

        // Jika menyentuh area bulatan Joystick (Kiri Bawah)
        if (getTouchDist(touchX, touchY, joystick.x, joystick.y) < joystick.radius + 20) {
            joystick.active = true;
            joystick.pointerId = touch.identifier;
            handleJoystickMove(touchX, touchY);
        }

        // Jika menyentuh area Tombol Boost (Kanan Bawah)
        if (getTouchDist(touchX, touchY, boostButton.x, boostButton.y) < boostButton.radius) {
            boostButton.active = true;
            boostButton.pointerId = touch.identifier;
            
            // Mengikuti syarat boost asli game Anda
            if (boostEnergy > 10) {
                isBoosting = true; 
            }
        }
    }
}, { passive: false });

// Deteksi saat jari digeser/di-drag di layar HP
window.addEventListener('touchmove', function(e) {
    e.preventDefault(); // Menghentikan layar HP agar tidak ikut scroll/goyang
    
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

// Mengkalkulasi arah jalan cacing berdasarkan tarikan joystick
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

    // Menghitung pusat layar secara aman
    let centerX = window.innerWidth / 2;
    let centerY = window.innerHeight / 2;
    
    // Mengarahkan objek mouse bawaan game Anda
    mouse.x = centerX + (dx / joystick.radius) * 300;
    mouse.y = centerY + (dy / joystick.radius) * 300;
}

// Deteksi saat jari dilepas dari layar HP
window.addEventListener('touchend', function(e) {
    for (let i = 0; i < e.changedTouches.length; i++) {
        let touch = e.changedTouches[i];

        if (touch.identifier === joystick.pointerId) {
            joystick.active = false;
            joystick.pointerId = null;
        }
        if (touch.identifier === boostButton.pointerId) {
            boostButton.active = false;
            boostButton.pointerId = null;
            isBoosting = false; // Mematikan efek boost game Anda kembali ke normal
        }
    }
});

function startGame() {
    if (menu) menu.style.display = 'none';
    if (gameOverScreen) gameOverScreen.style.display = 'none';
    if (hud) hud.style.display = 'flex';
    
    score = 0;
    currentLevel = 1;
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
    
    updateLeaderboard();
    gameActive = true;
    animate();
}
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
    
    let randomName = botNames[Math.floor(Math.random() * botNames.length)];
    let uniqueName = `${randomName}_${Math.floor(Math.random() * 90 + 10)}`;
    
    let bX = Math.random() * (MAP_WIDTH - 200) + 100;
    let bY = Math.random() * (MAP_HEIGHT - 200) + 100;
    let bLength = Math.floor(Math.random() * 20) + 25;
    let botWorm = [];
    for (let k = 0; k < bLength; k++) { botWorm.push({ x: bX, y: bY }); }
    
    bots[index] = {
        name: uniqueName,
        worm: botWorm,
        wormLength: bLength,
        score: (bLength - 25) * 5,
        angle: Math.random() * Math.PI * 2,
        color: `hsl(${Math.random() * 360}, 100%, 50%)`,
        changeDirTimer: 0
    };
}
function dropFoodFromDeadWorm(wormSegments, color) {
    wormSegments.forEach((part, index) => {
        if (index % 4 === 0) { 
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
    // DIUBAH: Mengganti pembagi menjadi 100 agar level naik setiap kelipatan skor 100
    let newLevel = Math.floor(score / 100) + 1;
    if (newLevel !== currentLevel) {
        currentLevel = newLevel;
        if (levelEl) levelEl.innerText = currentLevel;
    }
    if (score > highscore) {
        highscore = score;
        localStorage.setItem('LagaCacingHighscore', highscore);
    }
}
function animate() {
    if (!gameActive) return;
    
    // Membersihkan kanvas secara transparan total setiap frame agar super ringan!
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
    
    if (head.x < 0 || head.x > MAP_WIDTH || head.y < 0 || head.y > MAP_HEIGHT) { endGame(); return; }
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
// Logika Pemrosesan Pergerakan Bot AI Super Pintar & Agresif (Bisa Boost)
    for (let bIndex = bots.length - 1; bIndex >= 0; bIndex--) {
        let bot = bots[bIndex];
        let bHead = { x: bot.worm[0].x, y: bot.worm[0].y };
        
        let targetAngle = bot.angle;
        let closestFood = null;
        let minDist = 450; // DIUBAH: Pandangan dasar bot diperluas sedikit agar lebih awas
        let botSpeed = 5.0; // DIUBAH: Kecepatan dasar bot dinaikkan agar pergerakannya lincah

        // // Radar pencarian makanan terdekat + EFEK MAGNET BOT
        foods.forEach(food => {
            let d = Math.hypot(bHead.x - food.x, bHead.y - food.y);
            if (d < minDist) { minDist = d; closestFood = food; }

            // LOGIKA MAGNET BOT: Menarik makanan jika masuk radius
            if (magnetActive && d < magnetRadius) {
                let angle = Math.atan2(bHead.y - food.y, bHead.x - food.x);
                food.x += Math.cos(angle) * (magnetSpeed * 0.7); 
                food.y += Math.sin(angle) * (magnetSpeed * 0.7);
            }
        });

        if (closestFood) {
            targetAngle = Math.atan2(closestFood.y - bHead.y, closestFood.x - bHead.x);
            if (minDist < 150) botSpeed = 7.5; // DIUBAH: Kecepatan menyergap makanan ditingkatkan menjadi boost kuat
        } else {
            bot.changeDirTimer++;
            if (bot.changeDirTimer > 120 + Math.random() * 60) {
                targetAngle = Math.random() * Math.PI * 2;
                bot.changeDirTimer = 0;
            }
        }

        // Taktik Memotong Jalan Cacing Lain (Taktik Penyergapan Aggro Boost)
        let huntZone = 250; // DIUBAH: Zona berburu diperlebar agar bot lebih cerdik menyerang dari jarak ideal

        let dToPlayer = Math.hypot(bHead.x - head.x, bHead.y - head.y);
        if (dToPlayer < huntZone && bot.worm.length > worm.length) { 
            targetAngle = Math.atan2(head.y - bHead.y, head.x - bHead.x) + 0.45;
            botSpeed = 8.5; // DIUBAH: Taktik potong jalan player dipercepat secara pro
        }

        for (let i = 0; i < bots.length; i++) {
            if (i === bIndex) continue;
            let otherBot = bots[i];
            let dToOtherBot = Math.hypot(bHead.x - otherBot.worm[0].x, bHead.y - otherBot.worm[0].y);
            if (dToOtherBot < huntZone && bot.worm.length > otherBot.worm.length) {
                targetAngle = Math.atan2(otherBot.worm[0].y - bHead.y, otherBot.worm[0].x - bHead.x) + 0.45;
                botSpeed = 8.5; 
                break;
            }
        }

        // ==========================================
        // SENSOR UTAMA MENGHINDAR PRO (PREDIKSI AI)
        // ==========================================
        let dangerZone = 90; // Jarak aman refleks sensor depan
        // Membuat koordinat radar bayangan di depan arah gerak kepala bot
        let sensorX = bHead.x + Math.cos(bot.angle) * dangerZone;
        let sensorY = bHead.y + Math.sin(bot.angle) * dangerZone;

        // 1. Radar Pro Menghindar dari Tubuh Player
        for (let j = 0; j < worm.length; j += 2) {
            let d = Math.hypot(sensorX - worm[j].x, sensorY - worm[j].y);
            if (d < dangerZone) {
                // Kalkulasi sudut pelarian menjauh dari titik koordinat tubuh lawan
                let escapeAngle = Math.atan2(bHead.y - worm[j].y, bHead.x - worm[j].x);
                // Bot meliuk melengkung halus mengikuti lekukan tubuh musuh, tidak patah kaku
                targetAngle = escapeAngle + (Math.sin(bot.angle - escapeAngle) > 0 ? 0.6 : -0.6);
                botSpeed = 3.5; // Mengurangi kecepatan secara aman agar belokan lebih tajam
                break;
            }
        }

        // 2. Radar Pro Menghindar dari Tubuh Bot Kompetitor Lain
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
        // ==========================================

        // DIUBAH: Sensitivitas belok bot dinaikkan (0.18 -> 0.28) agar manuver liukan bot pro responsif
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
        
        // Pengecekan Tabrakan Kematian Bot vs Player & Bot vs Bot
        let botDied = false;
        for (let j = 5; j < worm.length; j++) {
            if (getDist(bHead.x, bHead.y, worm[j].x, worm[j].y) < wormRadius + 6) {
                score += 50; wormLength += 10; if (scoreEl) scoreEl.innerText = score;
                checkLevelAndHighscore(); dropFoodFromDeadWorm(bot.worm, bot.color); 
                spawnBot(bIndex); updateLeaderboard(); botDied = true; break;
            }
        }
        if (botDied) continue;

        for (let i = 0; i < bots.length; i++) {
            if (i === bIndex) continue;
            let otherBot = bots[i];
            for (let j = 5; j < otherBot.worm.length; j++) {
                if (getDist(bHead.x, bHead.y, otherBot.worm[j].x, otherBot.worm[j].y) < wormRadius + 6) {
                    otherBot.score += 50; otherBot.wormLength += 10;
                    dropFoodFromDeadWorm(bot.worm, bot.color); spawnBot(bIndex); 
                    updateLeaderboard(); botDied = true; break;
                }
            }
            if (botDied) break;
        }
        if (botDied) continue;
    }

    for (let i = 0; i < bots.length; i++) {
        let bot = bots[i];
        for (let j = 5; j < bot.worm.length; j++) {
            if (getDist(head.x, head.y, bot.worm[j].x, bot.worm[j].y) < wormRadius + 6) { endGame(); return; }
        }
    }
    camera.x = head.x - canvas.width / 2;
    camera.y = head.y - canvas.height / 2;
    
    ctx.save();
    ctx.translate(-camera.x, -camera.y);
    drawGrid();
    ctx.strokeStyle = '#ff0055'; ctx.lineWidth = 8;
    ctx.strokeRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
    
    // Pemrosesan & Render Gambar Makanan Camilan Solid (Flat / No Blur)
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
            ctx.beginPath(); ctx.arc(fr * 0.4, e = fr * 0.2, fr * 0.15, 0, Math.PI * 2); ctx.fill();
        } 
        else {
            ctx.beginPath(); ctx.arc(0, 0, fr, 0, Math.PI * 2); ctx.fillStyle = food.color; ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(0, 0, fr * 0.6, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.restore();

        // Hitbox Logika Pengindraan Makan
        let dist = Math.hypot(head.x - food.x, head.y - food.y);
        if (dist < wormRadius + fr) {
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

            // Efek Gradasi Bulat Timbul 3D Neon 
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
    // Menggambar Badan Utama Cacing Player (Sama Persis dengan Bot di Arena)
    const spacing = 2; 
    for (let i = worm.length - 1; i >= 0; i--) {
        if (i % spacing !== 0 && i !== 0) continue; 
        
        let isHead = (i === 0);
        let r = isHead ? wormRadius + 1 : wormRadius - (i * 0.02); 
        if (r < 6) r = 6; 
        
        ctx.save();
        ctx.translate(worm[i].x, worm[i].y);

        // Kunci Visual: Mengatur pusat cahaya di tengah tubuh untuk membuat efek garis punggung seperti bot
        let isEven = (Math.floor(i / spacing) % 2 === 0);
        let colorInner = isEven ? playerColorInner : playerColorOuter; 
        let colorOuter = isEven ? playerColorOuter : playerColorInner; 

        // Modifikasi titik koordinat gradasi agar menghasilkan garis terang silinder di tengah (bukan bola belang)
        let gradient = ctx.createRadialGradient(0, 0, r * 0.1, 0, 0, r);
        gradient.addColorStop(0, '#ffffff');       // Garis kilau putih paling tengah
        gradient.addColorStop(0.3, colorInner);    // Warna utama skin pilihan
        gradient.addColorStop(0.8, colorOuter);    // Warna bayangan tepi tubuh
        gradient.addColorStop(1, 'rgba(2, 2, 21, 0.6)'); // Transparansi tepi agar membaur rapi dengan arena

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
    ctx.restore(); // Tutup kamera translate
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
    drawMobileControls();
    requestAnimationFrame(animate);
}
// Interaksi Tombol Pop-up Menu
if(skinBtn) skinBtn.addEventListener('click', () => { skinModal.style.display = 'flex'; });
if(settingBtn) settingBtn.addEventListener('click', () => { settingModal.style.display = 'flex'; });
if(closeSkinBtn) closeSkinBtn.addEventListener('click', () => { skinModal.style.display = 'none'; });
if(closeSettingBtn) {
    closeSettingBtn.addEventListener('click', () => {
        settingModal.style.display = 'none';
        playerGlow = (document.getElementById('graphicQuality').value === 'high'); 
    });
}

function dapatkanWarnaTepi(warnaPusat) {
    const petaWarna = {
        '#00ffff': '#0033aa', // Cyan -> Biru Tua
        '#ff00ff': '#880088', // Magenta -> Ungu Tua
        '#00ff00': '#005500', // Lime -> Hijau Daun
        '#ffff00': '#cc6600', // Yellow -> Oranye Gelap
        '#ff3300': '#660000', // Red -> Merah Marun
        '#ff9900': '#ff3300', // Orange -> Belang Merah/Oranye Tua
        '#9900ff': '#4400aa', // Purple -> Belang Ungu Gelap
        '#ffffff': '#555555'  // White -> Belang Abu-abu
    };
    return petaWarna[warnaPusat] || '#111111';
}

// Logika klik tombol pilihan skin pada pop-up menu (SUDAH DIPERBAIKI)
document.querySelectorAll('.skin-opt').forEach(optButton => {
    optButton.addEventListener('click', (event) => {
        const warnaDipilih = event.target.getAttribute('data-color');
        
        // Perbarui dua variabel global cacing player yang baru
        playerColorInner = warnaDipilih;
        playerColorOuter = dapatkanWarnaTepi(warnaDipilih);
        
        skinModal.style.display = 'none';
    });
});

if(playBtn) playBtn.addEventListener('click', startGame);
if(restartBtn) restartBtn.addEventListener('click', startGame);

function endGame() {
    gameActive = false;
    if (hud) hud.style.display = 'none';
    if (finalScoreEl) finalScoreEl.innerText = `Score : ${score}`;
    if (gameOverScreen) gameOverScreen.style.display = 'flex';
    const finalHighscoreEl = document.getElementById('finalHighscore');
    if (finalHighscoreEl) finalHighscoreEl.innerText = highscore;
}
function drawGrid() {
    ctx.save();
    ctx.strokeStyle = '#00ffff'; 
    ctx.lineWidth = 1;
    
    let gridSize = 50; // Jarak ukuran antar kotak grid
    
    // Menggambar garis vertikal
    for (let x = 0; x < MAP_WIDTH; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, MAP_HEIGHT);
        ctx.stroke();
    }
    
    // Menggambar garis horizontal
    for (let y = 0; y < MAP_HEIGHT; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(MAP_WIDTH, y);
        ctx.stroke();
    }
    ctx.restore();
}
function drawMobileControls() {
    // HAPUS atau BERI KOMENTAR baris ini agar tombol bisa muncul saat dites di PC/Laptop:
    // if (!('ontouchstart' in window)) return; 

    // Mengatur posisi tombol adaptif sesuai tinggi dan lebar layar HP saat dimainkan
    joystick.y = canvas.height - 120;
    if (!joystick.active) {
        joystick.stickX = joystick.x;
        joystick.stickY = joystick.y;
    }
    
    // TIPS POSISI: Di kode Anda y dikurangi 210 (agak ke atas), 
    // jika ingin sejajar di bawah seperti joystick, ganti menjadi: canvas.height - 120
    boostButton.x = canvas.width - 70;
    boostButton.y = canvas.height - 210; 

    ctx.save();
    
    // PENTING: Tambahkan baris ini agar kontrol tidak ikut hanyut terbawa kamera game!
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

    // Teks di tengah tombol boost
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 13px Arial";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText("BOOST", boostButton.x, boostButton.y);
    
    ctx.restore();
}
