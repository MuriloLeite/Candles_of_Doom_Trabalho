/*
  gameManager.js - CORRIGIDO
  - Global game state and difficulty
  - Tracks torches, spawns enemies with LAYERS
  - Controls win/lose
*/

var GameManager = pc.createScript('gameManager');

// Difficulty selection: Easy, Normal, Hard
GameManager.attributes.add('difficulty', { type: 'string', enum: [
    { 'Easy': 'Easy' }, { 'Normal': 'Normal' }, { 'Hard': 'Hard' }
], default: 'Normal', title: 'Start Difficulty' });

// Player, Altar, UI
GameManager.attributes.add('player', { type: 'entity', title: 'Player' });
GameManager.attributes.add('altar', { type: 'entity', title: 'Altar' });
GameManager.attributes.add('uiManager', { type: 'entity', title: 'UI Manager' });

// Enemy spawn setup
GameManager.attributes.add('enemyPrefab', { type: 'entity', title: 'Enemy Prefab (disabled template entity)' });
GameManager.attributes.add('spawnPoints', { type: 'entity', array: true, title: 'Spawn Points' });

// Torch discovery (auto by tag "torch")
GameManager.attributes.add('torchTag', { type: 'string', default: 'torch', title: 'Torch Tag' });

// Win/Lose
GameManager.attributes.add('requireAllLitForWin', { type: 'boolean', default: true, title: 'Win When All Lit' });
GameManager.attributes.add('victoryHoldSeconds', { type: 'number', default: 5.0, title: 'Hold All Lit For (s)' });

// Internal difficulty table
GameManager.prototype._getDifficultyTable = function () {
    return {
        Easy:   { enemySpeed: 1.6, detectRange: 6,  spawnInterval: 10, maxEnemies: 4, extinguishTime: 3.0 },
        Normal: { enemySpeed: 2.1, detectRange: 8,  spawnInterval: 7,  maxEnemies: 6, extinguishTime: 2.2 },
        Hard:   { enemySpeed: 2.7, detectRange: 10, spawnInterval: 5,  maxEnemies: 8, extinguishTime: 1.6 }
    };
};

GameManager.prototype.initialize = function () {
    console.log("GameManager initializing...");
    
    // Persisted difficulty from menu (optional)
    try {
        var saved = pc.platform.browser && window && window.localStorage.getItem('ash:difficulty');
        if (saved) this.difficulty = saved;
    } catch(e) {}

    // State
    this._state = 'paused'; // playing | paused | victory | defeat
    this._difficultyParams = this._getDifficultyTable()[this.difficulty] || this._getDifficultyTable().Normal;
    this._torchEntities = [];
    this._litCount = 0;
    this._totalTorches = 0;
    this._currentMaxEnemies = 3; // start with 3 max enemies

    // Register event listeners
    this.app.on('torch:lit', this._onTorchLit, this);
    this.app.on('torch:unlit', this._onTorchUnlit, this);
    this.app.on('game:pause', this._onPause, this);
    this.app.on('game:resume', this._onResume, this);
    this.app.on('game:restart', this._onRestart, this);
    this.app.on('game:reset', this.resetGame, this);
    this.app.on('game:victory', this._onVictory, this);
    this.app.on('game:defeat', this._onDefeat, this);

    // Discover torches by tag
    this._collectTorches();

    // Apply initial HUD
    this._updateHUD();

    // Enemy spawn loop
    this._enemies = [];
    this._spawnTimer = 2.0; // Spawn primeiro inimigo após 2s

    // Inform altar about total count
    this._updateAltar();
    
    console.log("GameManager initialized. Difficulty:", this.difficulty);
    console.log("Params:", this._difficultyParams);
};

GameManager.prototype.onDestroy = function () {
    this.app.off('torch:lit', this._onTorchLit, this);
    this.app.off('torch:unlit', this._onTorchUnlit, this);
    this.app.off('game:pause', this._onPause, this);
    this.app.off('game:resume', this._onResume, this);
    this.app.off('game:restart', this._onRestart, this);
    this.app.off('game:victory', this._onVictory, this);
    this.app.off('game:defeat', this._onDefeat, this);
};

GameManager.prototype._collectTorches = function () {
    var tagged = this.app.root.findByTag(this.torchTag);
    this._torchEntities = tagged || [];
    this._totalTorches = this._torchEntities.length;
    console.log("Found", this._totalTorches, "torches");
    
    // compute lit count
    this._litCount = 0;
    for (var i = 0; i < this._torchEntities.length; i++) {
        var t = this._torchEntities[i];
        var ts = t.script && t.script.torch;
        if (ts && ts.isLit()) this._litCount++;
    }
};

GameManager.prototype._onTorchLit = function (torchScript) {
    this._litCount++;
    console.log("Torch lit! Total:", this._litCount, "/", this._totalTorches);
    this._updateHUD();
    this._updateAltar();

    // Increase max enemies when a torch is lit
    if (this._litCount <= 4) {
        this._currentMaxEnemies = 3 + this._litCount; // 4,5,6,7 for 1,2,3,4 torches
        console.log("Max enemies increased to:", this._currentMaxEnemies);
    }

    if (this.requireAllLitForWin) {
        // Start victory hold check
        if (this._litCount >= this._totalTorches && this._totalTorches > 0) {
            var self = this;
            // schedule a check after hold seconds
            this._victoryCheckTime = this.victoryHoldSeconds;
            this._pendingVictory = true;
            console.log("All torches lit! Victory in", this.victoryHoldSeconds, "seconds...");
        }
    }
};

GameManager.prototype._onTorchUnlit = function (torchScript) {
    this._litCount = Math.max(0, this._litCount - 1);
    this._pendingVictory = false;
    console.log("Torch extinguished! Total:", this._litCount, "/", this._totalTorches);
    this._updateHUD();
    this._updateAltar();

    if (this._litCount === 0 && this._totalTorches > 0) {
        this._onDefeat();
    }
};

GameManager.prototype._updateAltar = function () {
    if (this.altar && this.altar.script && this.altar.script.altar) {
        this.app.fire('altar:update', this._litCount, this._totalTorches);
    }
};

GameManager.prototype._updateHUD = function () {
    this.app.fire('hud:update', {
        lit: this._litCount,
        total: this._totalTorches,
        difficulty: this.difficulty,
        enemies: this._enemies ? this._enemies.length : 0
    });
};

GameManager.prototype._onPause = function () { 
    this._state = 'paused';
    console.log("Game paused");
};

GameManager.prototype._onResume = function () { 
    this._state = 'playing';
    console.log("Game resumed - state is now:", this._state);
    console.log("Current status:", {
        spawnTimer: this._spawnTimer.toFixed(2),
        enemies: this._enemies.length,
        maxEnemies: this._currentMaxEnemies
    });
};

GameManager.prototype._onRestart = function () {
    console.log("Restarting game...");
    this.resetGame();
    this.app.fire('game:resume');
};

GameManager.prototype._onVictory = function () {
    if (this._state === 'victory') return;
    this._state = 'victory';
    console.log("VICTORY!");
    this.app.fire('game:state', { state: 'victory' });
    this.app.fire('game:pause');
};

GameManager.prototype._onDefeat = function () {
    if (this._state === 'defeat') return;
    this._state = 'defeat';
    console.log("DEFEAT!");
    this.app.fire('game:state', { state: 'defeat' });
    this.app.fire('game:pause');
};

GameManager.prototype.update = function (dt) {
    if (this._state !== 'playing') {
        // Log apenas na primeira vez que detectar pause
        if (!this._loggedPause) {
            console.log("Update skipped - state is:", this._state);
            this._loggedPause = true;
        }
        return;
    }
    
    // Reset flag quando voltar a playing
    this._loggedPause = false;

    // Victory hold check
    if (this._pendingVictory) {
        this._victoryCheckTime -= dt;
        if (this._victoryCheckTime <= 0) {
            // verify still all lit
            var allLit = true;
            for (var i = 0; i < this._torchEntities.length; i++) {
                var ts = this._torchEntities[i].script && this._torchEntities[i].script.torch;
                if (!ts || !ts.isLit()) { allLit = false; break; }
            }
            if (allLit) {
                this._onVictory();
            }
            this._pendingVictory = false;
        }
    }

    // Spawn enemies
    this._spawnTimer -= dt;
    
    // Log a cada 5 segundos
    if (!this._lastLogTime) this._lastLogTime = 0;
    this._lastLogTime += dt;
    if (this._lastLogTime >= 5) {
        console.log("Spawn status:", {
            timer: this._spawnTimer.toFixed(2),
            enemies: this._enemies.length,
            max: this._currentMaxEnemies
        });
        this._lastLogTime = 0;
    }
    
    if (this._spawnTimer <= 0) {
        this._spawnTimer = this._difficultyParams.spawnInterval;
        
        // Remove destroyed enemies from array
        this._enemies = this._enemies.filter(function(e) {
            return e && e.parent;
        });
        
        if (this._enemies.length < this._currentMaxEnemies) {
            console.log("Spawning enemy... Current:", this._enemies.length, "/ Max:", this._currentMaxEnemies);
            this._spawnEnemy();
            this._updateHUD();
        } else {
            console.log("Max enemies reached:", this._enemies.length, "/", this._currentMaxEnemies);
        }
    }
};

GameManager.prototype._spawnEnemy = function () {
    if (!this.enemyPrefab) {
        console.error("No enemy prefab set!");
        return;
    }
    
    // Sempre usa spawn points
    var pos;
    if (this.spawnPoints && this.spawnPoints.length > 0) {
        var sp = this.spawnPoints[Math.floor(Math.random() * this.spawnPoints.length)];
        pos = sp.getPosition().clone();
    } else {
        // Fallback: topo do mapa se não houver spawn points
        console.warn("No spawn points, using top of map");
        pos = new pc.Vec3(
            Math.random() * 20 - 10, // x: -10 a 10
            10, // y: topo
            0.02 // z: acima do background
        );
    }
    
    console.log("Spawning at:", pos.x.toFixed(2), pos.y.toFixed(2), pos.z.toFixed(2));
    
    // Clone enemy
    var clone = this.enemyPrefab.clone();
    clone.enabled = true;
    clone.name = "Enemy_" + Date.now(); // Nome único
    this.entity.addChild(clone);
    clone.setPosition(pos);
    
    console.log("Enemy cloned:", clone.name);
    
    // CRITICAL: Aplica layers ao clone
    if (window.GAME_LAYERS) {
        if (clone.render) {
            clone.render.layers = [window.GAME_LAYERS.ENEMIES];
            console.log("Applied ENEMIES layer");
        } else {
            console.error("Clone has no render component!");
        }
    } else {
        console.error("GAME_LAYERS not found!");
    }
    
    // Ensure enemy has EnemyAI
    if (!clone.script || !clone.script.enemyAI) {
        console.warn("Clone missing enemyAI script, creating...");
        if (!clone.script) clone.addComponent('script');
        clone.script.create('enemyAI');
    }
    
    if (clone.script && clone.script.enemyAI) {
        clone.script.enemyAI.gameManager = this.entity;
        clone.script.enemyAI.extinguishTime = this._difficultyParams.extinguishTime;
        console.log("Enemy AI configured");
    } else {
        console.error("Failed to create enemyAI script!");
    }

    this._enemies.push(clone);
    console.log("Enemy spawned! Total:", this._enemies.length, "| Position:", pos);
};

GameManager.prototype.resetGame = function () {
    console.log("Resetting game...");
    
    // Re-read difficulty from localStorage if provided
    try {
        var saved = pc.platform.browser && window && window.localStorage.getItem('ash:difficulty');
        if (saved) {
            this.difficulty = saved;
            console.log("Loaded difficulty from localStorage:", saved);
        }
    } catch(e) {}
    this._difficultyParams = this._getDifficultyTable()[this.difficulty] || this._getDifficultyTable().Normal;
    
    console.log("Using params:", this._difficultyParams);

    // Reset max enemies
    this._currentMaxEnemies = 3;

    // Destroy spawned enemies
    if (this._enemies) {
        console.log("🧹 Destroying", this._enemies.length, "enemies");
        for (var i = 0; i < this._enemies.length; i++) {
            if (this._enemies[i] && this._enemies[i].destroy) {
                this._enemies[i].destroy();
            }
        }
    }
    this._enemies = [];
    this._spawnTimer = 2.0; // Reset spawn timer - primeiro spawn em 2s
    console.log("Spawn timer reset to:", this._spawnTimer);

    // Reset torches
    this._collectTorches();
    for (var t = 0; t < this._torchEntities.length; t++) {
        var te = this._torchEntities[t];
        var ts = te.script && te.script.torch;
        if (ts) {
            ts.setLit(!!ts.startLit);
        }
    }
    
    // Recount lit
    this._litCount = 0;
    for (var j = 0; j < this._torchEntities.length; j++) {
        var ts2 = this._torchEntities[j].script && this._torchEntities[j].script.torch;
        if (ts2 && ts2.isLit()) this._litCount++;
    }
    
    this._pendingVictory = false;
    this._updateHUD();
    this._updateAltar();
    
    console.log("Game reset complete. Ready to spawn enemies!");
};

