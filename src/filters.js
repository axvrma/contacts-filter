// src/filters.js

// parsed here is the object returned by vcard4.parse() for a single vCard

function getName (parsed) {
    const fnProps = parsed.getProperty('FN'); // array, possibly empty
    if (!fnProps || fnProps.length === 0) return '(No Name)';
    return fnProps[0].value || '(No Name)';
}

function getPhones (parsed) {
    const telProps = parsed.getProperty('TEL') || [];
    return telProps.map((p) => {
        if (typeof p.value === 'string') {
            // vCard often stores phones as "tel:+91..." URIs
            return p.value.replace(/^tel:/i, '');
        }
        if (Array.isArray(p.value)) {
            return p.value.join(', ');
        }
        return String(p.value);
    });
}

function getEmails (parsed) {
    const emailProps = parsed.getProperty('EMAIL') || [];
    return emailProps.map((p) => String(p.value));
}

/**
 * This is where YOU decide which contacts to keep.
 * cards = array of { raw, parsed }
 */
function applyFilters (cards) {
    console.log(cards?.[0]);
    return cards.filter(({ parsed }) => {
        const name = getName(parsed);
        const phones = getPhones(parsed);
        const emails = getEmails(parsed);

        // =============================
        // EDIT THIS LOGIC FREELY
        // =============================

        // Example 1: Only keep contacts with at least one phone
        // return phones.length > 0;

        // Example 2: Only keep +91 numbers
        // return phones.some((p) => p.startsWith('+91'));

        // Example 3: Only keep contacts whose name includes "Abhi"
        // return name.toLowerCase().includes('abhi');

        // Example 4: Only gmail users
        // return emails.some((e) => e.endsWith('@gmail.com'));

        // Default: keep everything
        return true;
    });
}

module.exports = { applyFilters, getName, getPhones, getEmails, getEmails };
