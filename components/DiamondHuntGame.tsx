'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useUser, SignInButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import MobileControls, { ControlAction } from '@/components/ui/MobileControls';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { getDiamondHuntLevel, TILE_SIZE, ROWS, COLS, EnemyConfig } from '@/lib/diamondhunt-maps';

// --- Constants ---
const PLAYER_SPEED_BASE = 0.2; // Speed 2
const PLAYER_SPEED_DIG = 0.1; // Speed 1
const PLAYER_SPEED_BOOST = 0.3; // Speed 3 (Diamond)
const ENEMY_SPEED = 0.1; // Speed 1
const PUMP_RANGE = 3; // Tiles
const INFLATE_SPEED = 0.05; // How fast they blow up
const POP_THRESHOLD = 1.0; // 100% inflated

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'NONE';

interface Entity {
    x: number;
    y: number;
    dir: Direction;
    nextDir: Direction;
    speed: number;
    type: 'PLAYER' | 'BURROWER' | 'DRAKE';
    state: 'IDLE' | 'WALKING' | 'PUMPING' | 'INFLATED' | 'GHOST' | 'WET';
    inflation: number; // 0 to 1
    ghostTimer: number;
}

interface Pump {
    active: boolean;
    x: number;
    y: number;
    dir: Direction;
    length: number;
    targetId: number | null; // index of enemy attached
}

interface Rock {
    x: number;
    y: number;
    state: 'IDLE' | 'WOBBLE' | 'FALLING';
    timer: number;
    variant: 0 | 1 | 2;
    scale: number;
}

interface FloatingText {
    x: number;
    y: number;
    text: string;
    color: string;
    life: number;
}

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    size: number;
    life: number;
    maxLife: number;
    type: 'DIRT' | 'SPARKLE' | 'DUST';
}

interface DelayedItem {
    r: number;
    c: number;
    type: 'GOLD' | 'DIAMOND';
    timer: number;
}

// Assets
const ASSETS = {
    miner: '/assets/diamond-hunt/miner.svg',
    burrower: '/assets/diamond-hunt/burrower.svg',
    drake: '/assets/diamond-hunt/drake.svg',
    diamond: '/assets/diamond-hunt/diamond.svg',
    gold: '/assets/diamond-hunt/gold.svg',
    silver: '/assets/diamond-hunt/silver.svg',
    rock: '/assets/diamond-hunt/rock.svg',
    bomb: '/assets/diamond-hunt/bomb.svg',
    water: '/assets/diamond-hunt/water.svg',
};

export default function DiamondHuntGame() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { user } = useUser();
    const submitScore = useMutation(api.scores.submitScore);

    // Game State
    const [level, setLevel] = useState(1);
    const [score, setScore] = useState(0);
    const [lives, setLives] = useState(3);
    const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'GAME_OVER' | 'VICTORY' | 'AUTH_REQUIRED'>('START');

    // Level Config
    const [earthColor, setEarthColor] = useState('#964B00');
    const [levelName, setLevelName] = useState('LEVEL 1');
    const [diamondTimer, setDiamondTimer] = useState(0); // For UI display

    // Asset Images Ref
    const imagesRef = useRef<{ [key: string]: HTMLImageElement }>({});

    // Load Assets
    useEffect(() => {
        Object.entries(ASSETS).forEach(([key, src]) => {
            const img = new Image();
            img.src = src;
            imagesRef.current[key] = img;
        });
    }, []);


    // Refs
    const mapRef = useRef<number[][]>([]);
    const playerRef = useRef<Entity>({
        x: 0, y: 0, dir: 'NONE', nextDir: 'NONE', speed: PLAYER_SPEED_BASE,
        type: 'PLAYER', state: 'IDLE', inflation: 0, ghostTimer: 0
    });
    const enemiesRef = useRef<Entity[]>([]);
    const rocksRef = useRef<Rock[]>([]);
    const pumpRef = useRef<Pump>({ active: false, x: 0, y: 0, dir: 'NONE', length: 0, targetId: null });
    const floatingTextsRef = useRef<FloatingText[]>([]);
    const delayedItemsRef = useRef<DelayedItem[]>([]);
    const particlesRef = useRef<Particle[]>([]);

    const reqRef = useRef<number>(0);
    const scoreRef = useRef(0);
    const lastSpawnScoreRef = useRef(0);
    const levelRef = useRef(1);
    const livesRef = useRef(3);

    // Powerups
    const speedBoostTimerRef = useRef(0);
    const floodLevelRef = useRef(0);
    const floodTimerRef = useRef(0);

    const totalTreasuresRef = useRef(0);
    const collectedTreasuresRef = useRef(0);

    // Inputs
    const heldDirectionsRef = useRef<Direction[]>([]);
    const actionHeldRef = useRef<boolean>(false);

    // --- Initialization ---
    const initLevel = useCallback((lvl: number) => {
        const config = getDiamondHuntLevel(lvl);
        // Deep copy map
        mapRef.current = config.map.map(row => [...row]);
        setEarthColor(config.color);
        setLevelName(config.levelName);

        playerRef.current = {
            x: config.diamondHuntStart.x,
            y: config.diamondHuntStart.y,
            dir: 'RIGHT',
            nextDir: 'NONE',
            speed: PLAYER_SPEED_BASE,
            type: 'PLAYER',
            state: 'IDLE',
            inflation: 0,
            ghostTimer: 0
        };

        enemiesRef.current = config.enemies.map(e => ({
            x: e.x,
            y: e.y,
            dir: 'NONE',
            nextDir: 'NONE',
            speed: ENEMY_SPEED,
            type: e.type,
            state: 'WALKING',
            inflation: 0,
            ghostTimer: 0
        }));

        rocksRef.current = config.rocks.map(r => ({
            x: r.x,
            y: r.y,
            state: 'IDLE',
            timer: 0,
            variant: r.variant,
            scale: r.scale
        }));

        pumpRef.current = { active: false, x: 0, y: 0, dir: 'NONE', length: 0, targetId: null };
        speedBoostTimerRef.current = 0;

        // Count Treasures
        let tCountGold = 0;
        let tCountDiamond = 0;
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (config.map[r][c] === 10) tCountGold++;
                if (config.map[r][c] === 11) tCountDiamond++;
            }
        }
        totalTreasuresRef.current = tCountGold + tCountDiamond; // Total needed to win
        collectedTreasuresRef.current = 0;

    }, []);

    const resetGame = () => {
        scoreRef.current = 0;
        setScore(0);
        livesRef.current = 3;
        setLives(3);
        levelRef.current = 1;
        setLevel(1);
        initLevel(1);
        setGameState('PLAYING');
    };

    // --- Input Handling ---
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (gameState !== 'PLAYING') return;
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();

            if (e.key === ' ') {
                actionHeldRef.current = true;
                return;
            }

            let newDir: Direction = 'NONE';
            if (e.key === 'ArrowUp') newDir = 'UP';
            if (e.key === 'ArrowDown') newDir = 'DOWN';
            if (e.key === 'ArrowLeft') newDir = 'LEFT';
            if (e.key === 'ArrowRight') newDir = 'RIGHT';

            if (newDir !== 'NONE') {
                heldDirectionsRef.current = heldDirectionsRef.current.filter(d => d !== newDir);
                heldDirectionsRef.current.push(newDir);
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === ' ') {
                actionHeldRef.current = false;
                return;
            }

            let releasedDir: Direction = 'NONE';
            if (e.key === 'ArrowUp') releasedDir = 'UP';
            if (e.key === 'ArrowDown') releasedDir = 'DOWN';
            if (e.key === 'ArrowLeft') releasedDir = 'LEFT';
            if (e.key === 'ArrowRight') releasedDir = 'RIGHT';

            if (releasedDir !== 'NONE') {
                heldDirectionsRef.current = heldDirectionsRef.current.filter(d => d !== releasedDir);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [gameState]);

    const handleMobileInput = (action: ControlAction, active: boolean) => {
        if (action === 'A') {
            actionHeldRef.current = active;
            return;
        }

        let dir: Direction = 'NONE';
        if (action === 'UP') dir = 'UP';
        if (action === 'DOWN') dir = 'DOWN';
        if (action === 'LEFT') dir = 'LEFT';
        if (action === 'RIGHT') dir = 'RIGHT';

        if (dir !== 'NONE') {
            if (active) {
                heldDirectionsRef.current = heldDirectionsRef.current.filter(d => d !== dir);
                heldDirectionsRef.current.push(dir);
            } else {
                heldDirectionsRef.current = heldDirectionsRef.current.filter(d => d !== dir);
            }
        }
    };

    const spawnEnemy = useCallback(() => {
        // Simple spawn logic: Find a spot far from player
        let attempts = 0;
        let spawnX = 1, spawnY = 1;
        let found = false;

        while (attempts < 50 && !found) {
            const r = 2 + Math.floor(Math.random() * (ROWS - 2));
            const c = 1 + Math.floor(Math.random() * (COLS - 2));
            // Safe distance > 5
            // Safe distance > 5 from player
            if (Math.hypot(c - playerRef.current.x, r - playerRef.current.y) > 5) {
                // Also check separation from other enemies (Min 2 tiles)
                const quiet = enemiesRef.current.every(e => Math.hypot(e.x - c, e.y - r) >= 2);
                if (quiet) {
                    spawnX = c;
                    spawnY = r;
                    found = true;
                }
            }
            attempts++;
        }

        enemiesRef.current.push({
            x: spawnX,
            y: spawnY,
            dir: 'NONE',
            nextDir: 'NONE',
            speed: ENEMY_SPEED,
            type: Math.random() > 0.5 ? 'BURROWER' : 'DRAKE',
            state: 'WALKING',
            inflation: 0,
            ghostTimer: 0
        });
        floatingTextsRef.current.push({ x: spawnX * TILE_SIZE, y: spawnY * TILE_SIZE, text: "WARNING!", color: "red", life: 60 });
    }, []);

    const spawnParticles = (x: number, y: number, type: 'DIRT' | 'SPARKLE' | 'DUST', color: string, count: number) => {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 2 + 1;
            particlesRef.current.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed + (type === 'DIRT' ? 1.5 : -0.5), // dirt falls down, sparkles float up
                color,
                size: Math.random() * 3 + 2,
                life: Math.random() * 15 + 15,
                maxLife: 30,
                type
            });
        }
    };

    // --- Game Logic ---
    const update = useCallback(() => {
        if (gameState !== 'PLAYING') return;

        // Dynamic Spawning based on Score
        if (scoreRef.current - lastSpawnScoreRef.current >= 1000) {
            spawnEnemy();
            lastSpawnScoreRef.current += 1000;
        }

        const p = playerRef.current;

        // Powerups / Speed Logic
        // Diamond Boost (Speed 3) > Base (Speed 2)
        if (speedBoostTimerRef.current > 0) {
            speedBoostTimerRef.current--;
            p.speed = PLAYER_SPEED_BOOST;

            // Sync UI Timer (approximate every 60 frames)
            if (speedBoostTimerRef.current % 60 === 0) {
                setDiamondTimer(Math.ceil(speedBoostTimerRef.current / 60));
            }
        } else {
            if (diamondTimer !== 0) setDiamondTimer(0); // Clear UI
            p.speed = PLAYER_SPEED_BASE;
        }

        let desiredDir: Direction = 'NONE';
        if (heldDirectionsRef.current.length > 0) {
            desiredDir = heldDirectionsRef.current[heldDirectionsRef.current.length - 1];
        }

        // Pump Logic
        if (actionHeldRef.current) {
            if (!pumpRef.current.active && p.state !== 'PUMPING') {
                // Start Pumping
                p.state = 'PUMPING';
                pumpRef.current.active = true;
                pumpRef.current.x = p.x;
                pumpRef.current.y = p.y;
                pumpRef.current.dir = p.dir;
                pumpRef.current.length = 0;
                pumpRef.current.targetId = null;
            } else if (pumpRef.current.active) {
                // Continue Pumping
                if (pumpRef.current.targetId !== null) {
                    // Inflate
                    const enemy = enemiesRef.current[pumpRef.current.targetId];
                    if (enemy) {
                        enemy.inflation += 0.05; // Faster pop (was INFLATE_SPEED 0.02)
                        enemy.state = 'INFLATED';
                        if (enemy.inflation >= POP_THRESHOLD) {
                            // Pop!
                            enemiesRef.current.splice(pumpRef.current.targetId, 1);
                            pumpRef.current.targetId = null;
                            pumpRef.current.active = false;
                            p.state = 'IDLE';
                            scoreRef.current += 200 + (levelRef.current * 10);
                            setScore(scoreRef.current);
                        }
                    } else {
                        pumpRef.current.targetId = null;
                        pumpRef.current.active = false;
                        p.state = 'IDLE';
                    }
                } else {
                    // Extend
                    if (pumpRef.current.length < PUMP_RANGE) {
                        pumpRef.current.length += 0.2;
                        // Check Collision
                        let hx = pumpRef.current.x;
                        let hy = pumpRef.current.y;
                        if (pumpRef.current.dir === 'RIGHT') hx += pumpRef.current.length;
                        if (pumpRef.current.dir === 'LEFT') hx -= pumpRef.current.length;
                        if (pumpRef.current.dir === 'UP') hy -= pumpRef.current.length;
                        if (pumpRef.current.dir === 'DOWN') hy += pumpRef.current.length;

                        enemiesRef.current.forEach((e, idx) => {
                            if (Math.hypot(e.x - hx, e.y - hy) < 0.5) {
                                pumpRef.current.targetId = idx;
                            }
                        });
                    }
                }
            }
        } else {
            // Stop Pumping
            if (pumpRef.current.active) {
                pumpRef.current.active = false;
                pumpRef.current.targetId = null;
                p.state = 'IDLE';
            }
        }



        // Flood Logic
        if (floodLevelRef.current > 0) {
            floodTimerRef.current++;
            if (floodTimerRef.current >= 600) { // 10 seconds
                floodTimerRef.current = 0;
                floodLevelRef.current++; // Rise
            }
            // Apply flood to map (Bottom-up)
            const targetRow = ROWS - floodLevelRef.current;
            if (targetRow >= 0) {
                for (let c = 0; c < COLS; c++) {
                    // Fill ONLY open tunnels (0) or existing water (30) to expand?
                    // "rise up one rove per 10 second on open tunnels"
                    // We proactively fill tunnels in the target row
                    if (mapRef.current[targetRow][c] === 0) {
                        mapRef.current[targetRow][c] = 30;
                    }
                }
            }
            // Check if player is invalidly in water (Simple collision later handles moving INTO it, this handles if it rises ONTO you)
            const pr = Math.round(p.y);
            const pc = Math.round(p.x);
            if (mapRef.current[pr] && mapRef.current[pr][pc] === 30) {
                // Drown
                if (livesRef.current > 0) {
                    livesRef.current--;
                    setLives(livesRef.current);
                    playerRef.current.x = getDiamondHuntLevel(levelRef.current).diamondHuntStart.x;
                    playerRef.current.y = getDiamondHuntLevel(levelRef.current).diamondHuntStart.y;
                    // Reset flood? User said "start from biggining". Assuming level reset.
                    floodLevelRef.current = 0;
                    mapRef.current = getDiamondHuntLevel(levelRef.current).map.map(row => [...row]); // Full Map Reset
                } else {
                    setGameState('GAME_OVER');
                }
            }
        }
        const isBlockedByRock = (tx: number, ty: number) => {
            return rocksRef.current.some(r => Math.round(r.x) === Math.round(tx) && Math.round(r.y) === Math.round(ty));
        };

        // Movement
        if (!pumpRef.current.active) {
            if (desiredDir !== 'NONE') {
                p.dir = desiredDir;
                p.state = 'WALKING';

                // Axis Snapping (Fixes "1/2 off" alignment)
                const SNAP_SPEED = 0.2;
                if (desiredDir === 'LEFT' || desiredDir === 'RIGHT') {
                    // Snap Y
                    const targetY = Math.round(p.y);
                    if (Math.abs(p.y - targetY) < SNAP_SPEED) p.y = targetY;
                    else p.y += Math.sign(targetY - p.y) * SNAP_SPEED;
                } else if (desiredDir === 'UP' || desiredDir === 'DOWN') {
                    // Snap X
                    const targetX = Math.round(p.x);
                    if (Math.abs(p.x - targetX) < SNAP_SPEED) p.x = targetX;
                    else p.x += Math.sign(targetX - p.x) * SNAP_SPEED;
                }

                // Determine Base Speed (Digging vs Walking)
                let currentBaseSpeed = 0.3; // Default (Walking)

                // Peek ahead to see if digging
                let peekX = p.x;
                let peekY = p.y;
                if (desiredDir === 'UP') peekY -= 0.4; // Look slightly ahead
                if (desiredDir === 'DOWN') peekY += 0.4;
                if (desiredDir === 'LEFT') peekX -= 0.4;
                if (desiredDir === 'RIGHT') peekX += 0.4;

                const pr = Math.round(peekY);
                const pc = Math.round(peekX);

                // If in bounds and is dirt (1), we are digging
                if (mapRef.current[pr] && mapRef.current[pr][pc] === 1) {
                    currentBaseSpeed = PLAYER_SPEED_DIG; // Digging Speed (1)
                }

                // Apply Powerups/Debuffs on top of dynamic base
                let moveSpeed = currentBaseSpeed;

                if (speedBoostTimerRef.current > 0) {
                    moveSpeed = PLAYER_SPEED_BOOST; // Override with Speed 3
                }

                let nextX = p.x;
                let nextY = p.y;

                if (desiredDir === 'UP') nextY -= moveSpeed;
                if (desiredDir === 'DOWN') nextY += moveSpeed;
                if (desiredDir === 'LEFT') nextX -= moveSpeed;
                if (desiredDir === 'RIGHT') nextX += moveSpeed;

                // Bounds Check & Digging
                // Clamp to ensure we never drift off board
                nextX = Math.max(0, Math.min(COLS - 1, nextX));
                nextY = Math.max(0, Math.min(ROWS - 1, nextY));

                if (true) {
                    const r = Math.round(nextY);
                    const c = Math.round(nextX);
                    if (isBlockedByRock(nextX, nextY)) {
                        // Blocked
                    } else {
                        const targetTile = mapRef.current[r] ? mapRef.current[r][c] : 1;
                        if (targetTile === 30) { // Flooded Water check
                            // Blocked
                            return; // Can't move into flood
                        }

                        // Interaction Logic
                        let canMove = true;

                        if (targetTile === 12) { // Hidden Rock (Visible when close/hit)
                            // If we hit it, reveal it and stop
                            mapRef.current[r][c] = 20; // Revealed Rock (Static)
                            canMove = false;
                        } else if (targetTile === 13) { // Hidden Bomb
                            // Boom!
                            mapRef.current[r][c] = 0; // Cleared
                            // Damage player
                            if (livesRef.current > 0) {
                                livesRef.current--;
                                setLives(livesRef.current);
                                // Reset pos slightly back?
                                // Or full reset? Let's just hurt them for now/reset pos
                                playerRef.current.x = getDiamondHuntLevel(levelRef.current).diamondHuntStart.x;
                                playerRef.current.y = getDiamondHuntLevel(levelRef.current).diamondHuntStart.y;
                            } else {
                                setGameState('GAME_OVER');
                                submitScore({ score: scoreRef.current, level: levelRef.current, gameType: "diamond-hunt" });
                            }
                        } else if (targetTile === 10) { // Gold
                            // Points Immediately
                            scoreRef.current += 100; // Updated Value
                            floatingTextsRef.current.push({ x: c * TILE_SIZE, y: r * TILE_SIZE, text: "+100", color: "#FFD700", life: 60 });
                            spawnParticles(c * TILE_SIZE + TILE_SIZE / 2, r * TILE_SIZE + TILE_SIZE / 2, 'SPARKLE', '#FFD700', 12);

                            // Delay disappearance for 1s (60 frames)
                            mapRef.current[r][c] = 21; // Revealed Gold ID
                            delayedItemsRef.current.push({ r, c, type: 'GOLD', timer: 60 });
                            collectedTreasuresRef.current++;
                        } else if (targetTile === 11) { // Diamond
                            // Points Immediately
                            scoreRef.current += 250;
                            speedBoostTimerRef.current = 300; // 5 seconds @ 60fps
                            setDiamondTimer(5); // Show UI immediately
                            floatingTextsRef.current.push({ x: c * TILE_SIZE, y: r * TILE_SIZE, text: "SPEED UP! +250", color: "#00FFFF", life: 120 });
                            spawnParticles(c * TILE_SIZE + TILE_SIZE / 2, r * TILE_SIZE + TILE_SIZE / 2, 'SPARKLE', '#00FFFF', 16);

                            // Delay disappearance for 1s
                            mapRef.current[r][c] = 22; // Revealed Diamond ID
                            delayedItemsRef.current.push({ r, c, type: 'DIAMOND', timer: 60 });
                            collectedTreasuresRef.current++;
                        } else if (targetTile === 14) { // Speed (Legacy/Extra)
                            scoreRef.current += 200;
                            speedBoostTimerRef.current = 600;
                            mapRef.current[r][c] = 0;
                        } else if (targetTile === 15) { // Water (Flood)
                            scoreRef.current += 50;
                            floodLevelRef.current = 1; // Start Rising
                            floodTimerRef.current = 0;
                            floatingTextsRef.current.push({ x: c * TILE_SIZE, y: r * TILE_SIZE, text: "FLOOD RISING!", color: "#0000FF", life: 120 });
                            mapRef.current[r][c] = 0;
                        } else if (targetTile === 16) { // Silver
                            // Silver is now just bonus points, not penalty
                            scoreRef.current += 500;
                            floatingTextsRef.current.push({ x: c * TILE_SIZE, y: r * TILE_SIZE, text: "BONUS! +500", color: "#C0C0C0", life: 120 });
                            mapRef.current[r][c] = 0;
                        } else if (targetTile === 1) {
                            // Normal Dig
                            mapRef.current[r][c] = 0;
                            scoreRef.current += 10;
                            setScore(scoreRef.current);
                            spawnParticles(c * TILE_SIZE + TILE_SIZE / 2, r * TILE_SIZE + TILE_SIZE / 2, 'DIRT', '#8B4513', 6);
                        }

                        if (canMove) {
                            p.x = nextX;
                            p.y = nextY;
                        }
                    }
                }
            } else {
                p.state = 'IDLE';
            }
        }

        // Process Delayed Items
        for (let i = delayedItemsRef.current.length - 1; i >= 0; i--) {
            const item = delayedItemsRef.current[i];
            item.timer--;
            if (item.timer <= 0) {
                // Clear and Check Win
                setScore(scoreRef.current);
                mapRef.current[item.r][item.c] = 0;
                delayedItemsRef.current.splice(i, 1);

                // Win Condition: All Treasures Found
                if (collectedTreasuresRef.current >= totalTreasuresRef.current && totalTreasuresRef.current > 0) {
                    levelRef.current++;
                    setLevel(levelRef.current);
                    initLevel(levelRef.current);
                    submitScore({ score: scoreRef.current, level: levelRef.current - 1, gameType: "diamond-hunt" });
                    // Reset player to start? initLevel handles state reset but maybe visual transition needed.
                    // The loop continues but level resets.
                }
            }
        }

        // Enemy Logic
        enemiesRef.current.forEach((e) => {
            if (e.state === 'INFLATED') {
                if (!pumpRef.current.active || pumpRef.current.targetId === null) {
                    e.inflation -= 0.01;
                    if (e.inflation <= 0) {
                        e.state = 'WALKING';
                        e.inflation = 0;
                    }
                }
                return;
            }

            // Simple Chase
            // Moles only move in tunnels now!
            const r = Math.round(e.y);
            const c = Math.round(e.x);

            let dx = 0;
            let dy = 0;

            if (Math.abs(p.x - e.x) > Math.abs(p.y - e.y)) {
                dx = p.x > e.x ? 1 : -1;
            } else {
                dy = p.y > e.y ? 1 : -1;
            }

            let nextX = e.x + dx * e.speed * 0.5;
            let nextY = e.y + dy * e.speed * 0.5;

            // Separation Check (Boids-like "personal space")
            // Can't move if it puts us < 2 tiles from another enemy
            // Exception: If we are ALREADY < 2 (stuck/spawned bad), we allow moving AWAY? 
            // For now, strict check on future pos.
            let crowded = false;
            for (const other of enemiesRef.current) {
                if (other === e) continue;
                // Using distance 1.5 to be slightly forgiving but generally 2
                if (Math.hypot(nextX - other.x, nextY - other.y) < 2.0) {
                    crowded = true;
                    break;
                }
            }

            // Bounds check for enemies
            if (!crowded && nextX >= 0 && nextX < COLS && nextY >= 0 && nextY < ROWS) {
                // Free Roaming: No tunnel check needed!
                e.x = nextX;
                e.y = nextY;
            }

            // Collision with Player
            if (Math.hypot(p.x - e.x, p.y - e.y) < 0.5 && p.state !== 'PUMPING') {
                if (livesRef.current > 0) {
                    livesRef.current--;
                    setLives(livesRef.current);
                    playerRef.current.x = getDiamondHuntLevel(levelRef.current).diamondHuntStart.x;
                    playerRef.current.y = getDiamondHuntLevel(levelRef.current).diamondHuntStart.y;
                } else {
                    setGameState('GAME_OVER');
                    submitScore({ score: scoreRef.current, level: levelRef.current, gameType: "diamond-hunt" });
                }
            }
        });

        // REMOVED "Level Clear if Enemies=0" block
        // Level clear is handled in DelayedItems processing (Treasures)

    }, [gameState, initLevel, submitScore]);

    // --- Render ---
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const render = () => {
            // Clear / Background Earth
            ctx.fillStyle = earthColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw Grid & Earth
            for (let r = 0; r < ROWS; r++) {
                for (let c = 0; c < COLS; c++) {
                    const tile = mapRef.current[r][c];
                    const x = c * TILE_SIZE;
                    const y = r * TILE_SIZE;

                    if (tile === 0) {
                        // Carved out tunnel
                        ctx.fillStyle = '#080504';
                        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

                        // Soft tunnel wall ambient shadow
                        ctx.fillStyle = 'rgba(0,0,0,0.4)';
                        ctx.beginPath();
                        ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, TILE_SIZE / 2 + 2, 0, Math.PI * 2);
                        ctx.fill();
                    } else if (tile === 30) {
                        // Flood Water
                        ctx.fillStyle = 'rgba(2, 132, 199, 0.85)';
                        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
                        if (imagesRef.current['water']) {
                            ctx.drawImage(imagesRef.current['water'], x + 4, y + 4, TILE_SIZE - 8, TILE_SIZE - 8);
                        }
                    } else if (tile === 21) {
                        // Revealed Gold
                        ctx.fillStyle = '#140c06';
                        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
                        if (imagesRef.current['gold']) {
                            const bounce = Math.sin(Date.now() / 150) * 2;
                            ctx.drawImage(imagesRef.current['gold'], x + 2, y + 2 + bounce, TILE_SIZE - 4, TILE_SIZE - 4);
                        }
                    } else if (tile === 22) {
                        // Revealed Diamond
                        ctx.fillStyle = '#060d14';
                        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
                        if (imagesRef.current['diamond']) {
                            const bounce = Math.sin(Date.now() / 120) * 3;
                            ctx.drawImage(imagesRef.current['diamond'], x + 2, y + 2 + bounce, TILE_SIZE - 4, TILE_SIZE - 4);
                        }
                    } else {
                        // Solid Dirt / Soil texture
                        ctx.fillStyle = earthColor;
                        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

                        // Subtle soil flecks & stratum lines
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
                        ctx.fillRect(x + 2, y + 2, TILE_SIZE - 4, 2);
                        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
                        ctx.fillRect(x + 2, y + TILE_SIZE - 4, TILE_SIZE - 4, 2);
                    }
                }
            }

            // Draw Rocks
            rocksRef.current.forEach(r => {
                const rx = r.x * TILE_SIZE;
                const ry = r.y * TILE_SIZE;
                let wobbleX = 0;
                if (r.state === 'WOBBLE') {
                    wobbleX = Math.sin(Date.now() / 30) * 3;
                }

                if (imagesRef.current['rock']) {
                    const rSize = TILE_SIZE * r.scale;
                    const offset = (TILE_SIZE - rSize) / 2;
                    ctx.drawImage(imagesRef.current['rock'], rx + offset + wobbleX, ry + offset, rSize, rSize);
                } else {
                    ctx.fillStyle = '#64748B';
                    ctx.beginPath();
                    ctx.arc(rx + TILE_SIZE / 2 + wobbleX, ry + TILE_SIZE / 2, TILE_SIZE / 2 - 4, 0, Math.PI * 2);
                    ctx.fill();
                }
            });

            // Draw Pump Hose
            if (pumpRef.current.active) {
                const p = playerRef.current;
                const px = p.x * TILE_SIZE + TILE_SIZE / 2;
                const py = p.y * TILE_SIZE + TILE_SIZE / 2;

                const hx = pumpRef.current.x * TILE_SIZE + TILE_SIZE / 2;
                const hy = pumpRef.current.y * TILE_SIZE + TILE_SIZE / 2;
                let tx = hx;
                let ty = hy;
                if (pumpRef.current.dir === 'RIGHT') tx += pumpRef.current.length * TILE_SIZE;
                if (pumpRef.current.dir === 'LEFT') tx -= pumpRef.current.length * TILE_SIZE;
                if (pumpRef.current.dir === 'UP') ty -= pumpRef.current.length * TILE_SIZE;
                if (pumpRef.current.dir === 'DOWN') ty += pumpRef.current.length * TILE_SIZE;

                // Glowing Cable
                ctx.save();
                ctx.strokeStyle = '#FACC15';
                ctx.lineWidth = 6;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(px, py);
                ctx.lineTo(tx, ty);
                ctx.stroke();

                ctx.strokeStyle = '#FFFFFF';
                ctx.lineWidth = 2;
                ctx.stroke();

                // Harpoon Dart Tip
                ctx.fillStyle = '#EF4444';
                ctx.beginPath();
                ctx.arc(tx, ty, 6, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            // Draw Player (Miner SVG)
            const p = playerRef.current;
            const px = p.x * TILE_SIZE;
            const py = p.y * TILE_SIZE;
            const isMoving = p.state === 'WALKING' || p.state === 'WET';
            const bob = isMoving ? Math.sin(Date.now() / 60) * 2 : 0;

            ctx.save();
            ctx.translate(px + TILE_SIZE / 2, py + TILE_SIZE / 2 + bob);

            // Flip / Rotate Player
            if (p.dir === 'LEFT') {
                ctx.scale(-1, 1);
            } else if (p.dir === 'UP') {
                ctx.rotate(-Math.PI / 2);
            } else if (p.dir === 'DOWN') {
                ctx.rotate(Math.PI / 2);
            }

            if (imagesRef.current['miner']) {
                ctx.drawImage(imagesRef.current['miner'], -TILE_SIZE / 2, -TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
            } else {
                ctx.fillStyle = '#3B82F6';
                ctx.fillRect(-12, -12, 24, 24);
            }
            ctx.restore();

            // Draw Enemies (Burrower & Drake SVGs)
            enemiesRef.current.forEach(e => {
                const ex = e.x * TILE_SIZE;
                const ey = e.y * TILE_SIZE;

                let size = TILE_SIZE;
                let wobble = 1;
                if (e.state === 'INFLATED') {
                    size += (e.inflation * 28);
                    wobble = 1 + Math.sin(Date.now() / 50) * (e.inflation * 0.1);
                }

                ctx.save();
                ctx.translate(ex + TILE_SIZE / 2, ey + TILE_SIZE / 2);
                ctx.scale(wobble, wobble);

                // Face toward player
                if (e.x > p.x) {
                    ctx.scale(-1, 1);
                }

                const enemyImg = e.type === 'DRAKE' ? imagesRef.current['drake'] : imagesRef.current['burrower'];
                if (enemyImg) {
                    ctx.drawImage(enemyImg, -size / 2, -size / 2, size, size);
                } else {
                    ctx.fillStyle = e.type === 'DRAKE' ? '#10B981' : '#F43F5E';
                    ctx.beginPath();
                    ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
                    ctx.fill();
                }

                ctx.restore();
            });

            // Draw Particles
            for (let i = particlesRef.current.length - 1; i >= 0; i--) {
                const pt = particlesRef.current[i];
                pt.x += pt.vx;
                pt.y += pt.vy;
                pt.life++;

                const progress = pt.life / pt.maxLife;
                const alpha = Math.max(0, 1 - progress);

                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.fillStyle = pt.color;
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, pt.size * (1 - progress * 0.5), 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();

                if (pt.life >= pt.maxLife) {
                    particlesRef.current.splice(i, 1);
                }
            }

            // Draw Floating Texts
            for (let i = floatingTextsRef.current.length - 1; i >= 0; i--) {
                const ft = floatingTextsRef.current[i];
                ft.life--;
                ft.y -= 0.6; // Float up

                ctx.save();
                ctx.fillStyle = ft.color;
                ctx.font = "bold 16px 'Courier New', monospace";
                ctx.shadowColor = '#000000';
                ctx.shadowBlur = 4;
                ctx.fillText(ft.text, ft.x, ft.y);
                ctx.restore();

                if (ft.life <= 0) {
                    floatingTextsRef.current.splice(i, 1);
                }
            }

            // Draw Speed Boost/Debuff Timer Overlay
            if (speedBoostTimerRef.current !== 0) {
                ctx.font = "bold 20px 'Courier New', monospace";
                const seconds = Math.ceil(Math.abs(speedBoostTimerRef.current) / 60);

                if (speedBoostTimerRef.current > 0) {
                    // Boost (Speed)
                    ctx.fillStyle = '#00FFFF';
                    ctx.shadowColor = '#00FFFF';
                    ctx.shadowBlur = 10;
                    ctx.fillText(`⚡ SPEED UP: ${seconds}s`, COLS * TILE_SIZE - 200, ROWS * TILE_SIZE - 20);
                }
            }

            reqRef.current = requestAnimationFrame(render);
        };

        const gameLoop = () => {
            update();
            render();
            reqRef.current = requestAnimationFrame(gameLoop);
        };

        reqRef.current = requestAnimationFrame(gameLoop);
        return () => cancelAnimationFrame(reqRef.current);
    }, [update, gameState, earthColor]);

    // Initial Start
    useEffect(() => {
        initLevel(1);
    }, []);

    return (
        <div className="w-full h-full max-h-full flex flex-col items-center justify-between min-h-0 overflow-hidden relative">
            {/* HUD Header */}
            <div className="flex-none py-1.5 px-4 flex justify-between items-center w-full max-w-[672px] text-xs sm:text-sm font-mono text-amber-400 bg-gray-900/80 rounded-lg border border-amber-500/30 shadow-md">
                <div className="flex items-center gap-1.5">
                    <span className="text-gray-400">SCORE:</span>
                    <span className="text-white font-bold text-sm sm:text-base">{score}</span>
                </div>
                <div className="px-2.5 py-0.5 bg-amber-500/20 border border-amber-500/40 rounded-full font-bold text-amber-300 text-xs">
                    {levelName}
                </div>
                {diamondTimer > 0 && (
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-cyan-950/90 border border-cyan-400 rounded-md text-cyan-300 animate-pulse text-xs">
                        <img src="/assets/diamond-hunt/diamond.svg" alt="Boost" className="w-4 h-4 object-contain" />
                        <span className="font-bold">{diamondTimer}s</span>
                    </div>
                )}
                <div className="flex items-center gap-1.5">
                    <span className="text-gray-400">LIVES:</span>
                    <div className="flex gap-1">
                        {Array.from({ length: Math.max(0, lives) }).map((_, i) => (
                            <img
                                key={i}
                                src="/assets/diamond-hunt/miner.svg"
                                alt="Life"
                                className="w-4 h-4 sm:w-5 sm:h-5 object-contain inline-block drop-shadow-[0_0_5px_rgba(245,158,11,0.8)]"
                            />
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex-1 min-h-0 w-full flex items-center justify-center p-1 sm:p-2 relative">
                <div className="relative border-2 sm:border-4 border-amber-600/80 rounded-xl bg-black shadow-[0_0_30px_rgba(217,119,6,0.4)] max-h-full max-w-full aspect-[14/15] w-auto h-auto flex overflow-hidden">
                    <canvas
                        ref={canvasRef}
                        width={COLS * TILE_SIZE}
                        height={ROWS * TILE_SIZE}
                        className="block w-full h-full object-contain pixelated"
                    />

                    {gameState === 'START' && (
                        <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center text-center p-6 backdrop-blur-sm z-20">
                            <div className="flex items-center justify-center gap-3 mb-3">
                                <img src="/assets/diamond-hunt/diamond.svg" alt="Diamond" className="w-8 h-8 sm:w-10 sm:h-10 animate-bounce" />
                                <h2 className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 font-mono tracking-wider drop-shadow-[0_0_20px_rgba(245,158,11,0.8)]">
                                    DIAMOND HUNT
                                </h2>
                                <img src="/assets/diamond-hunt/gold.svg" alt="Gold" className="w-8 h-8 sm:w-10 sm:h-10 animate-bounce" />
                            </div>
                            <p className="text-gray-300 mb-4 max-w-md font-sans text-xs sm:text-sm leading-relaxed">
                                Dig tunnels underground, collect diamonds &amp; gold, and inflate monsters before they catch you!
                            </p>
                            <div className="grid grid-cols-3 gap-3 mb-6 bg-gray-900/80 p-3 rounded-xl border border-gray-800">
                                <div className="flex flex-col items-center">
                                    <img src="/assets/diamond-hunt/diamond.svg" alt="Diamond" className="w-6 h-6 mb-1" />
                                    <span className="text-[10px] text-cyan-400 font-mono">+250 (SPEED)</span>
                                </div>
                                <div className="flex flex-col items-center">
                                    <img src="/assets/diamond-hunt/gold.svg" alt="Gold" className="w-6 h-6 mb-1" />
                                    <span className="text-[10px] text-yellow-400 font-mono">+100 GOLD</span>
                                </div>
                                <div className="flex flex-col items-center">
                                    <img src="/assets/diamond-hunt/rock.svg" alt="Rock" className="w-6 h-6 mb-1" />
                                    <span className="text-[10px] text-gray-400 font-mono">AVOID FALLS</span>
                                </div>
                            </div>
                            <Button
                                onClick={resetGame}
                                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-extrabold px-8 py-4 text-xl rounded-xl shadow-[0_0_25px_rgba(245,158,11,0.6)] transform hover:scale-105 transition-all font-mono"
                            >
                                INSERT COIN
                            </Button>
                        </div>
                    )}

                    {gameState === 'GAME_OVER' && (
                        <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center text-center p-6 z-20 overflow-auto backdrop-blur-sm">
                            <h2 className="text-4xl sm:text-5xl font-extrabold text-red-500 font-mono tracking-widest mb-2 drop-shadow-[0_0_20px_rgba(239,68,68,0.8)]">
                                GAME OVER
                            </h2>
                            <p className="text-white text-xl font-mono mb-6">Final Score: <span className="text-amber-400 font-bold">{score}</span></p>

                            <Button
                                onClick={resetGame}
                                className="bg-amber-500 hover:bg-amber-600 text-black font-extrabold px-8 py-4 text-xl rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.6)] font-mono"
                            >
                                TRY AGAIN
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-none py-1 px-3 text-gray-400 text-[10px] sm:text-xs font-mono hidden min-[400px]:block bg-gray-900/40 rounded-md border border-gray-800">
                ARROWS to Dig • SPACE to Pump / Pop Enemies • Collect All Treasures to Win!
            </div>

            <MobileControls onInput={handleMobileInput} gameType="DIAMOND_HUNT" className="lg:hidden" />
        </div>
    );
}
