const fs = require('fs');
const path = require('path');

function parseXMLLayoutByPosition(xmlContent) {
    const positions = new Map(); // VirtualKey -> {normal, shift}

    // Extract VK_TO_WCHARS entries
    const vkRegex = /<VK_TO_WCHARS\s+Wch="([^"]+)"[^>]*VirtualKey="([^"]+)"[^>]*>/g;
    let match;

    while ((match = vkRegex.exec(xmlContent)) !== null) {
        const wchars = match[1].split(' ');
        const virtualKey = match[2];

        if (wchars.length >= 2) {
            const normalChar = String.fromCharCode(parseInt(wchars[0], 16));
            const shiftChar = String.fromCharCode(parseInt(wchars[1], 16));

            positions.set(virtualKey, {
                normal: normalChar,
                shift: shiftChar
            });
        }
    }

    return positions;
}

function categorizeChar(char) {
    if (!char || char === '\uF000' || char.charCodeAt(0) < 32) {
        return null;
    }
    if (/[a-z]/.test(char)) return 'lowercase';
    if (/[A-Z]/.test(char)) return 'uppercase';
    if (/[0-9]/.test(char)) return 'numbers';
    if (char.trim()) return 'special';
    return null;
}

// Parse both layouts
const qwertyXML = fs.readFileSync(path.join(__dirname, '..', 'data', 'us_qwerty_layout.xml'), 'utf8');
const azertyXML = fs.readFileSync(path.join(__dirname, '..', 'data', 'french_azerty_standard.xml'), 'utf8');

const qwertyPositions = parseXMLLayoutByPosition(qwertyXML);
const azertyPositions = parseXMLLayoutByPosition(azertyXML);

// Find common characters (same character at same position on both keyboards)
const commonChars = {
    lowercase: new Set(),
    uppercase: new Set(),
    numbers: new Set(),
    special: new Set()
};

const incompatibleKeys = [];

// Check each virtual key position
for (const [virtualKey, qwertyChars] of qwertyPositions) {
    const azertyChars = azertyPositions.get(virtualKey);

    if (!azertyChars) continue;

    // Skip numpad keys - they're not universally available and can cause conflicts
    if (virtualKey.startsWith('VK_NUMPAD') || virtualKey === 'VK_DECIMAL' ||
        virtualKey === 'VK_ADD' || virtualKey === 'VK_SUBTRACT' ||
        virtualKey === 'VK_MULTIPLY' || virtualKey === 'VK_DIVIDE') {
        continue;
    }

    // Check normal key (unshifted)
    if (qwertyChars.normal === azertyChars.normal) {
        const category = categorizeChar(qwertyChars.normal);
        if (category) {
            commonChars[category].add(qwertyChars.normal);
        }
    } else {
        // Track incompatible keys for reporting
        if (categorizeChar(qwertyChars.normal) && categorizeChar(azertyChars.normal)) {
            incompatibleKeys.push({
                key: virtualKey,
                qwerty: qwertyChars.normal,
                azerty: azertyChars.normal,
                type: 'normal'
            });
        }
    }

    // Check shift key
    if (qwertyChars.shift === azertyChars.shift) {
        const category = categorizeChar(qwertyChars.shift);
        if (category) {
            commonChars[category].add(qwertyChars.shift);
        }
    } else {
        // Track incompatible keys for reporting
        if (categorizeChar(qwertyChars.shift) && categorizeChar(azertyChars.shift)) {
            incompatibleKeys.push({
                key: virtualKey,
                qwerty: qwertyChars.shift,
                azerty: azertyChars.shift,
                type: 'shift'
            });
        }
    }
}

// Convert sets to sorted arrays
const layouts = {
    common: {
        lowercase: Array.from(commonChars.lowercase).sort(),
        uppercase: Array.from(commonChars.uppercase).sort(),
        numbers: Array.from(commonChars.numbers).sort(),
        special: Array.from(commonChars.special).sort()
    }
};

// Write to JSON file
fs.writeFileSync(
    path.join(__dirname, '..', 'website', 'layouts.json'),
    JSON.stringify(layouts, null, 2)
);

console.log('Common characters found and saved to website/layouts.json');
console.log('\nCharacters compatible with BOTH QWERTY and AZERTY:');
console.log('  Lowercase:', layouts.common.lowercase.join(''));
console.log('  Uppercase:', layouts.common.uppercase.join(''));
console.log('  Numbers:', layouts.common.numbers.join(''));
console.log('  Special:', layouts.common.special.join(' '));
console.log('\nTotal counts:');
console.log('  Lowercase:', layouts.common.lowercase.length);
console.log('  Uppercase:', layouts.common.uppercase.length);
console.log('  Numbers:', layouts.common.numbers.length);
console.log('  Special:', layouts.common.special.length);

console.log('\n--- Incompatible keys (different on QWERTY vs AZERTY) ---');
incompatibleKeys.forEach(item => {
    console.log(`  ${item.key} (${item.type}): QWERTY='${item.qwerty}' vs AZERTY='${item.azerty}'`);
});
console.log(`\nTotal incompatible positions: ${incompatibleKeys.length}`);
