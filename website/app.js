// Load keyboard layouts
var layouts = null;

// Load layouts from JSON file
function loadLayouts() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'layouts.json', true);
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4 && xhr.status === 200) {
            layouts = JSON.parse(xhr.responseText);
            updateCharacterPreview();
        }
    };
    xhr.send();
}

// DOM Elements
var passwordLength = document.getElementById('password-length');
var lengthValue = document.getElementById('length-value');
var includeLowercase = document.getElementById('include-lowercase');
var includeUppercase = document.getElementById('include-uppercase');
var includeSpecial = document.getElementById('include-special');
var generateBtn = document.getElementById('generate-btn');
var passwordOutput = document.getElementById('password-output');
var copyBtn = document.getElementById('copy-btn');
var poolSize = document.getElementById('pool-size');
var actualLength = document.getElementById('actual-length');
var entropyValue = document.getElementById('entropy-value');
var strengthBar = document.getElementById('strength-bar');
var strengthText = document.getElementById('strength-text');
var charPreview = document.getElementById('char-preview');
var toast = document.getElementById('toast');

// Event Listeners
passwordLength.addEventListener('input', function(e) {
    lengthValue.textContent = e.target.value;
});

includeLowercase.addEventListener('change', updateCharacterPreview);
includeUppercase.addEventListener('change', updateCharacterPreview);
includeSpecial.addEventListener('change', updateCharacterPreview);

generateBtn.addEventListener('click', generatePassword);
copyBtn.addEventListener('click', copyToClipboard);

// Update character preview based on current settings
function updateCharacterPreview() {
    if (!layouts) return;

    var layout = layouts.common;
    var availableChars = [];

    if (includeLowercase.checked) {
        availableChars = availableChars.concat(layout.lowercase);
    }
    if (includeUppercase.checked) {
        availableChars = availableChars.concat(layout.uppercase);
    }
    if (includeSpecial.checked) {
        availableChars = availableChars.concat(layout.special);
    }

    if (availableChars.length === 0) {
        charPreview.textContent = 'Please select at least one character type.';
        charPreview.className = 'char-display empty';
    } else {
        charPreview.textContent = availableChars.join(' ');
        charPreview.className = 'char-display';
    }
}

// Generate a secure random password
function generatePassword() {
    if (!layouts) {
        alert('Layouts are still loading. Please wait a moment and try again.');
        return;
    }

    var layout = layouts.common;
    var length = parseInt(passwordLength.value);

    // Build character pool based on selections
    var charPool = [];

    if (includeLowercase.checked) {
        charPool = charPool.concat(layout.lowercase);
    }
    if (includeUppercase.checked) {
        charPool = charPool.concat(layout.uppercase);
    }
    if (includeSpecial.checked) {
        charPool = charPool.concat(layout.special);
    }

    // Validate at least one character type is selected
    if (charPool.length === 0) {
        alert('Please select at least one character type.');
        return;
    }

    // Generate password using cryptographically secure random
    var password = '';
    var randomValues = new Uint32Array(length);
    window.crypto.getRandomValues(randomValues);

    for (var i = 0; i < length; i++) {
        var randomIndex = randomValues[i] % charPool.length;
        password += charPool[randomIndex];
    }

    // Display password
    passwordOutput.value = password;
    copyBtn.disabled = false;

    // Calculate and display entropy
    calculateEntropy(password.length, charPool.length);
}

// Calculate password entropy using E = L × Log2(R)
function calculateEntropy(L, R) {
    // E = L × Log2(R)
    // L = password length
    // R = character pool size
    var entropy = L * Math.log2(R);

    // Update display
    poolSize.textContent = R;
    actualLength.textContent = L;
    entropyValue.textContent = entropy.toFixed(2) + ' bits';

    // Update strength bar and text
    updateStrengthIndicator(entropy);
}

// Update visual strength indicator
function updateStrengthIndicator(entropy) {
    var strength = '';
    var percentage = 0;
    var color = '';

    if (entropy < 80) {
        strength = 'NOT SECURE ENOUGH - Increase length or character types';
        percentage = Math.min((entropy / 80) * 50, 50);
        color = '#d32f2f';
    } else if (entropy < 100) {
        strength = 'Acceptable - Meets minimum security requirements';
        percentage = 65;
        color = '#f57c00';
    } else if (entropy < 128) {
        strength = 'Strong - Good protection';
        percentage = 85;
        color = '#7cb342';
    } else {
        strength = 'Very Strong - Excellent protection';
        percentage = 100;
        color = '#388e3c';
    }

    strengthBar.style.width = percentage + '%';
    strengthBar.style.backgroundColor = color;
    strengthText.textContent = strength;
    strengthText.style.color = color;
}

// Copy password to clipboard
function copyToClipboard() {
    passwordOutput.select();
    passwordOutput.setSelectionRange(0, 99999); // For mobile devices

    // Try modern clipboard API first
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(passwordOutput.value).then(function() {
            showToast();
        }).catch(function(err) {
            console.error('Failed to copy:', err);
            fallbackCopy();
        });
    } else {
        fallbackCopy();
    }
}

// Fallback copy method for older browsers
function fallbackCopy() {
    try {
        document.execCommand('copy');
        showToast();
    } catch (err) {
        console.error('Failed to copy:', err);
    }
}

// Show toast notification
function showToast() {
    toast.className = 'toast show';
    setTimeout(function() {
        toast.className = 'toast';
    }, 3000);
}

// Initialize on page load
window.addEventListener('load', function() {
    loadLayouts();
});
