const fs = require('fs');
const path = require('path');

const outputDir = path.join(__dirname, '../public/assets');

function generateSVG(type, seed, color) {
    const width = 12;
    const height = 12;
    const pixelSize = 4;

    let rects = '';

    // Generate random symmetrical pixels
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width / 2; x++) {
            const rand = Math.sin(seed * 999 + x * 13 + y * 27) * 10000;
            const isFilled = (rand - Math.floor(rand)) > 0.5;

            if (isFilled) {
                rects += `<rect x="${x * pixelSize}" y="${y * pixelSize}" width="${pixelSize}" height="${pixelSize}" fill="${color}" />`;
                rects += `<rect x="${(width - 1 - x) * pixelSize}" y="${y * pixelSize}" width="${pixelSize}" height="${pixelSize}" fill="${color}" />`;
            }
        }
    }

    // Add a background rect if needed, but user requested black background which is default for canvas if transparent.
    // However, user specifically asked for "new designs anon black background". 
    // If I make it transparent, it will show the game's black background.
    // If I make it black, it might look like a box.
    // I will stick to transparent for now as it's safer for "black background" context (space).

    return `<svg width="${width * pixelSize}" height="${height * pixelSize}" viewBox="0 0 ${width * pixelSize} ${height * pixelSize}" xmlns="http://www.w3.org/2000/svg">
        ${rects}
    </svg>`;
}

// Missing files based on ls output:
// player2.png
// enemy6.png
// enemy10.png

// Generate Player 2
fs.writeFileSync(path.join(outputDir, 'player2.svg'), generateSVG('player', 123, '#00FFFF'));
console.log('Generated player2.svg');

// Generate Enemy 6
fs.writeFileSync(path.join(outputDir, 'enemy6.svg'), generateSVG('enemy', 456, '#FF00FF'));
console.log('Generated enemy6.svg');

// Generate Enemy 10
fs.writeFileSync(path.join(outputDir, 'enemy10.svg'), generateSVG('enemy', 789, '#FFFF00'));
console.log('Generated enemy10.svg');
