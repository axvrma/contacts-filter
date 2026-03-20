// --- Pure functions for VCF processing ---

function parseVcf(text) {
    const blocks = text
        .split(/END:VCARD/i)
        .map((b) => b.trim())
        .filter((b) => /BEGIN:VCARD/i.test(b));

    const cards = [];

    for (const block of blocks) {
        const fullBlock = block + "\nEND:VCARD\n";
        const lines = fullBlock.split(/\r?\n/);

        let name = "";
        let suffix = "";
        let phones = [];
        let emails = [];

        for (const line of lines) {
            // FN: full name
            if (/^FN[:;]/i.test(line)) {
                const fnValue = line.split(":").slice(1).join(":").trim();
                name = fnValue || "(No Name)";
            }

            // N: Last;First;Middle;Prefix;Suffix
            if (/^N[:;]/i.test(line)) {
                const value = line.split(":").slice(1).join(":");
                const parts = value.split(";");
                if (parts.length >= 5) {
                    suffix = (parts[4] || "").trim();
                }
            }
            
            // Mapped item labels for Apple/Google custom VCF tags
            const itemLabels = {};
            for (const line of lines) {
                const match = line.match(/^(item\d+)\.X-ABLabel:(.*)/i);
                if (match) {
                    itemLabels[match[1].toLowerCase()] = match[2].trim();
                }
            }
            
            // Utility to extract [labels] from the left side parameters of a VCF prop
            const extractLabels = (paramsStr) => {
                if (!paramsStr) return "";
                const parts = paramsStr.split(";").filter(p => p.trim());
                let labels = parts.map(p => {
                    if(p.toUpperCase().startsWith("TYPE=")) {
                        return p.substring(5).split(',').join(' ');
                    }
                    if(p.toUpperCase().startsWith("VALUE=")) return null;
                    return p;
                }).filter(Boolean);
                
                labels = labels.filter(l => !['PREF', 'INTERNET', 'VOICE'].includes(l.toUpperCase()));
                let joined = labels.join(" ").toLowerCase();
                return joined ? `[${joined}] ` : "";
            };

            // TEL
            const telMatch = line.match(/^(?:(item\d+)\.)?TEL([^:]*):(.*)/i);
            if (telMatch) {
                const itemGroup = telMatch[1] ? telMatch[1].toLowerCase() : null;
                const params = telMatch[2];
                const value = telMatch[3].trim();
                
                let labelStr = "";
                if (itemGroup && itemLabels[itemGroup]) {
                    labelStr = `[${itemLabels[itemGroup].toLowerCase()}] `;
                } else {
                    labelStr = extractLabels(params);
                }
                
                if (value && !phones.includes(labelStr + value)) {
                    phones.push(labelStr + value);
                }
            }
            
            // EMAIL
            const emailMatch = line.match(/^(?:(item\d+)\.)?EMAIL([^:]*):(.*)/i);
            if (emailMatch) {
                const itemGroup = emailMatch[1] ? emailMatch[1].toLowerCase() : null;
                const params = emailMatch[2];
                const value = emailMatch[3].trim().toLowerCase();
                
                let labelStr = "";
                if (itemGroup && itemLabels[itemGroup]) {
                    labelStr = `[${itemLabels[itemGroup].toLowerCase()}] `;
                } else {
                    labelStr = extractLabels(params);
                }
                
                const finalRecord = labelStr + value;
                if (value && !emails.includes(finalRecord)) {
                    emails.push(finalRecord);
                }
            }
        }

        cards.push({
            name: name || "(No Name)",
            suffix: suffix || "",
            phones: phones,
            emails: emails,
            raw: fullBlock,
            rawLower: fullBlock.toLowerCase(),
        });
    }

    return cards;
}

function filterCards(cards, query) {
    if (!query) return cards;

    return cards.filter((card) => {
        const nameMatch = card.name.toLowerCase().includes(query);
        const suffixMatch = (card.suffix || "").toLowerCase().includes(query);
        const rawMatch = card.rawLower.includes(query); // email, phone, etc.

        return nameMatch || suffixMatch || rawMatch;
    });
}

function groupBySuffix(cards, sortMode) {
    const groups = new Map();

    for (const card of cards) {
        const key = card.suffix || "No Suffix";
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(card);
    }

    let entries = Array.from(groups.entries());

    if (sortMode === "count") {
        entries.sort((a, b) => {
            const diff = b[1].length - a[1].length;
            return diff !== 0 ? diff : a[0].localeCompare(b[0]);
        });
    } else {
        entries.sort((a, b) => a[0].localeCompare(b[0]));
    }

    return new Map(entries);
}

function buildUpdatedVcf(cards) {
    return cards
        .map((card) => updateVcfBlockWithSuffix(card.raw, card.suffix))
        .join("\r\n");
}

function updateVcfBlockWithSuffix(block, newSuffix) {
    const lines = block.split(/\r?\n/);
    let foundN = false;

    const updatedLines = lines.map((line) => {
        if (/^N[:;]/i.test(line)) {
            foundN = true;
            const [left, ...rest] = line.split(":");
            const value = rest.join(":"); // everything after first :
            const parts = value.split(";");
            while (parts.length < 5) {
                parts.push("");
            }
            parts[4] = newSuffix || "";
            return left + ":" + parts.join(";");
        }
        return line;
    });

    // If no N: line found, we just leave block as-is.
    return updatedLines.join("\r\n");
}
