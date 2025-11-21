var Torch = pc.createScript('torch');

Torch.attributes.add('startLit', { type: 'boolean', default: false, title: 'Start Lit' });
Torch.attributes.add('igniteTime', { type: 'number', default: 5.0, title: 'Ignite Hold Time (s)' }); // ⭐ Mudado de 0.8 para 5.0
Torch.attributes.add('extinguishTime', { type: 'number', default: 2.5, title: 'Extinguish Time (s)' });
Torch.attributes.add('spriteFrames', { type: 'number', default: 2, title: 'Sprite Frames (0=unlit,1=lit)' });
Torch.attributes.add('litFrameIndex', { type: 'number', default: 1, title: 'Lit Frame Index' });
Torch.attributes.add('unlitFrameIndex', { type: 'number', default: 0, title: 'Unlit Frame Index' });
Torch.attributes.add('tag', { type: 'string', default: 'torch', title: 'Entity Tag' });
Torch.attributes.add('vfxOnIgnite', { type: 'entity', title: 'Ignite VFX (optional)' });
Torch.attributes.add('vfxOnExtinguish', { type: 'entity', title: 'Extinguish VFX (optional)' });
Torch.attributes.add('unlitTexture', { type: 'asset', title: 'Unlit Texture (optional)' });
Torch.attributes.add('litTexture', { type: 'asset', title: 'Lit Texture (optional)' });

Torch.prototype.initialize = function () {
    this._isLit = !!this.startLit;
    this._igniteBy = null; // player entity
    this._igniteProgress = 0;
    this._extinguishBy = null; // enemy entity
    this._extinguishProgress = 0;

    if (this.tag) this.entity.tags.add(this.tag);

    // Register with player discovery
    this.app.fire('torch:register', this.entity);

    this._applySprite();
    
    console.log("Torch initialized:", this.entity.name, "| Lit:", this._isLit);
};

Torch.prototype.onDestroy = function () {
    this.app.fire('torch:unregister', this.entity);
};

Torch.prototype._applySprite = function () {
    if (this.entity.sprite) {
        this.entity.sprite.frame = this._isLit ? this.litFrameIndex : this.unlitFrameIndex;
        return;
    }
    // Fallback: Render material swap
    if (this.entity.render) {
        var asset = this._isLit ? this.litTexture : this.unlitTexture;
        var tex = asset && asset.resource ? asset.resource : asset;
        if (tex) {
            var mat = this.entity.render.material;
            if (!mat) {
                mat = new pc.StandardMaterial();
                this.entity.render.material = mat;
            }
            mat.diffuseMap = tex;
            mat.opacityMap = tex;
            mat.blendType = pc.BLEND_PREMULTIPLIED;
            mat.useLighting = false;
            mat.update();
        } else {
            // No texture - use color
            var mat2 = this.entity.render.material || this.entity.render.meshInstances[0].material;
            if (!mat2) {
                mat2 = new pc.StandardMaterial();
                this.entity.render.meshInstances[0].material = mat2;
            }
            var color = this._isLit ? new pc.Color(1, 0.9, 0.2) : new pc.Color(0.6, 0.1, 0.1);
            mat2.diffuse = color;
            mat2.emissive = color;
            mat2.useLighting = false;
            mat2.update();
        }
    }
};

Torch.prototype.isLit = function () { return this._isLit; };

// Player interaction
Torch.prototype.beginIgnite = function (playerEntity) {
    if (this._isLit) return;
    if (this._igniteBy && this._igniteBy !== playerEntity) return;
    this._igniteBy = playerEntity;
    console.log("Player começou a acender tocha:", this.entity.name);
};

Torch.prototype.cancelIgnite = function (playerEntity) {
    if (this._igniteBy === playerEntity) {
        this._igniteBy = null;
        this._igniteProgress = 0;
        this.app.fire('ui:hint', '');
        console.log("Ignição cancelada:", this.entity.name);
    }
};

// Enemy interaction
Torch.prototype.beginExtinguish = function (enemyEntity) {
    if (!this._isLit) return;
    this._extinguishBy = enemyEntity;
};

Torch.prototype.cancelExtinguish = function (enemyEntity) {
    if (this._extinguishBy === enemyEntity) {
        this._extinguishBy = null;
        this._extinguishProgress = 0;
    }
};

Torch.prototype.update = function (dt) {
    // Handle player ignite hold
    if (this._igniteBy && !this._isLit) {
        var pcScript = this._igniteBy.script && this._igniteBy.script.playerController;
        var stillHolding = pcScript && pcScript.isInteractHeld;
        var withinReach = false;
        
        if (this._igniteBy) {
            var a = this._igniteBy.getPosition();
            var b = this.entity.getPosition();
            var dx = a.x - b.x, dy = a.y - b.y;
            var dsq = dx * dx + dy * dy;
            var r = (pcScript ? pcScript.interactionRadius : 1.5);
            withinReach = dsq <= r * r;
        }
        
        if (stillHolding && withinReach) {
            this._igniteProgress += dt;
            var percent = Math.min(100, Math.floor(this._igniteProgress / this.igniteTime * 100));
            
            // Feedback visual progressivo
            var barWidth = 20;
            var filledWidth = Math.floor((percent / 100) * barWidth);
            var bar = '[' + '='.repeat(filledWidth) + ' '.repeat(barWidth - filledWidth) + ']';
            
            this.app.fire('ui:hint', 'Acendendo tocha... ' + percent + '% ' + bar);
            
            // Efeito visual na própria tocha (brilho crescente)
            this._applyIgniteEffect(percent / 100);
            
            if (this._igniteProgress >= this.igniteTime) {
                this._setLit(true);
                this._igniteBy = null;
                this._igniteProgress = 0;
                this.app.fire('ui:hint', 'Tocha acesa!');
                this._playVfx(this.vfxOnIgnite);
                console.log("Tocha acesa com sucesso:", this.entity.name);
            }
        } else {
            // interrupted
            this._igniteBy = null;
            this._igniteProgress = 0;
            this.app.fire('ui:hint', '');
        }
    }

    // Handle enemy extinguish hold
    if (this._extinguishBy && this._isLit) {
        var a2 = this._extinguishBy.getPosition();
        var b2 = this.entity.getPosition();
        var dx2 = a2.x - b2.x, dy2 = a2.y - b2.y;
        if ((dx2*dx2 + dy2*dy2) < 1.2 * 1.2) {
            this._extinguishProgress += dt;
            if (this._extinguishProgress >= this.extinguishTime) {
                this._setLit(false);
                this._extinguishBy = null;
                this._extinguishProgress = 0;
                this._playVfx(this.vfxOnExtinguish);
                console.log("Tocha apagada pelo inimigo:", this.entity.name);
            }
        } else {
            this._extinguishBy = null;
            this._extinguishProgress = 0;
        }
    }
};

// ⭐ NOVO: Aplica efeito visual durante ignição
Torch.prototype._applyIgniteEffect = function (progress) {
    if (!this.entity.render) return;
    
    var mat = this.entity.render.material || this.entity.render.meshInstances[0].material;
    if (!mat) return;
    
    // Gradiente de vermelho escuro -> amarelo brilhante
    var r = 0.6 + (0.4 * progress); // 0.6 -> 1.0
    var g = 0.1 + (0.8 * progress); // 0.1 -> 0.9
    var b = 0.1 + (0.1 * progress); // 0.1 -> 0.2
    
    var color = new pc.Color(r, g, b);
    mat.emissive = color;
    mat.emissiveIntensity = 0.5 + (0.5 * progress); // 0.5 -> 1.0
    mat.update();
};

Torch.prototype._setLit = function (lit) {
    if (this._isLit === lit) return;
    this._isLit = lit;
    this._applySprite();
    if (lit) {
        this.app.fire('torch:lit', this);
    } else {
        this.app.fire('torch:unlit', this);
    }
};

// Public method for GameManager reset
Torch.prototype.setLit = function (lit) {
    this._setLit(!!lit);
};

Torch.prototype._playVfx = function (vfxEntity) {
    if (!vfxEntity) return;
    if (vfxEntity.particlesystem) {
        vfxEntity.particlesystem.reset();
        vfxEntity.particlesystem.play();
    }
    if (vfxEntity.sound) {
        var slots = Object.keys(vfxEntity.sound.slots);
        if (slots.length > 0) vfxEntity.sound.play(slots[0]);
    }
};