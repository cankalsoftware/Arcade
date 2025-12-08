'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useUser, SignInButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import MobileControls, { ControlAction } from '@/components/ui/MobileControls';

import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';

// --- Constants & Types ---
import { getMapConfig } from '@/lib/pacman-maps';

const TILE_SIZE = 20;
const PACMAN_SPEED = 0.1; // Slower speed for better control
const BASE_GHOST_SPEED = 0.05;
const GHOST_SPEED_INCREMENT = 0.002;

const GHOST_COLORS = [
    '#FF0000', // Red (Blinky)
    '#FFB8FF', // Pink (Pinky)
    '#00FFFF', // Cyan (Inky)
    '#FFB852', // Orange (Clyde)
    '#9400D3', // Purple
    '#00FF00', // Green
    '#0000FF', // Blue
    '#8B4513', // Brown
    '#808080', // Gray
    '#32CD32', // Lime
];

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'NONE';

interface Entity {
    x: number;
    y: number;
    dir: Direction;
    nextDir: Direction;
    speed: number;
    color: string;
}

export default function PacmanGame() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { user } = useUser();
    const submitScore = useMutation(api.scores.submitScore);

    // Game State
    const [level, setLevel] = useState(1);
    const [score, setScore] = useState(0);
    const [lives, setLives] = useState(3);
    const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'GAME_OVER' | 'VICTORY' | 'AUTH_REQUIRED'>('START');

    // Map State


    // Refs for game loop to avoid stale closures
    const mapRef = useRef<number[][]>([]);
    const rowsRef = useRef(21);
    const colsRef = useRef(19);

    const pacmanRef = useRef<Entity>({ x: 9, y: 16, dir: 'NONE', nextDir: 'NONE', speed: PACMAN_SPEED, color: 'yellow' });
    const ghostsRef = useRef<Entity[]>([]);
    const reqRef = useRef<number>(0);
    const scoreRef = useRef(0);
    const pelletsRef = useRef(0);
    const levelRef = useRef(1);
    const livesRef = useRef(3);
    const pacmanStartRef = useRef({ x: 9, y: 16 });
    const ghostStartRef = useRef({ x: 9, y: 8 });

    // Initialize Ghosts based on Level
    const initGhosts = (currentLevel: number) => {
        // Start with 4 ghosts, increase by 1 every 2 levels, max 10
        const numGhosts = Math.min(4 + Math.floor((currentLevel - 1) / 2), 10);

        // Base speed increases with level
        const speed = BASE_GHOST_SPEED + ((currentLevel - 1) * GHOST_SPEED_INCREMENT);

        return GHOST_COLORS.slice(0, numGhosts).map((color, i) => ({
            x: ghostStartRef.current.x,
            y: ghostStartRef.current.y,
            dir: ['UP', 'LEFT', 'RIGHT'][i % 3] as Direction,
            nextDir: 'NONE' as Direction,
            speed: speed + (Math.random() * 0.01), // Slight variance
            color: color
        }));
    };

    // Reset Level
    const resetLevel = (fullReset = false, newLevel = 1) => {
        if (fullReset) {
            scoreRef.current = 0;
            setScore(0);
            setLives(3);
            livesRef.current = 3;
            setLevel(1);
            levelRef.current = 1;
            newLevel = 1;
        }

        // Load Map Config
        const config = getMapConfig(newLevel);
        mapRef.current = config.map;
        rowsRef.current = config.rows;
        colsRef.current = config.cols;

        pacmanStartRef.current = config.pacmanStart;
        ghostStartRef.current = config.ghostStart;

        pacmanRef.current = {
            x: config.pacmanStart.x,
            y: config.pacmanStart.y,
            dir: 'NONE',
            nextDir: 'NONE',
            speed: PACMAN_SPEED,
            color: 'yellow'
        };
        ghostsRef.current = initGhosts(newLevel);

        // Count pellets
        let pCount = 0;
        mapRef.current.forEach(row => row.forEach(cell => { if (cell === 0) pCount++; }));
        pelletsRef.current = pCount;
        console.log('Reset Level. Pellets Count:', pCount);
    };

    useEffect(() => {
        resetLevel(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Input Handling
    const heldDirectionsRef = useRef<Direction[]>([]);

    // Input Handling
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (gameState !== 'PLAYING') return;

            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault(); // Prevent scrolling
            }

            let newDir: Direction = 'NONE';
            switch (e.key) {
                case 'ArrowUp': newDir = 'UP'; break;
                case 'ArrowDown': newDir = 'DOWN'; break;
                case 'ArrowLeft': newDir = 'LEFT'; break;
                case 'ArrowRight': newDir = 'RIGHT'; break;
            }

            if (newDir !== 'NONE') {
                // Remove if already present to move to top of stack
                heldDirectionsRef.current = heldDirectionsRef.current.filter(d => d !== newDir);
                heldDirectionsRef.current.push(newDir);
                pacmanRef.current.nextDir = newDir;
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            let releasedDir: Direction = 'NONE';
            switch (e.key) {
                case 'ArrowUp': releasedDir = 'UP'; break;
                case 'ArrowDown': releasedDir = 'DOWN'; break;
                case 'ArrowLeft': releasedDir = 'LEFT'; break;
                case 'ArrowRight': releasedDir = 'RIGHT'; break;
            }

            if (releasedDir !== 'NONE') {
                heldDirectionsRef.current = heldDirectionsRef.current.filter(d => d !== releasedDir);

                if (heldDirectionsRef.current.length > 0) {
                    pacmanRef.current.nextDir = heldDirectionsRef.current[heldDirectionsRef.current.length - 1];
                } else {
                    pacmanRef.current.nextDir = 'NONE';
                }
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
        let dir: Direction = 'NONE';
        if (action === 'UP') dir = 'UP';
        else if (action === 'DOWN') dir = 'DOWN';
        else if (action === 'LEFT') dir = 'LEFT';
        else if (action === 'RIGHT') dir = 'RIGHT';

        if (dir !== 'NONE') {
            if (active) {
                heldDirectionsRef.current = heldDirectionsRef.current.filter(d => d !== dir);
                heldDirectionsRef.current.push(dir);
                pacmanRef.current.nextDir = dir;
            } else {
                heldDirectionsRef.current = heldDirectionsRef.current.filter(d => d !== dir);
                if (heldDirectionsRef.current.length > 0) {
                    pacmanRef.current.nextDir = heldDirectionsRef.current[heldDirectionsRef.current.length - 1];
                } else {
                    pacmanRef.current.nextDir = 'NONE';
                }
            }
        }
    };

    const handleLevelComplete = React.useCallback(() => {
        console.log('Level Complete! Current Level:', levelRef.current, 'Pellets Left:', pelletsRef.current);
        // Check Auth Restriction
        const nextLevel = levelRef.current + 1;
        if (nextLevel > 2 && !user) {
            console.log('Auth Required for Level:', nextLevel);
            setGameState('AUTH_REQUIRED');
            cancelAnimationFrame(reqRef.current);
        } else {
            console.log('Advancing to Level:', nextLevel);
            if (nextLevel > 50) {
                setGameState('VICTORY');
                submitScore({
                    score: scoreRef.current,
                    level: nextLevel,
                    gameType: "pacman"
                });
                return;
            }
            setLevel(nextLevel);
            levelRef.current = nextLevel;

            // Load new map
            const config = getMapConfig(nextLevel);
            mapRef.current = config.map;
            rowsRef.current = config.rows;
            colsRef.current = config.cols;

            pacmanStartRef.current = config.pacmanStart;
            ghostStartRef.current = config.ghostStart;

            pacmanRef.current = {
                x: config.pacmanStart.x,
                y: config.pacmanStart.y,
                dir: 'NONE',
                nextDir: 'NONE',
                speed: PACMAN_SPEED,
                color: 'yellow'
            };
            ghostsRef.current = initGhosts(nextLevel);

            let pCount = 0;
            mapRef.current.forEach(row => row.forEach(cell => { if (cell === 0) pCount++; }));
            pelletsRef.current = pCount;
            console.log('New Pellets Count:', pCount);
        }
    }, [user, submitScore]);

    const handleDeath = React.useCallback(() => {
        if (livesRef.current > 1) {
            livesRef.current -= 1;
            setLives(livesRef.current);
            pacmanRef.current = {
                x: pacmanStartRef.current.x,
                y: pacmanStartRef.current.y,
                dir: 'NONE',
                nextDir: 'NONE',
                speed: PACMAN_SPEED,
                color: 'yellow'
            };
            ghostsRef.current = initGhosts(levelRef.current);
            // Small pause?
        } else {
            setGameState('GAME_OVER');
            submitScore({
                score: scoreRef.current,
                level: levelRef.current,
                gameType: "pacman"
            });
        }
    }, [submitScore]);

    // Game Loop
    useEffect(() => {
        if (gameState !== 'PLAYING') {
            cancelAnimationFrame(reqRef.current);
            return;
        }

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        const checkCollision = (x: number, y: number) => {
            const row = Math.floor(y);
            const col = Math.floor(x);
            // Simple bounds check
            if (row < 0 || row >= rowsRef.current || col < 0 || col >= colsRef.current) return true;
            return mapRef.current[row][col] === 1;
        };

        const moveEntity = (entity: Entity) => {
            let moved = false;
            // Try to change direction
            if (entity.nextDir !== 'NONE' && entity.nextDir !== entity.dir) {
                // Cornering Logic
                const offX = Math.abs(entity.x - Math.round(entity.x));
                const offY = Math.abs(entity.y - Math.round(entity.y));
                const CORNER_TOLERANCE = 0.55; // Increased tolerance for wall-stops

                let canTurn = false;

                if (entity.nextDir === 'UP' || entity.nextDir === 'DOWN') {
                    if (offX < CORNER_TOLERANCE) canTurn = true;
                }
                if (entity.nextDir === 'LEFT' || entity.nextDir === 'RIGHT') {
                    if (offY < CORNER_TOLERANCE) canTurn = true;
                }

                if (canTurn) {
                    // Safe Snap Logic: Don't snap into a wall!
                    let snapX = Math.round(entity.x);
                    let snapY = Math.round(entity.y);

                    // If we are turning vertically, we snap X. Check if that X is valid.
                    if (entity.nextDir === 'UP' || entity.nextDir === 'DOWN') {
                        if (checkCollision(snapX, entity.y)) {
                            // The rounded X is a wall. Use the other side.
                            snapX = entity.x < snapX ? Math.floor(entity.x) : Math.ceil(entity.x);
                        }
                    }
                    // If we are turning horizontally, we snap Y.
                    if (entity.nextDir === 'LEFT' || entity.nextDir === 'RIGHT') {
                        if (checkCollision(entity.x, snapY)) {
                            snapY = entity.y < snapY ? Math.floor(entity.y) : Math.ceil(entity.y);
                        }
                    }

                    // Now check if the TARGET direction is free from this new snapped position
                    let checkTestX = snapX;
                    let checkTestY = snapY;
                    if (entity.nextDir === 'UP') checkTestY -= 1; // Check full tile ahead
                    if (entity.nextDir === 'DOWN') checkTestY += 1;
                    if (entity.nextDir === 'LEFT') checkTestX -= 1;
                    if (entity.nextDir === 'RIGHT') checkTestX += 1;

                    if (!checkCollision(checkTestX, checkTestY)) {
                        entity.dir = entity.nextDir;
                        entity.nextDir = 'NONE';
                        entity.x = snapX;
                        entity.y = snapY;
                    }
                }
            } else if (entity.nextDir === entity.dir) {
                entity.nextDir = 'NONE';
            }

            // Move in current direction
            let nextX = entity.x;
            let nextY = entity.y;
            const radius = 0.35; // Reduced radius for easier movement (0.45 -> 0.35)

            if (entity.dir === 'UP') nextY -= entity.speed;
            if (entity.dir === 'DOWN') nextY += entity.speed;
            if (entity.dir === 'LEFT') nextX -= entity.speed;
            if (entity.dir === 'RIGHT') nextX += entity.speed;

            // Check collision points (leading edge)
            let checkX = nextX;
            let checkY = nextY;

            if (entity.dir === 'UP') checkY -= radius;
            if (entity.dir === 'DOWN') checkY += radius;
            if (entity.dir === 'LEFT') checkX -= radius;
            if (entity.dir === 'RIGHT') checkX += radius;

            if (!checkCollision(checkX, checkY)) {
                entity.x = nextX;
                entity.y = nextY;
                moved = true;
            } else {
                // Stop if hit wall.
            }

            // Wrap around (Tunnel)
            if (entity.x < 0) { entity.x = colsRef.current - 1; moved = true; }
            if (entity.x >= colsRef.current) { entity.x = 0; moved = true; }

            return moved;
        };

        const update = () => {
            // Stop if current direction is not held
            if (pacmanRef.current.dir !== 'NONE' && !heldDirectionsRef.current.includes(pacmanRef.current.dir)) {
                pacmanRef.current.dir = 'NONE';
            }

            // Move Pacman
            moveEntity(pacmanRef.current);

            // Eat Pellets
            const pRow = Math.round(pacmanRef.current.y);
            const pCol = Math.round(pacmanRef.current.x);
            if (pRow >= 0 && pRow < rowsRef.current && pCol >= 0 && pCol < colsRef.current) {
                if (mapRef.current[pRow][pCol] === 0) {
                    mapRef.current[pRow][pCol] = 2; // Empty
                    scoreRef.current += 10;
                    setScore(scoreRef.current);
                    pelletsRef.current--;

                    if (pelletsRef.current <= 0) {
                        handleLevelComplete();
                    }
                }
            }

            // Move Ghosts
            ghostsRef.current.forEach(ghost => {
                // Simple AI: Random turns at intersections
                const isCentered = Math.abs(ghost.x - Math.round(ghost.x)) < ghost.speed * 1.5 && Math.abs(ghost.y - Math.round(ghost.y)) < ghost.speed * 1.5;
                if (isCentered) {
                    const dirs: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
                    const validDirs = dirs.filter(d => {
                        let tx = Math.round(ghost.x);
                        let ty = Math.round(ghost.y);
                        if (d === 'UP') ty--;
                        if (d === 'DOWN') ty++;
                        if (d === 'LEFT') tx--;
                        if (d === 'RIGHT') tx++;
                        return !checkCollision(tx, ty);
                    });

                    // Don't reverse immediately if possible
                    const filtered = validDirs.filter(d => {
                        if (ghost.dir === 'UP' && d === 'DOWN') return false;
                        if (ghost.dir === 'DOWN' && d === 'UP') return false;
                        if (ghost.dir === 'LEFT' && d === 'RIGHT') return false;
                        if (ghost.dir === 'RIGHT' && d === 'LEFT') return false;
                        return true;
                    });

                    // If we are at an intersection (more than 1 choice, or 1 choice that isn't just forward), pick a new dir
                    const choices = filtered.length > 0 ? filtered : validDirs;

                    if (choices.length > 0) {
                        const isJunction = validDirs.length > 2;
                        const isCorner = validDirs.length === 2 && !((validDirs.includes('UP') && validDirs.includes('DOWN')) || (validDirs.includes('LEFT') && validDirs.includes('RIGHT')));

                        if (isJunction || isCorner) {
                            if (Math.random() < 0.2) { // 20% chance to change direction at intersection each frame it's centered
                                ghost.nextDir = choices[Math.floor(Math.random() * choices.length)];
                            }
                        } else if (Math.random() < 0.02) {
                            // Small chance to reverse or turn even on straight path? No, just keep moving.
                        }

                        if (ghost.dir === 'NONE') {
                            ghost.nextDir = choices[Math.floor(Math.random() * choices.length)];
                        }
                    }
                }

                const moved = moveEntity(ghost);
                if (!moved) {
                    // If stuck, reverse direction
                    if (ghost.dir === 'UP') ghost.nextDir = 'DOWN';
                    else if (ghost.dir === 'DOWN') ghost.nextDir = 'UP';
                    else if (ghost.dir === 'LEFT') ghost.nextDir = 'RIGHT';
                    else if (ghost.dir === 'RIGHT') ghost.nextDir = 'LEFT';
                }

                // Collision with Pacman
                const dist = Math.hypot(ghost.x - pacmanRef.current.x, ghost.y - pacmanRef.current.y);
                if (dist < 0.8) {
                    handleDeath();
                }
            });
        };

        const draw = () => {
            // Clear
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw Map
            for (let r = 0; r < rowsRef.current; r++) {
                for (let c = 0; c < colsRef.current; c++) {
                    const tile = mapRef.current[r][c];
                    const x = c * TILE_SIZE;
                    const y = r * TILE_SIZE;

                    if (tile === 1) {
                        ctx.fillStyle = '#1919A6'; // Wall Blue
                        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
                        // Inner black for retro look
                        ctx.fillStyle = 'black';
                        ctx.fillRect(x + 4, y + 4, TILE_SIZE - 8, TILE_SIZE - 8);
                        ctx.strokeStyle = '#1919A6';
                        ctx.strokeRect(x + 4, y + 4, TILE_SIZE - 8, TILE_SIZE - 8);
                    } else if (tile === 0) {
                        ctx.fillStyle = '#ffb8ae'; // Pellet color
                        ctx.beginPath();
                        ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, 2, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }

            // Draw Pacman
            const px = pacmanRef.current.x * TILE_SIZE + TILE_SIZE / 2;
            const py = pacmanRef.current.y * TILE_SIZE + TILE_SIZE / 2;
            ctx.fillStyle = 'yellow';
            ctx.beginPath();
            // Simple mouth animation based on time
            const mouthOpen = Math.abs(Math.sin(Date.now() / 100)) * 0.2 + 0.02;
            let startAngle = 0;
            if (pacmanRef.current.dir === 'RIGHT') startAngle = 0;
            if (pacmanRef.current.dir === 'DOWN') startAngle = Math.PI / 2;
            if (pacmanRef.current.dir === 'LEFT') startAngle = Math.PI;
            if (pacmanRef.current.dir === 'UP') startAngle = -Math.PI / 2;

            ctx.arc(px, py, TILE_SIZE / 2 - 2, startAngle + mouthOpen * Math.PI, startAngle + (2 - mouthOpen) * Math.PI);
            ctx.lineTo(px, py);
            ctx.fill();

            // Draw Ghosts
            ghostsRef.current.forEach(ghost => {
                const gx = ghost.x * TILE_SIZE + TILE_SIZE / 2;
                const gy = ghost.y * TILE_SIZE + TILE_SIZE / 2;
                ctx.fillStyle = ghost.color;

                // Ghost body (semicircle top)
                ctx.beginPath();
                ctx.arc(gx, gy - 2, TILE_SIZE / 2 - 2, Math.PI, 0);
                ctx.lineTo(gx + TILE_SIZE / 2 - 2, gy + TILE_SIZE / 2 - 2);
                // Feet
                for (let i = 1; i <= 3; i++) {
                    ctx.lineTo(gx + TILE_SIZE / 2 - 2 - (i * (TILE_SIZE - 4) / 3), gy + TILE_SIZE / 2 - (i % 2 == 0 ? 2 : 6));
                }
                ctx.lineTo(gx - TILE_SIZE / 2 + 2, gy + TILE_SIZE / 2 - 2);
                ctx.fill();

                // Eyes
                ctx.fillStyle = 'white';
                ctx.beginPath();
                ctx.arc(gx - 4, gy - 4, 3, 0, Math.PI * 2);
                ctx.arc(gx + 4, gy - 4, 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = 'blue';
                ctx.beginPath();
                ctx.arc(gx - 4 + (ghost.dir === 'LEFT' ? -1 : ghost.dir === 'RIGHT' ? 1 : 0), gy - 4 + (ghost.dir === 'UP' ? -1 : ghost.dir === 'DOWN' ? 1 : 0), 1.5, 0, Math.PI * 2);
                ctx.arc(gx + 4 + (ghost.dir === 'LEFT' ? -1 : ghost.dir === 'RIGHT' ? 1 : 0), gy - 4 + (ghost.dir === 'UP' ? -1 : ghost.dir === 'DOWN' ? 1 : 0), 1.5, 0, Math.PI * 2);
                ctx.fill();
            });
        };

        const loop = () => {
            update();
            draw();
            reqRef.current = requestAnimationFrame(loop);
        };

        reqRef.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(reqRef.current);
    }, [gameState, handleDeath, handleLevelComplete]);

    const startGame = () => {
        resetLevel(true);
        setGameState('PLAYING');
    };

    return (
        <div className="flex flex-col items-center gap-4 pb-60 min-[1380px]:pb-0">
            <div className="flex justify-center gap-6 min-[1380px]:justify-between w-full max-w-[400px] text-xs min-[1380px]:text-xl font-mono text-yellow-400 px-4 min-[1380px]:px-0">
                <div>SCORE: {score}</div>
                <div>LEVEL: {level}</div>
                <div>LIVES: {lives}</div>
            </div>

            <div className="relative border-4 border-blue-900 rounded-lg bg-black shadow-[0_0_20px_rgba(0,0,255,0.3)] w-full max-w-[400px] aspect-[19/21]">
                <canvas
                    ref={canvasRef}
                    width={380}
                    height={420}
                    className="block w-full h-full object-contain"
                />

                {gameState === 'START' && (
                    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-center">
                        <h2 className="text-4xl font-bold text-yellow-500 mb-4 animate-pulse">PACMAN</h2>
                        <p className="text-gray-400 mb-8">Use Arrow Keys to Move</p>
                        <Button onClick={startGame} className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold px-8 py-4 text-xl">
                            INSERT COIN
                        </Button>
                    </div>
                )}

                {gameState === 'GAME_OVER' && (
                    <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center text-center">
                        <h2 className="text-4xl font-bold text-red-500 mb-4">GAME OVER</h2>
                        <p className="text-yellow-400 text-xl mb-8">Final Score: {score}</p>
                        <Button onClick={startGame} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-4">
                            TRY AGAIN
                        </Button>
                    </div>
                )}

                {gameState === 'VICTORY' && (
                    <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center text-center">
                        <h2 className="text-4xl font-bold text-yellow-400 mb-4">YOU WIN!</h2>
                        <p className="text-white text-xl mb-8">All 50 Levels Cleared!</p>
                        <p className="text-yellow-400 text-xl mb-8">Final Score: {score}</p>
                        <Button onClick={startGame} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-4">
                            PLAY AGAIN
                        </Button>
                    </div>
                )}

                {gameState === 'AUTH_REQUIRED' && (
                    <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center text-center p-8">
                        <h2 className="text-3xl font-bold text-yellow-400 mb-4">LEVEL 3 LOCKED</h2>
                        <p className="text-gray-300 mb-8">Please sign in to continue your streak!</p>
                        <SignInButton mode="modal">
                            <Button className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold px-8 py-4 text-xl">
                                SIGN IN TO CONTINUE
                            </Button>
                        </SignInButton>
                    </div>
                )}
            </div>

            <div className="text-gray-500 text-sm font-mono mt-4">
                Avoid the Ghosts! Clear all pellets to advance.
            </div>

            <MobileControls onInput={handleMobileInput} gameType="PACMAN" className="min-[1380px]:hidden" />
        </div>
    );
}
