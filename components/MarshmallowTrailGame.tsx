'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useUser, SignInButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import MobileControls, { ControlAction } from '@/components/ui/MobileControls';

import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';

// --- Constants & Types ---
import { getMapConfig } from '@/lib/marshmallowtrail-maps';

const TILE_SIZE = 20;
const MARSHMALLOW_TRAIL_SPEED = 0.1; // Slower speed for better control
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

export default function MarshmallowTrailGame() {
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

    const marshmallowtrailRef = useRef<Entity>({ x: 9, y: 16, dir: 'NONE', nextDir: 'NONE', speed: MARSHMALLOW_TRAIL_SPEED, color: 'yellow' });
    const ghostsRef = useRef<Entity[]>([]);
    const reqRef = useRef<number>(0);
    const scoreRef = useRef(0);
    const pelletsRef = useRef(0);
    const levelRef = useRef(1);
    const livesRef = useRef(3);
    const marshmallowtrailStartRef = useRef({ x: 9, y: 16 });
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

        marshmallowtrailStartRef.current = config.marshmallowtrailStart;
        ghostStartRef.current = config.ghostStart;

        marshmallowtrailRef.current = {
            x: config.marshmallowtrailStart.x,
            y: config.marshmallowtrailStart.y,
            dir: 'NONE',
            nextDir: 'NONE',
            speed: MARSHMALLOW_TRAIL_SPEED,
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
                marshmallowtrailRef.current.nextDir = newDir;
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
                    marshmallowtrailRef.current.nextDir = heldDirectionsRef.current[heldDirectionsRef.current.length - 1];
                } else {
                    marshmallowtrailRef.current.nextDir = 'NONE';
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
                marshmallowtrailRef.current.nextDir = dir;
            } else {
                heldDirectionsRef.current = heldDirectionsRef.current.filter(d => d !== dir);
                if (heldDirectionsRef.current.length > 0) {
                    marshmallowtrailRef.current.nextDir = heldDirectionsRef.current[heldDirectionsRef.current.length - 1];
                } else {
                    marshmallowtrailRef.current.nextDir = 'NONE';
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
                    gameType: "marshmallowtrail"
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

            marshmallowtrailStartRef.current = config.marshmallowtrailStart;
            ghostStartRef.current = config.ghostStart;

            marshmallowtrailRef.current = {
                x: config.marshmallowtrailStart.x,
                y: config.marshmallowtrailStart.y,
                dir: 'NONE',
                nextDir: 'NONE',
                speed: MARSHMALLOW_TRAIL_SPEED,
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
            marshmallowtrailRef.current = {
                x: marshmallowtrailStartRef.current.x,
                y: marshmallowtrailStartRef.current.y,
                dir: 'NONE',
                nextDir: 'NONE',
                speed: MARSHMALLOW_TRAIL_SPEED,
                color: 'yellow'
            };
            ghostsRef.current = initGhosts(levelRef.current);
            // Small pause?
        } else {
            setGameState('GAME_OVER');
            submitScore({
                score: scoreRef.current,
                level: levelRef.current,
                gameType: "marshmallowtrail"
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

        const getNeighbor = (x: number, y: number, dir: Direction) => {
            let nx = x;
            let ny = y;
            if (dir === 'UP') ny--;
            if (dir === 'DOWN') ny++;
            if (dir === 'LEFT') nx--;
            if (dir === 'RIGHT') nx++;
            return { x: nx, y: ny };
        };

        const getOppositeDirection = (dir: Direction): Direction => {
            if (dir === 'UP') return 'DOWN';
            if (dir === 'DOWN') return 'UP';
            if (dir === 'LEFT') return 'RIGHT';
            if (dir === 'RIGHT') return 'LEFT';
            return 'NONE';
        };

        const moveEntity = (entity: Entity, isGhost: boolean) => {
            // If stationary, try to start moving
            if (entity.dir === 'NONE') {
                if (entity.nextDir !== 'NONE') {
                    const neighbor = getNeighbor(entity.x, entity.y, entity.nextDir);
                    if (!checkCollision(neighbor.x, neighbor.y)) {
                        entity.dir = entity.nextDir;
                        entity.nextDir = 'NONE';
                    }
                }
                if (entity.dir === 'NONE') return false;
            }

            // Calculate next position
            let currVal = (entity.dir === 'LEFT' || entity.dir === 'RIGHT') ? entity.x : entity.y;
            let nextVal = currVal;
            if (entity.dir === 'RIGHT' || entity.dir === 'DOWN') {
                nextVal += entity.speed;
            } else {
                nextVal -= entity.speed;
            }

            // Next integer grid boundary
            let targetVal;
            if (entity.dir === 'RIGHT' || entity.dir === 'DOWN') {
                targetVal = Math.floor(currVal) + 1;
            } else {
                targetVal = Math.ceil(currVal) - 1;
            }

            // Check if we reach or cross the grid boundary this frame
            let reached = false;
            if (entity.dir === 'RIGHT' || entity.dir === 'DOWN') {
                reached = nextVal >= targetVal;
            } else {
                reached = nextVal <= targetVal;
            }

            if (reached) {
                // Snap exactly to the center of the reached tile
                let targetX = (entity.dir === 'LEFT' || entity.dir === 'RIGHT') ? targetVal : Math.round(entity.x);
                let targetY = (entity.dir === 'UP' || entity.dir === 'DOWN') ? targetVal : Math.round(entity.y);

                // Tunnel Wrap Around
                if (targetX < 0) targetX = colsRef.current - 1;
                if (targetX >= colsRef.current) targetX = 0;

                entity.x = targetX;
                entity.y = targetY;

                // Make decisions exactly at the grid intersection
                if (isGhost) {
                    // Ghost AI: Choose next direction at center
                    const dirs: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
                    const validDirs = dirs.filter(d => {
                        const n = getNeighbor(entity.x, entity.y, d);
                        return !checkCollision(n.x, n.y);
                    });
                    const opposite = getOppositeDirection(entity.dir);
                    const choices = validDirs.filter(d => d !== opposite);
                    const finalChoices = choices.length > 0 ? choices : validDirs;

                    if (finalChoices.length > 0) {
                        entity.dir = finalChoices[Math.floor(Math.random() * finalChoices.length)];
                    } else {
                        entity.dir = 'NONE';
                    }
                } else {
                    // MarshmallowTrail decision at tile center
                    let turned = false;
                    if (entity.nextDir !== 'NONE') {
                        const neighbor = getNeighbor(entity.x, entity.y, entity.nextDir);
                        if (!checkCollision(neighbor.x, neighbor.y)) {
                            entity.dir = entity.nextDir;
                            entity.nextDir = 'NONE';
                            turned = true;
                        }
                    }

                    if (!turned) {
                        // Stop if current direction is no longer held, or blocked
                        const isHeld = heldDirectionsRef.current.includes(entity.dir);
                        const neighbor = getNeighbor(entity.x, entity.y, entity.dir);
                        const isBlocked = checkCollision(neighbor.x, neighbor.y);
                        if (!isHeld || isBlocked) {
                            entity.dir = 'NONE';
                        }
                    }
                }

                // Apply remaining sub-pixel movement in the new/current direction
                if (entity.dir !== 'NONE') {
                    const leftover = Math.abs(nextVal - targetVal);
                    if (entity.dir === 'UP') entity.y -= leftover;
                    else if (entity.dir === 'DOWN') entity.y += leftover;
                    else if (entity.dir === 'LEFT') entity.x -= leftover;
                    else if (entity.dir === 'RIGHT') entity.x += leftover;
                }
            } else {
                // Update coordinates normally along the movement axis
                if (entity.dir === 'UP') entity.y = nextVal;
                else if (entity.dir === 'DOWN') entity.y = nextVal;
                else if (entity.dir === 'LEFT') entity.x = nextVal;
                else if (entity.dir === 'RIGHT') entity.x = nextVal;
            }

            return entity.dir !== 'NONE';
        };

        const update = () => {
            // Move MarshmallowTrail
            moveEntity(marshmallowtrailRef.current, false);

            // Eat Pellets
            const pRow = Math.round(marshmallowtrailRef.current.y);
            const pCol = Math.round(marshmallowtrailRef.current.x);
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
                moveEntity(ghost, true);

                // Collision with MarshmallowTrail
                const dist = Math.hypot(ghost.x - marshmallowtrailRef.current.x, ghost.y - marshmallowtrailRef.current.y);
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

            // Draw MarshmallowTrail
            const px = marshmallowtrailRef.current.x * TILE_SIZE + TILE_SIZE / 2;
            const py = marshmallowtrailRef.current.y * TILE_SIZE + TILE_SIZE / 2;
            ctx.fillStyle = 'yellow';
            ctx.beginPath();
            // Simple mouth animation based on time
            const mouthOpen = Math.abs(Math.sin(Date.now() / 100)) * 0.2 + 0.02;
            let startAngle = 0;
            if (marshmallowtrailRef.current.dir === 'RIGHT') startAngle = 0;
            if (marshmallowtrailRef.current.dir === 'DOWN') startAngle = Math.PI / 2;
            if (marshmallowtrailRef.current.dir === 'LEFT') startAngle = Math.PI;
            if (marshmallowtrailRef.current.dir === 'UP') startAngle = -Math.PI / 2;

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
        <div className="flex flex-col items-center gap-4 h-[100dvh] w-full overflow-hidden min-[1380px]:h-auto min-[1380px]:overflow-visible min-[1380px]:pb-0">
            <div className="flex-none pt-4 flex justify-center gap-6 min-[1380px]:justify-between w-full max-w-[400px] text-xs min-[1380px]:text-xl font-mono text-yellow-400 px-4 min-[1380px]:px-0">
                <div>SCORE: {score}</div>
                <div>LEVEL: {level}</div>
                <div>LIVES: {lives}</div>
            </div>

            <div className="flex-1 w-full min-h-0 flex items-center justify-center pb-48 min-[1380px]:pb-0 px-4">
                <div 
                    style={{ aspectRatio: colsRef.current / rowsRef.current } as React.CSSProperties}
                    className="relative border-4 border-blue-900 rounded-lg bg-black shadow-[0_0_20px_rgba(0,0,255,0.3)] max-h-full max-w-full w-auto h-auto flex"
                >
                    <canvas
                        ref={canvasRef}
                        width={colsRef.current * TILE_SIZE}
                        height={rowsRef.current * TILE_SIZE}
                        className="block w-full h-full object-contain"
                    />

                    {gameState === 'START' && (
                        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-center">
                            <h2 className="text-4xl font-bold text-yellow-500 mb-4 animate-pulse">MARSHMALLOW_TRAIL</h2>
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
            </div>

            <div className="flex-none mb-2 min-[1380px]:mb-0 text-gray-500 text-[10px] min-[1380px]:text-sm font-mono mt-4 hidden min-[400px]:block">
                Avoid the Ghosts! Clear all pellets to advance.
            </div>

            <MobileControls onInput={handleMobileInput} gameType="MARSHMALLOW_TRAIL" className="min-[1380px]:hidden absolute bottom-0" />
        </div>
    );
}
