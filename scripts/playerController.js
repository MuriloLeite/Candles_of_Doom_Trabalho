// playerController.js
// Movimento pelas setas, sprites por direção, hitbox AABB e INTERAÇÃO COM TOCHAS

var PlayerController = pc.createScript("playerController");

// Atributos configuráveis
PlayerController.attributes.add("speed", {
  type: "number",
  default: 5,
  title: "Speed",
});
PlayerController.attributes.add("boundsMin", {
  type: "vec2",
  default: [-11, -11],
  title: "Bounds Min",
});
PlayerController.attributes.add("boundsMax", {
  type: "vec2",
  default: [11, 11],
  title: "Bounds Max",
});
PlayerController.attributes.add("hitboxSize", {
  type: "vec2",
  default: [1.0, 1.2],
  title: "Hitbox Size (w,h)",
});
// Raio de interação com tochas
PlayerController.attributes.add("interactionRadius", {
  type: "number",
  default: 1.5,
  title: "Interaction Radius (tochas)",
});

PlayerController.prototype.initialize = function () {
  // teclas
  this.app.keyboard = this.app.keyboard || new pc.Keyboard(window);

  // direção/movimento
  this._dir = new pc.Vec2(0, 0);
  this._lastDir = new pc.Vec2(0, -1); // default apontando para frente (baixo)

  // Texturas
  this.frameTextures =
    window.GAME_TEXTURES?.player || window.GAME_TEXTURES?.hero || [];

  // Material para trocar diffuseMap
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

  // Hitbox parâmetros
  this._hitW = this.hitboxSize.x;
  this._hitH = this.hitboxSize.y;

  // Estado de interação
  this.isInteractHeld = false; // se está segurando E
  this._nearbyTorch = null; // tocha mais próxima
  this._interactingTorch = null; // tocha sendo acesa no momento

  console.log("🦸 PlayerController inicializado. Hitbox:", 
    this._hitW.toFixed(2), "x", this._hitH.toFixed(2),
    "| Interação:", this.interactionRadius.toFixed(2)
  );
};

PlayerController.prototype.update = function (dt) {
  this._readInput();
  this._move(dt);
  this._clampToBounds();
  this._updateSprite();
  this._checkTorchInteraction(); 
};

// lê setas e WASD e normaliza direção
PlayerController.prototype._readInput = function () {
  var x = 0, y = 0;
  
  // Movimento
  if (this.app.keyboard.isPressed(pc.KEY_LEFT) || this.app.keyboard.isPressed(pc.KEY_A)) x -= 1;
  if (this.app.keyboard.isPressed(pc.KEY_RIGHT) || this.app.keyboard.isPressed(pc.KEY_D)) x += 1;
  if (this.app.keyboard.isPressed(pc.KEY_UP) || this.app.keyboard.isPressed(pc.KEY_W)) y += 1;
  if (this.app.keyboard.isPressed(pc.KEY_DOWN) || this.app.keyboard.isPressed(pc.KEY_S)) y -= 1;

  if (x !== 0 || y !== 0) {
    var len = Math.sqrt(x * x + y * y);
    this._dir.set(x / len, y / len);
    this._lastDir.copy(this._dir);
  } else {
    this._dir.set(0, 0);
  }
  
  // Interação (tecla E)
  this.isInteractHeld = this.app.keyboard.isPressed(pc.KEY_E);
};

// aplica movimento
PlayerController.prototype._move = function (dt) {
  if (this._dir.lengthSq() === 0) return;
  var dx = this._dir.x * this.speed * dt;
  var dy = this._dir.y * this.speed * dt;

  var currentPos = this.entity.getLocalPosition();
  var newX = currentPos.x + dx;
  var newY = currentPos.y + dy;

  // Check collision with torches
  if (!this._collidesWithTorch(newX, newY)) {
    this.entity.setLocalPosition(newX, newY, currentPos.z);
  } else {
    // Try moving only in X
    if (!this._collidesWithTorch(newX, currentPos.y)) {
      this.entity.setLocalPosition(newX, currentPos.y, currentPos.z);
    } else if (!this._collidesWithTorch(currentPos.x, newY)) {
      // Try moving only in Y
      this.entity.setLocalPosition(currentPos.x, newY, currentPos.z);
    }
  }
};

// mantém dentro dos limites
PlayerController.prototype._clampToBounds = function () {
  var p = this.entity.getLocalPosition();
  p.x = pc.math.clamp(p.x, this.boundsMin.x, this.boundsMax.x);
  p.y = pc.math.clamp(p.y, this.boundsMin.y, this.boundsMax.y);
  this.entity.setLocalPosition(p);
};

// check if position collides with any torch
PlayerController.prototype._collidesWithTorch = function (x, y) {
  var torches = this.app.root.findByTag('torch');
  var playerRadius = 0.5;
  var torchRadius = 0.25;
  var minDist = playerRadius + torchRadius;

  for (var i = 0; i < torches.length; i++) {
    var torchPos = torches[i].getPosition();
    var dx = x - torchPos.x;
    var dy = y - torchPos.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < minDist) {
      return true;
    }
  }
  return false;
};

// Verifica interação com tochas
PlayerController.prototype._checkTorchInteraction = function () {
  var playerPos = this.entity.getPosition();
  var torches = this.app.root.findByTag('torch');
  var closestTorch = null;
  var closestDist = Infinity;

  // Encontra a tocha mais próxima dentro do raio
  for (var i = 0; i < torches.length; i++) {
    var torch = torches[i];
    var torchPos = torch.getPosition();
    var dx = playerPos.x - torchPos.x;
    var dy = playerPos.y - torchPos.y;
    var dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= this.interactionRadius && dist < closestDist) {
      closestDist = dist;
      closestTorch = torch;
    }
  }

  // Mostra hint se está perto de uma tocha apagada
  if (closestTorch && !this.isInteractHeld) {
    var torchScript = closestTorch.script && closestTorch.script.torch;
    if (torchScript && !torchScript.isLit()) {
      this.app.fire('ui:hint', 'Pressione E para acender a tocha');
    }
  }

  // Atualiza tocha próxima
  if (this._nearbyTorch !== closestTorch) {
    // Saiu do alcance da tocha anterior
    if (this._nearbyTorch) {
      var oldScript = this._nearbyTorch.script && this._nearbyTorch.script.torch;
      if (oldScript) {
        oldScript.cancelIgnite(this.entity);
      }
    }
    this._nearbyTorch = closestTorch;
  }

  // Se está segurando E e há uma tocha próxima
  if (this.isInteractHeld && this._nearbyTorch) {
    var torchScript = this._nearbyTorch.script && this._nearbyTorch.script.torch;
    if (torchScript && !torchScript.isLit()) {
      // Começa a acender
      if (this._interactingTorch !== this._nearbyTorch) {
        console.log("Player começou a segurar E na tocha");
        torchScript.beginIgnite(this.entity);
        this._interactingTorch = this._nearbyTorch;
      }
    }
  } else {
    // Soltou E ou saiu do alcance
    if (this._interactingTorch) {
      var script = this._interactingTorch.script && this._interactingTorch.script.torch;
      if (script) {
        console.log("Player soltou E ou saiu do alcance");
        script.cancelIgnite(this.entity);
      }
      this._interactingTorch = null;
    }
    
    // Limpa hint se não está perto de nenhuma tocha
    if (!closestTorch) {
      this.app.fire('ui:hint', '');
    }
  }
};

// obtém AABB world do hitbox do player
PlayerController.prototype.getHitboxAabb = function () {
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

// atualiza sprite com base em this._lastDir
PlayerController.prototype._updateSprite = function () {
  if (!this.frameTextures || this.frameTextures.length < 3) return;
  if (!this._material) return;

  var absX = Math.abs(this._lastDir.x);
  var absY = Math.abs(this._lastDir.y);

  var texIdx = 1; // default front
  var flip = false;

  if (absX > absY) {
    texIdx = 2; // side
    flip = this._lastDir.x < 0;
  } else {
    if (this._lastDir.y > 0) {
      texIdx = 1; // front
    } else {
      texIdx = 0; // back
    }
  }

  var asset = this.frameTextures[texIdx];
  var tex =
    asset && asset.resource
      ? asset.resource
      : asset instanceof pc.Texture
      ? asset
      : null;
  if (tex) {
    if (this._material.diffuseMap !== tex) {
      this._material.diffuseMap = tex;
      this._material.emissiveMap = tex;
      this._material.update();
    }
  }

  // aplica flip horizontal
  var s = this.entity.getLocalScale();
  this.entity.setLocalScale(flip ? -Math.abs(s.x) : Math.abs(s.x), s.y, s.z);
};