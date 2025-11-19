// Asset Loader - Manages loading and caching of game assets
window.GAME_TEXTURES = {
  player: [],
  enemy: [],
  vision: [], // NOVO: texturas de visão do inimigo
  world: {},
  altar: [],
  torch: [],
};

function loadGameAssets(app) {
  return new Promise((resolve) => {
    // Define asset lists by category
    const playerAssets = [
      "./game_assets/player/player_front.png",
      "./game_assets/player/player_back.png",
      "./game_assets/player/player_side.png",
    ];

    const enemyAssets = [
      "./game_assets/enemy/enemy_front.png",
      "./game_assets/enemy/enemy_back.png",
      "./game_assets/enemy/enemy_side.png",
    ];

    // NOVO: Assets de visão do inimigo (cone amarelo)
    const visionAssets = [
      "./game_assets/enemy/enemy_vision_back.png",
      "./game_assets/enemy/enemy_vision_front.png",
      "./game_assets/enemy/enemy_vision_side.png",
    ];

    const torchAssets = [
      "./game_assets/world/tocha-frente.png", // unlit
      "./game_assets/world/tocha-lateral.png", // lit
    ];

    const altarAssets = [
      "./game_assets/world/portal.png", // frame 0
      "./game_assets/world/portal.png", // frame 1
      "./game_assets/world/portal.png", // frame 2
      "./game_assets/world/portal.png", // frame 3
      "./game_assets/world/portal.png", // frame 4
    ];

    const worldAssets = [
      "./game_assets/world/scenario.png",
      "./game_assets/world/banco.png",
      "./game_assets/world/pedra.png",
      "./game_assets/world/poste.png",
    ];

    const allAssets = [...playerAssets, ...enemyAssets, ...visionAssets, ...torchAssets, ...altarAssets, ...worldAssets];
    let toLoad = allAssets.length;
    let loaded = 0;

    function onAssetLoaded(asset, category, index) {
      if (category === "player") {
        window.GAME_TEXTURES.player[index] = asset.resource;
      } else if (category === "enemy") {
        window.GAME_TEXTURES.enemy[index] = asset.resource;
      } else if (category === "torch") {
        window.GAME_TEXTURES.torch[index] = asset.resource;
      } else if (category === "altar") {
        window.GAME_TEXTURES.altar[index] = asset.resource;
      } else if (category === "world") {
        const name = asset.name.toLowerCase();
        window.GAME_TEXTURES.world[name] = asset.resource;
      }

      loaded++;
      if (loaded === toLoad) {
        console.log("✅ All assets loaded successfully!");
        console.log("📦 Vision textures:", window.GAME_TEXTURES.vision);
        resolve(window.GAME_TEXTURES);
      }
    }

    // Load player assets
    playerAssets.forEach((url, index) => {
      const asset = new pc.Asset(`player_${index}`, "texture", { url: url });
      app.assets.add(asset);
      asset.once("load", () => onAssetLoaded(asset, "player", index));
      asset.once("error", (err) => {
        console.error(`❌ Failed to load player asset ${index}:`, err);
        loaded++;
        if (loaded === toLoad) resolve(window.GAME_TEXTURES);
      });
      app.assets.load(asset);
    });

    // Load enemy assets
    enemyAssets.forEach((url, index) => {
      const asset = new pc.Asset(`enemy_${index}`, "texture", { url: url });
      app.assets.add(asset);
      asset.once("load", () => onAssetLoaded(asset, "enemy", index));
      asset.once("error", (err) => {
        console.error(`❌ Failed to load enemy asset ${index}:`, err);
        loaded++;
        if (loaded === toLoad) resolve(window.GAME_TEXTURES);
      });
      app.assets.load(asset);
    });

    // NOVO: Load vision assets
    visionAssets.forEach((url, index) => {
      const asset = new pc.Asset(`vision_${index}`, "texture", { url: url });
      app.assets.add(asset);
      asset.once("load", () => onAssetLoaded(asset, "vision", index));
      asset.once("error", (err) => {
        console.warn(`⚠️ Failed to load vision asset ${index}:`, err);
        console.log("Will use solid color cone instead");
        loaded++;
        if (loaded === toLoad) resolve(window.GAME_TEXTURES);
      });
      app.assets.load(asset);
    });

    // Load torch assets
    torchAssets.forEach((url, index) => {
      const asset = new pc.Asset(`torch_${index}`, "texture", { url: url });
      app.assets.add(asset);
      asset.once("load", () => onAssetLoaded(asset, "torch", index));
      asset.once("error", (err) => {
        console.error(`❌ Failed to load torch asset ${index}:`, err);
        loaded++;
        if (loaded === toLoad) resolve(window.GAME_TEXTURES);
      });
      app.assets.load(asset);
    });

    // Load altar assets
    altarAssets.forEach((url, index) => {
      const asset = new pc.Asset(`altar_${index}`, "texture", { url: url });
      app.assets.add(asset);
      asset.once("load", () => onAssetLoaded(asset, "altar", index));
      asset.once("error", (err) => {
        console.error(`❌ Failed to load altar asset ${index}:`, err);
        loaded++;
        if (loaded === toLoad) resolve(window.GAME_TEXTURES);
      });
      app.assets.load(asset);
    });

    // Load world assets
    worldAssets.forEach((url) => {
      const name = url.split("/").pop().split(".")[0];
      const asset = new pc.Asset(name, "texture", { url: url });
      app.assets.add(asset);
      asset.once("load", () => onAssetLoaded(asset, "world"));
      asset.once("error", (err) => {
        console.error(`❌ Failed to load world asset ${name}:`, err);
        loaded++;
        if (loaded === toLoad) resolve(window.GAME_TEXTURES);
      });
      app.assets.load(asset);
    });
  });
}