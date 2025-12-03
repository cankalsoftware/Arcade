const fs = require('fs');
const path = require('path');

const COLORS = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080'];

function generateShipSVG(seed) {
    const width = 12;
    const height = 12;
    const pixelSize = 4;
    const color = COLORS[seed % COLORS.length];

    let rects = '';

    // Generate random symmetrical pixels
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width / 2; x++) {
            // Simple pseudo-random based on position and seed
            const rand = Math.sin(seed * 999 + x * 13 + y * 27) * 10000;
            const isFilled = (rand - Math.floor(rand)) > 0.5;

            if (isFilled) {
                rects += `<rect x="${x * pixelSize}" y="${y * pixelSize}" width="${pixelSize}" height="${pixelSize}" fill="${color}" />`;
                // Mirror
                rects += `<rect x="${(width - 1 - x) * pixelSize}" y="${y * pixelSize}" width="${pixelSize}" height="${pixelSize}" fill="${color}" />`;
            }
        }
    }

    return `<svg width="${width * pixelSize}" height="${height * pixelSize}" viewBox="0 0 ${width * pixelSize} ${height * pixelSize}" xmlns="http://www.w3.org/2000/svg">
        ${rects}
    </svg>`;
}

const outputDir = path.join(__dirname, '../public/assets');

// Generate enemies 5 to 10
for (let i = 5; i <= 10; i++) {
    const svg = generateShipSVG(i + 100); // Offset seed
    fs.writeFileSync(path.join(outputDir, `enemy${i}.svg`), svg);
    console.log(`Generated enemy${i}.svg`);
}
