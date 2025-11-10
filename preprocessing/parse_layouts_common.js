const fs = require('fs');
const path = require('path');

function parseVSCtoVK(xmlContent) {
    // Parse the VSCtoVK mapping (scan code -> VirtualKey)
    const vscRegex = /<VSCtoVK>([^<]+)<\/VSCtoVK>/;
    const match = xmlContent.match(vscRegex);

    if (!match) return new Map();

    const vkCodes = match[1].trim().split(/\s+/);
    const scanCodeToVK = new Map();

    // Position in array = scan code, value = VirtualKey code
    for (var i = 0; i < vkCodes.length; i++) {
        var vkCode = parseInt(vkCodes[i], 16);
        if (vkCode !== 0x00FF && vkCode !== 0) {
            scanCodeToVK.set(i, vkCode);
        }
    }

    return scanCodeToVK;
}

function parseVKtoWchars(xmlContent) {
    // Parse VK_TO_WCHARS entries to get character mappings
    const vkToChars = new Map(); // VirtualKey code -> {allWchars, normal, shift}

    const vkRegex = /<VK_TO_WCHARS\s+Wch="([^"]+)"[^>]*VirtualKey="([^"]+)"[^>]*>/g;
    var match;

    while ((match = vkRegex.exec(xmlContent)) !== null) {
        const wchars = match[1].split(' ');
        const virtualKeyName = match[2];

        // Convert VK name to code (VK_A = 0x41, etc.)
        var vkCode = null;
        if (virtualKeyName.startsWith('VK_')) {
            var vkName = virtualKeyName.substring(3);
            if (vkName.length === 1 && vkName >= 'A' && vkName <= 'Z') {
                vkCode = vkName.charCodeAt(0);
            } else if (vkName >= '0' && vkName <= '9') {
                vkCode = vkName.charCodeAt(0);
            } else {
                // For OEM keys, use a lookup
                var oemMap = {
                    'VK_OEM_1': 0xBA, 'VK_OEM_PLUS': 0xBB, 'VK_OEM_COMMA': 0xBC,
                    'VK_OEM_MINUS': 0xBD, 'VK_OEM_PERIOD': 0xBE, 'VK_OEM_2': 0xBF,
                    'VK_OEM_3': 0xC0, 'VK_OEM_4': 0xDB, 'VK_OEM_5': 0xDC,
                    'VK_OEM_6': 0xDD, 'VK_OEM_7': 0xDE, 'VK_OEM_102': 0xE2,
                    'VK_SPACE': 0x20, 'VK_DECIMAL': 0x6E, 'VK_ADD': 0x6B,
                    'VK_SUBTRACT': 0x6D, 'VK_MULTIPLY': 0x6A, 'VK_DIVIDE': 0x6F
                };
                vkCode = oemMap[virtualKeyName];
            }
        }

        if (vkCode && wchars.length >= 2) {
            var normalChar = String.fromCharCode(parseInt(wchars[0], 16));
            var shiftChar = String.fromCharCode(parseInt(wchars[1], 16));

            vkToChars.set(vkCode, {
                virtualKeyName: virtualKeyName,
                allWchars: wchars,
                normal: normalChar,
                shift: shiftChar,
                wcharCount: wchars.length
            });
        }
    }

    return vkToChars;
}

function buildLayoutByScanCode(xmlContent) {
    // Build a map: scan code -> character info
    const scanCodeToVK = parseVSCtoVK(xmlContent);
    const vkToChars = parseVKtoWchars(xmlContent);

    const layout = new Map(); // scan code -> char info

    for (var scanCode of scanCodeToVK.keys()) {
        var vkCode = scanCodeToVK.get(scanCode);
        var charInfo = vkToChars.get(vkCode);

        if (charInfo) {
            layout.set(scanCode, charInfo);
        }
    }

    return layout;
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

const qwertyLayout = buildLayoutByScanCode(qwertyXML);
const azertyLayout = buildLayoutByScanCode(azertyXML);

console.log('DEBUG: Parsed layouts');
console.log('QWERTY scan codes:', qwertyLayout.size);
console.log('AZERTY scan codes:', azertyLayout.size);

// Find common characters (same character at same PHYSICAL position)
const commonChars = {
    lowercase: new Set(),
    uppercase: new Set(),
    numbers: new Set(),
    special: new Set()
};

const incompatibleKeys = [];

// Check each scan code (physical key position)
for (var scanCode of qwertyLayout.keys()) {
    var qwertyChars = qwertyLayout.get(scanCode);
    var azertyChars = azertyLayout.get(scanCode);

    if (!azertyChars) continue;

    // Skip numpad keys (scan codes >= 71 are typically numpad)
    if (scanCode >= 71 && scanCode <= 83) {
        continue;
    }

    // Get the categories for this key's characters
    var qNormalCat = categorizeChar(qwertyChars.normal);
    var aNormalCat = categorizeChar(azertyChars.normal);

    // Strategy: For letters (a-z, A-Z), only check normal and shift
    // For special characters, check if they have same modifier count to avoid AltGr issues

    var isLetter = (qNormalCat === 'lowercase' || qNormalCat === 'uppercase') &&
                   (aNormalCat === 'lowercase' || aNormalCat === 'uppercase');

    if (isLetter) {
        // For letters: only check normal (pos 0) and shift (pos 1)
        // Ignore AltGr modifiers since letters are typed without AltGr
        if (qwertyChars.normal === azertyChars.normal &&
            qwertyChars.shift === azertyChars.shift) {

            var normalCategory = categorizeChar(qwertyChars.normal);
            if (normalCategory) {
                commonChars[normalCategory].add(qwertyChars.normal);
            }

            var shiftCategory = categorizeChar(qwertyChars.shift);
            if (shiftCategory) {
                commonChars[shiftCategory].add(qwertyChars.shift);
            }
        } else {
            incompatibleKeys.push({
                scanCode: scanCode,
                qwerty: qwertyChars.normal + '/' + qwertyChars.shift + ' (' + qwertyChars.virtualKeyName + ')',
                azerty: azertyChars.normal + '/' + azertyChars.shift + ' (' + azertyChars.virtualKeyName + ')',
                type: 'letter_mismatch'
            });
        }
    } else {
        // For special characters and numbers: require exact match of ALL modifier states
        // This ensures @ and other special chars that might need AltGr are handled correctly

        if (qwertyChars.wcharCount !== azertyChars.wcharCount) {
            if (qNormalCat || aNormalCat) {
                incompatibleKeys.push({
                    scanCode: scanCode,
                    qwerty: qwertyChars.normal + ' (' + qwertyChars.wcharCount + ' states, ' + qwertyChars.virtualKeyName + ')',
                    azerty: azertyChars.normal + ' (' + azertyChars.wcharCount + ' states, ' + azertyChars.virtualKeyName + ')',
                    type: 'special_wchar_count_mismatch'
                });
            }
            continue;
        }

        // Check if ALL wchar positions match
        var allMatch = true;
        for (var i = 0; i < qwertyChars.allWchars.length; i++) {
            if (qwertyChars.allWchars[i] !== azertyChars.allWchars[i]) {
                allMatch = false;
                break;
            }
        }

        if (allMatch) {
            // All modifier states match - add the characters
            var normalCategory = categorizeChar(qwertyChars.normal);
            if (normalCategory) {
                commonChars[normalCategory].add(qwertyChars.normal);
            }

            var shiftCategory = categorizeChar(qwertyChars.shift);
            if (shiftCategory) {
                commonChars[shiftCategory].add(qwertyChars.shift);
            }
        } else {
            if (qNormalCat || aNormalCat) {
                incompatibleKeys.push({
                    scanCode: scanCode,
                    qwerty: qwertyChars.allWchars.join(' ') + ' (' + qwertyChars.virtualKeyName + ')',
                    azerty: azertyChars.allWchars.join(' ') + ' (' + azertyChars.virtualKeyName + ')',
                    type: 'special_modifier_mismatch'
                });
            }
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

// Save to JSON
const outputPath = path.join(__dirname, '..', 'website', 'layouts.json');
fs.writeFileSync(outputPath, JSON.stringify(layouts, null, 2));

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
incompatibleKeys.forEach(function(item) {
    console.log('  ScanCode ' + item.scanCode + ' (' + item.type + '): QWERTY=' + item.qwerty + ' vs AZERTY=' + item.azerty);
});
console.log('\nTotal incompatible positions: ' + incompatibleKeys.length);
