const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 1200;
canvas.height = 700;

// --- טעינת תמונות ---
const images = {};
// השארתי את הקישור הזמני לרקע שעבד לך.
const imageSources = {
    background: 'assets/background.png',
    castle: 'assets/castle.png',
    dragon: 'assets/dragon.png',
    skeleton: 'assets/skeleton.png'
};

let imagesLoaded = 0;
const totalImages = Object.keys(imageSources).length;

function loadImages(callback) {
    for (let key in imageSources) {
        images[key] = new Image();
        images[key].src = imageSources[key];

        images[key].onload = () => {
            imagesLoaded++;
            if (imagesLoaded === totalImages) callback();
        };

        images[key].onerror = () => {
            console.error(`Error loading image: ${imageSources[key]}`);
            // ממשיכים גם אם יש שגיאה כדי לא לתקוע את המשחק, נשתמש בגיבויים
            imagesLoaded++;
            if (imagesLoaded === totalImages) callback();
        }
    }
}

// --- משתני משחק ---
let gameRunning = false;
let selectedDragonType = null;
let enemies = [];
let projectiles = [];
let spawnTimer = 0;
let level = 1;

let gold = 100;
let castleHealth = 150; // הגדלתי קצת חיים התחלתיים כי הטירה גדולה
let maxCastleHealth = 150;

let damageMultiplier = 1;
let attackSpeedMultiplier = 1;
let regenRate = 0;
let upgradeCosts = { damage: 50, speed: 50, maxHealth: 40, regen: 60 };

// --- הגדרת צבעים לדרקונים ---
const dragonColors = {
    fire: '#e74c3c',    // אדום
    electric: '#f1c40f', // צהוב
    poison: '#8e44ad'   // סגול
};

// מיקום בסיס הטירה על השביל
const castlePos = { x: 130, y: 580 };

// --- מחלקות (Classes) ---

class Enemy {
    constructor() {
        this.x = canvas.width + 50;
        // פיזור האויבים על רוחב השביל
        this.y = castlePos.y + (Math.random() * 60 - 30);

        this.speed = (1.5 + (Math.random() * 0.5)) + (level * 0.1);
        this.radius = 30;
        this.maxHealth = 30 + (level * 5);
        this.health = this.maxHealth;
    }

    update() {
        const dx = castlePos.x - this.x;
        const dy = castlePos.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        const velocityX = (dx / distance) * this.speed;
        const velocityY = (dy / distance) * this.speed;

        this.x += velocityX;
        this.y += velocityY * 0.2; // תנועה אנכית עדינה יותר לשמירה על השביל

        // הגדלתי את טווח הפגיעה כי הטירה גדולה יותר
        if (distance < 100) {
            this.hitCastle();
            return true;
        }
        return false;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(-1, 1);

        if (images.skeleton && images.skeleton.complete && images.skeleton.naturalWidth !== 0) {
            ctx.drawImage(images.skeleton, -25, -65, 50, 70);
        } else {
            ctx.fillStyle = 'red';
            ctx.beginPath();
            ctx.arc(0, 0, 20, 0, Math.PI*2);
            ctx.fill();
        }
        ctx.restore();

        // בר חיים
        ctx.fillStyle = 'red';
        ctx.fillRect(this.x - 20, this.y - 70, 40, 6);
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(this.x - 20, this.y - 70, (40 * (this.health / this.maxHealth)), 6);
    }

    hitCastle() {
        castleHealth -= 10;
        updateUI();
        if (castleHealth <= 0) {
            alert("המשחק נגמר! הטירה נפלה.");
            location.reload();
        }
    }
}

class Projectile {
    constructor(x, y, targetEnemy, type) {
        this.x = x;
        this.y = y;
        this.target = targetEnemy;
        this.type = type;
        this.radius = 10; // קליע קצת יותר גדול
        this.speed = 12;

        // שימוש באותם צבעים שהוגדרו לדרקון
        if (type === 'fire') {
            this.color = dragonColors.fire;
            this.damage = 10 * damageMultiplier;
        } else if (type === 'electric') {
            this.color = dragonColors.electric;
            this.damage = 5 * damageMultiplier;
            this.speed = 16;
        } else if (type === 'poison') {
            this.color = dragonColors.poison;
            this.damage = 15 * damageMultiplier;
            this.speed = 10;
        }
    }

    update() {
        if (this.target.health <= 0) return true;

        const dx = this.target.x - this.x;
        const dy = (this.target.y - 40) - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        const velocityX = (dx / distance) * this.speed;
        const velocityY = (dy / distance) * this.speed;

        this.x += velocityX;
        this.y += velocityY;

        if (distance < this.target.radius) {
            this.target.health -= this.damage;
            return true;
        }
        return false;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.closePath();
    }
}

// --- ניהול UI ---
function updateUI() {
    document.getElementById('health').innerText = Math.floor(castleHealth) + "/" + maxCastleHealth;
    document.getElementById('gold').innerText = Math.floor(gold);
    document.getElementById('level').innerText = level;

    document.getElementById('cost-damage').innerText = upgradeCosts.damage;
    document.getElementById('cost-speed').innerText = upgradeCosts.speed;
    document.getElementById('cost-maxHealth').innerText = upgradeCosts.maxHealth;
    document.getElementById('cost-regen').innerText = upgradeCosts.regen;
}

window.toggleUpgradeMenu = function() {
    const modal = document.getElementById('upgrade-modal');
    modal.classList.toggle('hidden');
    updateUI();
};

window.buyUpgrade = function(type) {
    const cost = upgradeCosts[type];
    if (gold >= cost) {
        gold -= cost;
        if (type === 'damage') {
            damageMultiplier += 0.25;
            upgradeCosts.damage = Math.floor(upgradeCosts.damage * 1.5);
        } else if (type === 'speed') {
            attackSpeedMultiplier += 0.15;
            upgradeCosts.speed = Math.floor(upgradeCosts.speed * 1.5);
        } else if (type === 'maxHealth') {
            maxCastleHealth += 50;
            castleHealth += 50;
            upgradeCosts.maxHealth += 20;
        } else if (type === 'regen') {
            regenRate += 0.5;
            upgradeCosts.regen = Math.floor(upgradeCosts.regen * 1.3);
        }
        updateUI();
    } else {
        alert("אין לך מספיק זהב!");
    }
};

window.startGame = function(type) {
    selectedDragonType = type;
    document.getElementById('dragon-selector').style.display = 'none';
    gameRunning = true;
    updateUI();
    animate();
};

function getClosestEnemy() {
    let closest = null;
    let minDist = 1200;
    enemies.forEach(enemy => {
        const dx = enemy.x - castlePos.x;
        const dy = enemy.y - castlePos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist) {
            minDist = dist;
            closest = enemy;
        }
    });
    return closest;
}

// --- לולאת המשחק ---
function animate() {
    if (!gameRunning) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. רקע
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (images.background && images.background.complete && images.background.naturalWidth !== 0) {
        ctx.drawImage(images.background, 0, 0, canvas.width, canvas.height);
    }

    // 2. חישוב מיקומים לטירה
    const castleW = 300;
    const castleH = 300;
    const castleDrawX = castlePos.x - (castleW / 2) + 50;
    const castleDrawY = castlePos.y - castleH + 5;

    // ציור טירה
    if (images.castle && images.castle.complete && images.castle.naturalWidth !== 0) {
        ctx.drawImage(images.castle, castleDrawX, castleDrawY, castleW, castleH);
    } else {
        ctx.fillStyle = 'gray';
        ctx.fillRect(castlePos.x - 50, castlePos.y - 100, 100, 100);
    }

    // 3. ציור דרקון עם הילה זוהרת (תיקון ההעלמות)
    const dragonW = 150;
    const dragonH = 150;
    // כיוונון גובה הדרקון כדי שיישב בול על המגדל
    const dragonX = castlePos.x - (dragonW / 2) + 50;
    const dragonY = castleDrawY - 120;

    if (images.dragon && images.dragon.complete && images.dragon.naturalWidth !== 0) {
        ctx.save(); // שומרים מצב

        // אם נבחר סוג דרקון - מוסיפים לו הילה בצבע המתאים
        if (selectedDragonType && dragonColors[selectedDragonType]) {
            ctx.shadowBlur = 20; // חוזק הזוהר
            ctx.shadowColor = dragonColors[selectedDragonType]; // צבע הזוהר (אדום/צהוב/סגול)
        }

        // מציירים את הדרקון (עכשיו הוא יופיע עם הזוהר מסביבו)
        ctx.drawImage(images.dragon, dragonX, dragonY, dragonW, dragonH);

        ctx.restore(); // מחזירים מצב כדי לא להשפיע על שאר הציורים
    }


    // --- לוגיקה ---
    if (spawnTimer % 60 === 0 && regenRate > 0) {
        if (castleHealth < maxCastleHealth) {
            castleHealth += regenRate;
            if (castleHealth > maxCastleHealth) castleHealth = maxCastleHealth;
            updateUI();
        }
    }

    spawnTimer++;
    if (spawnTimer % (100 - (level * 2)) === 0) {
        enemies.push(new Enemy());
    }
    if (spawnTimer % 1000 === 0) {
        level++;
        updateUI();
    }

    let baseFireRate = 60;
    if (selectedDragonType === 'electric') baseFireRate = 30;
    const fireRate = Math.max(5, Math.floor(baseFireRate / attackSpeedMultiplier));

    if (spawnTimer % fireRate === 0) {
        const target = getClosestEnemy();
        if (target) {
            // הירי יוצא מפה הדרקון (מותאם לגודל החדש)
            projectiles.push(new Projectile(dragonX + dragonW/2 + 20, dragonY + 60, target, selectedDragonType));
        }
    }

    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        const hit = p.update();
        p.draw();
        if (hit || p.x > canvas.width) projectiles.splice(i, 1);
    }

    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        const hitCastle = enemy.update();
        enemy.draw();

        if (enemy.health <= 0) {
            gold += 20;
            updateUI();
            enemies.splice(i, 1);
            continue;
        }
        if (hitCastle) enemies.splice(i, 1);
    }

    requestAnimationFrame(animate);
}
// התחלה
loadImages(() => {
    console.log("Game assets loaded.");
});