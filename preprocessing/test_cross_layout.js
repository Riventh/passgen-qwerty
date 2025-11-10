const fs = require('fs');
const path = require('path');

// Load the generated layouts
const layoutsPath = path.join(__dirname, '..', 'website', 'layouts.json');
const layouts = JSON.parse(fs.readFileSync(layoutsPath, 'utf8'));

// Load original XML layouts to verify key positions
function parseXMLLayoutByPosition(xmlContent) {
    const positions = new Map(); // VirtualKey -> {normal, shift}

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

const qwertyXML = fs.readFileSync(path.join(__dirname, '..', 'data', 'us_qwerty_layout.xml'), 'utf8');
const azertyXML = fs.readFileSync(path.join(__dirname, '..', 'data', 'french_azerty_standard.xml'), 'utf8');

const qwertyPositions = parseXMLLayoutByPosition(qwertyXML);
const azertyPositions = parseXMLLayoutByPosition(azertyXML);

// Build reverse lookup: character -> virtualKey (for verification)
function buildCharToKeyMap(positions) {
    const charToKey = new Map();
    for (const [virtualKey, chars] of positions) {
        if (chars.normal && chars.normal !== '\uF000' && chars.normal.charCodeAt(0) >= 32) {
            charToKey.set(chars.normal, { virtualKey, shifted: false });
        }
        if (chars.shift && chars.shift !== '\uF000' && chars.shift.charCodeAt(0) >= 32) {
            charToKey.set(chars.shift, { virtualKey, shifted: true });
        }
    }
    return charToKey;
}

const qwertyCharMap = buildCharToKeyMap(qwertyPositions);
const azertyCharMap = buildCharToKeyMap(azertyPositions);

// Password generation function (same as website)
function generatePassword(length, includeLowercase, includeUppercase, includeSpecial) {
    const layout = layouts.common;
    let charPool = [];

    if (includeLowercase) {
        charPool = charPool.concat(layout.lowercase);
    }
    if (includeUppercase) {
        charPool = charPool.concat(layout.uppercase);
    }
    if (includeSpecial) {
        charPool = charPool.concat(layout.special);
    }

    if (charPool.length === 0) {
        throw new Error('No character types selected');
    }

    let password = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * charPool.length);
        password += charPool[randomIndex];
    }

    return password;
}

// Verify password is cross-layout compatible
function verifyPassword(password) {
    const issues = [];

    // Build set of all allowed characters from the common layout
    const allowedChars = new Set();
    layouts.common.lowercase.forEach(c => allowedChars.add(c));
    layouts.common.uppercase.forEach(c => allowedChars.add(c));
    layouts.common.numbers.forEach(c => allowedChars.add(c));
    layouts.common.special.forEach(c => allowedChars.add(c));

    for (let i = 0; i < password.length; i++) {
        const char = password[i];

        // Simple check: is the character in our allowed common set?
        if (!allowedChars.has(char)) {
            issues.push({
                char: char,
                position: i,
                issue: 'Character not in common cross-layout character set'
            });
            continue;
        }

        // Find all virtual keys that can produce this character on both layouts
        const qwertyKeys = [];
        const azertyKeys = [];

        for (const [virtualKey, chars] of qwertyPositions) {
            if (chars.normal === char) qwertyKeys.push({ virtualKey, shifted: false });
            if (chars.shift === char) qwertyKeys.push({ virtualKey, shifted: true });
        }

        for (const [virtualKey, chars] of azertyPositions) {
            if (chars.normal === char) azertyKeys.push({ virtualKey, shifted: false });
            if (chars.shift === char) azertyKeys.push({ virtualKey, shifted: true });
        }

        // Check if there's at least one matching virtualKey+shift combination
        const hasMatch = qwertyKeys.some(qk =>
            azertyKeys.some(ak =>
                qk.virtualKey === ak.virtualKey && qk.shifted === ak.shifted
            )
        );

        if (!hasMatch) {
            const qwertyVKs = qwertyKeys.map(k => `${k.virtualKey}${k.shifted ? '+SHIFT' : ''}`).join(', ');
            const azertyVKs = azertyKeys.map(k => `${k.virtualKey}${k.shifted ? '+SHIFT' : ''}`).join(', ');
            issues.push({
                char: char,
                position: i,
                issue: `No matching key position - QWERTY: [${qwertyVKs}], AZERTY: [${azertyVKs}]`
            });
        }
    }

    return {
        valid: issues.length === 0,
        issues: issues
    };
}

// Run tests
console.log('='.repeat(80));
console.log('CROSS-LAYOUT PASSWORD COMPATIBILITY TEST');
console.log('='.repeat(80));
console.log('\nGenerating and testing 100 random passwords...\n');

const testConfigurations = [
    { lowercase: true, uppercase: false, special: false, name: 'Lowercase only' },
    { lowercase: false, uppercase: true, special: false, name: 'Uppercase only' },
    { lowercase: true, uppercase: true, special: false, name: 'Mixed case' },
    { lowercase: true, uppercase: true, special: true, name: 'All characters' },
    { lowercase: true, uppercase: false, special: true, name: 'Lowercase + special' },
];

const results = {
    total: 0,
    passed: 0,
    failed: 0,
    failures: []
};

// Generate 20 passwords for each configuration
testConfigurations.forEach(config => {
    console.log(`Testing: ${config.name}`);

    for (let i = 0; i < 20; i++) {
        const length = Math.floor(Math.random() * 60) + 8; // 8-67 chars
        const password = generatePassword(length, config.lowercase, config.uppercase, config.special);
        const verification = verifyPassword(password);

        results.total++;

        if (verification.valid) {
            results.passed++;
            process.stdout.write('.');
        } else {
            results.failed++;
            process.stdout.write('X');
            results.failures.push({
                config: config.name,
                password: password,
                issues: verification.issues
            });
        }
    }
    console.log(` (20 passwords tested)`);
});

// Print results
console.log('\n' + '='.repeat(80));
console.log('TEST RESULTS');
console.log('='.repeat(80));
console.log(`Total passwords tested: ${results.total}`);
console.log(`✓ Passed: ${results.passed} (${(results.passed / results.total * 100).toFixed(1)}%)`);
console.log(`✗ Failed: ${results.failed} (${(results.failed / results.total * 100).toFixed(1)}%)`);

if (results.failed > 0) {
    console.log('\n' + '='.repeat(80));
    console.log('FAILURE DETAILS');
    console.log('='.repeat(80));

    results.failures.forEach((failure, index) => {
        console.log(`\nFailure #${index + 1}:`);
        console.log(`  Configuration: ${failure.config}`);
        console.log(`  Password: "${failure.password}"`);
        console.log(`  Issues:`);
        failure.issues.forEach(issue => {
            console.log(`    - Position ${issue.position}: '${issue.char}' - ${issue.issue}`);
        });
    });
} else {
    console.log('\n🎉 All passwords are cross-layout compatible!');
    console.log('Every generated password can be typed correctly on both QWERTY and AZERTY keyboards.');
}

console.log('\n' + '='.repeat(80));
console.log('CHARACTER POOL VERIFICATION');
console.log('='.repeat(80));
console.log(`Lowercase: ${layouts.common.lowercase.length} characters`);
console.log(`Uppercase: ${layouts.common.uppercase.length} characters`);
console.log(`Special: ${layouts.common.special.length} characters`);
console.log(`Total: ${layouts.common.lowercase.length + layouts.common.uppercase.length + layouts.common.special.length} characters`);
console.log('\n' + '='.repeat(80));

// Exit with appropriate code
process.exit(results.failed > 0 ? 1 : 0);
