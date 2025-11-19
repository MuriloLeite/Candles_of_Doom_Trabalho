// enemyAI.js - ATUALIZADO COM LAYERS
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

  // ⭐ SEMPRE CRIA UM NOVO CONE DE VISÃO
  console.log("🆕 Creating vision cone for", this.entity.name);
  
  // Remove cone antigo se existir
  var oldVision = this.entity.findByName(this.entity.name + "_vision");
  if (oldVision) {
    console.log("🗑️ Removing old vision cone");
    oldVision.destroy();
  }
  
  // ⭐ CRIAR ENTIDADE VISION - USANDO BOX para melhor visibilidade
  this._vision = new pc.Entity(this.entity.name + "_vision");
  this._vision.addComponent("render", { 
    type: "box", // ⭐ Mudado de plane para box
    castShadows: false,
    receiveShadows: false
  });
  
  // Adiciona à hierarquia ANTES de configurar layers
  this.entity.addChild(this._vision);
  
  // ⭐ APLICA LAYER DEPOIS de adicionar à hierarquia
  if (window.GAME_LAYERS && window.GAME_LAYERS.VISION) {
    this._vision.render.layers = [window.GAME_LAYERS.VISION];
    console.log("✅ Vision layer applied:", window.GAME_LAYERS.VISION);
  } else {
    console.warn("⚠️ VISION layer not found! Using default.");
  }
  
  // Posição e escala inicial (cone triangular achatado)
  this._vision.setLocalPosition(0, 0, 0.03); // Z maior para garantir visibilidade
  this._vision.setLocalScale(6, 6, 0.05); // Escala grande e achatado
  this._vision.enabled = true;

  // ⭐ Material SUPER VISÍVEL (amarelo brilhante opaco)
  this._visionMat = new pc.StandardMaterial();
  this._visionMat.useLighting = false;
  this._visionMat.blendType = pc.BLEND_NORMAL;
  this._visionMat.opacity = 0.7; // Bem visível
  this._visionMat.emissive = new pc.Color(1, 1, 0); // Amarelo puro
  this._visionMat.emissiveIntensity = 1.5; // Bem brilhante
  this._visionMat.depthWrite = false;
  this._visionMat.cull = pc.CULLFACE_NONE; // Renderiza dos dois lados
  this._visionMat.update();
  
  if (this._vision.render && this._vision.render.meshInstances[0]) {
    this._vision.render.meshInstances[0].material = this._visionMat;
    console.log("✅ Vision material applied (bright yellow, opacity 0.7)");
  } else {
    console.error("❌ Failed to apply vision material!");
  }

  // Carregar texturas de visão
  this._visionAssets = {
    front: window.GAME_TEXTURES?.vision?.[1],
    back: window.GAME_TEXTURES?.vision?.[0],
    side: window.GAME_TEXTURES?.vision?.[2],
  };

  if (!this._visionAssets.front && !this._visionAssets.back && !this._visionAssets.side) {
    this._useSimpleCone = true;
  }

  // Hitbox sizes
  this._hitW = this.hitboxSize.x;
  this._hitH = this.hitboxSize.y;

  // Cooldown para múltiplos hits
  this._lastHitTime = 0;
  this._hitCooldown = 0.8;

  // Contador global de hits
  if (window.PLAYER_HITS === undefined) window.PLAYER_HITS = 0;

  console.log("👹 Enemy initialized. Vision layer:", window.GAME_LAYERS?.VISION, "| Clone:", !!existingVision);
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
  var dir = this._lastMoveDir || new pc.Vec3(1, 0, 0);
  if (dir.lengthSq() === 0) dir.set(1, 0, 0);
  var absX = Math.abs(dir.x),
    absY = Math.abs(dir.y);

  var texIdx = 1;
  var flip = false;
  var visionKey = "side";
  var angle = 0;

  if (absX > absY) {
    texIdx = 2;
    flip = dir.x < 0;
    visionKey = "side";
    this._currentDirection = dir.x > 0 ? "right" : "left";
    angle = dir.x > 0 ? -90 : 90;
  } else {
    if (dir.y > 0) {
      texIdx = 1;
      visionKey = "front";
      this._currentDirection = "front";
      angle = 0;
    } else {
      texIdx = 0;
      visionKey = "back";
      this._currentDirection = "back";
      angle = 180;
    }
  }

  // Aplica textura no corpo
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

  // Flip
  var s = this.entity.getLocalScale();
  this.entity.setLocalScale(flip ? -Math.abs(s.x) : Math.abs(s.x), s.y, s.z);

  // Aplica textura de visão
  var vAsset = this._visionAssets[visionKey];
  var vTex = vAsset || null;
  if (vTex) {
    if (this._visionMat.diffuseMap !== vTex) {
      this._visionMat.diffuseMap = vTex;
      this._visionMat.emissiveMap = vTex;
      this._visionMat.update();
    }

    var scale = this.visionScale;
    this._vision.setLocalScale(scale, scale, 1);
  }

  // Rotaciona o cone
  this._vision.setLocalEulerAngles(0, 0, angle);
  
  // Posiciona o cone à frente do inimigo
  var offset = this.sightDistance * 0.4;
  var offsetX = 0, offsetY = 0;
  
  switch(this._currentDirection) {
    case "front":
      offsetY = -offset;
      break;
    case "back":
      offsetY = offset;
      break;
    case "right":
      offsetX = offset;
      break;
    case "left":
      offsetX = -offset;
      break;
  }
  
  this._vision.setLocalPosition(offsetX, offsetY, 0.01);
  
  // Muda cor do cone quando perseguindo
  if (this._state === "chase") {
    this._visionMat.emissive = new pc.Color(1, 0, 0); // vermelho
    this._visionMat.opacity = 0.6;
  } else {
    this._visionMat.emissive = new pc.Color(1, 1, 0); // amarelo
    this._visionMat.opacity = 0.45;
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
    console.log(`💥 Player hit by enemy! Hits: ${window.PLAYER_HITS} / 4`);

    if (window.PLAYER_HITS >= 4) {
      console.log("💀 GAME OVER - Player defeated!");
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