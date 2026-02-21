import sharp from 'sharp';

async function processImage() {
    try {
        const inputPath = 'C:/Users/Aqib/.gemini/antigravity/brain/db1af47d-f2ef-41d7-a9ad-10307622b719/media__1771708262841.jpg';
        const outputPath = 'e:/abhmwebsite/backend/src/assets/signature.png';

        console.log('Reading image with sharp...');
        const { data, info } = await sharp(inputPath)
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });

        console.log('Processing pixels...');
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Calculate luminance
            const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;

            // Threshold: anything brighter than 130 is considered background paper
            if (luminance > 120) {
                data[i + 3] = 0; // Make transparent
            } else {
                // It's ink: darken it slightly to pop against white card
                data[i] = Math.max(0, r - 40);
                data[i + 1] = Math.max(0, g - 40);
                data[i + 2] = Math.max(0, b - 10);
                data[i + 3] = 255; // Keep opaque
            }
        }

        console.log('Saving processed image...');
        await sharp(data, {
            raw: {
                width: info.width,
                height: info.height,
                channels: 4
            }
        })
        .trim({ threshold: 0 }) // Trim transparent bounding box
        .png()
        .toFile(outputPath);

        console.log('Signature successfully processed and saved to', outputPath);
    } catch (err) {
        console.error('Error processing image:', err);
    }
}

processImage();
