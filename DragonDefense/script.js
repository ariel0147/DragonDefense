const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// התאמת גודל הקנבס למסך
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// --- הגדרות אנימציה לדרקונים ---
// --- הגדרות אנימציה לדרקונים ---
const spriteConfig = {
    // חישוב מדויק: הרוחב הכולל (717) לחלק ל-8 פריימים
    frameWidth: 717 / 8,  // יוצא בערך 89.625
    frameHeight: 391,     // חובה להשתמש בגובה המקורי של התמונה!
    maxFrames: 8,
    gameFrame: 0,
    staggerFrames: 8
};

// --- טעינת תמונות ---
const images = {
    background: new Image(),
    castle: new Image(),
    dragonFire: new Image(),
    dragonElectric: new Image(),
    dragonPoison: new Image(),
    skeleton: new Image()
};

images.background.src = 'assets/background.png';
images.castle.src = 'assets/castle.png';
images.skeleton.src = 'assets/skeleton.png';

images.dragonFire.src = 'assets/dragon f.png';
images.dragonElectric.src = 'assets/dragon e.png';
images.dragonPoison.src = 'assets/dragon p.png';

// --- הגדרות מיקום וגודל ---
const groundLevel = canvas.height - 220;
const castleSize = 400;
const castlePos = {
    x: canvas.width - 410,
    y: groundLevel - 320
};

// --- משתני משחק ---
let gameActive = false;
let score = 0;
let level = 1;
let gold = 100;
let castleHealth = 100;
let maxCastleHealth = 100;

let damage = 20;
let attackSpeed = 1000;
let lastShotTime = 0;
let regenRate = 0;
let projectileSpeed = 8;

let selectedDragonType = 'fire';

const dragonColors = {
    'fire': 'rgba(248,0,0,0.6)',
    'electric': 'rgb(255,229,0)',
    'poison': 'rgb(0,255,0)'
};

// --- מחלקות ---

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
        this.y = groundLevel + 20;
        this.width = 60;
        this.height = 80;
        this.speed = (0.5 + level * 0.15);
        this.maxHealth = 20 + (level * 10);
        this.health = this.maxHealth;
        this.markedForDeletion = false;
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
        const walkCycle = Math.sin(Date.now() / 150) * 0.15;
        ctx.rotate(walkCycle);

        if (images.skeleton.complete) {
            ctx.drawImage(images.skeleton, -this.width / 2, -this.height / 2, this.width, this.height);
        } else {
            ctx.fillStyle = 'red';
            ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        }
        ctx.restore();

        const healthPercent = this.health / this.maxHealth;
        ctx.fillStyle = 'red';
        ctx.fillRect(this.x, this.y - 15, this.width, 5);
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(this.x, this.y - 15, this.width * healthPercent, 5);
    }
}

let projectiles = [];
let enemies = [];

// --- פונקציות משחק ---

window.startGame = function(type) {
    selectedDragonType = type;
    document.getElementById('dragon-selector').style.display = 'none';
    gameActive = true;
    animate();

    setInterval(() => {
        if (gameActive) enemies.push(new Enemy());
    }, 2500 - (level * 50));

    setInterval(() => {
        if (gameActive && castleHealth < maxCastleHealth) {
            castleHealth = Math.min(maxCastleHealth, castleHealth + regenRate);
            updateUI();
        }
    }, 1000);
};

window.toggleUpgradeMenu = function() {
    document.getElementById('upgrade-modal').classList.toggle('hidden');
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

// לולאת האנימציה הראשית
function animate() {
    if (!gameActive) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. רקע
    if (images.background.complete) ctx.drawImage(images.background, 0, 0, canvas.width, canvas.height);

    // 2. טירה
    if (images.castle.complete) ctx.drawImage(images.castle, castlePos.x, castlePos.y, castleSize, castleSize);

    // 3. לוגיקת אנימציית דרקון
    let currentDragonImg;
    if (selectedDragonType === 'fire') currentDragonImg = images.dragonFire;
    else if (selectedDragonType === 'electric') currentDragonImg = images.dragonElectric;
    else if (selectedDragonType === 'poison') currentDragonImg = images.dragonPoison;

    const hoverOffset = Math.sin(Date.now() / 400) * 12;

    // הגדרת גודל תצוגה על המסך
    // הגדרת הגובה הרצוי על המסך (אפשר לשחק עם המספר הזה)
    const renderHeight = 300;

    // חישוב הפרופורציה: רוחב הפריים חלקי גובה הפריים
    // (89.625 חלקי 391 נותן יחס של בערך 0.23 - הדרקון די צר וגבוה)
    const aspectRatio = spriteConfig.frameWidth / spriteConfig.frameHeight;
    const renderWidth = renderHeight * aspectRatio;

    // עדכון המיקום כדי שיהיה מול הטירה
    const dragonX = castlePos.x - 250;
    const dragonY = castlePos.y + (castleSize / 2) - (renderHeight / 2) + hoverOffset;
    if (currentDragonImg && currentDragonImg.complete) {

        let frameIndex = 0;
        const timeSinceShot = Date.now() - lastShotTime;
        const attackAnimDuration = 600; // זמן הצגת אנימציית התקיפה

        if (timeSinceShot < attackAnimDuration) {
            // --- מצב תקיפה ---
            // משתמש בפריימים 6 ו-7 (השניים האחרונים)
            const attackStart = 6;
            const attackCount = 2;

            let localFrame = Math.floor(spriteConfig.gameFrame / (spriteConfig.staggerFrames / 2)) % attackCount;
            frameIndex = attackStart + localFrame;

        } else {
            // --- מצב רגיל (ריחוף) ---
            // משתמש בפריימים 0 עד 5 (6 הראשונים)
            const flyFramesCount = 5;
            frameIndex = Math.floor(spriteConfig.gameFrame / spriteConfig.staggerFrames) % flyFramesCount;
        }

        let frameX = frameIndex * spriteConfig.frameWidth;

        ctx.save();

        // מרכוז הדרקון והיפוך כיוון (מסתכל שמאלה)
        ctx.translate(dragonX + renderWidth / 2, dragonY + renderHeight / 2);
        ctx.scale(-1, 1);

        if (dragonColors[selectedDragonType]) {
            ctx.shadowBlur = 25;
            ctx.shadowColor = dragonColors[selectedDragonType];
        }

        // ציור הפריים מתוך ה-Sprite Sheet
        ctx.drawImage(currentDragonImg,
            frameX, 0, spriteConfig.frameWidth, spriteConfig.frameHeight, // המקור בתמונה
            -renderWidth / 2, -renderHeight / 2, renderWidth, renderHeight // היעד על המסך
        );

        ctx.restore();
        spriteConfig.gameFrame++;
    }

    // 4. קליעים
    projectiles.forEach((proj, index) => {
        proj.update();
        proj.draw();
        if (proj.x < 0 || proj.x > canvas.width || proj.y < 0 || proj.y > canvas.height) {
            projectiles.splice(index, 1);
        }
    });

    // 5. אויבים
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

    const startX = castlePos.x - 20;
    const startY = castlePos.y + (castleSize / 2) - 40;
    projectiles.push(new Projectile(startX, startY, e.clientX, e.clientY));
});

updateUI();