// Enhanced Dig Dug Map Configuration

export const TILE_SIZE = 48;
export const ROWS = 15;
export const COLS = 14;

export type TileType =
    | 0 // Tunnel (Empty)
    | 1 // Dirt (Normal)
    | 10 // Hidden Gold (Give Points)
    | 11 // Hidden Diamond (Next Level / Big Points)
    | 12 // Hidden Rock (Stops movement)
    | 13 // Hidden Bomb (Explodes)
    | 14 // Hidden Speed (Powerup)
    | 15 // Hidden Water (Slow/Slip)
    | 16 // Hidden Bronze (Take Points);

export interface EnemyConfig {
    x: number;
    y: number;
    type: 'POOKA' | 'FYGAR';
}

export interface RockConfig {
    x: number;
    y: number;
    variant: 0 | 1 | 2; // 0=Round, 1=Jagged, 2=Flat
    scale: number; // 0.8 to 1.4
}

export interface LevelConfig {
    map: number[][];
    enemies: EnemyConfig[];
    rocks: RockConfig[];
    digDugStart: { x: number; y: number };
    color: string; // Earth color
    levelName: string;
}

const EARTH_COLORS = [
    '#964B00', // Brown (Classic)
    '#8B4513', // SaddleBrown
    '#A0522D', // Sienna
    '#CD853F', // Peru
    '#D2691E', // Chocolate
    '#B8860B', // DarkGoldenRod
    '#556B2F', // DarkOliveGreen
    '#800000', // Maroon
    '#483D8B', // DarkSlateBlue (Alien world?)
    '#2F4F4F', // DarkSlateGray
];

export function getDigDugLevel(level: number): LevelConfig {
    // 0. Setup Grid
    const map: number[][] = Array.from({ length: ROWS }, () => Array(COLS).fill(1));
    for (let c = 0; c < COLS; c++) map[0][c] = 0; // Top row empty

    // 1. Pre-cut Tunnels (Procedural-ish based on level)
    // Always a center shaft for start
    for (let r = 1; r < 9; r++) map[r][7] = 0;

    // Random tunnels
    const numTunnels = 2 + Math.floor(level / 5);
    for (let i = 0; i < numTunnels; i++) {
        const tr = 2 + Math.floor(Math.random() * (ROWS - 4));
        const tc = 2 + Math.floor(Math.random() * (COLS - 4));
        const dir = Math.random() > 0.5 ? 'H' : 'V';
        const len = 3 + Math.floor(Math.random() * 4);

        if (dir === 'H') {
            for (let k = 0; k < len; k++) if (tc + k < COLS - 1) map[tr][tc + k] = 0;
        } else {
            for (let k = 0; k < len; k++) if (tr + k < ROWS - 1) map[tr + k][tc] = 0;
        }
    }

    // 2. Hidden Items (The "Treats")
    // Amount scales with level
    // Gold: Common
    // Diamond: Rare (Goal)
    // Hazards: Increase with level

    const seedItem = (type: TileType, count: number) => {
        let placed = 0;
        let attempts = 0;
        while (placed < count && attempts < 100) {
            attempts++;
            const r = 2 + Math.floor(Math.random() * (ROWS - 3));
            const c = 1 + Math.floor(Math.random() * (COLS - 2));
            if (map[r][c] === 1) { // Only place in dirt
                map[r][c] = type;
                placed++;
            }
        }
    };

    if (level === 1) {
        // --- Level 1 Specific Config ---
        seedItem(10, 1); // 1 Gold
        seedItem(11, 1); // 1 Diamond
        seedItem(16, 1); // 1 Silver
    } else {
        // --- Standard Scaling ---
        // "Next level startas from beggining code ... each level incremend gold, diamond and silver randomly"
        // Base is 1, plus random increment
        const goldCount = 1 + Math.floor(Math.random() * level);
        const diamondCount = 1 + Math.floor(Math.random() * (level / 2)); // Scale diamonds slower
        const silverCount = 1 + Math.floor(Math.random() * level);

        seedItem(10, goldCount);
        seedItem(11, diamondCount);
        seedItem(16, silverCount);

        // Hazards/Powerups (Keep existing logic or adjust?)
        // Keeping similar logic but ensuring clean board otherwise
        if (level > 2) seedItem(12, 2 + Math.floor(level / 5)); // Hard Rock
        if (level > 5) seedItem(13, 1 + Math.floor(level / 10)); // Bomb
        if (level > 3) seedItem(14, 1); // Speed
        if (level > 4) seedItem(15, 2); // Water (Slip)
    }

    // 3. Enemies
    const enemies: EnemyConfig[] = [];

    let numPookas = 0;
    let numFygars = 0;

    if (level === 1) {
        numPookas = 1;
        numFygars = 1;
    } else {
        // Scale enemies aggressively: "multiply itself every level"
        numPookas = 3 + (level * 2);
        numFygars = 1 + level;
    }

    const digDugStart = { x: 7, y: 5 };

    // Helper to find open tunnel spot
    const findOpenSpot = (): { x: number, y: number } | null => {
        let attempts = 0;
        while (attempts < 100) {
            const r = 2 + Math.floor(Math.random() * (ROWS - 2));
            const c = 1 + Math.floor(Math.random() * (COLS - 2));

            // Distance Check from Player
            const distPlayer = Math.hypot(c - digDugStart.x, r - digDugStart.y);

            // Distance Check from Other Enemies (Spread them out)
            const isCrowded = enemies.some(e => Math.hypot(e.x - c, e.y - r) < 4); // Min 4 tiles apart

            if (map[r][c] === 0 && distPlayer > 5 && !isCrowded) return { x: c, y: r };
            attempts++;
        }
        return null;
    };

    for (let i = 0; i < numPookas; i++) {
        const spot = findOpenSpot();
        if (spot) enemies.push({ ...spot, type: 'POOKA' });
    }
    for (let i = 0; i < numFygars; i++) {
        const spot = findOpenSpot();
        if (spot) enemies.push({ ...spot, type: 'FYGAR' });
    }

    // 4. Rocks (Falling)
    const rocks: RockConfig[] = [];
    const numRocks = 4 + Math.floor(level / 2); // More rocks (was 2 + lvl/5)
    for (let i = 0; i < numRocks; i++) {
        // Place rocks in dirt, sporadic placement
        let placed = false;
        let attempts = 0;
        while (!placed && attempts < 50) {
            attempts++;
            const r = 2 + Math.floor(Math.random() * (ROWS - 4)); // Wider vertical range
            const c = 1 + Math.floor(Math.random() * (COLS - 2));
            if (map[r][c] === 1) { // In dirt
                rocks.push({
                    x: c,
                    y: r,
                    variant: Math.floor(Math.random() * 3) as 0 | 1 | 2,
                    scale: 0.8 + Math.random() * 0.6 // 0.8 to 1.4
                });
                placed = true;
            }
        }
    }

    return {
        map,
        enemies,
        rocks,
        digDugStart: { x: 7, y: 5 },
        color: EARTH_COLORS[(level - 1) % EARTH_COLORS.length],
        levelName: level % 10 === 0 ? `MILESTONE ${level}` : `LEVEL ${level}`
    };
}
