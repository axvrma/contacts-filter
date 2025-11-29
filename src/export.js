// src/export.js
const fs = require('fs');

/**
 * Save filtered cards back into a .vcf file.
 * cards: array of { raw, parsed }
 */
function saveContacts (cards, outPath = './filtered.vcf') {
    const combined = cards.map((c) => c.raw).join('\r\n');
    fs.writeFileSync(outPath, combined, 'utf-8');
}

module.exports = { saveContacts };
