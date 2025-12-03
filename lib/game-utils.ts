export type GameState = 'START' | 'SHIP_SELECTION' | 'PLAYING' | 'GAME_OVER' | 'VICTORY' | 'LEVEL_TRANSITION';

export interface GameObject {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface Player extends GameObject {
    speed: number;
}

export interface Projectile extends GameObject {
    dy: number;
    active: boolean;
}

export interface Enemy extends GameObject {
    active: boolean;
    row: number;
    col: number;
}

export interface Bunker extends GameObject {
    damage: number; // 0 to 100
}

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;
export const PLAYER_WIDTH = 50;
export const PLAYER_HEIGHT = 30;
export const ENEMY_WIDTH = 40;
export const ENEMY_HEIGHT = 30;
export const BULLET_WIDTH = 5;
export const BULLET_HEIGHT = 15;
export const BUNKER_WIDTH = 60;
export const BUNKER_HEIGHT = 40;

export const PLAYER_SHIPS = [
    '/assets/space-invaders/player1.png',
    '/assets/space-invaders/player2.png',
    '/assets/space-invaders/player3.png',
];

export const ENEMY_SHIPS = [
    '/assets/space-invaders/enemy1.png',
    '/assets/space-invaders/enemy2.png',
    '/assets/space-invaders/enemy3.png',
    '/assets/space-invaders/enemy4.png',
    '/assets/space-invaders/enemy5.png',
    '/assets/space-invaders/enemy6.png',
    '/assets/space-invaders/enemy7.png',
    '/assets/space-invaders/enemy8.png',
    '/assets/space-invaders/enemy9.png',
    '/assets/space-invaders/enemy10.png',
];
