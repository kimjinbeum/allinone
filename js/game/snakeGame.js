let snakeAnimationFrameId;
let snakeGameRunning = false;
let snakeInitialized = false;

function initSnakeGame() {
    const canvas = document.getElementById('snake-canvas');
    if (!canvas) return;

    if (snakeInitialized) return;
    snakeInitialized = true;

    const ctx = canvas.getContext('2d');
    const scoreEl = document.getElementById('snake-score');
    const levelEl = document.getElementById('snake-level');
    const startBtn = document.getElementById('snake-start-btn');
    const gameOverEl = document.getElementById('snake-game-over-section');

    const gridSize = 20; // Size of each grid cell
    const tileCountX = canvas.width / gridSize;
    const tileCountY = canvas.height / gridSize;

    let snake = [];
    let apple = { x: 0, y: 0 };
    let dx = 0;
    let dy = 0;
    let score = 0;
    let level = 1;
    let speed = 7; // Initial speed (frames per second)
    let lastRenderTime = 0;

    // --- Colors for 3D-like effect ---
    const snakeHeadColor = '#4CAF50'; // Darker green for head
    const snakeBodyColor = '#8BC34A'; // Lighter green for body
    const appleColor = '#F44336'; // Red for apple

    // Helper to darken hex colors for the 3D shading
    function darkenColor(color, percent) {
        let R = parseInt(color.substring(1,3),16);
        let G = parseInt(color.substring(3,5),16);
        let B = parseInt(color.substring(5,7),16);

        R = parseInt(R * (100 - percent) / 100);
        G = parseInt(G * (100 - percent) / 100);
        B = parseInt(B * (100 - percent) / 100);

        R = (R<255)?R:255;  
        G = (G<255)?G:255;  
        B = (B<255)?B:255;  

        const RR = ((R.toString(16).length==1)?"0"+R.toString(16):R.toString(16));
        const GG = ((G.toString(16).length==1)?"0"+G.toString(16):G.toString(16));
        const BB = ((B.toString(16).length==1)?"0"+B.toString(16):B.toString(16));

        return "#"+RR+GG+BB;
    }

    // --- Helper to draw a connected 3D-like segment ---
    // prev, next: the coordinates of the previous and next snake segments to determine connections
    function drawSegment(x, y, mainColor, prev, next) {
        const px = x * gridSize;
        const py = y * gridSize;
        const offset = gridSize * 0.15; // 3D depth offset
        const innerSize = gridSize - offset;

        // Draw the main body of the segment
        ctx.fillStyle = mainColor;
        ctx.fillRect(px, py, gridSize, gridSize);

        // Draw top face (highlight)
        ctx.fillStyle = darkenColor(mainColor, -15); // Lighter
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + gridSize, py);
        ctx.lineTo(px + gridSize - offset, py + offset);
        ctx.lineTo(px + offset, py + offset);
        ctx.closePath();
        ctx.fill();

        // Draw right face (shadow)
        ctx.fillStyle = darkenColor(mainColor, 25); // Darker
        ctx.beginPath();
        ctx.moveTo(px + gridSize, py);
        ctx.lineTo(px + gridSize, py + gridSize);
        ctx.lineTo(px + gridSize - offset, py + gridSize - offset);
        ctx.lineTo(px + gridSize - offset, py + offset);
        ctx.closePath();
        ctx.fill();

        // Fill connection gaps for smoother look
        // Connect to previous segment
        if (prev) {
            if (prev.x < x) { // Connected from left
                ctx.fillRect(px, py + offset, offset, innerSize);
            } else if (prev.x > x) { // Connected from right
                ctx.fillRect(px + innerSize, py + offset, offset, innerSize);
            } else if (prev.y < y) { // Connected from top
                ctx.fillRect(px + offset, py, innerSize, offset);
            } else if (prev.y > y) { // Connected from bottom
                ctx.fillRect(px + offset, py + innerSize, innerSize, offset);
            }
        }
        // Connect to next segment
        if (next) {
            if (next.x < x) { // Connected to left
                ctx.fillRect(px, py + offset, offset, innerSize);
            } else if (next.x > x) { // Connected to right
                ctx.fillRect(px + innerSize, py + offset, offset, innerSize);
            } else if (next.y < y) { // Connected to top
                ctx.fillRect(px + offset, py, innerSize, offset);
            } else if (next.y > y) { // Connected to bottom
                ctx.fillRect(px + offset, py + innerSize, innerSize, offset);
            }
        }
    }

    function drawApple3D(x, y) {
        const px = x * gridSize;
        const py = y * gridSize;
        const radius = gridSize / 2;
        const offset = gridSize * 0.15;

        // Main sphere body
        ctx.beginPath();
        ctx.arc(px + radius, py + radius, radius, 0, Math.PI * 2);
        ctx.fillStyle = appleColor;
        ctx.fill();

        // Highlight (top-left)
        ctx.beginPath();
        ctx.arc(px + radius * 0.7, py + radius * 0.7, radius * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fill();

        // Shadow (bottom-right)
        ctx.beginPath();
        ctx.arc(px + radius * 1.3, py + radius * 1.3, radius * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fill();

        // Stem
        ctx.fillStyle = '#8B4513'; // Brown
        ctx.fillRect(px + radius - 2, py, 4, radius * 0.6);
    }

    function drawSnakeHead(x, y, currentDx, currentDy, next) {
        drawSegment(x, y, snakeHeadColor, null, next); // Head has no 'prev'

        ctx.fillStyle = 'black';
        const eyeRadius = gridSize * 0.15;
        const eyeOffset = gridSize * 0.25;
        const headPx = x * gridSize;
        const headPy = y * gridSize;

        // Eyes adjusted for 3D perspective
        if (currentDy === -1) { // Up
            ctx.beginPath(); ctx.arc(headPx + gridSize / 2 - eyeOffset, headPy + gridSize / 2 - eyeOffset, eyeRadius, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(headPx + gridSize / 2 + eyeOffset, headPy + gridSize / 2 - eyeOffset, eyeRadius, 0, Math.PI * 2); ctx.fill();
        } else if (currentDy === 1) { // Down
            ctx.beginPath(); ctx.arc(headPx + gridSize / 2 - eyeOffset, headPy + gridSize / 2 + eyeOffset, eyeRadius, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(headPx + gridSize / 2 + eyeOffset, headPy + gridSize / 2 + eyeOffset, eyeRadius, 0, Math.PI * 2); ctx.fill();
        } else if (currentDx === -1) { // Left
            ctx.beginPath(); ctx.arc(headPx + gridSize / 2 - eyeOffset, headPy + gridSize / 2 - eyeOffset, eyeRadius, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(headPx + gridSize / 2 - eyeOffset, headPy + gridSize / 2 + eyeOffset, eyeRadius, 0, Math.PI * 2); ctx.fill();
        } else if (currentDx === 1) { // Right
            ctx.beginPath(); ctx.arc(headPx + gridSize / 2 + eyeOffset, headPy + gridSize / 2 - eyeOffset, eyeRadius, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(headPx + gridSize / 2 + eyeOffset, headPy + gridSize / 2 + eyeOffset, eyeRadius, 0, Math.PI * 2); ctx.fill();
        }
    }


    function resetGame() {
        snake = [
            { x: Math.floor(tileCountX / 2), y: Math.floor(tileCountY / 2) },
            { x: Math.floor(tileCountX / 2), y: Math.floor(tileCountY / 2) + 1 },
            { x: Math.floor(tileCountX / 2), y: Math.floor(tileCountY / 2) + 2 }
        ];
        dx = 0;
        dy = -1; // Initial direction (up)
        score = 0;
        level = 1;
        speed = 7;
        scoreEl.textContent = score;
        levelEl.textContent = level;
        placeApple();
    }

    function placeApple() {
        apple.x = Math.floor(Math.random() * tileCountX);
        apple.y = Math.floor(Math.random() * tileCountY);

        for (let i = 0; i < snake.length; i++) {
            if (apple.x === snake[i].x && apple.y === snake[i].y) {
                placeApple(); 
                return;
            }
        }
    }

    function updateGameLogic() {
        const head = { x: snake[0].x + dx, y: snake[0].y + dy };

        if (head.x < 0 || head.x >= tileCountX || head.y < 0 || head.y >= tileCountY) {
            return gameOver();
        }

        for (let i = 0; i < snake.length; i++) {
            if (head.x === snake[i].x && head.y === snake[i].y) {
                return gameOver();
            }
        }

        snake.unshift(head); 

        if (head.x === apple.x && head.y === apple.y) {
            score += 10;
            scoreEl.textContent = score;
            
            if (score % 50 === 0) {
                level++;
                levelEl.textContent = level;
                speed += 1; 
            }
            placeApple();
        } else {
            snake.pop(); 
        }
    }

    function drawGame() {
        ctx.fillStyle = '#111'; 
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.strokeStyle = '#222';
        for(let i=0; i<tileCountX; i++){
            ctx.beginPath(); ctx.moveTo(i*gridSize, 0); ctx.lineTo(i*gridSize, canvas.height); ctx.stroke();
        }
        for(let i=0; i<tileCountY; i++){
            ctx.beginPath(); ctx.moveTo(0, i*gridSize); ctx.lineTo(canvas.width, i*gridSize); ctx.stroke();
        }

        drawApple3D(apple.x, apple.y);

        // Draw snake from tail to head
        for (let i = snake.length - 1; i >= 0; i--) {
            const prev = i > 0 ? snake[i - 1] : null;
            const next = i < snake.length - 1 ? snake[i + 1] : null;

            if (i === 0) {
                drawSnakeHead(snake[i].x, snake[i].y, dx, dy, next);
            } else {
                drawSegment(snake[i].x, snake[i].y, snakeBodyColor, prev, next);
            }
        }
    }

    function main(currentTime) {
        if (!snakeGameRunning) return;

        snakeAnimationFrameId = window.requestAnimationFrame(main);

        const secondsSinceLastRender = (currentTime - lastRenderTime) / 1000;
        if (secondsSinceLastRender < 1 / speed) return;

        lastRenderTime = currentTime;

        updateGameLogic();
        if (snakeGameRunning) {
            drawGame();
        }
    }

    function gameOver() {
        snakeGameRunning = false;
        cancelAnimationFrame(snakeAnimationFrameId);
        gameOverEl.style.display = 'flex';
        startBtn.style.display = 'inline-block';
        startBtn.textContent = '다시 시작';
    }

    function startGame() {
        const snakeMenu = document.getElementById('snake-game-menu');
        if (!snakeMenu.classList.contains('active')) return;

        if (snakeGameRunning) return;

        resetGame();
        gameOverEl.style.display = 'none';
        startBtn.style.display = 'none';
        
        snakeGameRunning = true;
        lastRenderTime = performance.now();
        main(performance.now());
    }

    // --- Event Listeners ---
    function keyDown(e) {
        const snakeMenu = document.getElementById('snake-game-menu');
        if (!snakeMenu || !snakeMenu.classList.contains('active')) return;

        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
            e.preventDefault();
        }

        if (!snakeGameRunning && e.key === 'Enter') {
            startGame();
            return;
        }

        if (!snakeGameRunning) return;

        if (e.key === 'ArrowUp' && dy !== 1) {
            dx = 0; dy = -1;
        } else if (e.key === 'ArrowDown' && dy !== -1) {
            dx = 0; dy = 1;
        } else if (e.key === 'ArrowLeft' && dx !== 1) {
            dx = -1; dy = 0;
        } else if (e.key === 'ArrowRight' && dx !== -1) {
            dx = 1; dy = 0;
        }
    }

    document.removeEventListener('keydown', keyDown);
    document.addEventListener('keydown', keyDown);
    
    startBtn.onclick = startGame;
    
    resetGame();
    drawGame();
}
