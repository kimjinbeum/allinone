let animationFrameId;
let gameRunning = false;
let spaceInvadersInitialized = false;

function initGame() {
    const canvas = document.getElementById('space-invaders-canvas');
    if (!canvas) return;
    
    if (spaceInvadersInitialized) return;
    spaceInvadersInitialized = true;

    const ctx = canvas.getContext('2d');
    
    // 1. 게임 내부 해상도 완전 고정: 세로를 가로의 2배(1:2)로 길게 변경하여 세로 길이를 체감되도록 확장
    canvas.width = 600;
    canvas.height = 1200;
    
    // 2. 화면 크기에 맞춰 CSS 디스플레이 사이즈만 동적으로 조절 (중앙 정렬, 부모 영역 맞춤, 스크롤 완벽 차단)
    function resizeCanvas() {
        // 브라우저 전체 및 내부 컨테이너 세로 스크롤바 생성 원천 차단
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
        
        // 모바일 기기인지 판별 (흰색 카드 패딩값까지 고려하여 가로 여백을 넉넉히 확보)
        const isMobile = window.innerWidth <= 768;
        const marginX = isMobile ? 60 : 80; 
        const marginY = isMobile ? 220 : 280; 
        
        const availableWidth = window.innerWidth - marginX;
        const availableHeight = window.innerHeight - marginY;
        
        let scale = Math.min(availableWidth / canvas.width, availableHeight / canvas.height);
        
        // 캔버스 자체를 화면 한가운데로 중앙 정렬
        canvas.style.display = 'block';
        canvas.style.margin = '0 auto';
        
        const finalWidth = Math.floor(canvas.width * scale);
        const finalHeight = Math.floor(canvas.height * scale);
        canvas.style.width = finalWidth + 'px';
        canvas.style.height = finalHeight + 'px'; 
        canvas.style.maxWidth = '100%'; // 캔버스가 화면을 뚫고 나가는 것 추가 방지
        canvas.style.objectFit = 'contain'; // 가로가 축소될 때 캔버스 찌그러짐 방지
        
        // 부모 흰색 배경(.game-container)이 CSS 제한 때문에 안 커지는 현상 무력화 및 캔버스 핏에 맞춤
        const gameContainer = document.querySelector('.game-container');
        if (gameContainer) {
            gameContainer.style.width = '100%'; // fit-content 대신 100%로 변경하여 강제 반응형 축소 유도
            gameContainer.style.maxWidth = (finalWidth + 40) + 'px'; // 캔버스 폭 + 내부 패딩만큼만 허용
            gameContainer.style.boxSizing = 'border-box'; // 패딩 포함 크기 계산
            gameContainer.style.maxHeight = 'none'; // CSS 최대 높이 제한 해제 (흰색 카드가 길어지도록)
            gameContainer.style.margin = '0 auto'; // 화면 정중앙에 배치
            gameContainer.style.height = 'auto'; // 고정 높이 속성 완전 해제
            gameContainer.style.minHeight = 'fit-content'; // 캔버스 세로 길이에 맞춰 무조건 늘어나게 보장
            gameContainer.style.overflow = 'hidden'; // 미세하게 삐져나오는 여백을 숨겨 내부 스크롤 차단
            gameContainer.style.wordWrap = 'break-word'; // 긴 텍스트(조작 설명 등)가 박스를 뚫지 않고 자연스럽게 줄바꿈되도록 유도
            gameContainer.style.whiteSpace = 'normal';
        }
        
        // 상단 점수판 텍스트가 컨테이너를 강제로 넓히는 것 방지
        const infoBar = document.querySelector('.game-info-bar');
        if (infoBar) {
            infoBar.style.display = 'flex';
            infoBar.style.flexWrap = 'wrap'; // 좁으면 점수와 레벨이 자연스럽게 줄바꿈됨
            infoBar.style.justifyContent = 'space-between';
        }

        // 캔버스를 직접 감싸는 컨테이너 영역의 제한도 해제
        const canvasContainer = document.querySelector('.game-canvas-container');
        if (canvasContainer) {
            canvasContainer.style.maxHeight = 'none';
            canvasContainer.style.maxWidth = '100%';
            canvasContainer.style.height = 'auto';
        }
        
        // 최상위 메뉴 영역도 가운데 정렬되도록 지원
        const menuContainer = document.getElementById('space-invaders-menu');
        if (menuContainer) {
            menuContainer.style.width = '100%';
            menuContainer.style.height = 'auto';
            menuContainer.style.maxHeight = 'none';
            menuContainer.style.overflow = 'hidden';
            menuContainer.style.boxSizing = 'border-box';
            // 강제로 display 속성을 변경하면 다른 탭(화면)일 때도 노출되는 버그가 생기므로 제거
        }
    }
    
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas(); // 초기 1회 실행

    const scoreEl = document.getElementById('game-score');
    const levelEl = document.getElementById('game-level');
    const startBtn = document.getElementById('game-start-btn');
    const gameOverEl = document.getElementById('game-over-section');

    // --- Icons (Emojis) ---
    const playerIcon = '🚀'; // 정면을 바라보는 아이콘
    const enemyIcons = ['👾','👽','🛸','🐛','🦋','🦇','🦂','🕷️','🐝','🦟'];
    const bossIcons = ['👹','👺','🐲','🐙','🦑','🦖','🦍','🦈','🐅','🐊'];
    const itemWeaponIcon = '⚡';
    const itemLifeIcon = '❤️';

    // --- Game Objects ---
    const player = {
        x: canvas.width / 2 - 20,
        y: canvas.height - 40,
        width: 40,
        height: 40,
        speed: 5,
        dx: 0,
        dy: 0, // 상하 이동 속도 추가
        lives: 3,
        weaponLevel: 1,
        invulnerableUntil: 0, // 피격 시 무적 시간
        isShooting: false, // 자동 사격 상태
        lastShotTime: 0, // 사격 쿨다운 제어
        draw() {
            // 무적 시간 깜빡임 효과
            if (Date.now() < this.invulnerableUntil && Math.floor(Date.now() / 100) % 2 === 0) return;

            // 로켓 아이콘(-45도 회전하여 정면을 바라보게 처리)
            ctx.save();
            ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
            ctx.rotate(-45 * Math.PI / 180);
            ctx.font = '36px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(playerIcon, 0, 0);
            ctx.restore();
            
            ctx.font = '20px Arial';
            ctx.textAlign = 'right';
            ctx.fillText('❤️'.repeat(this.lives), canvas.width - 10, 25);
        },
        move() {
            this.x += this.dx;
            this.y += this.dy;
            if (this.x < 0) this.x = 0;
            if (this.x + this.width > canvas.width) this.x = canvas.width - this.width;
            if (this.y < 0) this.y = 0;
            if (this.y + this.height > canvas.height) this.y = canvas.height - this.height;
        }
    };

    const bullets = [];
    const enemies = [];
    const enemyBullets = [];
    const items = [];

    let score = 0;
    let level = 1;
    let maxLevel = 50;
    let stageStartTime = 0;
    let isBossSpawned = false;

    // --- Game Functions ---
    function fireBullets() {
        const now = Date.now();
        if (now - player.lastShotTime < 150) return; // 연사 방지 쿨다운 (150ms)
        player.lastShotTime = now;

        const bSpeed = 8;
        const dmg = player.weaponLevel; // 아이템 먹을 시 미사일 1발당 데미지 1씩 증가
        if (player.weaponLevel === 1) {
            bullets.push({ x: player.x + player.width / 2 - 2, y: player.y, width: 4, height: 15, speed: bSpeed, damage: dmg });
        } else if (player.weaponLevel === 2) {
            bullets.push({ x: player.x + player.width / 2 - 12, y: player.y, width: 4, height: 15, speed: bSpeed, damage: dmg });
            bullets.push({ x: player.x + player.width / 2 + 8, y: player.y, width: 4, height: 15, speed: bSpeed, damage: dmg });
        } else {
            bullets.push({ x: player.x + player.width / 2 - 2, y: player.y - 10, width: 4, height: 15, speed: bSpeed, damage: dmg });
            bullets.push({ x: player.x + player.width / 2 - 15, y: player.y, width: 4, height: 15, speed: bSpeed, damage: dmg });
            bullets.push({ x: player.x + player.width / 2 + 11, y: player.y, width: 4, height: 15, speed: bSpeed, damage: dmg });
        }
    }

    function spawnNormalEnemy() {
        const size = 35;
        const x = Math.random() * (canvas.width - size);
        const hp = 1 + Math.floor(level / 5);
        const speed = 2 + (level * 0.1) + Math.random();
        const eIcon = enemyIcons[Math.floor(Math.random() * enemyIcons.length)];
        enemies.push({
            x: x, y: -size, width: size, height: size,
            hp: hp, maxHp: hp, speed: speed, icon: eIcon, isBoss: false
        });
    }

    function spawnBoss() {
        isBossSpawned = true;
        const size = 100;
        const bIcon = bossIcons[(level - 1) % bossIcons.length];
        // 보스 피통 1000 + 스테이지 비례
        const bossHp = 1000 + ((level - 1) * 300); 
        
        enemies.push({
            x: canvas.width / 2 - size / 2, y: -size, 
            width: size, height: size,
            hp: bossHp, maxHp: bossHp, speed: 1.5, dx: 2, 
            icon: bIcon, isBoss: true
        });
    }

    function drawEnemies() {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        enemies.forEach(enemy => {
            ctx.font = enemy.isBoss ? '80px Arial' : '35px Arial';
            ctx.fillText(enemy.icon, enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
        });
    }

    // 플레이어 방향으로 유도 사격
    function fireTargetedBullet(sourceX, sourceY, isBoss) {
        const targetX = player.x + player.width / 2;
        const targetY = player.y + player.height / 2;
        
        const angle = Math.atan2(targetY - sourceY, targetX - sourceX);
        const speed = isBoss ? 5 + (level * 0.2) : 3 + (level * 0.1);
        
        enemyBullets.push({
            x: sourceX - 3,
            y: sourceY,
            width: isBoss ? 10 : 6, 
            height: isBoss ? 20 : 12,
            dx: Math.cos(angle) * speed,
            dy: Math.sin(angle) * speed
        });
    }

    function moveEnemies() {
        for (let i = enemies.length - 1; i >= 0; i--) {
            let enemy = enemies[i];
            
            if (enemy.isBoss) {
                if (enemy.y < 50) {
                    enemy.y += enemy.speed; // 보스 등장 시 천천히 내려옴
                } else {
                    enemy.x += enemy.dx; // 좌우 이동
                    if (enemy.x < 0 || enemy.x + enemy.width > canvas.width) {
                        enemy.dx *= -1;
                    }
                    // 보스 미사일 발사 (스테이지 상승 시 확률 증가)
                    if (Math.random() < 0.03 + (level * 0.005)) {
                        fireTargetedBullet(enemy.x + enemy.width / 2, enemy.y + enemy.height, true);
                    }
                }
            } else {
                enemy.y += enemy.speed; // 위에서 아래로
                if (enemy.y > canvas.height) {
                    enemies.splice(i, 1); // 화면 밖으로 나가면 삭제
                    continue;
                }
                // 일반 몬스터 미사일 발사
                if (Math.random() < 0.005 + (level * 0.001)) {
                    fireTargetedBullet(enemy.x + enemy.width / 2, enemy.y + enemy.height, false);
                }
            }
        }
    }

    function playerHit() {
        if (Date.now() < player.invulnerableUntil) return; // 무적 시간 적용
        player.lives--;
        player.weaponLevel = 1;
        player.invulnerableUntil = Date.now() + 2000; // 2초간 무적
        if (player.lives <= 0) gameOver();
    }

    function collisionDetection() {
        for (let i = bullets.length - 1; i >= 0; i--) {
            let b = bullets[i];
            let hit = false;
            for (let j = enemies.length - 1; j >= 0; j--) {
                let e = enemies[j];
                if (b.x < e.x + e.width && b.x + b.width > e.x &&
                    b.y < e.y + e.height && b.y + b.height > e.y) {
                    e.hp -= b.damage; // 플레이어 무기 레벨 비례 데미지
                    hit = true;
                    if (e.hp <= 0) {
                        let dropChance = Math.random();
                        if (dropChance < 0.20 && !e.isBoss) { // 보스가 아닐때만 아이템 드랍
                            items.push({
                                x: e.x + e.width / 2 - 10, y: e.y + e.height / 2, width: 20, height: 20,
                                type: dropChance < 0.10 ? 'weapon' : 'life', speed: 2
                            });
                        }
                        score += (e.isBoss ? 1000 : 10) * level;
                        scoreEl.textContent = score;
                        enemies.splice(j, 1);
                        
                        if (e.isBoss) {
                            // 보스 처치 시 다음 스테이지로
                            nextLevel();
                        }
                    }
                    break;
                }
            }
            if (hit) bullets.splice(i, 1);
        }

        for (let i = enemyBullets.length - 1; i >= 0; i--) {
            let eb = enemyBullets[i];
            if (eb.x < player.x + player.width && eb.x + eb.width > player.x &&
                eb.y < player.y + player.height && eb.y + eb.height > player.y) {
                enemyBullets.splice(i, 1);
                playerHit();
            }
        }

        for (let i = items.length - 1; i >= 0; i--) {
            let item = items[i];
            if (item.x < player.x + player.width && item.x + item.width > player.x &&
                item.y < player.y + player.height && item.y + item.height > player.y) {
                if (item.type === 'weapon') player.weaponLevel = Math.min(player.weaponLevel + 1, 3);
                else if (item.type === 'life') player.lives++;
                items.splice(i, 1);
            }
        }

        // 몬스터와 플레이어 직접 충돌 확인
        for (let i = 0; i < enemies.length; i++) {
            let e = enemies[i];
            if (player.x < e.x + e.width && player.x + player.width > e.x &&
                player.y < e.y + e.height && player.y + player.height > e.y) {
                playerHit();
                if (!e.isBoss) {
                    enemies.splice(i, 1); // 일반 몬스터는 충돌 후 삭제
                    i--;
                }
            }
        }
    }

    function startStage() {
        levelEl.textContent = level;
        stageStartTime = Date.now();
        isBossSpawned = false;
        bullets.length = 0;
        enemyBullets.length = 0;
        enemies.length = 0;
        items.length = 0;
        player.x = canvas.width / 2 - player.width / 2;
        player.y = canvas.height - 40;
        player.invulnerableUntil = Date.now() + 2000;
    }

    function nextLevel() {
        if (level >= maxLevel) {
            gameOver(true);
            return;
        }
        level++;
        startStage();
    }

    function update() {
        if (!gameRunning) return;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 1분 타이머 및 적 스폰 로직
        const elapsedTime = Date.now() - stageStartTime;
        const timeLeft = Math.max(0, 60 - Math.floor(elapsedTime / 1000));
        
        if (!isBossSpawned && timeLeft <= 0) {
            spawnBoss();
        } else if (!isBossSpawned && Math.random() < 0.02 + (level * 0.002)) {
            spawnNormalEnemy();
        }

        // 모바일 터치 또는 스페이스바를 누르고 있을 때 연속 사격
        if (player.isShooting) {
            fireBullets();
        }

        player.move();
        player.draw();

        ctx.fillStyle = '#5bc0de';
        for (let i = bullets.length - 1; i >= 0; i--) {
            let b = bullets[i];
            b.y -= b.speed;
            ctx.fillRect(b.x, b.y, b.width, b.height);
            if (b.y < 0) bullets.splice(i, 1);
        }

        moveEnemies();
        drawEnemies();

        ctx.fillStyle = '#d9534f';
        for (let i = enemyBullets.length - 1; i >= 0; i--) {
            let eb = enemyBullets[i];
            eb.x += eb.dx;
            eb.y += eb.dy;
            ctx.fillRect(eb.x, eb.y, eb.width, eb.height);
            if (eb.y > canvas.height || eb.y < 0 || eb.x < 0 || eb.x > canvas.width) enemyBullets.splice(i, 1);
        }

        ctx.font = '20px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        for (let i = items.length - 1; i >= 0; i--) {
            let item = items[i];
            item.y += item.speed;
            ctx.fillText(item.type === 'weapon' ? itemWeaponIcon : itemLifeIcon, item.x, item.y);
            if (item.y > canvas.height) items.splice(i, 1);
        }

        // 보스 HP 바 및 타이머 UI 그리기
        if (isBossSpawned) {
            const boss = enemies.find(e => e.isBoss);
            if (boss) {
                ctx.fillStyle = 'red';
                const hpWidth = (boss.hp / boss.maxHp) * (canvas.width - 40);
                ctx.fillRect(20, 40, hpWidth, 10);
                ctx.strokeStyle = 'white';
                ctx.strokeRect(20, 40, canvas.width - 40, 10);
                ctx.fillStyle = 'white';
                ctx.font = '14px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(`BOSS HP: ${boss.hp}`, canvas.width / 2, 35);
            }
        } else {
            ctx.fillStyle = 'white';
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`보스 출현까지: ${timeLeft}초`, canvas.width / 2, 40);
        }

        collisionDetection();

        animationFrameId = requestAnimationFrame(update);
    }

    function gameOver(isClear = false) {
        gameRunning = false;
        cancelAnimationFrame(animationFrameId);
        gameOverEl.style.display = 'flex';
        startBtn.style.display = 'inline-block';
        startBtn.textContent = isClear ? '게임 클리어! 다시 시작' : '다시 시작';
    }

    function startGame() {
        const spaceInvadersMenu = document.getElementById('space-invaders-menu');
        if (!spaceInvadersMenu.classList.contains('active')) return;

        if (gameRunning) return;

        score = 0;
        level = 1;
        player.lives = 3;
        player.weaponLevel = 1;
        
        scoreEl.textContent = score;
        gameOverEl.style.display = 'none';
        startBtn.style.display = 'none';
        
        startStage();
        
        gameRunning = true;
        update();
    }

    // 터치 시 플레이어 위치 업데이트 (손가락에 가리지 않게 약간 위로 조정)
    function updatePlayerPositionByTouch(touch) {
        const rect = canvas.getBoundingClientRect();
        
        // 축소/확대된 화면 비율(Scale) 계산
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        // 실제 화면 터치 픽셀 위치를 600x900 게임 내부 좌표로 변환
        const touchX = (touch.clientX - rect.left) * scaleX;
        const touchY = (touch.clientY - rect.top) * scaleY;
        
        player.x = touchX - player.width / 2;
        player.y = touchY - player.height - 40; 

        // 화면 밖으로 나가지 않게 경계선 처리
        if (player.x < 0) player.x = 0;
        if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;
        if (player.y < 0) player.y = 0;
        if (player.y + player.height > canvas.height) player.y = canvas.height - player.height;
    }

    // --- Event Listeners ---
    function keyDown(e) {
        const spaceInvadersMenu = document.getElementById('space-invaders-menu');
        if (!spaceInvadersMenu || !spaceInvadersMenu.classList.contains('active')) return;

        if (['Spacebar', ' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
            e.preventDefault();
        }

        if (!gameRunning && e.key === 'Enter') {
            startGame();
            return;
        }

        if (!gameRunning) return;

        if (e.key === 'ArrowRight' || e.key === 'Right') {
            player.dx = player.speed;
        } else if (e.key === 'ArrowLeft' || e.key === 'Left') {
            player.dx = -player.speed;
        } else if (e.key === 'ArrowUp' || e.key === 'Up') {
            player.dy = -player.speed;
        } else if (e.key === 'ArrowDown' || e.key === 'Down') {
            player.dy = player.speed;
        } else if (e.key === ' ' || e.key === 'Spacebar') {
            player.isShooting = true;
            fireBullets();
        }
    }

    function keyUp(e) {
        if (
            e.key === 'ArrowRight' ||
            e.key === 'Right' ||
            e.key === 'ArrowLeft' ||
            e.key === 'Left'
        ) {
            player.dx = 0;
        }
        if (
            e.key === 'ArrowUp' ||
            e.key === 'Up' ||
            e.key === 'ArrowDown' ||
            e.key === 'Down'
        ) {
            player.dy = 0;
        }
        if (e.key === ' ' || e.key === 'Spacebar') {
            player.isShooting = false;
        }
    }

    // 모바일 터치 이벤트 핸들러
    function touchStart(e) {
        if (!gameRunning) return;
        e.preventDefault();
        player.isShooting = true;
        updatePlayerPositionByTouch(e.touches[0]);
    }

    function touchMove(e) {
        if (!gameRunning) return;
        e.preventDefault();
        updatePlayerPositionByTouch(e.touches[0]);
    }

    function touchEnd(e) {
        if (!gameRunning) return;
        e.preventDefault();
        player.isShooting = false;
    }

    document.removeEventListener('keydown', keyDown);
    document.removeEventListener('keyup', keyUp);
    canvas.removeEventListener('touchstart', touchStart);
    canvas.removeEventListener('touchmove', touchMove);
    canvas.removeEventListener('touchend', touchEnd);
    canvas.removeEventListener('touchcancel', touchEnd);

    document.addEventListener('keydown', keyDown);
    document.addEventListener('keyup', keyUp);
    
    canvas.addEventListener('touchstart', touchStart, { passive: false });
    canvas.addEventListener('touchmove', touchMove, { passive: false });
    canvas.addEventListener('touchend', touchEnd, { passive: false });
    canvas.addEventListener('touchcancel', touchEnd, { passive: false });
    
    startBtn.onclick = startGame;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    player.draw();
}
