const fs = require('fs');
const path = require('path');

function parseXMLLayout(xmlContent) {
    const characters = {
        lowercase: new Set(),
        uppercase: new Set(),
        numbers: new Set(),
        special: new Set()
    };

    // Extract VK_TO_WCHARS entries
    const vkRegex = /<VK_TO_WCHARS\s+Wch="([^"]+)"[^>]*VirtualKey="([^"]+)"[^>]*>/g;
    let match;

    while ((match = vkRegex.exec(xmlContent)) !== null) {
        const wchars = match[1].split(' ');
        const virtualKey = match[2];

        // First wchar is usually lowercase/normal, second is shift
        if (wchars.length >= 2) {
            const normalChar = String.fromCharCode(parseInt(wchars[0], 16));
            const shiftChar = String.fromCharCode(parseInt(wchars[1], 16));

            // Categorize characters
            if (normalChar && normalChar !== '\uF000' && normalChar.charCodeAt(0) >= 32) {
                if (/[a-z]/.test(normalChar)) {
                    characters.lowercase.add(normalChar);
                } else if (/[0-9]/.test(normalChar)) {
                    characters.numbers.add(normalChar);
                } else if (normalChar.trim()) {
                    characters.special.add(normalChar);
                }
            }

            if (shiftChar && shiftChar !== '\uF000' && shiftChar.charCodeAt(0) >= 32) {
                if (/[A-Z]/.test(shiftChar)) {
                    characters.uppercase.add(shiftChar);
                } else if (/[0-9]/.test(shiftChar)) {
                    characters.numbers.add(shiftChar);
                } else if (shiftChar.trim()) {
                    characters.special.add(shiftChar);
                }
            }
        }
    }

    // Convert sets to sorted arrays
    return {
        lowercase: Array.from(characters.lowercase).sort(),
        uppercase: Array.from(characters.uppercase).sort(),
        numbers: Array.from(characters.numbers).sort(),
        special: Array.from(characters.special).sort()
    };
}

// Parse QWERTY layout
const qwertyXML = fs.readFileSync(path.join(__dirname, '..', 'data', 'us_qwerty_layout.xml'), 'utf8');
const qwertyLayout = parseXMLLayout(qwertyXML);

// Parse AZERTY layout
const azertyXML = fs.readFileSync(path.join(__dirname, '..', 'data', 'french_azerty_standard.xml'), 'utf8');
const azertyLayout = parseXMLLayout(azertyXML);

// Combine layouts
const layouts = {
    qwerty: qwertyLayout,
    azerty: azertyLayout
};

// Write to JSON file
fs.writeFileSync(
    path.join(__dirname, '..', 'website', 'layouts.json'),
    JSON.stringify(layouts, null, 2)
);

console.log('Layouts parsed and saved to website/layouts.json');
console.log('QWERTY characters:', {
    lowercase: qwertyLayout.lowercase.length,
    uppercase: qwertyLayout.uppercase.length,
    numbers: qwertyLayout.numbers.length,
    special: qwertyLayout.special.length
});
console.log('AZERTY characters:', {
    lowercase: azertyLayout.lowercase.length,
    uppercase: azertyLayout.uppercase.length,
    numbers: azertyLayout.numbers.length,
    special: azertyLayout.special.length
});
