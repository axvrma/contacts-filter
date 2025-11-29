// src/index.js
const fs = require('fs');
const vCard = require('vcard-parser');

// 1. Load and split the VCF file into individual vCards
function loadContacts (vcfPath = './contacts.vcf') {
    const rawFile = fs.readFileSync(vcfPath, 'utf-8');

    // Split on each BEGIN:VCARD while keeping it in the result using a lookahead
    const blocks = rawFile
        .split(/(?=BEGIN:VCARD)/g)
        .map((b) => b.trim())
        .filter((b) => b.length > 0);

    const cards = blocks.map((block) => {
        const parsed = vCard.parse(block); // vCard 2.1/3.0 parser

        // vcard-parser returns a JS object like:
        // { fn: [{ value: 'Name' }], tel: [...], email: [...] }
        return { raw: block, parsed };
    });

    return cards;
}

// ---------- Helper functions to inspect data ----------

function getName (card) {
    const fnArr = card.parsed.fn || [];
    if (!fnArr.length) return '(No Name)';
    return fnArr[0].value || '(No Name)';
}

function getPhones (card) {
    const telArr = card.parsed.tel || [];
    return telArr.map((t) => t.value);
}

function getEmails (card) {
    const emailArr = card.parsed.email || [];
    return emailArr.map((e) => e.value);
}

function getSuffix (card) {
    const nArr = card.parsed.n || [];
    if (!nArr.length) return '';

    const parts = nArr[0].value; // array of 5 things
    if (!Array.isArray(parts) || parts.length < 5) return '';

    return parts[4] || '';
}

// ---------- Your filter logic lives here ----------

function applyFilters (cards) {
    return cards.filter((card) => {
        const name = getName(card);
        const phones = getPhones(card);
        const emails = getEmails(card);

        // =============================
        // CHANGE THIS TO WHATEVER YOU WANT
        // =============================

        // Example 1: only keep contacts with at least one phone
        // return phones.length > 0;

        // Example 2: only +91 numbers
        // return phones.some((p) => p && p.startsWith('+91'));

        // Example 3: only names containing "Abhi"
        // return name.toLowerCase().includes('abhi');

        // Example 4: only gmail users
        // return emails.some((e) => e && e.endsWith('@gmail.com'));

        // For now: keep everything
        return true;
    });
}

// ---------- Save output as filtered.vcf ----------

function saveContacts (cards, outPath = './filtered.vcf') {
    // vcard-parser has vCard.generate(obj) but we can also
    // just join the original raw blocks of the cards we kept.
    const text = cards
        .map((card) => card.raw.endsWith('\n') ? card.raw : card.raw + '\r\n')
        .join('\r\n');

    fs.writeFileSync(outPath, text, 'utf-8');
}

// ---------- Main ----------

function main () {
    const cards = loadContacts('./contacts.vcf');

    console.log(`Total contacts in VCF: ${cards.length}`);

    const counts = {};

    cards.forEach(card => {
        const suffix = getSuffix(card);

        if (suffix) {
            counts[suffix] = (counts[suffix] || 0) + 1;
        } else {
            counts["__NO_SUFFIX__"] = (counts["__NO_SUFFIX__"] || 0) + 1;
        }
    });

    // ------------------------------------------------------------------

    // Sort keys alphabetically
    // const sortedKeys = Object.keys(counts).sort((a, b) =>
    //     a.localeCompare(b)
    // );

    // Build a new sorted object
    // const sorted = {};
    // sortedKeys.forEach(key => {
    //     sorted[key] = counts[key];
    // });

    // console.log('Unique Suffixes: ', Object.keys(sorted)?.length);
    // console.log(sorted);

    // ------------------------------------------------------------------

    // Convert to array of [suffix, count]
    const asArray = Object.entries(counts);

    // Sort by count DESC, ties sorted alphabetically
    asArray.sort((a, b) => {
        if (b[1] === a[1]) {
            return a[0].localeCompare(b[0]); // tie-break alphabetical
        }
        return b[1] - a[1];
    });

    console.log('Unique Suffixes: ', Object.keys(asArray)?.length);
    console.log(asArray);

    // ------------------------------------------------------------------

    // const filtered = applyFilters(cards);
    // console.log(`Filtered contacts: ${filtered.length}`);

    // saveContacts(filtered, './filtered.vcf');
    // console.log('Saved filtered.vcf');
}

main();
