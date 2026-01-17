const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// התאמת גודל הקנבס למסך
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// --- טעינת תמונות ---
const images = {
    background: new Image(),
    castle: new Image(),
    dragon: new Image(),
    skeleton: new Image()
};

images.background.src = 'assets/background.png';
images.castle.src = 'assets/castle.png';
images.dragon.src = 'assets/dragon.png';
images.skeleton.src = 'assets/skeleton.png';

// --- הגדרות מיקום וגודל מעודכנות ---

// הרמנו את קו הקרקע למעלה כדי להתאים לשביל
const groundLevel = canvas.height - 220;

// נתוני הטירה
const castleSize = 400;
const castlePos = {
    x: canvas.width - 410,
    y: groundLevel - 320 // מותאם לקו הקרקע החדש
};

// --- משתני משחק (Stats) ---
let gameActive = false;
let score = 0;
let level = 1;
let gold = 100;
let castleHealth = 100;
let maxCastleHealth = 100;

// נתוני שדרוגים
let damage = 20;
let attackSpeed = 1000;
let lastShotTime = 0;
let regenRate = 0;
let projectileSpeed = 8;

// סוג דרקון שנבחר
let selectedDragonType = 'fire';

const dragonColors = {
    'fire': 'rgba(248,0,0,0.6)',
    'electric': 'rgb(255,229,0)',
    'poison': 'rgb(0,255,0)'
};

// --- מחלקות (Classes) ---

class Projectile {
    constructor(x, y, targetX, targetY) {
        this.x = x;
        this.y = y;
        this.radius = 8;
        this.color = dragonColors[selectedDragonType] || 'yellow';

        const angle = Math.atan2(targetY - y, targetX - x);
        this.velocity = {
            x: Math.cos(angle) * projectileSpeed,
            y: Math.sin(angle) * projectileSpeed
        };
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color.replace('0.6', '1');
        ctx.fill();
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        ctx.closePath();
        ctx.shadowBlur = 0;
    }

    update() {
        this.x += this.velocity.x;
        this.y += this.velocity.y;
    }
}

class Enemy {
    constructor() {
        this.x = -50;
        // מיקום האויבים מותאם לקו הקרקע החדש
        this.y = groundLevel + 20;
        this.width = 60;
        this.height = 80;
        this.speed = (0.5 + level * 0.15);
        this.maxHealth = 20 + (level * 10);
        this.health = this.maxHealth;
        this.markedForDeletion = false;

        // וריאציה קטנה במיקום
        this.y += Math.random() * 20 - 10;
    }

    update() {
        this.x += this.speed;

        if (this.x > castlePos.x + 40) {
            this.markedForDeletion = true;
            takeDamage(10);
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);

        // --- תיקון כיוון האויבים ---
        // הסרתי את ה-scale(-1, 1) כדי להפוך את הכיוון
        ctx.scale(1, 1);

        const walkCycle = Math.sin(Date.now() / 150) * 0.15;
        ctx.rotate(walkCycle);

        if (images.skeleton.complete) {
            ctx.drawImage(images.skeleton, -this.width / 2, -this.height / 2, this.width, this.height);
        } else {
            ctx.fillStyle = 'red';
            ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        }

        ctx.restore();

        // בר חיים
        const healthPercent = this.health / this.maxHealth;
        ctx.fillStyle = 'red';
        ctx.fillRect(this.x, this.y - 15, this.width, 5);
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(this.x, this.y - 15, this.width * healthPercent, 5);
    }
}

// --- ניהול משחק ---
let projectiles = [];
let enemies = [];

// פונקציות ממשק
window.startGame = function(type) {
    selectedDragonType = type;
    document.getElementById('dragon-selector').style.display = 'none';
    gameActive = true;
    animate();

    // יצירת אויבים
    setInterval(() => {
        if (gameActive) enemies.push(new Enemy());
    }, 2500 - (level * 50));

    // התחדשות חיים
    setInterval(() => {
        if (gameActive && castleHealth < maxCastleHealth) {
            castleHealth = Math.min(maxCastleHealth, castleHealth + regenRate);
            updateUI();
        }
    }, 1000);
};

window.toggleUpgradeMenu = function() {
    const modal = document.getElementById('upgrade-modal');
    modal.classList.toggle('hidden');
};

window.buyUpgrade = function(type) {
    const costs = {
        'damage': parseInt(document.getElementById('cost-damage').innerText),
        'speed': parseInt(document.getElementById('cost-speed').innerText),
        'maxHealth': parseInt(document.getElementById('cost-maxHealth').innerText),
        'regen': parseInt(document.getElementById('cost-regen').innerText)
    };

    if (gold >= costs[type]) {
        gold -= costs[type];

        if (type === 'damage') {
            damage += 5;
            document.getElementById('cost-damage').innerText = Math.floor(costs[type] * 1.5);
        } else if (type === 'speed') {
            attackSpeed = Math.max(100, attackSpeed - 100);
            document.getElementById('cost-speed').innerText = Math.floor(costs[type] * 1.5);
        } else if (type === 'maxHealth') {
            maxCastleHealth += 50;
            castleHealth += 50;
            document.getElementById('cost-maxHealth').innerText = Math.floor(costs[type] * 1.5);
        } else if (type === 'regen') {
            regenRate += 1;
            document.getElementById('cost-regen').innerText = Math.floor(costs[type] * 1.5);
        }
        updateUI();
    } else {
        alert("אין לך מספיק זהב!");
    }
};

function takeDamage(amount) {
    castleHealth -= amount;
    if (castleHealth <= 0) {
        castleHealth = 0;
        gameActive = false;
        alert("המשחק נגמר! הטירה נפלה.");
        location.reload();
    }
    updateUI();
}

function updateUI() {
    document.getElementById('health').innerText = Math.floor(castleHealth) + '/' + maxCastleHealth;
    document.getElementById('gold').innerText = gold;
    document.getElementById('level').innerText = level;
}

// לולאת המשחק
function animate() {
    if (!gameActive) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. ציור רקע
    if (images.background.complete) {
        ctx.drawImage(images.background, 0, 0, canvas.width, canvas.height);
    }

    // 2. ציור טירה
    if (images.castle.complete) {
        ctx.drawImage(images.castle, castlePos.x, castlePos.y, castleSize, castleSize);
    }

    // 3. ציור הדרקון (גם הוא עלה למעלה עם קו הקרקע החדש)
    const hoverOffset = Math.sin(Date.now() / 400) * 12;
    const dragonSize = 200;
    const dragonX = castlePos.x - 150;
    // מיקום הדרקון מחושב מחדש לפי הטירה והגובה החדש
    const dragonY = castlePos.y + (castleSize / 2) - 150 + hoverOffset;

    if (images.dragon.complete) {
        ctx.save();
        if (dragonColors[selectedDragonType]) {
            ctx.shadowBlur = 25;
            ctx.shadowColor = dragonColors[selectedDragonType];
        }
        ctx.drawImage(images.dragon, dragonX, dragonY, dragonSize, dragonSize);
        ctx.restore();
    }

    // 4. לוגיקת קליעים
    projectiles.forEach((proj, index) => {
        proj.update();
        proj.draw();

        if (proj.x < 0 || proj.x > canvas.width || proj.y < 0 || proj.y > canvas.height) {
            projectiles.splice(index, 1);
        }
    });

    // 5. לוגיקת אויבים
    enemies.forEach((enemy, enemyIndex) => {
        enemy.update();
        enemy.draw();

        projectiles.forEach((proj, projIndex) => {
            const dist = Math.hypot(proj.x - (enemy.x + enemy.width/2), proj.y - (enemy.y + enemy.height/2));

            if (dist < enemy.width / 2 + proj.radius) {
                enemy.health -= damage;
                projectiles.splice(projIndex, 1);

                if (enemy.health <= 0) {
                    enemies.splice(enemyIndex, 1);
                    gold += 10 + (level * 2);
                    score += 10;
                    if (score % 60 === 0) level++;
                    updateUI();
                }
            }
        });
    });

    requestAnimationFrame(animate);
}

// אירוע ירייה
canvas.addEventListener('click', (e) => {
    if (!gameActive) return;

    const now = Date.now();
    if (now - lastShotTime < attackSpeed) return;
    lastShotTime = now;

    // ירייה מותאמת למיקום החדש של הדרקון
    const startX = castlePos.x - 20;
    const startY = castlePos.y + (castleSize / 2) - 40;

    projectiles.push(new Projectile(startX, startY, e.clientX, e.clientY));
});

updateUI();