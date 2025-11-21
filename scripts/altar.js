/*
  Celestial Candelarium - altar.js
  - Shows how many torches are lit (0-4)
  - Sprite frame updates: 0..4 corresponds to lit count
  - Emits victory when all are lit
*/

var Altar = pc.createScript('altar');

Altar.attributes.add('maxFrames', { type: 'number', default: 5, title: 'Frames (0..N-1)' });
Altar.attributes.add('winDelay', { type: 'number', default: 0.5, title: 'Win Delay (s) after all lit' });
// Optional: frames as textures for engine-only mode
Altar.attributes.add('frameTextures', { type: 'asset', array: true, title: 'Frame Textures (optional)' });

Altar.prototype.initialize = function () {
    this._lit = 0;
    this._total = 4; // default, GameManager may override via event
    this._winPending = false;

    console.log("Altar initializing...");

    // Fallback 1: Buscar da propriedade customizada da entidade
    var hasValidTextures = this.frameTextures && this.frameTextures.length > 0 && this.frameTextures[0] !== null;
    if (!hasValidTextures && this.entity._altarTextures) {
        this.frameTextures = this.entity._altarTextures;
        console.log('Altar using entity._altarTextures:', this.frameTextures.length);
        hasValidTextures = true;
    }
    
    // Fallback 2: se ainda não tem, buscar do global
    if (!hasValidTextures) {
        if (window.GAME_TEXTURES && window.GAME_TEXTURES.altar) {
            this.frameTextures = window.GAME_TEXTURES.altar;
            console.log('Altar using global textures:', this.frameTextures.length);
        }
    }

    this.app.on('altar:update', this._onUpdate, this);
    this.app.on('altar:force', this._onForce, this);
    
    // Apply initial frame (0 torches lit)
    this._applyFrame();

    console.log("Altar initialized with", this.frameTextures ? this.frameTextures.length : 0, "textures");
};

Altar.prototype.onDestroy = function () {
    this.app.off('altar:update', this._onUpdate, this);
    this.app.off('altar:force', this._onForce, this);
};

Altar.prototype._onUpdate = function (lit, total) {
    this._lit = lit|0; this._total = total|0;
    this._applyFrame();

    if (!this._winPending && this._total > 0 && this._lit >= this._total) {
        this._winPending = true;
        var self = this;
        this.app.once('update', function tick() {
            // small delay; alternatively setTimeout via app
            self._triggerWin();
        });
    }
};

Altar.prototype._onForce = function (frameIndex) {
    var clamped = pc.math.clamp(frameIndex|0, 0, this.maxFrames-1);
    if (this.entity.sprite) {
        this.entity.sprite.frame = clamped;
    } else {
        this._applyFrameTexture(clamped);
    }
};

Altar.prototype._applyFrame = function () {
    var frame = pc.math.clamp(this._lit, 0, Math.max(0, this.maxFrames - 1));
    if (this.entity.sprite) {
        this.entity.sprite.frame = frame;
    } else {
        this._applyFrameTexture(frame);
    }
};

Altar.prototype._triggerWin = function () {
    this.app.fire('game:victory');
};

Altar.prototype._applyFrameTexture = function (frameIndex) {
    if (!this.entity.render) return;
    var asset = this.frameTextures && this.frameTextures[Math.min(frameIndex|0, this.frameTextures.length - 1)];
    var tex = asset && asset.resource ? asset.resource : asset;
    
    // Aplicar ao meshInstance diretamente
    var mat = this.entity.render.meshInstances[0].material;
    if (!mat) {
        mat = new pc.StandardMaterial();
        this.entity.render.meshInstances[0].material = mat;
    }

    if (tex) {
        mat.diffuseMap = tex;
        mat.emissiveMap = tex;
        mat.emissive = new pc.Color(1, 1, 1);
        mat.opacityMap = tex;
        mat.blendType = pc.BLEND_PREMULTIPLIED;
        mat.useLighting = false;
    } else {
        // Fallback: use color based on frame
        var colors = [
            new pc.Color(0.2, 0.2, 0.2), // 0: dark
            new pc.Color(0.4, 0.2, 0.2), // 1: red
            new pc.Color(0.6, 0.4, 0.2), // 2: orange
            new pc.Color(0.8, 0.6, 0.2), // 3: yellow
            new pc.Color(1, 1, 0.5)      // 4: bright yellow
        ];
        var color = colors[frameIndex] || colors[0];
        mat.diffuse = color;
        mat.emissive = color;
        mat.useLighting = false;
        mat.diffuseMap = null;
        mat.emissiveMap = null;
        mat.opacityMap = null;
    }
    mat.update();
};
