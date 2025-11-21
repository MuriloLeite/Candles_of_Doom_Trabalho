// enemyAI.js - VERSÃO CORRIGIDA COM CONE TRIANGULAR FUNCIONAL
// Wander + visão com sprite + hitbox AABB que conta 4 hits até Game Over

var EnemyAI = pc.createScript("enemyAI");

EnemyAI.attributes.add("speedWander", { type: "number", default: 1.0 });
EnemyAI.attributes.add("speedChase", { type: "number", default: 2.2 });
EnemyAI.attributes.add("sightDistance", { type: "number", default: 8 });
EnemyAI.attributes.add("sightAngleDeg", { type: "number", default: 120 });
EnemyAI.attributes.add("boundsMin", { type: "vec2", default: [-11, -11] });
EnemyAI.attributes.add("boundsMax", { type: "vec2", default: [11, 11] });
EnemyAI.attributes.add("wanderChangeInterval", {
  type: "number",
  default: 2.5,
});
EnemyAI.attributes.add("hitboxSize", {
  type: "vec2",
  default: [1.0, 1.2],
  title: "Hitbox Size (w,h)",
});
EnemyAI.attributes.add("visionScale", {
  type: "number",
  default: 8.0,
  title: "Vision Cone Scale",
});

EnemyAI.prototype.initialize = function () {
  this._state = "wander";
  this._wanderTimer = 0;
  this._targetPos = this._randomPoint();
  this._player = this.app.root.findByName("Player");
  this._lastMoveDir = new pc.Vec3(1, 0, 0);
  this._currentDirection = "right";

  // Texturas do inimigo
  this.frameTextures = window.GAME_TEXTURES?.enemy || [];

  // Material do inimigo
  var mi =
    this.entity.render &&
    this.entity.render.meshInstances &&
    this.entity.render.meshInstances[0];
  if (mi) {
    this._material = mi.material || new pc.StandardMaterial();
    mi.material = this._material;
  } else {
    this._material = null;
  }

  console.log("🆕 Creating vision cone for", this.entity.name);
  
  // Remove cone antigo se existir
  var oldVision = this.entity.findByName(this.entity.name + "_vision");
  if (oldVision) {
    console.log("Removing old vision cone");
    oldVision.destroy();
  }
  
  // CRIAR CONE TRIANGULAR REAL
  this._vision = new pc.Entity(this.entity.name + "_vision");
  
  // Criar mesh triangular customizado
  this._createTriangleMesh();
  
  // Adiciona à hierarquia
  this.entity.addChild(this._vision);
  
  // Posição inicial
  this._vision.setLocalPosition(0, 0, 0.05);
  this._vision.enabled = true;
  
  // APLICA LAYER (se existir)
  if (window.GAME_LAYERS && window.GAME_LAYERS.VISION) {
    this._vision.render.layers = [window.GAME_LAYERS.VISION];
    console.log("Vision layer applied:", window.GAME_LAYERS.VISION);
  } else {
    console.warn("VISION layer not found - using default layers");
    this._vision.render.layers = [pc.LAYERID_WORLD];
  }

  // Hitbox sizes
  this._hitW = this.hitboxSize.x;
  this._hitH = this.hitboxSize.y;

  // Cooldown para múltiplos hits
  this._lastHitTime = 0;
  this._hitCooldown = 0.8;

  // Contador global de hits
  if (window.PLAYER_HITS === undefined) window.PLAYER_HITS = 0;

  console.log("Enemy initialized with vision cone!");
};

EnemyAI.prototype._createTriangleMesh = function() {
  console.log("Creating triangle mesh...");
  
  try {
    // Criar geometria triangular customizada (cone maior e mais visível)
    var vertices = new Float32Array([
      0, 0, 0,           // Ponto de origem (centro)
      -0.5, 1, 0,        // Ponta esquerda
      0.5, 1, 0          // Ponta direita
    ]);
    
    var indices = new Uint16Array([0, 1, 2]);
    
    var normals = new Float32Array([
      0, 0, 1,
      0, 0, 1,
      0, 0, 1
    ]);
    
    var uvs = new Float32Array([
      0.5, 0,
      0, 1,
      1, 1
    ]);
    
    // Criar mesh
    var mesh = new pc.Mesh(this.app.graphicsDevice);
    mesh.setPositions(vertices);
    mesh.setNormals(normals);
    mesh.setUvs(0, uvs);
    mesh.setIndices(indices);
    mesh.update(pc.PRIMITIVE_TRIANGLES);
    
    console.log("Mesh created successfully");
    
    // Criar material ANTES de adicionar o componente
    var material = new pc.StandardMaterial();
    material.diffuse.set(1, 1, 0); // Amarelo
    material.emissive.set(1, 1, 0);
    material.emissiveIntensity = 1;
    material.opacity = 0.6;
    material.blendType = pc.BLEND_NORMAL;
    material.depthWrite = false;
    material.cull = pc.CULLFACE_NONE; // Renderizar ambos os lados
    material.update();
    
    console.log("Material created");
    
    // Criar mesh instance com o material
    var meshInstance = new pc.MeshInstance(mesh, material);
    
    // Adicionar componente render
    this._vision.addComponent('render', {
      type: 'asset',
      meshInstances: [meshInstance]
    });
    
    console.log("Render component added");
    
    // Configurar escala do cone 
    this._vision.setLocalScale(
      this.visionScale * 0.8, 
      this.sightDistance * 0.8, 
      1
    );
    
    console.log("Scale set to:", this.visionScale * 0.8, this.sightDistance * 0.8);
    
    // Guardar referência do material
    this._visionMat = material;
    
    console.log("Vision cone fully created!");
    
  } catch (error) {
    console.error("Error creating vision cone:", error);
  }
};

EnemyAI.prototype._randomPoint = function () {
  var min = this.boundsMin,
    max = this.boundsMax;
  var x = min.x + Math.random() * (max.x - min.x);
  var y = min.y + Math.random() * (max.y - min.y);
  return new pc.Vec3(x, y, 0);
};

EnemyAI.prototype.update = function (dt) {
  if (!this._player) {
    this._player = this.app.root.findByName("Player");
    if (!this._player) return;
  }

  // Wander change
  this._wanderTimer -= dt;
  if (this._wanderTimer <= 0 && this._state === "wander") {
    this._targetPos = this._randomPoint();
    this._wanderTimer =
      this.wanderChangeInterval + Math.random() * this.wanderChangeInterval;
  }

  // Detect player in sight
  if (this._isPlayerInSight()) {
    this._state = "chase";
    this._targetPos = this._player.getPosition().clone();
  } else if (this._state === "chase") {
    if (!this._chaseLoseTimer) this._chaseLoseTimer = 0.8;
    this._chaseLoseTimer -= dt;
    if (this._chaseLoseTimer <= 0) {
      this._state = "wander";
      this._chaseLoseTimer = 0;
    }
  }

  // Move
  var speed = this._state === "chase" ? this.speedChase : this.speedWander;
  this._moveToward(this._targetPos, speed, dt);

  // Update sprite + vision
  this._updateSpriteAndVision();

  // Check collision with player
  this.checkCollisionWithPlayer();
};

EnemyAI.prototype._moveToward = function (target, speed, dt) {
  var cur = this.entity.getPosition();
  var dir = new pc.Vec3(target.x - cur.x, target.y - cur.y, 0);
  var len = Math.sqrt(dir.x * dir.x + dir.y * dir.y);
  if (len < 0.001) return;
  dir.x /= len;
  dir.y /= len;
  this._lastMoveDir = dir.clone();

  this.entity.translate(dir.x * speed * dt, dir.y * speed * dt, 0);

  var p = this.entity.getLocalPosition();
  p.x = pc.math.clamp(p.x, this.boundsMin.x, this.boundsMax.x);
  p.y = pc.math.clamp(p.y, this.boundsMin.y, this.boundsMax.y);
  this.entity.setLocalPosition(p);
};

EnemyAI.prototype._isPlayerInSight = function () {
  if (!this._player) return false;
  var myPos = this.entity.getPosition();
  var playerPos = this._player.getPosition();
  var v = new pc.Vec3(playerPos.x - myPos.x, playerPos.y - myPos.y, 0);
  var dist = Math.sqrt(v.x * v.x + v.y * v.y);
  if (dist > this.sightDistance) return false;

  var forward =
    this._lastMoveDir && this._lastMoveDir.lengthSq() > 0
      ? this._lastMoveDir.clone()
      : new pc.Vec3(1, 0, 0);
  forward.normalize();
  v.normalize();
  var dot = forward.x * v.x + forward.y * v.y;
  dot = Math.max(-1, Math.min(1, dot));
  var angleDeg = Math.acos(dot) * (180 / Math.PI);
  return angleDeg <= this.sightAngleDeg * 0.5;
};

EnemyAI.prototype._updateSpriteAndVision = function () {
  if (!this._vision || !this._visionMat) return;
  
  var dir = this._lastMoveDir || new pc.Vec3(1, 0, 0);
  if (dir.lengthSq() === 0) dir.set(1, 0, 0);
  
  // Normalizar direção
  dir.normalize();
  
  var absX = Math.abs(dir.x);
  var absY = Math.abs(dir.y);

  var texIdx = 1;
  var flip = false;

  // CALCULAR ÂNGULO DIRETO DO VETOR DE MOVIMENTO
  // atan2 retorna o ângulo em radianos, convertemos para graus
  var angleRad = Math.atan2(dir.y, dir.x);
  var angleDeg = angleRad * (180 / Math.PI);
  
  // Ajustar para o sistema de coordenadas do PlayCanvas
  // (0° = direita, 90° = cima, -90° = baixo, 180° = esquerda)
  var visionAngle = angleDeg - 90; // Subtrai 90° porque o cone base aponta para cima

  // Determinar sprite baseado na direção predominante
  if (absX > absY) {
    texIdx = 2; // Sprite lateral
    flip = dir.x < 0;
    this._currentDirection = dir.x > 0 ? "right" : "left";
  } else {
    if (dir.y > 0) {
      texIdx = 1; // Sprite frente
      this._currentDirection = "front";
    } else {
      texIdx = 0; // Sprite costas
      this._currentDirection = "back";
    }
  }

  // Aplicar textura
  var asset = this.frameTextures && this.frameTextures[texIdx];
  var tex = asset
    ? asset.resource
      ? asset.resource
      : asset instanceof pc.Texture
      ? asset
      : null
    : null;
  
  if (tex && this._material) {
    if (this._material.diffuseMap !== tex) {
      this._material.diffuseMap = tex;
      this._material.emissiveMap = tex;
      this._material.update();
    }
  }

  // Flip horizontal do sprite
  var s = this.entity.getLocalScale();
  this.entity.setLocalScale(flip ? -Math.abs(s.x) : Math.abs(s.x), s.y, s.z);

  // ATUALIZAR CONE DE VISÃO - ROTAÇÃO PRECISA
  this._vision.setLocalEulerAngles(0, 0, visionAngle);
  
  // Offset do cone baseado na direção EXATA
  var offset = 0.3; // Offset pequeno para ficar próximo do inimigo
  var offsetX = dir.x * offset;
  var offsetY = dir.y * offset;
  
  this._vision.setLocalPosition(offsetX, offsetY, 0.05);
  
  // Cor baseada no estado
  if (this._state === "chase") {
    this._visionMat.diffuse.set(1, 0, 0);
    this._visionMat.emissive.set(1, 0, 0);
    this._visionMat.opacity = 0.9;
  } else {
    this._visionMat.diffuse.set(1, 1, 0);
    this._visionMat.emissive.set(1, 1, 0);
    this._visionMat.opacity = 0.8;
  }
  this._visionMat.update();
};

EnemyAI.prototype.getHitboxAabb = function () {
  var pos = this.entity.getPosition();
  var halfW = this._hitW / 2;
  var halfH = this._hitH / 2;
  return {
    minX: pos.x - halfW,
    maxX: pos.x + halfW,
    minY: pos.y - halfH,
    maxY: pos.y + halfH,
  };
};

EnemyAI.prototype.checkCollisionWithPlayer = function () {
  const player = this.app.root.findByName("Player");
  if (!player) return;

  const eBox = this.getHitboxAabb();

  const pPos = player.getPosition();
  const pHalfW = 0.4;
  const pHalfH = 0.5;
  const pBox = {
    minX: pPos.x - pHalfW,
    maxX: pPos.x + pHalfW,
    minY: pPos.y - pHalfH,
    maxY: pPos.y + pHalfH,
  };

  const isColliding = !(
    eBox.maxX < pBox.minX ||
    eBox.minX > pBox.maxX ||
    eBox.maxY < pBox.minY ||
    eBox.minY > pBox.maxY
  );

  const now = Date.now();
  if (isColliding && now - this._lastHitTime > this._hitCooldown * 1000) {
    this._lastHitTime = now;

    if (window.PLAYER_HITS == null) window.PLAYER_HITS = 0;
    window.PLAYER_HITS++;
    console.log(`Player hit by enemy! Hits: ${window.PLAYER_HITS} / 4`);

    if (window.PLAYER_HITS >= 4) {
      console.log("GAME OVER - Player defeated!");
      this.triggerGameOver();
    }
  }
};

EnemyAI.prototype.triggerGameOver = function () {
  if (this._gameOverTriggered) return;
  this._gameOverTriggered = true;

  this.app.timeScale = 0;

  const gameOverDiv = document.createElement("div");
  gameOverDiv.innerHTML =
    "<h1 style='color:red;font-size:48px;text-align:center;margin-top:40vh;'>GAME OVER</h1>";
  gameOverDiv.style.position = "fixed";
  gameOverDiv.style.top = "0";
  gameOverDiv.style.left = "0";
  gameOverDiv.style.width = "100%";
  gameOverDiv.style.height = "100%";
  gameOverDiv.style.background = "rgba(0,0,0,0.7)";
  gameOverDiv.style.zIndex = "9999";
  document.body.appendChild(gameOverDiv);
};