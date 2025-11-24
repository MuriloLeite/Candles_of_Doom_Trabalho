// Bootstrap v7 - MÚSICA CORRIGIDA + Sistema de layers e menu
(function () {
  "use strict";

  console.log("Bootstrap v7 - Música e cone de visão corrigidos");

  // MENU CONTROLLER
  function setupMenuController(app) {
    console.log("Setting up menu controller...");

    var btnStart = document.getElementById("btnStart");
    var btnQuit = document.getElementById("btnQuit");
    var btnMute = document.getElementById("btnMute");
    var btnPause = document.getElementById("btnPause");
    var menu = document.getElementById("menuInicial");
    var pauseOverlay = document.getElementById("pauseOverlay");

    console.log("Elementos encontrados:", {
      btnStart: !!btnStart,
      btnQuit: !!btnQuit,
      btnMute: !!btnMute,
      btnPause: !!btnPause,
      menu: !!menu,
      pauseOverlay: !!pauseOverlay,
    });

    // SISTEMA DE MÚSICA
    var bgMusic = new Audio();
    bgMusic.loop = true;
    bgMusic.volume = 0.3;
    bgMusic.src = "game_assets/audio/bg-theme.mp3";

    var musicEnabled = localStorage.getItem("ash:music") !== "false";
    var isGamePaused = false;
    var wasMusicPlayingBeforePause = false; // ✅ NOVO: Track se música estava tocando

    function playMusic() {
      if (musicEnabled) {
        bgMusic
          .play()
          .then(function () {
            console.log("🎵 Música iniciada");
          })
          .catch(function (err) {
            console.warn("❌ Não foi possível tocar música:", err);
          });
      }
    }

    function stopMusic() {
      bgMusic.pause();
      console.log("⏸️ Música pausada");
    }

    function toggleMusic() {
      musicEnabled = !musicEnabled;
      localStorage.setItem("ash:music", musicEnabled.toString());

      if (musicEnabled) {
        playMusic();
      } else {
        stopMusic();
      }

      updateMusicButton();
      console.log("🎵 Música:", musicEnabled ? "ON" : "OFF");
    }

    function updateMusicButton() {
      if (btnMute) {
        btnMute.textContent = musicEnabled ? "🔊 Som: ON" : "🔇 Som: OFF";
        btnMute.style.backgroundColor = musicEnabled
          ? "rgba(76,175,80,0.3)"
          : "rgba(244,67,54,0.3)";
      }
    }

    // BOTÃO DE PAUSA
    function setupPauseButton() {
      if (!btnPause) {
        console.warn("⚠️ Botão de pausa não encontrado!");
        return;
      }

      btnPause.addEventListener("click", function () {
        isGamePaused = !isGamePaused;

        if (isGamePaused) {
          // ✅ SALVA SE MÚSICA ESTAVA TOCANDO
          wasMusicPlayingBeforePause = !bgMusic.paused;

          // Pausar jogo
          app.timeScale = 0;
          app.fire("game:pause");
          btnPause.innerHTML = "Retomar";
          btnPause.style.backgroundColor = "rgba(255,184,77,0.3)";

          if (pauseOverlay) {
            pauseOverlay.style.display = "flex";
          }

          // Pausar música
          stopMusic();

          console.log(
            "⏸️ Jogo pausado - música estava tocando:",
            wasMusicPlayingBeforePause
          );
        } else {
          // Retomar jogo
          app.timeScale = 1;
          app.fire("game:resume");
          btnPause.innerHTML = "Pausar";
          btnPause.style.backgroundColor = "rgba(0,0,0,0.7)";

          if (pauseOverlay) {
            pauseOverlay.style.display = "none";
          }

          // ✅ RETOMA MÚSICA SE ESTAVA TOCANDO ANTES DA PAUSA
          if (wasMusicPlayingBeforePause && musicEnabled) {
            console.log("▶️ Retomando música...");
            playMusic();
          }

          console.log("▶️ Jogo retomado");
        }
      });

      console.log("✅ Botão Pausar conectado");
    }

    // Controle de pausa por tecla ESC
    function setupKeyboardPause() {
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" || e.key === "Esc" || e.keyCode === 27) {
          if (btnPause && menu && menu.style.display === "none") {
            btnPause.click();
            e.preventDefault();
          }
        }
      });
    }

    // Configura botão de música
    if (btnMute) {
      updateMusicButton();
      btnMute.addEventListener("click", toggleMusic);
      console.log("✅ Botão de música conectado");
    }

    setupPauseButton();
    setupKeyboardPause();

    // PAUSA O JOGO IMEDIATAMENTE no início
    app.timeScale = 0;
    console.log("⏸️ Jogo pausado inicialmente (timeScale:", app.timeScale, ")");

    if (menu) {
      menu.style.display = "flex";
      console.log("📋 Menu HTML ativado");
    }

    if (pauseOverlay) {
      pauseOverlay.style.display = "none";
    }

    // Botão INICIAR
    if (btnStart) {
      btnStart.addEventListener("click", function () {
        console.log("▶️ Iniciar jogo clicado");
        if (menu) menu.style.display = "none";
        app.timeScale = 1;
        app.fire("game:resume");

        if (btnPause) {
          btnPause.style.display = "block";
        }

        if (pauseOverlay) {
          pauseOverlay.style.display = "none";
        }

        // ✅ INICIA MÚSICA E MARCA COMO TOCANDO
        playMusic();
        wasMusicPlayingBeforePause = true;

        console.log("▶️ Jogo iniciado (timeScale:", app.timeScale, ")");
      });
      console.log("✅ Botão Iniciar conectado");
    } else {
      console.error("❌ btnStart não encontrado!");
    }

    // Botão SAIR
    if (btnQuit) {
      btnQuit.addEventListener("click", function () {
        console.log("🚪 Sair clicado");
        stopMusic();

        if (app.timeScale === 0) {
          window.close();
          history.back();
          return;
        }

        if (menu) {
          menu.style.display = "flex";
          app.timeScale = 0;
          app.fire("game:pause");

          if (btnPause) {
            btnPause.style.display = "none";
          }
        }
      });
    }

    if (btnPause) {
      btnPause.style.display = "none";
    }

    // Salva referência global
    window.GAME_AUDIO = {
      music: bgMusic,
      isPlaying: function () {
        return !bgMusic.paused;
      },
      play: playMusic,
      stop: stopMusic,
      toggle: toggleMusic,
    };

    window.GAME_PAUSE = {
      isPaused: function () {
        return isGamePaused;
      },
      pause: function () {
        if (btnPause && !isGamePaused) btnPause.click();
      },
      resume: function () {
        if (btnPause && isGamePaused) btnPause.click();
      },
      toggle: function () {
        if (btnPause) btnPause.click();
      },
    };

    console.log("✅ MenuController configurado completamente!");
  }

  function loadGameScripts(callback) {
    var scripts = [
      "scripts/layerManager.js",
      "scripts/assetLoader.js",
      "scripts/playerController.js",
      "scripts/enemyAI.js",
      "scripts/torch.js",
      "scripts/altar.js",
      "scripts/gameManager.js",
      "scripts/uiManager.js",
    ];
    var loaded = 0;

    function checkComplete() {
      loaded++;
      if (loaded === scripts.length) {
        console.log("✅ All scripts loaded");
        callback();
      }
    }

    scripts.forEach(function (src) {
      var script = document.createElement("script");
      script.src = src + "?v=" + Date.now();
      script.onload = checkComplete;
      script.onerror = function () {
        console.error("❌ Failed to load:", src);
        checkComplete();
      };
      document.head.appendChild(script);
    });
  }

  function makeMaterial(tex) {
    var mat = new pc.StandardMaterial();
    mat.diffuseMap = tex;
    mat.emissive = new pc.Color(1, 1, 1);
    mat.emissiveMap = tex;
    mat.opacityMap = tex; // ✅ Usa canal alpha da textura
    mat.blendType = pc.BLEND_PREMULTIPLIED; // ✅ Transparência correta
    mat.useLighting = false;
    mat.cull = pc.CULLFACE_NONE;
    mat.update();
    return mat;
  }

  function main() {
    console.log("🎮 Starting game with layer system...");

    var canvas = document.getElementById("application-canvas");
    var app = new pc.Application(canvas, {
      mouse: new pc.Mouse(canvas),
      touch: new pc.TouchDevice(canvas),
      keyboard: new pc.Keyboard(window),
      elementInput: new pc.ElementInput(canvas),
    });
    app.start();
    app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
    app.setCanvasResolution(pc.RESOLUTION_AUTO);
    window.addEventListener("resize", function () {
      app.resizeCanvas();
    });

    loadGameScripts(function () {
      if (typeof loadGameAssets === "function") {
        console.log("📦 Loading game assets...");
        loadGameAssets(app).then(function () {
          console.log("✅ Assets loaded, building scene...");
          buildScene(app);

          setTimeout(function () {
            setupMenuController(app);
          }, 100);
        });
      } else {
        console.warn(
          "⚠️ loadGameAssets not found, building scene without assets"
        );
        buildScene(app);

        setTimeout(function () {
          setupMenuController(app);
        }, 100);
      }
    });
  }

  function buildScene(app) {
    var LAYERS = window.setupLayers(app);
    console.log("🎨 Layers configuradas:", LAYERS);

    var world = new pc.Entity("World");
    app.root.addChild(world);

    var ui = new pc.Entity("UI");
    ui.addComponent("screen", {
      screenSpace: true,
      referenceResolution: new pc.Vec2(1280, 720),
      scaleBlend: 0.5,
      scaleMode: pc.SCALEMODE_BLEND,
    });
    app.root.addChild(ui);

    // Camera
    var camera = new pc.Entity("Camera");
    camera.addComponent("camera", {
      clearColor: new pc.Color(0.1, 0.1, 0.1),
      projection: pc.PROJECTION_ORTHOGRAPHIC,
      orthoHeight: 14,
      nearClip: 0.1,
      farClip: 100,
      layers: [
        LAYERS.BACKGROUND,
        LAYERS.WORLD,
        LAYERS.OBJECTS,
        LAYERS.PLAYER,
        LAYERS.ENEMIES,
        LAYERS.VISION,
      ],
    });
    camera.setLocalPosition(0, 0, 20);
    camera.lookAt(0, 0, 0);
    app.root.addChild(camera);

    // Light
    var light = new pc.Entity("Light");
    light.addComponent("light", {
      type: "directional",
      color: new pc.Color(1, 1, 1),
      intensity: 1,
    });
    light.setLocalEulerAngles(45, 30, 0);
    app.root.addChild(light);

    // UI Panels
    var menuPanel = new pc.Entity("MenuPanel");
    menuPanel.addComponent("element", {
      type: pc.ELEMENTTYPE_IMAGE,
      anchor: [0, 0, 1, 1],
      pivot: [0.5, 0.5],
      color: new pc.Color(0, 0, 0, 0.95),
      opacity: 0.95,
      layers: [LAYERS.UI],
    });
    ui.addChild(menuPanel);

    var hudPanel = new pc.Entity("HudPanel");
    hudPanel.addComponent("element", {
      type: pc.ELEMENTTYPE_GROUP,
      anchor: [0, 0, 1, 1],
      pivot: [0.5, 0.5],
      layers: [LAYERS.UI],
    });
    ui.addChild(hudPanel);

    var pausePanel = new pc.Entity("PausePanel");
    pausePanel.addComponent("element", {
      type: pc.ELEMENTTYPE_GROUP,
      anchor: [0, 0, 1, 1],
      pivot: [0.5, 0.5],
      layers: [LAYERS.UI],
    });
    pausePanel.enabled = false;
    ui.addChild(pausePanel);

    // HUD Info
    var enemyCountText = new pc.Entity("EnemyCountText");
    enemyCountText.addComponent("element", {
      type: pc.ELEMENTTYPE_TEXT,
      anchor: [0, 1, 0, 1],
      pivot: [0, 1],
      fontSize: 28,
      color: new pc.Color(1, 0.5, 0.5),
      text: "0",
      outlineColor: new pc.Color(0, 0, 0),
      outlineThickness: 0.3,
      layers: [LAYERS.UI],
    });
    enemyCountText.setLocalPosition(25, -25, 0);
    hudPanel.addChild(enemyCountText);

    var hintText = new pc.Entity("HintText");
    hintText.addComponent("element", {
      type: pc.ELEMENTTYPE_TEXT,
      anchor: [0.5, 0, 0.5, 0],
      pivot: [0.5, 0],
      fontSize: 24,
      color: new pc.Color(1, 1, 1),
      text: "",
      outlineColor: new pc.Color(0, 0, 0),
      outlineThickness: 0.3,
      layers: [LAYERS.UI],
    });
    hintText.setLocalPosition(0, 25, 0);
    hudPanel.addChild(hintText);

    var progressBar = new pc.Entity("ProgressBar");
    progressBar.addComponent("element", {
      type: pc.ELEMENTTYPE_TEXT,
      anchor: [0.5, 0, 0.5, 0],
      pivot: [0.5, 0],
      fontSize: 24,
      color: new pc.Color(0, 1, 0),
      text: "",
      outlineColor: new pc.Color(0, 0, 0),
      outlineThickness: 0.3,
      layers: [LAYERS.UI],
    });
    progressBar.setLocalPosition(0, 60, 0);
    progressBar.enabled = false;
    hudPanel.addChild(progressBar);

    // Texturas
    var heroTex = window.GAME_TEXTURES?.player || [];
    var enemyTex = window.GAME_TEXTURES?.enemy || [];
    var visionTex = window.GAME_TEXTURES?.vision || [];
    var torchTex = window.GAME_TEXTURES?.torch || [];
    var altarTex = window.GAME_TEXTURES?.altar || [];
    var mapTex = window.GAME_TEXTURES?.world?.scenario;

    console.log("🎨 Using textures:", {
      hero: heroTex.length,
      enemy: enemyTex.length,
      vision: visionTex.length,
      torch: torchTex.length,
      altar: altarTex.length,
      map: !!mapTex,
    });

    // BACKGROUND
    var background = new pc.Entity("Background");
    background.addComponent("render", {
      type: "box",
      layers: [LAYERS.BACKGROUND],
    });
    background.setLocalScale(24, 24, 0.1);
    background.setLocalPosition(0, 0, -1);
    if (mapTex) {
      background.render.meshInstances[0].material = makeMaterial(mapTex);
    }
    world.addChild(background);

    // PLAYER
    var player = new pc.Entity("Player");
    player.addComponent("render", {
      type: "box",
      layers: [LAYERS.PLAYER],
    });
    player.setLocalScale(1, 1, 0.1);
    player.setLocalPosition(0, -5, 0.02);
    if (heroTex[0]) {
      var matPlayer = makeMaterial(heroTex[0]);
      player.render.meshInstances[0].material = matPlayer;
    }
    player._heroTextures = heroTex;

    player.addComponent("script");
    player.script.create("playerController", {
      attributes: {
        boundsMin: new pc.Vec2(-11, -11),
        boundsMax: new pc.Vec2(11, 11),
      },
    });
    world.addChild(player);

    // TORCHES
    var torchPositions = [
      new pc.Vec3(-11, -11, 0.01),
      new pc.Vec3(-11, 11, 0.01),
      new pc.Vec3(11, -11, 0.01),
      new pc.Vec3(11, 11, 0.01),
    ];
    torchPositions.forEach(function (pos, index) {
      var torch = new pc.Entity("Torch" + index);
      torch.addComponent("render", {
        type: "box",
        layers: [LAYERS.WORLD],
      });
      torch.setLocalScale(0.5, 0.5, 0.1);
      torch.setLocalPosition(pos.x, pos.y, pos.z);
      var mat = makeMaterial(torchTex[0] || null);
      if (!torchTex[0]) {
        mat.diffuse.set(0.6, 0.1, 0.1);
        mat.emissive.set(0.6, 0.1, 0.1);
        mat.useLighting = false;
        mat.update();
      }
      torch.render.meshInstances[0].material = mat;
      torch.addComponent("script");
      torch.script.create("torch", {
        attributes: {
          unlitTexture: torchTex[0]
            ? new pc.Asset("torch_unlit", "texture", {
                url: "./game_assets/world/tocha-frente.png",
              })
            : null,
          litTexture: torchTex[1]
            ? new pc.Asset("torch_lit", "texture", {
                url: "./game_assets/world/tocha-lateral.png",
              })
            : null,
          startLit: false,
        },
      });
      world.addChild(torch);
    });

    // ALTAR
    var altar = new pc.Entity("Altar");
    altar.addComponent("render", {
      type: "box",
      layers: [LAYERS.WORLD],
    });
    altar.setLocalScale(2, 2, 0.1);
    altar.setLocalPosition(0, 0, 0.02);
    if (altarTex[0]) {
      altar.render.meshInstances[0].material = makeMaterial(altarTex[0]);
    }
    altar._altarTextures = altarTex;
    altar.addComponent("script");
    altar.script.create("altar");
    world.addChild(altar);

    // ELEMENTOS DECORATIVOS
    var bancoTex = window.GAME_TEXTURES?.world?.banco;
    var portalTex = window.GAME_TEXTURES?.world?.portal;
    var posteTex = window.GAME_TEXTURES?.world?.poste;

    console.log("🎨 Decorative textures:", {
      banco: !!bancoTex,
      portal: !!portalTex,
      poste: !!posteTex,
    });

    // 4 BANCOS (próximos às paredes) com colisão
    var bancoData = [
      { pos: new pc.Vec3(-9, 9, 0.01), flipX: true }, // Canto superior esquerdo (INVERTIDO)
      { pos: new pc.Vec3(9, 9, 0.01), flipX: false }, // Canto superior direito
      { pos: new pc.Vec3(-9, -9, 0.01), flipX: true }, // Canto inferior esquerdo (INVERTIDO)
      { pos: new pc.Vec3(9, -9, 0.01), flipX: false }, // Canto inferior direito
    ];

    bancoData.forEach(function (data, i) {
      var banco = new pc.Entity("Banco" + i);
      banco.addComponent("render", {
        type: "box",
        layers: [LAYERS.OBJECTS],
      });

      // ✅ Tamanho aumentado
      var scaleX = data.flipX ? -2.0 : 2.0; // Flipar se estiver à esquerda
      banco.setLocalScale(scaleX, 2.0, 0.1);
      banco.setLocalPosition(data.pos.x, data.pos.y, data.pos.z);

      if (bancoTex) {
        var mat = makeMaterial(bancoTex);
        banco.render.meshInstances[0].material = mat;
      } else {
        var mat = new pc.StandardMaterial();
        mat.diffuse.set(0.4, 0.3, 0.2);
        mat.update();
        banco.render.meshInstances[0].material = mat;
      }

      world.addChild(banco);
    });

    // PORTAL (parte superior, próximo ao spawn) com colisão
    var portal = new pc.Entity("Portal");
    portal.addComponent("render", {
      type: "box",
      layers: [LAYERS.OBJECTS],
    });
    portal.setLocalScale(3.5, 3.5, 0.1); // ✅ Aumentado
    portal.setLocalPosition(0, 10, 0.01);

    if (portalTex) {
      var matPortal = makeMaterial(portalTex);
      portal.render.meshInstances[0].material = matPortal;
      console.log("✅ Portal texture loaded");
    } else {
      console.warn("⚠️ Portal texture not found!");
      var matPortal = new pc.StandardMaterial();
      matPortal.diffuse.set(0.5, 0.2, 0.8);
      matPortal.emissive.set(0.5, 0.2, 0.8);
      matPortal.emissiveIntensity = 0.5;
      matPortal.update();
      portal.render.meshInstances[0].material = matPortal;
    }

    world.addChild(portal);

    // 2 POSTES (laterais, entre bancos) com colisão
    var postePositions = [
      new pc.Vec3(-9, 0, 0.01), // Lado esquerdo
      new pc.Vec3(9, 0, 0.01), // Lado direito
    ];

    postePositions.forEach(function (pos, i) {
      var poste = new pc.Entity("Poste" + i);
      poste.addComponent("render", {
        type: "box",
        layers: [LAYERS.OBJECTS],
      });
      poste.setLocalScale(1.2, 2.2, 0.1); // ✅ Aumentado
      poste.setLocalPosition(pos.x, pos.y, pos.z);

      if (posteTex) {
        var mat = makeMaterial(posteTex);
        poste.render.meshInstances[0].material = mat;
      } else {
        var mat = new pc.StandardMaterial();
        mat.diffuse.set(0.3, 0.3, 0.3);
        mat.update();
        poste.render.meshInstances[0].material = mat;
      }

      world.addChild(poste);
    });

    console.log(
      "✅ Elementos decorativos adicionados COM COLISÃO: 4 bancos, 1 portal, 2 postes"
    );

    // GAME MANAGER
    var gm = new pc.Entity("GameManager");
    gm.addComponent("script");
    gm.script.create("gameManager");
    world.addChild(gm);

    // ENEMY PREFAB
    var enemyPrefab = new pc.Entity("EnemyPrefab");
    enemyPrefab.addComponent("render", {
      type: "box",
      layers: [LAYERS.ENEMIES],
    });
    enemyPrefab.setLocalScale(0.9, 0.9, 0.1);
    if (enemyTex[0]) {
      var matEnemy = makeMaterial(enemyTex[0]);
      enemyPrefab.render.meshInstances[0].material = matEnemy;
    }
    enemyPrefab._enemyTextures = enemyTex;

    enemyPrefab.addComponent("script");
    enemyPrefab.script.create("enemyAI");
    enemyPrefab.enabled = false;
    gm.addChild(enemyPrefab);

    window.GAME_LAYERS = LAYERS;

    // Spawn Points
    var spawnPointTop = new pc.Entity("SpawnPointTop");
    spawnPointTop.setLocalPosition(0, 11, 0);
    world.addChild(spawnPointTop);

    // UI Manager
    var uiMgr = new pc.Entity("UiManager");
    uiMgr.addComponent("script");
    uiMgr.script.create("uiManager", {
      attributes: {
        menuPanel: menuPanel,
        hudPanel: hudPanel,
        pausePanel: pausePanel,
        enemyCountText: enemyCountText,
        hintText: hintText,
        progressBar: progressBar,
      },
    });
    ui.addChild(uiMgr);

    // Connect scripts
    gm.script.gameManager.player = player;
    gm.script.gameManager.altar = altar;
    gm.script.gameManager.uiManager = uiMgr;
    gm.script.gameManager.enemyPrefab = enemyPrefab;
    gm.script.gameManager.spawnPoints = [spawnPointTop];

    menuPanel.enabled = false;
    hudPanel.enabled = false;

    console.log("✅ Scene built successfully!");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", main);
  } else {
    main();
  }
})();
