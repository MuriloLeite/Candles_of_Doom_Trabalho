/*
  Celestial Candelarium - altar.js
  - Shows how many torches are lit (0-4)
  - Sprite frame updates: 0..4 corresponds to lit count
  - Player pode interagir quando todas as tochas estão acesas
  - Emits victory when player interacts
*/

var Altar = pc.createScript("altar");

Altar.attributes.add("maxFrames", {
  type: "number",
  default: 5,
  title: "Frames (0..N-1)",
});
Altar.attributes.add("winDelay", {
  type: "number",
  default: 0.5,
  title: "Win Delay (s) after all lit",
});
// Optional: frames as textures for engine-only mode
Altar.attributes.add("frameTextures", {
  type: "asset",
  array: true,
  title: "Frame Textures (optional)",
});
Altar.attributes.add("interactionRadius", {
  type: "number",
  default: 2.0,
  title: "Interaction Radius",
});

Altar.prototype.initialize = function () {
  this._lit = 0;
  this._total = 4; // default, GameManager may override via event
  this._winPending = false;
  this._canInteract = false;
  this._player = null;
  this._interacting = false;
  this._wasShowingHint = false;

  console.log("Altar initializing...");

  // Fallback 1: Buscar da propriedade customizada da entidade
  var hasValidTextures =
    this.frameTextures &&
    this.frameTextures.length > 0 &&
    this.frameTextures[0] !== null;
  if (!hasValidTextures && this.entity._altarTextures) {
    this.frameTextures = this.entity._altarTextures;
    console.log(
      "Altar using entity._altarTextures:",
      this.frameTextures.length
    );
    hasValidTextures = true;
  }

  // Fallback 2: se ainda não tem, buscar do global
  if (!hasValidTextures) {
    if (window.GAME_TEXTURES && window.GAME_TEXTURES.altar) {
      this.frameTextures = window.GAME_TEXTURES.altar;
      console.log("Altar using global textures:", this.frameTextures.length);
    }
  }

  this.app.on("altar:update", this._onUpdate, this);
  this.app.on("altar:force", this._onForce, this);

  // Apply initial frame (0 torches lit)
  this._applyFrame();

  console.log(
    "Altar initialized with",
    this.frameTextures ? this.frameTextures.length : 0,
    "textures"
  );
};

Altar.prototype.onDestroy = function () {
  this.app.off("altar:update", this._onUpdate, this);
  this.app.off("altar:force", this._onForce, this);
};

Altar.prototype._onUpdate = function (lit, total) {
  this._lit = lit | 0;
  this._total = total | 0;
  this._applyFrame();

  // Verifica se todas as tochas estão acesas - HABILITA INTERAÇÃO
  this._canInteract = this._total > 0 && this._lit >= this._total;

  if (this._canInteract) {
    console.log("✨ Altar está completo! Player pode interagir para vencer!");
  }
};

Altar.prototype._onForce = function (frameIndex) {
  var clamped = pc.math.clamp(frameIndex | 0, 0, this.maxFrames - 1);
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

  // Adiciona brilho pulsante quando todas tochas estão acesas
  if (this._canInteract && this.entity.render) {
    var mat = this.entity.render.meshInstances[0].material;
    if (mat) {
      mat.emissiveIntensity = 1.5 + Math.sin(Date.now() * 0.005) * 0.3;
      mat.update();
    }
  }
};

// NOVO: Loop de update para detectar interação
Altar.prototype.update = function (dt) {
  if (!this._canInteract) return;

  // Encontra o player se ainda não encontrou
  if (!this._player) {
    this._player = this.app.root.findByName("Player");
    if (!this._player) return;
  }

  // Verifica distância do player
  var playerPos = this._player.getPosition();
  var altarPos = this.entity.getPosition();
  var dx = playerPos.x - altarPos.x;
  var dy = playerPos.y - altarPos.y;
  var dist = Math.sqrt(dx * dx + dy * dy);

  // Se player está perto o suficiente
  if (dist <= this.interactionRadius) {
    // Mostra hint
    this.app.fire(
      "ui:hint",
      "✨ Pressione E no altar para completar o ritual!"
    );
    this._wasShowingHint = true;

    // Verifica se apertou E
    if (this.app.keyboard && this.app.keyboard.isPressed(pc.KEY_E)) {
      if (!this._interacting) {
        this._interacting = true;
        console.log("🎉 Player ativou o altar - VITÓRIA!");
        this._triggerWin();
      }
    } else {
      this._interacting = false;
    }
  } else {
    // Limpa hint se estava mostrando
    if (this._wasShowingHint) {
      this.app.fire("ui:hint", "");
      this._wasShowingHint = false;
    }
  }
};

Altar.prototype._triggerWin = function () {
  if (this._winPending) return;
  this._winPending = true;

  // Pausa o jogo
  this.app.timeScale = 0;

  // Cria tela de vitória
  this._createVictoryScreen();

  // Dispara evento de vitória para o GameManager
  this.app.fire("game:victory");
};

Altar.prototype._createVictoryScreen = function () {
  var self = this;

  // Remove tela antiga se existir
  var oldScreen = document.getElementById("victoryScreen");
  if (oldScreen && oldScreen.parentNode) {
    oldScreen.parentNode.removeChild(oldScreen);
  }

  var victoryDiv = document.createElement("div");
  victoryDiv.id = "victoryScreen";
  victoryDiv.style.position = "fixed";
  victoryDiv.style.top = "0";
  victoryDiv.style.left = "0";
  victoryDiv.style.width = "100%";
  victoryDiv.style.height = "100%";
  victoryDiv.style.background =
    "linear-gradient(135deg, rgba(20,20,50,0.95), rgba(50,20,80,0.95))";
  victoryDiv.style.zIndex = "9999";
  victoryDiv.style.display = "flex";
  victoryDiv.style.flexDirection = "column";
  victoryDiv.style.justifyContent = "center";
  victoryDiv.style.alignItems = "center";
  victoryDiv.style.fontFamily = "Arial, sans-serif";

  // Título
  var title = document.createElement("h1");
  title.textContent = "🎉 VITÓRIA! 🎉";
  title.style.color = "#FFD700";
  title.style.fontSize = "72px";
  title.style.marginBottom = "20px";
  title.style.textShadow =
    "4px 4px 8px rgba(0,0,0,0.8), 0 0 20px rgba(255,215,0,0.5)";

  // Mensagem
  var message = document.createElement("p");
  message.textContent = "Você acendeu todas as tochas e completou o ritual!";
  message.style.color = "#FFFFFF";
  message.style.fontSize = "28px";
  message.style.marginBottom = "15px";
  message.style.textShadow = "2px 2px 4px rgba(0,0,0,0.8)";
  message.style.textAlign = "center";
  message.style.maxWidth = "600px";

  // Submensagem
  var subMessage = document.createElement("p");
  subMessage.textContent = "As luzes foram dissipadas pelas Trevas!";
  subMessage.style.color = "#FFD700";
  subMessage.style.fontSize = "20px";
  subMessage.style.marginBottom = "40px";
  subMessage.style.fontStyle = "italic";
  subMessage.style.textShadow = "2px 2px 4px rgba(0,0,0,0.8)";

  // Container de botões
  var buttonContainer = document.createElement("div");
  buttonContainer.style.display = "flex";
  buttonContainer.style.gap = "20px";

  // Botão Jogar Novamente
  var btnRestart = document.createElement("button");
  btnRestart.textContent = "Jogar Novamente";
  btnRestart.style.padding = "15px 40px";
  btnRestart.style.fontSize = "20px";
  btnRestart.style.fontWeight = "bold";
  btnRestart.style.backgroundColor = "#4CAF50";
  btnRestart.style.color = "white";
  btnRestart.style.border = "none";
  btnRestart.style.borderRadius = "10px";
  btnRestart.style.cursor = "pointer";
  btnRestart.style.transition = "all 0.3s";
  btnRestart.style.boxShadow = "0 4px 8px rgba(0,0,0,0.3)";

  btnRestart.onmouseover = function () {
    this.style.backgroundColor = "#45a049";
    this.style.transform = "scale(1.05)";
  };
  btnRestart.onmouseout = function () {
    this.style.backgroundColor = "#4CAF50";
    this.style.transform = "scale(1)";
  };

  btnRestart.onclick = function () {
    console.log("Reiniciando jogo...");
    if (window.PLAYER_HITS !== undefined) window.PLAYER_HITS = 0;
    if (victoryDiv.parentNode) {
      victoryDiv.parentNode.removeChild(victoryDiv);
    }
    self.app.fire("game:restart");
    self.app.timeScale = 1;
    self._winPending = false;
    self._interacting = false;
  };

  // Botão Menu
  var btnMenu = document.createElement("button");
  btnMenu.textContent = "Menu Principal";
  btnMenu.style.padding = "15px 40px";
  btnMenu.style.fontSize = "20px";
  btnMenu.style.fontWeight = "bold";
  btnMenu.style.backgroundColor = "#2196F3";
  btnMenu.style.color = "white";
  btnMenu.style.border = "none";
  btnMenu.style.borderRadius = "10px";
  btnMenu.style.cursor = "pointer";
  btnMenu.style.transition = "all 0.3s";
  btnMenu.style.boxShadow = "0 4px 8px rgba(0,0,0,0.3)";

  btnMenu.onmouseover = function () {
    this.style.backgroundColor = "#0b7dda";
    this.style.transform = "scale(1.05)";
  };
  btnMenu.onmouseout = function () {
    this.style.backgroundColor = "#2196F3";
    this.style.transform = "scale(1)";
  };

  btnMenu.onclick = function () {
    console.log("Voltando ao menu...");
    if (window.PLAYER_HITS !== undefined) window.PLAYER_HITS = 0;
    if (victoryDiv.parentNode) {
      victoryDiv.parentNode.removeChild(victoryDiv);
    }

    // Mostra menu inicial
    var menu = document.getElementById("menuInicial");
    if (menu) {
      menu.style.display = "flex";
    }

    self.app.fire("game:pause");
    self._winPending = false;
    self._interacting = false;
  };

  // Monta a estrutura
  buttonContainer.appendChild(btnRestart);
  buttonContainer.appendChild(btnMenu);
  victoryDiv.appendChild(title);
  victoryDiv.appendChild(message);
  victoryDiv.appendChild(subMessage);
  victoryDiv.appendChild(buttonContainer);

  document.body.appendChild(victoryDiv);
};

Altar.prototype._applyFrameTexture = function (frameIndex) {
  if (!this.entity.render) return;
  var asset =
    this.frameTextures &&
    this.frameTextures[Math.min(frameIndex | 0, this.frameTextures.length - 1)];
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
      new pc.Color(1, 1, 0.5), // 4: bright yellow
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

// No script que controla a vitória (ex: collectible.js ou goal.js)
function triggerVictory() {
  // 🔥 MARCAR QUE JOGADOR GANHOU - ISSO IMPEDE GAME OVER
  window.GAME_WON = true;

  // Parar o jogo
  this.app.timeScale = 0;

  // Remover qualquer tela de Game Over que possa estar ativa
  const gameOverScreen = document.getElementById("gameOverScreen");
  if (gameOverScreen) {
    gameOverScreen.remove();
  }

  // Mostrar tela de vitória
  const victoryDiv = document.createElement("div");
  victoryDiv.id = "victoryScreen";
  victoryDiv.innerHTML = `
      <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; flex-direction: column; justify-content: center; align-items: center;">
        <h1 style="color: green; font-size: 48px; text-align: center; margin-bottom: 30px;">VITÓRIA!</h1>
        <p style="color: white; font-size: 24px; margin-bottom: 30px;">Parabéns! Você completou o nível.</p>
        <div style="display: flex; gap: 20px;">
          <button onclick="window.location.reload()" style="padding: 15px 30px; font-size: 18px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer;">
            Jogar Novamente
          </button>
          <button onclick="window.location.href = '/'" style="padding: 15px 30px; font-size: 18px; background: #2196F3; color: white; border: none; border-radius: 5px; cursor: pointer;">
            Menu Inicial
          </button>
        </div>
      </div>
    `;

  document.body.appendChild(victoryDiv);
}
