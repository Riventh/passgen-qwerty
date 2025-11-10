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
    { lowercase: true, uppercase: false, special: false, name: 'Lowercase only', count: 25 },
    { lowercase: false, uppercase: true, special: false, name: 'Uppercase only', count: 25 },
    { lowercase: true, uppercase: true, special: false, name: 'Mixed case (lowercase + uppercase)', count: 50 },
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

    for (let i = 0; i < config.count; i++) {
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
    console.log(` (${config.count} passwords tested)`);
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

// NEGATIVE TESTS - Verify test suite catches incompatible passwords
console.log('NEGATIVE TEST CASES (Verifying Test Suite Correctness)');
console.log('='.repeat(80));
console.log('\nTesting passwords with INCOMPATIBLE characters (should FAIL):\n');

const negativeTests = [
    { password: 'Password', reason: 'Contains letter "a" at different physical position' },
    { password: 'quick', reason: 'Contains letter "q" at different physical position' },
    { password: 'window', reason: 'Contains letter "w" at different physical position' },
    { password: 'puzzle', reason: 'Contains letter "z" at different physical position' },
    { password: 'example', reason: 'Contains letters "a" and "m" at different physical positions' },
    { password: 'Test123', reason: 'Contains numbers 1,2,3 at different physical positions' },
    { password: 'user@host', reason: 'Contains @ symbol with different modifier states' },
    { password: 'Pass#word', reason: 'Contains # symbol and letters at incompatible positions' },
    { password: 'Hello!World', reason: 'Contains ! and letters at incompatible positions' },
    { password: '0123456789', reason: 'All numbers - completely incompatible' }
];

let negativePassedCorrectly = 0;
let negativeFailedIncorrectly = 0;

negativeTests.forEach((test, index) => {
    const verification = verifyPassword(test.password);

    // For negative tests, we EXPECT them to fail (not be valid)
    if (!verification.valid) {
        negativePassedCorrectly++;
        console.log(`✓ Test ${index + 1}: "${test.password}"`);
        console.log(`  Expected: FAIL - ${test.reason}`);
        console.log(`  Result: CORRECTLY FAILED`);
        verification.issues.slice(0, 3).forEach(issue => {
            console.log(`    - Position ${issue.position}: '${issue.char}' - ${issue.issue}`);
        });
        if (verification.issues.length > 3) {
            console.log(`    ... and ${verification.issues.length - 3} more issues`);
        }
    } else {
        negativeFailedIncorrectly++;
        console.log(`✗ Test ${index + 1}: "${test.password}"`);
        console.log(`  Expected: FAIL - ${test.reason}`);
        console.log(`  Result: INCORRECTLY PASSED (Bug in test suite!)`);
    }
    console.log('');
});

console.log('='.repeat(80));
console.log('NEGATIVE TEST RESULTS');
console.log('='.repeat(80));
console.log(`Total negative tests: ${negativeTests.length}`);
console.log(`✓ Correctly failed: ${negativePassedCorrectly} (${(negativePassedCorrectly / negativeTests.length * 100).toFixed(1)}%)`);
console.log(`✗ Incorrectly passed: ${negativeFailedIncorrectly} (${(negativeFailedIncorrectly / negativeTests.length * 100).toFixed(1)}%)`);

if (negativeFailedIncorrectly > 0) {
    console.log('\n⚠ WARNING: Test suite has bugs! Some incompatible passwords passed validation.');
    process.exit(1);
} else {
    console.log('\n✓ Test suite is working correctly! All incompatible passwords were rejected.');
}

console.log('\n' + '='.repeat(80));

// Exit with appropriate code
const allTestsPassed = results.failed === 0 && negativeFailedIncorrectly === 0;
process.exit(allTestsPassed ? 0 : 1);
