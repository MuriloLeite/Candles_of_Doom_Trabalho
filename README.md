
# História - Bearer of Ash

A escuridão é apenas a luz que queimou por tempo demais... Por eras, os Towners guardaram a Candelária Celeste, um antigo altar forjado com metais de estrelas caídas. Ela era o elo entre o mundo humano e a essência luminosa dos antigos deuses - um símbolo da ordem e da pureza. Mas sob o brilho dourado da Candelária, existia um segredo esquecido: a chama original não era feita de luz... e sim de sombra viva. Você é um dos Sombras do Fulgor, uma alma banida que outrora serviu à Candelária antes que os Towners profanassem seu fogo, aprisionando-o em luz. 
Agora, desperto entre os mundos, você busca restaurar a verdadeira chama, reacendendo as Tochas da Ruína - artefatos antigos que alimentam a essência sombria do fogo original. Quando todas as tochas estiverem acesas, o círculo da Candelária se fechará e renascerá como o Foco das Sombras Eternas, consumindo toda a luz falsa que domina o mundo. 

## Objetivo do jogador

O jogador deve acender as tochas da Ruína no centro da área sagrada. Os Towners, cegos pela devoção, tentarão impedir. Use seus dons sombrios para confundir seus inimigos e finalizar o trabalho. 

## Personagem principal

“O Portador da Cinza”, um ex-sacerdote que traiu os deuses da luz ao descobrir a origem verdadeira do fogo. Condenado a vagar entre mundos, agora carrega fragmentos da antiga chama dentro do próprio corpo. Cada tocha que reacende o torna mais humano - mas também mais monstruoso. 

## Cenário 

Claustro da Luz Silente, onde monges Towners realizam rituais para selar o fogo.

# Bearer of Ash (PlayCanvas)

Jogo de ação top-down desenvolvido para a PlayCanvas, criado inteiramente com scripts JavaScript (pc.createScript) no VS Code.

Este repositório suporta dois fluxos de trabalho:

Execução local apenas com a engine (sem PlayCanvas Editor): abrir index.html, que utiliza scripts/bootstrap.js para construir a cena e a interface em tempo de execução com texturas.

Fluxo com Editor (opcional): enviar scripts e imagens para um projeto PlayCanvas e configurar componentes/atributos no Editor.

## Estrutura de Pastas (local / VS Code)

Importe esses arquivos para seu projeto PlayCanvas (Assets → Upload). Para imagens, crie assets de Sprite (Animado quando necessário).

## Hierarquia de Cena

Se usar o fluxo com o Editor, crie duas cenas no PlayCanvas:

Menu

Screen (Screen Space)

MenuPanel (Element: Group)

Title (Element: Text)

Buttons (Element: Button para cada) → Easy, Normal, Hard, Credits, Exit, Start

PausePanel (oculto)

HudPanel (oculto)

WinPanel (oculto)

LosePanel (oculto)

CreditsPanel (oculto)

UiManager (Entidade com Script: uiManager)

TinwoodGrove (Jogo)

Camera (Orthographic) olhando para baixo no eixo Y-

Background (Element: Image) usando images/map.jpg (esticado ou escalado para o mundo)

Player (Sprite, Collision opcional)

Script: playerController

Torches (sugerido 4)

Torch_01..04 (Sprite com 2 frames)

Script: torch

Altar (Sprite com 5 frames)

Script: altar

GameManager (Vazio)

Script: gameManager

EnemyPrefab (filho desativado com Sprite + Script enemyAI)

UI (Screen Space)

HudPanel (Element: Group)

TorchesText (Text)

DifficultyText (Text)

HintText (Text opcional)

Painéis de Pause/Win/Lose, se preferir também na cena do jogo

Script: uiManager (opcional na cena do jogo se não reutilizar a cena Menu)

Para o fluxo local apenas com a engine, scripts/bootstrap.js cria programaticamente uma hierarquia equivalente em tempo de execução e carrega texturas diretamente da pasta images/.

## Scripts (anexar via Script Component)

playerController.js → na entidade Player

Movimento com WASD no plano XZ

Segurar E para acender uma tocha próxima

Animação de Sprite com 3 frames

enemyAI.js → em entidades Enemy (e EnemyPrefab)

Procura tochas acesas e as apaga

Opcionalmente persegue o jogador se estiver perto

torch.js → em cada entidade Torch

Gerencia estado aceso/apagado, acender/apagar

Emite eventos usados por GameManager/UI

altar.js → na entidade Altar

Mostra contagem de tochas acesas (frame 0..4) e dispara vitória

gameManager.js → em uma entidade GameManager

Controla tochas, spawn de inimigos, dificuldade, vitória/derrota

uiManager.js → na raiz da UI (Menu ou Jogo dependendo da configuração)

Botões e atualização do HUD, pause/resume, carregamento de cena

## Configuração de Componentes no Editor (opcional)

Geral

Use um layout 2D top-down com plano XZ; mantenha Y = 0 para entidades de jogo.

Camera → Orthographic (ajuste tamanho ao mundo). Aponte para (0, -1, 0), posição em torno de (0, 10, 0).

Player

Sprite Component: defina um Sprite com 3 frames (grade ou clips). O script usa sprite.frame para animar.

(Opcional) Collision (Capsule/Box) + Rigidbody (Kinematic) se quiser triggers; scripts também funcionam só com verificação de distância.

Script Component → adicionar playerController

moveSpeed ≈ 2.2

animFps = 10, frames = 3

interactionRadius = 1.5

gameManager = entidade GameManager

Torch (repetir por tocha)

Sprite Component: 2 frames (0=apagado, 1=aceso) OU Sprite com duas imagens.

Marque a entidade com a tag torch (script adiciona automaticamente se não existir).

Script Component → adicionar torch

startLit (se desejar começar acesa)

igniteTime ≈ 1.2s; extinguishTime depende da dificuldade (enemyAI substitui)

Altar

Sprite Component: 5 frames. O índice do frame igual ao número de tochas acesas (0..4).

Script Component → adicionar altar

Enemies

Crie uma entidade EnemyPrefab dentro de GameManager (desativada), com Sprite (3 frames) e Script enemyAI.

EnemyPrefab será clonado/gerado pelo GameManager.

GameManager

Script Component → adicionar gameManager

difficulty: Easy/Normal/Hard (substituído pela seleção do menu via localStorage)

player: entidade Player

altar: entidade Altar

uiManager: entidade UI (HUD do jogo)

enemyPrefab: filho EnemyPrefab (template desativado)

spawnPoints: adicione algumas entidades vazias no mapa como pontos de spawn

UI / Menu

Crie uma UI Screen Space com painéis Element: Group para Menu, HUD, Pause, Win, Lose, Credits.

Adicione Botões com componentes Element + Button; conecte ao uiManager via atributos.

Script Component → adicionar uiManager e vincular entidades de painel e textos.

## Fluxo de Jogo

Cena Menu carrega com uiManager exibindo MenuPanel.

Escolher dificuldade (Easy/Normal/Hard) → salva em localStorage.

Start → carrega cena TinwoodGrove; uiManager exibe HUD e envia game:resume.

Jogador explora e acende tochas com E; inimigos aparecem e tentam apagar.

Altar atualiza frames conforme tochas acesas; quando todas acesas e mantidas por um tempo, vitória.

Se todas forem apagadas, derrota.

Pause com ESC → Resume/Restart/Return to Main.

## Dificuldade (valores padrão no GameManager)

Easy: enemySpeed 1.6, detectRange 6, spawnInterval 10s, maxEnemies 4, extinguishTime 3.0s

Normal: 2.1, 8, 7s, 6, 2.2s

Hard: 2.7, 10, 5s, 8, 1.6s


## Notas

Execução local apenas com a engine:

Inicie um servidor web local na raiz do repositório e acesse http://localhost:PORT/ para carregar index.html.

Nomes de arquivos de asset esperados por padrão (ajustáveis em scripts/bootstrap.js):

## Fluxo com Editor:

Criar assets de Sprite e atribuir às entidades. Os scripts também suportam modo apenas textura via Render (atributos frameTextures, unlitTexture, litTexture).

A UI espera componentes Element; vincule via atributos no Editor.
