'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useUser, SignInButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import MobileControls, { ControlAction } from '@/components/ui/MobileControls';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { getDigDugLevel, TILE_SIZE, ROWS, COLS, EnemyConfig } from '@/lib/digdug-maps';
import Link from 'next/link';
import Leaderboard from './Leaderboard';

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
    type: 'PLAYER' | 'POOKA' | 'FYGAR';
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

interface DelayedItem {
    r: number;
    c: number;
    type: 'GOLD' | 'DIAMOND';
    timer: number;
}

export default function DigDugGame() {
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
        const config = getDigDugLevel(lvl);
        // Deep copy map
        mapRef.current = config.map.map(row => [...row]);
        setEarthColor(config.color);
        setLevelName(config.levelName);

        playerRef.current = {
            x: config.digDugStart.x,
            y: config.digDugStart.y,
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
            type: Math.random() > 0.5 ? 'POOKA' : 'FYGAR',
            state: 'WALKING',
            inflation: 0,
            ghostTimer: 0
        });
        floatingTextsRef.current.push({ x: spawnX * TILE_SIZE, y: spawnY * TILE_SIZE, text: "WARNING!", color: "red", life: 60 });
    }, []);

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
                    playerRef.current.x = getDigDugLevel(levelRef.current).digDugStart.x;
                    playerRef.current.y = getDigDugLevel(levelRef.current).digDugStart.y;
                    // Reset flood? User said "start from biggining". Assuming level reset.
                    floodLevelRef.current = 0;
                    mapRef.current = getDigDugLevel(levelRef.current).map.map(row => [...row]); // Full Map Reset
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
                                playerRef.current.x = getDigDugLevel(levelRef.current).digDugStart.x;
                                playerRef.current.y = getDigDugLevel(levelRef.current).digDugStart.y;
                            } else {
                                setGameState('GAME_OVER');
                                submitScore({ score: scoreRef.current, level: levelRef.current, gameType: "dig_dug" });
                            }
                        } else if (targetTile === 10) { // Gold
                            // Points Immediately
                            scoreRef.current += 100; // Updated Value
                            floatingTextsRef.current.push({ x: c * TILE_SIZE, y: r * TILE_SIZE, text: "+100", color: "#FFD700", life: 60 });

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
                    submitScore({ score: scoreRef.current, level: levelRef.current - 1, gameType: "dig_dug" });
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
                    playerRef.current.x = getDigDugLevel(levelRef.current).digDugStart.x;
                    playerRef.current.y = getDigDugLevel(levelRef.current).digDugStart.y;
                } else {
                    setGameState('GAME_OVER');
                    submitScore({ score: scoreRef.current, level: levelRef.current, gameType: "dig_dug" });
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
            // Background
            ctx.fillStyle = earthColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw Grid
            for (let r = 0; r < ROWS; r++) {
                for (let c = 0; c < COLS; c++) {
                    const tile = mapRef.current[r][c];
                    const x = c * TILE_SIZE;
                    const y = r * TILE_SIZE;

                    if (tile === 0) {
                        ctx.fillStyle = 'black';
                        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
                        ctx.beginPath();
                        ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, TILE_SIZE / 2 - 2, 0, Math.PI * 2);
                        ctx.fill();
                    } else if (tile === 30) { // Flood Water
                        ctx.fillStyle = '#0000AA'; // Deep Blue
                        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
                        // Waves
                        ctx.strokeStyle = '#0044FF';
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.moveTo(x, y + 10);
                        ctx.lineTo(x + TILE_SIZE, y + 10);
                        ctx.moveTo(x, y + 30);
                        ctx.lineTo(x + TILE_SIZE, y + 30);
                        ctx.stroke();
                    } else if (tile === 21) { // Revealed Gold
                        ctx.fillStyle = '#FFD700';
                        ctx.beginPath();
                        ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, TILE_SIZE / 3, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.strokeStyle = 'orange';
                        ctx.lineWidth = 2;
                        ctx.stroke();
                    } else if (tile === 22) { // Revealed Diamond
                        ctx.fillStyle = '#00FFFF';
                        ctx.beginPath();
                        ctx.moveTo(x + TILE_SIZE / 2, y + 8);
                        ctx.lineTo(x + TILE_SIZE - 8, y + TILE_SIZE / 2);
                        ctx.lineTo(x + TILE_SIZE / 2, y + TILE_SIZE - 8);
                        ctx.lineTo(x + 8, y + TILE_SIZE / 2);
                        ctx.closePath();
                        ctx.fill();
                        ctx.stroke();
                    }
                }
            }

            // Draw Rocks (Varied Shapes)
            rocksRef.current.forEach(r => {
                const rx = r.x * TILE_SIZE;
                const ry = r.y * TILE_SIZE;
                const cx = rx + TILE_SIZE / 2;
                const cy = ry + TILE_SIZE / 2;
                const rSize = (TILE_SIZE / 2 - 4) * r.scale;

                ctx.fillStyle = '#555'; // Dark Gray
                ctx.beginPath();

                if (r.variant === 1) { // Jagged
                    const sides = 6;
                    ctx.moveTo(cx + rSize, cy);
                    for (let i = 1; i < sides; i++) {
                        const angle = (i * 2 * Math.PI) / sides;
                        const len = rSize * (0.8 + Math.random() * 0.4); // Jittery
                        ctx.lineTo(cx + Math.cos(angle) * len, cy + Math.sin(angle) * len);
                    }
                } else if (r.variant === 2) { // Flat/Oval
                    ctx.ellipse(cx, cy, rSize, rSize * 0.6, 0, 0, Math.PI * 2);
                } else { // Round (Default)
                    ctx.arc(cx, cy, rSize, 0, Math.PI * 2);
                }

                ctx.closePath();
                ctx.fill();

                // Shine
                ctx.fillStyle = '#777';
                ctx.beginPath();
                ctx.arc(cx - rSize / 2, cy - rSize / 2, rSize / 4, 0, Math.PI * 2);
                ctx.fill();
            });

            // Draw Player ("Running Man" - Procedural)
            const p = playerRef.current;
            const px = p.x * TILE_SIZE;
            const py = p.y * TILE_SIZE;

            // Animation Frame
            const isMoving = p.state === 'WALKING' || p.state === 'WET';
            const frame = Math.floor(Date.now() / 150) % 2; // Slower stride

            // Color Palette
            const SUIT_COLOR = '#FFFFFF';
            const SKIN_COLOR = '#FFCCAA';
            const BOOT_COLOR = '#FF0000';

            ctx.save();
            ctx.translate(px + TILE_SIZE / 2, py + TILE_SIZE / 2);

            // Scale Up for "Chunky" Look (Fits tile better)
            ctx.scale(1.45, 1.45);

            // Flip for Left
            if (p.dir === 'LEFT') ctx.scale(-1, 1);
            if (p.dir === 'UP') ctx.rotate(-Math.PI / 2);
            if (p.dir === 'DOWN') ctx.rotate(Math.PI / 2);

            // Draw Body (Wider)
            ctx.fillStyle = SUIT_COLOR;
            ctx.fillRect(-8, -6, 16, 12);

            // Draw Legs (Running Animation - Wider Stance)
            ctx.fillStyle = BOOT_COLOR;
            if (isMoving) {
                if (frame === 0) {
                    ctx.fillRect(-9, 6, 7, 8); // Back Leg
                    ctx.fillRect(2, 6, 7, 8);  // Front Leg
                } else {
                    ctx.fillRect(-4, 6, 7, 8);
                    ctx.fillRect(4, 6, 7, 6);  // Kick
                }
            } else {
                ctx.fillRect(-8, 6, 6, 8);
                ctx.fillRect(2, 6, 6, 8);
            }

            // Draw Head (Larger)
            ctx.fillStyle = SUIT_COLOR;
            ctx.beginPath();
            ctx.arc(0, -9, 9, 0, Math.PI * 2); // Radius 9, shifted up
            ctx.fill();

            // Visor (Wider)
            ctx.fillStyle = SKIN_COLOR;
            ctx.fillRect(2, -11, 7, 5);

            // Draw Arms (Pump vs Run)
            ctx.fillStyle = SUIT_COLOR;
            if (p.state === 'PUMPING') {
                ctx.fillRect(0, -2, 14, 5); // Arm extended (Longer/Thicker)
                // Gun
                ctx.fillStyle = 'red';
                ctx.fillRect(14, -3, 5, 7);
            } else {
                // Running Arms
                if (isMoving && frame === 0) {
                    ctx.fillRect(-2, -2, 9, 5);
                } else {
                    ctx.fillRect(-5, -2, 9, 5);
                }
            }

            ctx.restore();

            // Draw Pump Hose
            if (pumpRef.current.active) {
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(px + TILE_SIZE / 2, py + TILE_SIZE / 2);
                const hx = pumpRef.current.x * TILE_SIZE + TILE_SIZE / 2;
                const hy = pumpRef.current.y * TILE_SIZE + TILE_SIZE / 2;
                let tx = hx;
                let ty = hy;
                if (pumpRef.current.dir === 'RIGHT') tx += pumpRef.current.length * TILE_SIZE;
                if (pumpRef.current.dir === 'LEFT') tx -= pumpRef.current.length * TILE_SIZE;
                if (pumpRef.current.dir === 'UP') ty -= pumpRef.current.length * TILE_SIZE;
                if (pumpRef.current.dir === 'DOWN') ty += pumpRef.current.length * TILE_SIZE;
                ctx.lineTo(tx, ty);
                ctx.stroke();
            }

            // Draw Enemies (Moles)
            enemiesRef.current.forEach(e => {
                const ex = e.x * TILE_SIZE;
                const ey = e.y * TILE_SIZE;

                let size = TILE_SIZE - 8;
                if (e.state === 'INFLATED') {
                    size += (e.inflation * 20);
                }

                // Mole Body
                ctx.fillStyle = '#5C4033'; // Dark Brown Mole
                ctx.beginPath();
                ctx.ellipse(ex + TILE_SIZE / 2, ey + TILE_SIZE / 2, size / 2, size / 2.5, 0, 0, Math.PI * 2);
                ctx.fill();

                // Snout
                ctx.fillStyle = '#FFB6C1'; // Pink
                ctx.beginPath();
                ctx.arc(ex + TILE_SIZE / 2 + (e.x > p.x ? -6 : 6), ey + TILE_SIZE / 2 - 4, 4, 0, Math.PI * 2);
                ctx.fill();

                // Goggles/Glasses (Pooka style)
                ctx.fillStyle = 'yellow';
                ctx.fillRect(ex + TILE_SIZE / 2 - 6, ey + TILE_SIZE / 2 - 12, 12, 5);
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 1;
                ctx.strokeRect(ex + TILE_SIZE / 2 - 6, ey + TILE_SIZE / 2 - 12, 12, 5);
            });

            // Draw Floating Texts
            for (let i = floatingTextsRef.current.length - 1; i >= 0; i--) {
                const ft = floatingTextsRef.current[i];
                ft.life--;
                ft.y -= 0.5; // Float up

                ctx.fillStyle = ft.color;
                ctx.font = "bold 16px monospace";
                ctx.fillText(ft.text, ft.x, ft.y);

                if (ft.life <= 0) {
                    floatingTextsRef.current.splice(i, 1);
                }
            }

            // Draw Speed Boost/Debuff Timer
            if (speedBoostTimerRef.current !== 0) {
                ctx.font = "bold 24px monospace";
                const seconds = Math.ceil(Math.abs(speedBoostTimerRef.current) / 60);

                if (speedBoostTimerRef.current < 0) {
                    // Debuff (Silver)
                    ctx.fillStyle = '#C0C0C0'; // Silver
                    ctx.strokeStyle = 'black';
                    ctx.lineWidth = 4;
                    ctx.strokeText(`HEAVY: ${seconds}`, 20, ROWS * TILE_SIZE - 20);
                    ctx.fillText(`HEAVY: ${seconds}`, 20, ROWS * TILE_SIZE - 20);
                } else {
                    // Boost (Speed)
                    ctx.fillStyle = '#00FF00'; // Green
                    ctx.strokeStyle = 'black';
                    ctx.lineWidth = 4;
                    ctx.strokeText(`SPEED: ${seconds}`, COLS * TILE_SIZE - 150, ROWS * TILE_SIZE - 20);
                    ctx.fillText(`SPEED: ${seconds}`, COLS * TILE_SIZE - 150, ROWS * TILE_SIZE - 20);
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
        <div className="flex flex-col min-[1380px]:flex-row items-center min-[1380px]:items-start min-[1380px]:justify-center gap-4 min-[1380px]:gap-12 h-[100dvh] w-full overflow-hidden min-[1380px]:h-auto min-[1380px]:overflow-visible min-[1380px]:py-8 bg-[#050505]">
            <Link href="/" className="fixed top-4 left-4 z-50 text-white hover:text-amber-500 font-mono font-bold bg-black/50 px-4 py-2 rounded border border-white/20 transition-colors">
                ← ARCADE
            </Link>

            {/* Game Column */}
            <div className="flex flex-col items-center gap-4 w-full max-w-[672px]">
                <div className="flex-none pt-4 flex justify-center gap-6 min-[1380px]:justify-between w-full max-w-[400px] text-xs min-[1380px]:text-xl font-mono text-amber-500 px-4 min-[1380px]:px-0">
                    <div>SCORE: {score}</div>
                    <div>{levelName}</div>
                    <div>LIVES: {lives}</div>
                </div>

                <div className="flex-1 w-full min-h-0 flex items-center justify-center pb-48 min-[1380px]:pb-0 px-4">
                    <div className="relative border-4 border-amber-800 rounded-lg bg-black shadow-[0_0_20px_rgba(217,119,6,0.3)] max-h-full max-w-full aspect-[14/15] w-auto h-auto flex">
                        <canvas
                            ref={canvasRef}
                            width={COLS * TILE_SIZE}
                            height={ROWS * TILE_SIZE}
                            className="block w-full h-full object-contain pixelated"
                        />

                        {gameState === 'START' && (
                            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-center p-8">
                                <h2 className="text-4xl font-bold text-amber-500 mb-4 animate-pulse">DIG DUG</h2>
                                <p className="text-gray-400 mb-8 max-w-md">
                                    Dig through the earth, pump enemies until they pop!
                                    <br /><br />
                                    <span className="text-yellow-400">FIND DIAMONDS & GOLD!</span>
                                    <br />
                                    <span className="text-red-400">AVOID ROCKS & BOMBS!</span>
                                </p>
                                <Button onClick={resetGame} className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-8 py-4 text-xl">
                                    INSERT COIN
                                </Button>
                            </div>
                        )}

                        {gameState === 'GAME_OVER' && (
                            <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center text-center p-4 z-10 overflow-auto">
                                <h2 className="text-4xl font-bold text-red-500 mb-2">GAME OVER</h2>
                                <p className="text-white text-xl mb-6">Final Score: {score}</p>

                                <div className="w-full max-w-sm mb-6 min-[1380px]:hidden">
                                    <Leaderboard gameType="dig_dug" />
                                </div>

                                <Button onClick={resetGame} className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-8 py-4">
                                    TRY AGAIN
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex-none mb-2 min-[1380px]:mb-0 text-gray-400 text-sm min-[1380px]:text-lg font-mono mt-4 text-center hidden min-[400px]:block">
                    HIDDEN ITEMS IN DIRT • PUMP ENEMIES TO POP • DIG FAST!
                </div>
            </div>

            {/* Diamond Timer UI (Left of Game) */}
            <div className="hidden min-[1380px]:flex flex-col items-end justify-center w-32 h-full absolute left-4 top-0 z-10 pointer-events-none">
                {diamondTimer > 0 && (
                    <div className="bg-cyan-900/80 border-2 border-cyan-400 p-4 rounded-lg shadow-[0_0_15px_cyan] animate-pulse">
                        <div className="text-cyan-200 text-xs font-bold mb-1">SPEED UP</div>
                        <div className="text-4xl font-mono text-cyan-50">{diamondTimer}</div>
                        <div className="text-cyan-300 text-[10px]">SECONDS</div>
                    </div>
                )}
            </div>

            {/* Desktop Leaderboard Sidebar */}
            <div className="hidden min-[1380px]:block w-80 pt-16">
                <Leaderboard gameType="dig_dug" />
            </div>

            <MobileControls onInput={handleMobileInput} gameType="DIG_DUG" className="min-[1380px]:hidden absolute bottom-0" />
        </div>
    );
}
