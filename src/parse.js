// src/parse.js
const fs = require('fs');
const { parse } = require('vcard4');

/**
 * Load and parse all vCards from a .vcf file.
 * Returns an array of { raw, parsed } objects.
 *  - raw: the original vCard text
 *  - parsed: the object returned by vcard4.parse()
 */
function loadContacts (vcfPath = './contacts.vcf') {
    const rawFile = fs.readFileSync(vcfPath, 'utf-8');

    // Split the file into individual vCards by END:VCARD
    const blocks = rawFile
        .split(/END:VCARD\s*/i)
        .map((chunk) => chunk.trim())
        .filter((chunk) => chunk.toUpperCase().includes('BEGIN:VCARD'))
        .map((chunk) => chunk + '\r\nEND:VCARD\r\n'); // ensure proper ending

    const cards = blocks.map((block) => {
        const parsedResult = parse(block); // from vcard4

        // parse() returns either a single object or an array of them.
        const parsedArray = Array.isArray(parsedResult)
            ? parsedResult
            : [parsedResult];

        // Each block should be one vCard, so we take the first.
        const parsed = parsedArray[0];

        return { raw: block, parsed };
    });

    return cards;
}

module.exports = { loadContacts };
