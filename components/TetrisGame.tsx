'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useUser, SignInButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';

import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';

// --- Constants & Types ---
const ROWS = 20;
const BLOCK_SIZE = 30;
const COLORS = [
    'cyan',   // I
    'blue',   // J
    'orange', // L
    'yellow', // O
    'green',  // S
    'purple', // T
    'red'     // Z
];

const SHAPES = [
    [[1, 1, 1, 1]], // I
    [[1, 0, 0], [1, 1, 1]], // J
    [[0, 0, 1], [1, 1, 1]], // L
    [[1, 1], [1, 1]], // O
    [[0, 1, 1], [1, 1, 0]], // S
    [[0, 1, 0], [1, 1, 1]], // T
    [[1, 1, 0], [0, 1, 1]]  // Z
];

const getCols = (level: number) => 10 + Math.floor((level - 1) / 10) * 2;

export default function TetrisGame() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { user } = useUser();
    const submitScore = useMutation(api.scores.submitScore);

    // Game State
    const [level, setLevel] = useState(1);
    const [score, setScore] = useState(0);
    const [lines, setLines] = useState(0);
    const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'GAME_OVER' | 'AUTH_REQUIRED'>('START');
    const [cols, setCols] = useState(10);

    // Refs
    const gridRef = useRef<number[][]>(Array.from({ length: ROWS }, () => Array(10).fill(0)));
    const pieceRef = useRef<{ shape: number[][], x: number, y: number, color: string } | null>(null);
    const nextPieceRef = useRef<{ shape: number[][], color: string } | null>(null);
    const nextCanvasRef = useRef<HTMLCanvasElement>(null);
    const reqRef = useRef<number>(0);
    const lastTimeRef = useRef<number>(0);
    const dropCounterRef = useRef<number>(0);
    const dropIntervalRef = useRef<number>(1000);
    const scoreRef = useRef(0);
    const levelRef = useRef(1);
    const colsRef = useRef(10);

    const drawNext = useCallback(() => {
        const canvas = nextCanvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (!nextPieceRef.current) return;

        ctx.fillStyle = nextPieceRef.current.color;
        const shape = nextPieceRef.current.shape;
        const blockSize = 20;
        const offsetX = (canvas.width - shape[0].length * blockSize) / 2;
        const offsetY = (canvas.height - shape.length * blockSize) / 2;

        shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    ctx.fillRect(offsetX + x * blockSize, offsetY + y * blockSize, blockSize - 1, blockSize - 1);
                }
            });
        });
    }, []);

    const checkCollision = useCallback((x: number, y: number, shape: number[][]) => {
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c] !== 0) {
                    const newX = x + c;
                    const newY = y + r;

                    if (newX < 0 || newX >= colsRef.current || newY >= ROWS) {
                        return true;
                    }

                    if (newY >= 0 && gridRef.current[newY][newX] !== 0) {
                        return true;
                    }
                }
            }
        }
        return false;
    }, []);

    const rotate = useCallback((matrix: number[][]) => {
        return matrix[0].map((_, index) => matrix.map(row => row[index]).reverse());
    }, []);

    const spawnPiece = useCallback(() => {
        // Promote next piece to current
        if (!nextPieceRef.current) {
            const typeId = Math.floor(Math.random() * SHAPES.length);
            nextPieceRef.current = {
                shape: SHAPES[typeId],
                color: COLORS[typeId]
            };
        }

        const currentShape = nextPieceRef.current!.shape;
        const currentColor = nextPieceRef.current!.color;

        pieceRef.current = {
            shape: currentShape,
            x: Math.floor(colsRef.current / 2) - Math.floor(currentShape[0].length / 2),
            y: 0,
            color: currentColor
        };

        // Generate new next piece
        const typeId = Math.floor(Math.random() * SHAPES.length);
        nextPieceRef.current = {
            shape: SHAPES[typeId],
            color: COLORS[typeId]
        };

        drawNext();

        // Check for immediate collision (Game Over)
        if (checkCollision(pieceRef.current.x, pieceRef.current.y, pieceRef.current.shape)) {
            setGameState('GAME_OVER');
            submitScore({
                score: scoreRef.current,
                level: levelRef.current,
                gameType: "tetris"
            });
        }
    }, [checkCollision, drawNext, submitScore]);

    const merge = useCallback(() => {
        if (!pieceRef.current) return;
        pieceRef.current.shape.forEach((row, r) => {
            row.forEach((value, c) => {
                if (value !== 0) {
                    const py = pieceRef.current!.y + r;
                    const px = pieceRef.current!.x + c;
                    if (py >= 0) {
                        // Store color index + 1 to distinguish from empty (0)
                        gridRef.current[py][px] = COLORS.indexOf(pieceRef.current!.color) + 1;
                    }
                }
            });
        });
    }, []);

    const sweep = useCallback(() => {
        let rowCount = 0;
        outer: for (let r = ROWS - 1; r >= 0; r--) {
            for (let c = 0; c < colsRef.current; c++) {
                if (gridRef.current[r][c] === 0) {
                    continue outer;
                }
            }
            const row = gridRef.current.splice(r, 1)[0].fill(0);
            gridRef.current.unshift(row);
            rowCount++;
            r++; // Check same row again
        }

        if (rowCount > 0) {
            const points = [0, 100, 300, 500, 800];
            scoreRef.current += points[rowCount] * levelRef.current;
            setScore(scoreRef.current);
            setLines(prev => {
                const newLines = prev + rowCount;
                const newLevel = Math.floor(newLines / 10) + 1;

                if (newLevel > levelRef.current) {
                    // Check for board expansion
                    const newCols = getCols(newLevel);
                    if (newCols > colsRef.current) {
                        const offset = Math.floor((newCols - colsRef.current) / 2);
                        const newGrid = Array.from({ length: ROWS }, () => Array(newCols).fill(0));

                        // Copy old grid to center of new grid
                        for (let r = 0; r < ROWS; r++) {
                            for (let c = 0; c < colsRef.current; c++) {
                                newGrid[r][c + offset] = gridRef.current[r][c];
                            }
                        }

                        gridRef.current = newGrid;
                        colsRef.current = newCols;
                        setCols(newCols);
                    }

                    levelRef.current = newLevel;
                    setLevel(newLevel);
                    dropIntervalRef.current = Math.max(100, 1000 - (newLevel - 1) * 100);

                    // Auth Check
                    if (newLevel > 2 && !user) {
                        setGameState('AUTH_REQUIRED');
                        cancelAnimationFrame(reqRef.current);
                    }
                }
                return newLines;
            });
        }
    }, [user]);

    const resetGame = useCallback(() => {
        const startCols = getCols(1);
        gridRef.current = Array.from({ length: ROWS }, () => Array(startCols).fill(0));
        setScore(0);
        scoreRef.current = 0;
        setLines(0);
        setLevel(1);
        levelRef.current = 1;
        setCols(startCols);
        colsRef.current = startCols;
        dropIntervalRef.current = 1000;

        // Init next piece
        const typeId = Math.floor(Math.random() * SHAPES.length);
        nextPieceRef.current = {
            shape: SHAPES[typeId],
            color: COLORS[typeId]
        };

        spawnPiece();
    }, [spawnPiece]);

    const playerDrop = useCallback(() => {
        if (!pieceRef.current) return;
        if (!checkCollision(pieceRef.current.x, pieceRef.current.y + 1, pieceRef.current.shape)) {
            pieceRef.current.y++;
            dropCounterRef.current = 0;
        } else {
            merge();
            sweep();
            spawnPiece();
        }
    }, [checkCollision, merge, sweep, spawnPiece]);

    const playerMove = useCallback((dir: number) => {
        if (!pieceRef.current) return;
        if (!checkCollision(pieceRef.current.x + dir, pieceRef.current.y, pieceRef.current.shape)) {
            pieceRef.current.x += dir;
        }
    }, [checkCollision]);

    const playerRotate = useCallback(() => {
        if (!pieceRef.current) return;
        const rotated = rotate(pieceRef.current.shape);
        // Wall kick (basic)
        let offset = 1;
        let x = pieceRef.current.x;
        while (checkCollision(x, pieceRef.current.y, rotated)) {
            x += offset;
            offset = -(offset + (offset > 0 ? 1 : -1));
            if (offset > pieceRef.current.shape[0].length) {
                return; // Rotate failed
            }
        }
        pieceRef.current.shape = rotated;
        pieceRef.current.x = x;
    }, [rotate, checkCollision]);

    // Input
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (gameState !== 'PLAYING') return;

            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
            }

            if (e.key === 'ArrowLeft') playerMove(-1);
            if (e.key === 'ArrowRight') playerMove(1);
            if (e.key === 'ArrowDown') playerDrop();
            if (e.key === 'ArrowUp') playerRotate();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [gameState, playerMove, playerDrop, playerRotate]);

    // Game Loop
    useEffect(() => {
        if (gameState !== 'PLAYING') {
            cancelAnimationFrame(reqRef.current);
            return;
        }

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        const update = (time = 0) => {
            const deltaTime = time - lastTimeRef.current;
            lastTimeRef.current = time;

            dropCounterRef.current += deltaTime;
            if (dropCounterRef.current > dropIntervalRef.current) {
                playerDrop();
            }

            draw();
            reqRef.current = requestAnimationFrame(update);
        };

        const draw = () => {
            // Clear
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw Grid
            gridRef.current.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value !== 0) {
                        ctx.fillStyle = COLORS[value - 1];
                        ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE - 1, BLOCK_SIZE - 1);
                    }
                });
            });

            // Draw Piece
            if (pieceRef.current) {
                ctx.fillStyle = pieceRef.current.color;
                pieceRef.current.shape.forEach((row, y) => {
                    row.forEach((value, x) => {
                        if (value !== 0) {
                            ctx.fillRect((pieceRef.current!.x + x) * BLOCK_SIZE, (pieceRef.current!.y + y) * BLOCK_SIZE, BLOCK_SIZE - 1, BLOCK_SIZE - 1);
                        }
                    });
                });
            }
        };

        update();
        return () => cancelAnimationFrame(reqRef.current);
    }, [gameState, cols, playerDrop]);

    const startGame = useCallback(() => {
        resetGame();
        setGameState('PLAYING');
    }, [resetGame]);

    return (
        <div className="flex flex-col items-center gap-2">
            <div className="flex justify-between w-full max-w-[300px] text-xl font-mono text-yellow-400">
                <div>SCORE: {score}</div>
                <div>LEVEL: {level}</div>
                <div>LINES: {lines % 10}/10</div>
            </div>

            <div className="relative border-4 border-yellow-400 bg-black shadow-[0_0_20px_rgba(255,255,0,0.3)] max-w-full">
                <canvas
                    ref={canvasRef}
                    width={cols * BLOCK_SIZE}
                    height={ROWS * BLOCK_SIZE}
                    className="block max-w-full h-auto"
                />

                {/* Next Piece Preview */}
                <div className="absolute -right-32 top-0 border-2 border-yellow-400 bg-black p-2 hidden md:block">
                    <div className="text-yellow-400 font-mono text-sm text-center mb-2">NEXT</div>
                    <canvas
                        ref={nextCanvasRef}
                        width={80}
                        height={80}
                        className="block"
                    />
                </div>

                {/* Overlays */}
                {gameState === 'START' && (
                    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-center">
                        <h2 className="text-4xl font-bold text-yellow-400 mb-4 animate-pulse">TETRIS</h2>
                        <p className="text-gray-400 mb-8">Arrows to Move & Rotate</p>
                        <Button onClick={startGame} className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold px-8 py-4 text-xl">
                            START GAME
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

                {gameState === 'AUTH_REQUIRED' && (
                    <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center text-center p-8">
                        <h2 className="text-3xl font-bold text-yellow-400 mb-4">LEVEL 3 LOCKED</h2>
                        <p className="text-gray-300 mb-8">Please sign in to continue!</p>
                        <SignInButton mode="modal">
                            <Button className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold px-8 py-4 text-xl">
                                SIGN IN TO CONTINUE
                            </Button>
                        </SignInButton>
                    </div>
                )}
            </div>

            {/* Controls Legend */}
            <div className="mt-4 text-gray-400 font-mono text-sm flex flex-wrap justify-center gap-6 bg-gray-900/50 p-4 rounded-lg border border-gray-800">
                <div className="flex items-center gap-2">
                    <span className="bg-gray-800 px-2 py-1 rounded text-yellow-400">←</span> <span>Left</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="bg-gray-800 px-2 py-1 rounded text-yellow-400">→</span> <span>Right</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="bg-gray-800 px-2 py-1 rounded text-yellow-400">↑</span> <span>Rotate</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="bg-gray-800 px-2 py-1 rounded text-yellow-400">↓</span> <span>Drop</span>
                </div>
            </div>
        </div>
    );
}
