// --- CONFIGURATIONS ---
// --- 设定闯关模式的限定时间 ---
const CHALLENGE_CONFIG = {
    1: { size: 3, timeLimit: 90 },
    2: { size: 4, timeLimit: 180 },
    3: { size: 5, timeLimit: 300 }
};

const TRADITIONAL_PIECES_INITIAL_STATE = [
    { id: 'caocao', name: '曹操', x: 1, y: 0, w: 2, h: 2, img: 'images/曹操.png' },
    { id: 'guanyu', name: '关羽', x: 1, y: 2, w: 2, h: 1, img: 'images/关羽.png' },
    { id: 'zhangfei', name: '张飞', x: 0, y: 0, w: 1, h: 2, img: 'images/张飞.png' },
    { id: 'zhaoyun', name: '赵云', x: 3, y: 0, w: 1, h: 2, img: 'images/赵云.png' },
    { id: 'machao', name: '马超', x: 0, y: 2, w: 1, h: 2, img: 'images/马超.png' },
    { id: 'huangzhong', name: '黄忠', x: 3, y: 2, w: 1, h: 2, img: 'images/黄忠.png' },
    { id: 'soldier1', name: '兵', x: 1, y: 3, w: 1, h: 1, img: 'images/小小兵.png' },
    { id: 'soldier2', name: '兵', x: 2, y: 3, w: 1, h: 1, img: 'images/小小兵.png' },
    { id: 'soldier3', name: '兵', x: 0, y: 4, w: 1, h: 1, img: 'images/小小兵.png' },
    { id: 'soldier4', name: '兵', x: 3, y: 4, w: 1, h: 1, img: 'images/小小兵.png' }
];

let unlockedLevel = 1;

// --- GAME CLASSES ---

class KlotskiGame {
    constructor() {
        this.boardElement = document.getElementById('klotskiBoard');
        this.moveCountElement = document.getElementById('klotskiMoveCount');
        this.pieces = [];
        this.moves = 0;
        this.isGameActive = false;
        this.boardWidth = 4;
        this.boardHeight = 5;

        // Drag state
        this.draggedPiece = null;
        this.draggedElement = null;
        this.startX = 0;
        this.startY = 0;
        this.initialPieceX = 0;
        this.initialPieceY = 0;
        this.dragAxis = null; // 'horizontal', 'vertical', or null
        this.dragThreshold = 10; // pixels to move before locking axis
    }

    start() {
        this.isGameActive = true;
        this.moves = 0;
        this.pieces = JSON.parse(JSON.stringify(TRADITIONAL_PIECES_INITIAL_STATE));
        this.updateMoveCount();
        this.renderBoard();
    }

    renderBoard() {
        this.boardElement.innerHTML = '';
        this.pieces.forEach(p => {
            const pieceEl = document.createElement('div');
            pieceEl.className = 'klotski-piece';
            pieceEl.id = p.id;
            pieceEl.style.gridColumn = `${p.x + 1} / span ${p.w}`;
            pieceEl.style.gridRow = `${p.y + 1} / span ${p.h}`;
            pieceEl.style.backgroundImage = `url(${p.img})`;
            
            pieceEl.addEventListener('mousedown', (e) => this.onDragStart(e, p));
            pieceEl.addEventListener('touchstart', (e) => this.onDragStart(e, p), { passive: false });
            
            this.boardElement.appendChild(pieceEl);
        });
    }

    onDragStart(e, piece) {
        if (!this.isGameActive) return;
        e.preventDefault();

        this.draggedPiece = piece;
        this.draggedElement = document.getElementById(piece.id);
        this.draggedElement.classList.add('selected');
        this.draggedElement.style.zIndex = '1000';

        this.initialPieceX = piece.x;
        this.initialPieceY = piece.y;

        const event = e.touches ? e.touches[0] : e;
        this.startX = event.clientX;
        this.startY = event.clientY;
        this.dragAxis = null; // Reset axis on new drag

        this.onDragMove = this.onDragMove.bind(this);
        this.onDragEnd = this.onDragEnd.bind(this);

        document.addEventListener('mousemove', this.onDragMove);
        document.addEventListener('mouseup', this.onDragEnd);
        document.addEventListener('touchmove', this.onDragMove, { passive: false });
        document.addEventListener('touchend', this.onDragEnd);
    }
    
    onDragMove(e) {
        if (!this.draggedPiece) return;
        e.preventDefault();
        
        const event = e.touches ? e.touches[0] : e;
        let dx = event.clientX - this.startX;
        let dy = event.clientY - this.startY;

        if (!this.dragAxis && (Math.abs(dx) > this.dragThreshold || Math.abs(dy) > this.dragThreshold)) {
            this.dragAxis = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical';
        }

        const { min, max } = this.getDragBounds();
        
        if (this.dragAxis === 'horizontal') {
            dy = 0;
            dx = Math.max(min, Math.min(dx, max));
        } else if (this.dragAxis === 'vertical') {
            dx = 0;
            dy = Math.max(min, Math.min(dy, max));
        } else {
            // Don't move until axis is determined
            dx = 0;
            dy = 0;
        }

        this.draggedElement.style.transform = `translate(${dx}px, ${dy}px)`;
    }

    isPositionOccupied(x, y, w, h, ignoredPieceId) {
        if (x < 0 || y < 0 || x + w > this.boardWidth || y + h > this.boardHeight) {
            return true;
        }
        for (const other of this.pieces) {
            if (other.id === ignoredPieceId) continue;
            if (x < other.x + other.w && x + w > other.x &&
                y < other.y + other.h && y + h > other.y) {
                return true;
            }
        }
        return false;
    }

    onDragEnd(e) {
        if (!this.draggedPiece) return;
        e.preventDefault();
        
        const piece = this.draggedPiece;
        const cellWidth = this.boardElement.clientWidth / this.boardWidth;
        const cellHeight = this.boardElement.clientHeight / this.boardHeight;
        
        const transform = new DOMMatrix(getComputedStyle(this.draggedElement).transform);
        const finalDx = this.dragAxis === 'horizontal' ? transform.m41 : 0;
        const finalDy = this.dragAxis === 'vertical' ? transform.m42 : 0;
        
        const gridDeltaX = Math.round(finalDx / cellWidth);
        const gridDeltaY = Math.round(finalDy / cellHeight);

        let finalGridX = this.initialPieceX;
        let finalGridY = this.initialPieceY;

        if (this.dragAxis === 'horizontal' && gridDeltaX !== 0) {
            const step = Math.sign(gridDeltaX);
            for (let i = 1; i <= Math.abs(gridDeltaX); i++) {
                const nextX = this.initialPieceX + i * step;
                if (this.isPositionOccupied(nextX, this.initialPieceY, piece.w, piece.h, piece.id)) {
                    break;
                }
                finalGridX = nextX;
            }
        } else if (this.dragAxis === 'vertical' && gridDeltaY !== 0) {
            const step = Math.sign(gridDeltaY);
            for (let i = 1; i <= Math.abs(gridDeltaY); i++) {
                const nextY = this.initialPieceY + i * step;
                if (this.isPositionOccupied(this.initialPieceX, nextY, piece.w, piece.h, piece.id)) {
                    break;
                }
                finalGridY = nextY;
            }
        }

        piece.x = finalGridX;
        piece.y = finalGridY;

        if (finalGridX !== this.initialPieceX || finalGridY !== this.initialPieceY) {
            this.moves++;
            this.updateMoveCount();
            slidingPuzzleGame.playSound('move');
            if (this.checkWin()) {
                this.gameWin();
            }
        }

        this.draggedElement.classList.remove('selected');
        this.draggedElement.style.zIndex = '';
        this.draggedElement.style.transform = '';
        document.removeEventListener('mousemove', this.onDragMove);
        document.removeEventListener('mouseup', this.onDragEnd);
        document.removeEventListener('touchmove', this.onDragMove);
        document.removeEventListener('touchend', this.onDragEnd);
        
        this.draggedPiece = null;
        this.draggedElement = null;
        this.renderBoard();
    }

    // --- MODIFIED: getDragBounds with correct logic ---
    getDragBounds() {
        const piece = this.draggedPiece;
        // This check is important because clientWidth/clientHeight can be 0 if the element is not visible
        if (!this.boardElement.clientWidth || !this.boardElement.clientHeight) {
            return { min: 0, max: 0 };
        }
        const cellWidth = this.boardElement.clientWidth / this.boardWidth;
        const cellHeight = this.boardElement.clientHeight / this.boardHeight;

        let minPixelBound = -Infinity;
        let maxPixelBound = Infinity;

        if (this.dragAxis === 'horizontal') {
            let leftEdgeBoundary = 0;
            let rightEdgeBoundary = this.boardWidth;

            for (const other of this.pieces) {
                if (other.id === piece.id) continue;
                if (other.y < piece.y + piece.h && other.y + other.h > piece.y) {
                    if (other.x < piece.x) { // Obstacle to the left
                        leftEdgeBoundary = Math.max(leftEdgeBoundary, other.x + other.w);
                    } else { // Obstacle to the right
                        rightEdgeBoundary = Math.min(rightEdgeBoundary, other.x);
                    }
                }
            }
            minPixelBound = (leftEdgeBoundary - piece.x) * cellWidth;
            maxPixelBound = (rightEdgeBoundary - (piece.x + piece.w)) * cellWidth;

        } else if (this.dragAxis === 'vertical') {
            let topEdgeBoundary = 0;
            let bottomEdgeBoundary = this.boardHeight;

            for (const other of this.pieces) {
                if (other.id === piece.id) continue;
                if (other.x < piece.x + piece.w && other.x + other.w > piece.x) {
                    if (other.y < piece.y) { // Obstacle above
                        topEdgeBoundary = Math.max(topEdgeBoundary, other.y + other.h);
                    } else { // Obstacle below
                        bottomEdgeBoundary = Math.min(bottomEdgeBoundary, other.y);
                    }
                }
            }
            minPixelBound = (topEdgeBoundary - piece.y) * cellHeight;
            maxPixelBound = (bottomEdgeBoundary - (piece.y + piece.h)) * cellHeight;
        }

        return { min: minPixelBound, max: maxPixelBound };
    }

    updateMoveCount() {
        this.moveCountElement.textContent = this.moves;
    }

    checkWin() {
        const caoCao = this.pieces.find(p => p.name === '曹操');
        return caoCao.x === 1 && caoCao.y === 3;
    }

    gameWin() {
        this.isGameActive = false;
        slidingPuzzleGame.playSound('win');
        showWinModal({
            title: '横刀立马，解围成功！',
            subtitle: '你成功帮助曹操逃出华容道！',
            stats: `总步数：${this.moves}`,
            message: '真乃神机妙算！',
            showNextBtn: false
        });
    }
}

class SlidingPuzzle {
    constructor() {
        this.size = 4;
        this.board = [];
        this.emptyPos = { row: 0, col: 0 };
        this.moves = 0;
        this.startTime = null;
        this.gameTimer = null;
        this.soundEnabled = true;
        this.isGameActive = false;
        this.gameMode = 'number';
        this.imageUrl = null;
        this.challengeLevel = 0;
        this.timeLimit = 0;
        this.remainingTime = 0;
        try { this.audioContext = new (window.AudioContext || window.webkitAudioContext)(); } 
        catch (e) { this.audioContext = null; }
        
        this.initializeGame();
        this.bindEvents();
    }

    initializeGame() { this.createSolvedBoard(); this.renderBoard(); }
    createSolvedBoard() { this.board = []; for (let i = 0; i < this.size; i++) { this.board[i] = []; for (let j = 0; j < this.size; j++) { const value = i * this.size + j + 1; this.board[i][j] = value === this.size * this.size ? 0 : value; } } this.emptyPos = { row: this.size - 1, col: this.size - 1 }; }
    shuffleBoard() { const moves = this.size * this.size * 20; for (let i = 0; i < moves; i++) { const validMoves = this.getValidMoves(); if (validMoves.length > 0) { const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)]; this.moveTile(randomMove.row, randomMove.col, false); } } this.moves = 0; this.updateMoveCount(); }
    getValidMoves() { const moves = []; const directions = [ { row: -1, col: 0 }, { row: 1, col: 0 }, { row: 0, col: -1 }, { row: 0, col: 1 } ]; for (const dir of directions) { const newRow = this.emptyPos.row + dir.row; const newCol = this.emptyPos.col + dir.col; if (newRow >= 0 && newRow < this.size && newCol >= 0 && newCol < this.size) { moves.push({ row: newRow, col: newCol }); } } return moves; }
    moveTile(row, col, countMove = true) { const rowDiff = Math.abs(row - this.emptyPos.row); const colDiff = Math.abs(col - this.emptyPos.col); if ((rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1)) { this.board[this.emptyPos.row][this.emptyPos.col] = this.board[row][col]; this.board[row][col] = 0; this.emptyPos = { row, col }; if (countMove) { this.moves++; this.updateMoveCount(); this.playSound('move'); } this.renderBoard(); if (countMove && this.checkWin()) { this.gameWin(); } return true; } return false; }
    checkWin() { for (let i = 0; i < this.size; i++) { for (let j = 0; j < this.size; j++) { const expectedValue = i * this.size + j + 1; const actualValue = this.board[i][j]; if (i === this.size - 1 && j === this.size - 1) { if (actualValue !== 0) return false; } else { if (actualValue !== expectedValue) return false; } } } return true; }
    
    gameWin() {
        this.isGameActive = false;
        clearInterval(this.gameTimer);
        this.playSound('win');
        
        let winData = {};
        if (this.gameMode === 'challenge') {
            unlockedLevel = Math.max(unlockedLevel, this.challengeLevel + 1);
            winData = {
                title: `<i class="fas fa-trophy"></i> 第 ${this.challengeLevel} 关通过！`,
                subtitle: '你太棒了！准备好迎接下一关了吗？',
                stats: `用时：${document.getElementById('timeDisplay').textContent}，步数：${this.moves}`,
                showNextBtn: this.challengeLevel < Object.keys(CHALLENGE_CONFIG).length
            };
            if (!winData.showNextBtn) {
                document.getElementById('nextChallengeBtn').textContent = '返回关卡选择';
                document.getElementById('nextChallengeBtn').onclick = () => { closeWinModal(); showChallengeScreen(); };
            }
        } else {
            winData = {
                title: '<i class="fas fa-trophy"></i> 恭喜你！',
                subtitle: '你成功完成了挑战！',
                stats: `用时：${document.getElementById('timeDisplay').textContent}，步数：${this.moves}`,
                showNextBtn: true
            };
        }
        showWinModal(winData);
    }
    
    challengeFailed() { this.isGameActive = false; clearInterval(this.gameTimer); this.playSound('move'); document.getElementById('failModal').style.display = 'flex'; }
    showCelebration() { const celebration = document.getElementById('celebration'); celebration.innerHTML = ''; const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#f0932b', '#eb4d4b', '#6c5ce7']; for (let i = 0; i < 50; i++) { const confetti = document.createElement('div'); confetti.className = 'confetti'; confetti.style.left = Math.random() * 100 + '%'; confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)]; confetti.style.animationDelay = Math.random() * 3 + 's'; confetti.style.animationDuration = (Math.random() * 2 + 2) + 's'; celebration.appendChild(confetti); } }
    renderBoard() { const boardElement = document.getElementById('puzzleBoard'); boardElement.className = `puzzle-board size-${this.size}`; boardElement.innerHTML = ''; for (let i = 0; i < this.size; i++) { for (let j = 0; j < this.size; j++) { const tile = document.createElement('div'); const value = this.board[i][j]; if (value === 0) { tile.className = 'tile empty'; } else { tile.addEventListener('click', () => { if (this.isGameActive) this.moveTile(i, j); }); if (this.gameMode === 'picture' && this.imageUrl) { tile.className = 'tile picture'; const bgSize = this.size * 100; tile.style.backgroundImage = `url(${this.imageUrl})`; tile.style.backgroundSize = `${bgSize}% ${bgSize}%`; const correctCol = (value - 1) % this.size; const correctRow = Math.floor((value - 1) / this.size); const bgPosX = (correctCol / (this.size - 1)) * 100; const bgPosY = (correctRow / (this.size - 1)) * 100; tile.style.backgroundPosition = `${bgPosX}% ${bgPosY}%`; } else { tile.className = 'tile number'; tile.textContent = value; } } boardElement.appendChild(tile); } } }
    startTimer() { this.startTime = Date.now(); clearInterval(this.gameTimer); this.gameTimer = setInterval(() => { const elapsed = Date.now() - this.startTime; const minutes = Math.floor(elapsed / 60000); const seconds = Math.floor((elapsed % 60000) / 1000); document.getElementById('timeDisplay').textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`; }, 1000); }
    startChallengeTimer() { this.remainingTime = this.timeLimit; clearInterval(this.gameTimer); const timeDisplay = document.getElementById('timeDisplay'); const updateTimer = () => { if (!this.isGameActive) { clearInterval(this.gameTimer); return; } const minutes = Math.floor(this.remainingTime / 60); const seconds = this.remainingTime % 60; timeDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`; if (this.remainingTime <= 10) { timeDisplay.classList.add('warning'); } else { timeDisplay.classList.remove('warning'); } if (this.remainingTime <= 0) { this.challengeFailed(); } else { this.remainingTime--; } }; updateTimer(); this.gameTimer = setInterval(updateTimer, 1000); }
    updateMoveCount() { document.getElementById('moveCount').textContent = this.moves; }
    
    bindEvents() { 
        document.getElementById('imageUpload').addEventListener('change', (e) => {
             const file = e.target.files[0]; if (file) { const allowedTypes = ['image/jpeg', 'image/png']; if (!allowedTypes.includes(file.type)) { showMessage('请选择 JPG 或 PNG 格式的图片。', '文件类型无效'); e.target.value = ''; return; } const fileSizeMB = file.size / 1024 / 1024; if (fileSizeMB > 3) { showMessage('请选择小于 3MB 的图片。', '图片文件过大'); e.target.value = ''; return; } const reader = new FileReader(); reader.onload = (event) => { selectImageAndProceed(event.target.result); }; reader.readAsDataURL(file); } 
        });
    }

    playSound(type) { if (!this.soundEnabled || !this.audioContext) return; const audioContext = this.audioContext; const oscillator = audioContext.createOscillator(); const gainNode = audioContext.createGain(); oscillator.connect(gainNode); gainNode.connect(audioContext.destination); switch(type) { case 'move': oscillator.frequency.setValueAtTime(800, audioContext.currentTime); gainNode.gain.setValueAtTime(0.1, audioContext.currentTime); gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1); break; case 'win': oscillator.frequency.setValueAtTime(523, audioContext.currentTime); oscillator.frequency.setValueAtTime(659, audioContext.currentTime + 0.1); oscillator.frequency.setValueAtTime(784, audioContext.currentTime + 0.2); gainNode.gain.setValueAtTime(0.2, audioContext.currentTime); gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5); break; } oscillator.start(); oscillator.stop(audioContext.currentTime + 0.5); }
}

// --- GLOBAL STATE & FUNCTIONS ---

let slidingPuzzleGame = new SlidingPuzzle();
let klotskiGame = new KlotskiGame();
let activeGame = 'sliding';

document.addEventListener('keydown', (e) => {
    if (activeGame === 'sliding' && slidingPuzzleGame.isGameActive) {
        if (!slidingPuzzleGame.isGameActive) return; let targetRow = slidingPuzzleGame.emptyPos.row, targetCol = slidingPuzzleGame.emptyPos.col; switch(e.key) { case 'ArrowUp': targetRow++; break; case 'ArrowDown': targetRow--; break; case 'ArrowLeft': targetCol++; break; case 'ArrowRight': targetCol--; break; default: return; } if (targetRow >= 0 && targetRow < slidingPuzzleGame.size && targetCol >= 0 && targetCol < slidingPuzzleGame.size) { slidingPuzzleGame.moveTile(targetRow, targetCol); e.preventDefault(); }
    }
});

function switchScreen(screenId) {
    const allScreens = ['menuScreen', 'difficultySelect', 'gameScreen', 'imageSelectScreen', 'challengeScreen', 'traditionalScreen'];
    allScreens.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.style.display = 'none';
        }
    });
    
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.style.display = 'flex';
    }
}


function showMenu() {
    switchScreen('menuScreen');
    slidingPuzzleGame.isGameActive = false;
    klotskiGame.isGameActive = false;
    clearInterval(slidingPuzzleGame.gameTimer);
    unlockedLevel = 1; 
    document.getElementById('timeDisplay').classList.remove('warning');
}

function showClassicDifficultySelect() { activeGame = 'sliding'; slidingPuzzleGame.gameMode = 'number'; slidingPuzzleGame.imageUrl = null; switchScreen('difficultySelect'); }
function showImageSelectScreen() { activeGame = 'sliding'; slidingPuzzleGame.gameMode = 'picture'; switchScreen('imageSelectScreen'); }
function selectImageAndProceed(imageUrl) { slidingPuzzleGame.imageUrl = imageUrl; switchScreen('difficultySelect'); }
function showChallengeScreen() { activeGame = 'sliding'; switchScreen('challengeScreen'); for (let level = 1; level <= Object.keys(CHALLENGE_CONFIG).length; level++) { const btn = document.getElementById(`levelBtn${level}`); if (level <= unlockedLevel) { btn.classList.remove('locked'); btn.disabled = false; } else { btn.classList.add('locked'); btn.disabled = true; } } }
function startGame(size) { slidingPuzzleGame.gameMode = slidingPuzzleGame.imageUrl ? 'picture' : 'number'; slidingPuzzleGame.size = size; slidingPuzzleGame.moves = 0; slidingPuzzleGame.isGameActive = true; document.getElementById('difficultyDisplay').textContent = `${size}×${size}`; switchScreen('gameScreen'); slidingPuzzleGame.createSolvedBoard(); slidingPuzzleGame.shuffleBoard(); slidingPuzzleGame.renderBoard(); slidingPuzzleGame.startTimer(); }
function startChallenge(level) { if (level > unlockedLevel) return; const config = CHALLENGE_CONFIG[level]; activeGame = 'sliding'; slidingPuzzleGame.gameMode = 'challenge'; slidingPuzzleGame.challengeLevel = level; slidingPuzzleGame.size = config.size; slidingPuzzleGame.timeLimit = config.timeLimit; slidingPuzzleGame.moves = 0; slidingPuzzleGame.isGameActive = true; document.getElementById('difficultyDisplay').textContent = `第 ${level} 关`; switchScreen('gameScreen'); slidingPuzzleGame.createSolvedBoard(); slidingPuzzleGame.shuffleBoard(); slidingPuzzleGame.renderBoard(); slidingPuzzleGame.startChallengeTimer(); }

function startTraditionalMode() {
    activeGame = 'klotski';
    switchScreen('traditionalScreen');
    klotskiGame.start();
}

function restartGame() {
    if (activeGame === 'klotski') {
        klotskiGame.start();
    } else {
        if (slidingPuzzleGame.gameMode === 'challenge') {
            closeFailModal();
            startChallenge(slidingPuzzleGame.challengeLevel);
        } else {
            slidingPuzzleGame.isGameActive = true;
            slidingPuzzleGame.moves = 0;
            clearInterval(slidingPuzzleGame.gameTimer);
            slidingPuzzleGame.shuffleBoard();
            slidingPuzzleGame.renderBoard();
            slidingPuzzleGame.startTimer();
        }
    }
}

function nextChallenge() { closeWinModal(); if (slidingPuzzleGame.gameMode === 'challenge') { const nextLevel = slidingPuzzleGame.challengeLevel + 1; if (CHALLENGE_CONFIG[nextLevel]) { startChallenge(nextLevel); } } else { const nextSize = slidingPuzzleGame.size < 5 ? slidingPuzzleGame.size + 1 : 3; startGame(nextSize); } }
function closeFailModal() { document.getElementById('failModal').style.display = 'none'; }
function showHint() { if (slidingPuzzleGame.gameMode === 'picture' && slidingPuzzleGame.imageUrl) { const messageHtml = `<img src="${slidingPuzzleGame.imageUrl}" class="hint-image" alt="完成图预览"><p>这就是完整的图片样子！</p>`; showMessage(messageHtml, '图片提示', true); } else { showMessage('试着将数字按顺序排列，从左上角的1开始！支持键盘方向键操作。', '游戏提示'); } }

function showInstructions() { 
    const htmlText = `
    <p style="text-align: left; margin-bottom: 15px;">
        <strong>数字/图片/闯关模式：</strong><br>
        点击或用键盘方向键移动方块，按顺序完成拼图。
    </p>
    <p style="text-align: left;">
        <strong>传统模式：</strong><br>
        按住并拖动棋子进行移动，帮助曹操（最大的方块）从下方出口逃脱。
    </p>
    <p style="text-align: left;">
        <strong>关于上传个人图片说明：</strong><br>
        用户上传图片的所有处理都在用户的浏览器内部完成。整个过程中，图片文件或其数据从未被上传到任何服务器。 它只是从用户的硬盘/相册进入了浏览器的内存，然后显示在屏幕上，数据不离设备 (最重要的安全保障)。
    </p>
`;
showMessage(htmlText, '游戏说明', true);  
}

function showWinModal({title, subtitle, stats, message = '', showNextBtn = false}) {
    document.getElementById('winTitle').innerHTML = title;
    document.getElementById('winSubtitle').textContent = subtitle;
    document.getElementById('winStats').textContent = stats;
    document.getElementById('winMessage').textContent = message;
    
    const nextBtn = document.getElementById('nextChallengeBtn');
    nextBtn.style.display = showNextBtn ? 'inline-block' : 'none';
    if(showNextBtn) {
        nextBtn.textContent = '下一关';
        nextBtn.onclick = nextChallenge;
    }

    slidingPuzzleGame.showCelebration();
    setTimeout(() => document.getElementById('winModal').style.display = 'flex', 500);
}

function showMessage(text, title = '提示', isHtml = false) { document.getElementById('messageTitle').textContent = title; const messageTextElement = document.getElementById('messageText'); if (isHtml) { messageTextElement.innerHTML = text; } else { messageTextElement.textContent = text; } document.getElementById('messageModal').style.display = 'flex'; }
function closeMessageModal() { document.getElementById('messageModal').style.display = 'none'; }
function closeWinModal() { document.getElementById('winModal').style.display = 'none'; showMenu(); }
document.getElementById('soundToggle').addEventListener('click', function() { slidingPuzzleGame.soundEnabled = !slidingPuzzleGame.soundEnabled; this.querySelector('i').className = slidingPuzzleGame.soundEnabled ? 'fas fa-volume-up' : 'fas fa-volume-mute'; });
document.addEventListener('click', function(e) { if (e.target.classList.contains('modal')) { e.target.style.display = 'none'; } });
document.addEventListener('touchstart', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
let lastTouchEnd = 0;
document.addEventListener('touchend', (e) => { const now = Date.now(); if (now - lastTouchEnd <= 300) e.preventDefault(); lastTouchEnd = now; }, false);

showMenu();