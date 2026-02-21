import fs from 'fs';
try {
    const text = fs.readFileSync('e:/abhmwebsite/backend/src/services/emailService.js', 'utf8');

    const sIdx = text.indexOf('        // Icons as inline SVGs');
    const eIdx = text.indexOf('        await page.setContent(htmlContent);');

    if (sIdx === -1 || eIdx === -1) throw new Error("Markers not found");

    const ex = text.substring(sIdx, eIdx);
    
    let newText = text.substring(0, sIdx) + '        const htmlContent = await generateIdCardHtml(member);\n\n' + text.substring(eIdx); 

    const func = `export const generateIdCardHtml = async (member) => {\n${ex}\n    return htmlContent;\n};\n\n`;

    newText = newText.replace('export const generateIdCardPdf = async', func + 'export const generateIdCardPdf = async');
    
    fs.writeFileSync('e:/abhmwebsite/backend/src/services/emailService.js', newText);
    console.log('Done refactoring');
} catch (e) {
    console.error(e);
}
