/**
 * layerManager.js
 * Cria e gerencia layers do PlayCanvas Engine
 * Deve ser carregado ANTES de criar entidades
 */

function setupLayers(app) {
  console.log("🎨 Configurando layers...");

  // Obtém a composição de layers da aplicação
  const composition = app.scene.layers;

  // Remove layers existentes (exceto World e UI que são padrão)
  const layersToRemove = [];
  composition.layerList.forEach((layer) => {
    if (layer.name !== "World" && layer.name !== "Ui" && layer.name !== "Skybox") {
      layersToRemove.push(layer);
    }
  });
  layersToRemove.forEach((layer) => composition.remove(layer));

  // IDs únicos para cada layer (números altos para evitar conflitos)
  const LAYER_IDS = {
    BACKGROUND: 100,
    WORLD: 101,
    OBJECTS: 102,
    PLAYER: 103,
    ENEMIES: 104,
    VISION: 105,
    UI: 106,
  };

  // Cria layers customizadas
  const layers = {};

  // 1. BACKGROUND - Mapa de fundo (z = -1)
  layers.background = new pc.Layer({
    id: LAYER_IDS.BACKGROUND,
    name: "Background",
    opaqueSortMode: pc.SORTMODE_NONE,
    transparentSortMode: pc.SORTMODE_NONE,
  });

  // 2. WORLD - Objetos do mundo (tochas, altar) (z = 0 a 0.02)
  layers.world = new pc.Layer({
    id: LAYER_IDS.WORLD,
    name: "World",
    opaqueSortMode: pc.SORTMODE_MANUAL,
    transparentSortMode: pc.SORTMODE_BACK2FRONT,
  });

  // 3. OBJECTS - Obstáculos, decorações (z = 0.01)
  layers.objects = new pc.Layer({
    id: LAYER_IDS.OBJECTS,
    name: "Objects",
    opaqueSortMode: pc.SORTMODE_MANUAL,
    transparentSortMode: pc.SORTMODE_BACK2FRONT,
  });

  // 4. PLAYER - Player (z = 0.02)
  layers.player = new pc.Layer({
    id: LAYER_IDS.PLAYER,
    name: "Player",
    opaqueSortMode: pc.SORTMODE_MANUAL,
    transparentSortMode: pc.SORTMODE_BACK2FRONT,
  });

  // 5. ENEMIES - Inimigos (z = 0.02)
  layers.enemies = new pc.Layer({
    id: LAYER_IDS.ENEMIES,
    name: "Enemies",
    opaqueSortMode: pc.SORTMODE_MANUAL,
    transparentSortMode: pc.SORTMODE_BACK2FRONT,
  });

  // 6. VISION - Cone de visão dos inimigos (z = 0.03) - com transparência
  layers.vision = new pc.Layer({
    id: LAYER_IDS.VISION,
    name: "Vision",
    opaqueSortMode: pc.SORTMODE_NONE,
    transparentSortMode: pc.SORTMODE_BACK2FRONT,
  });

  // 7. UI - Interface (sempre no topo)
  layers.ui = new pc.Layer({
    id: LAYER_IDS.UI,
    name: "UI",
    opaqueSortMode: pc.SORTMODE_MANUAL,
    transparentSortMode: pc.SORTMODE_MANUAL,
  });

  // Adiciona layers à composição na ordem correta
  composition.push(layers.background);
  composition.push(layers.world);
  composition.push(layers.objects);
  composition.push(layers.player);
  composition.push(layers.enemies);
  composition.push(layers.vision);
  composition.push(layers.ui);

  // Adiciona câmera a todas as layers (exceto UI que tem sua própria câmera)
  const camera = app.root.findByName("Camera");
  if (camera && camera.camera) {
    camera.camera.layers = [
      LAYER_IDS.BACKGROUND,
      LAYER_IDS.WORLD,
      LAYER_IDS.OBJECTS,
      LAYER_IDS.PLAYER,
      LAYER_IDS.ENEMIES,
      LAYER_IDS.VISION,
    ];
  }

  console.log("✅ Layers configuradas:", {
    background: LAYER_IDS.BACKGROUND,
    world: LAYER_IDS.WORLD,
    objects: LAYER_IDS.OBJECTS,
    player: LAYER_IDS.PLAYER,
    enemies: LAYER_IDS.ENEMIES,
    vision: LAYER_IDS.VISION,
    ui: LAYER_IDS.UI,
  });

  // Retorna IDs para uso no código
  return LAYER_IDS;
}

/**
 * Adiciona uma entidade a uma layer específica
 * @param {pc.Entity} entity - Entidade a ser adicionada
 * @param {number} layerId - ID da layer
 */
function addToLayer(entity, layerId) {
  if (entity.render) {
    entity.render.layers = [layerId];
  }
  if (entity.element) {
    entity.element.layers = [layerId];
  }
}

/**
 * Adiciona múltiplas entidades a uma layer
 * @param {pc.Entity[]} entities - Array de entidades
 * @param {number} layerId - ID da layer
 */
function addAllToLayer(entities, layerId) {
  entities.forEach((entity) => addToLayer(entity, layerId));
}

// Exporta funções globalmente para uso nos scripts
window.setupLayers = setupLayers;
window.addToLayer = addToLayer;
window.addAllToLayer = addAllToLayer;