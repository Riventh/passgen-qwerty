# Password Generator - Cross-Layout Compatible

A vanilla HTML/CSS/JavaScript password generator that creates secure passwords using only characters that are in the **same physical position** on both QWERTY and AZERTY keyboard layouts.

## Key Concept

This generator ensures your password can be typed correctly on **both QWERTY and AZERTY keyboards** without switching layouts. It analyzes both keyboard layouts and only uses characters that produce the same result at the same key position on both layouts.

## Features

- **Cross-Layout Compatibility**: Uses only characters at the SAME PHYSICAL KEY POSITION on both QWERTY and AZERTY
- **Character Analysis** (based on physical scan codes):
  - ✅ 21 letters are compatible: **bcdefghijklnoprstuvxy** (and uppercase)
  - ❌ 5 letters excluded: **a, m, q, w, z** (different physical positions due to layout differences)
  - ❌ Numbers 0-9 are **NOT** compatible (different positions)
  - ❌ Special characters are **NOT** compatible (require different modifier keys/states)
- **Customizable Character Sets**: Select from lowercase and uppercase letters
- **Adjustable Length**: Generate passwords from 4 to 128 characters
- **Entropy Calculation**: Real-time password strength calculation using the formula `E = L × Log₂(R)`
  - E = Entropy (in bits)
  - L = Password length (number of characters)
  - R = Character pool size (number of possible character types)
- **Visual Strength Indicator**: Color-coded strength bar with descriptions
- **Cryptographically Secure**: Uses `crypto.getRandomValues()` for secure random generation
- **Copy to Clipboard**: One-click password copying with visual feedback
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **No Dependencies**: Pure vanilla HTML, CSS, and JavaScript

## Project Structure

```
passgen_qwerty/
├── website/                       # Website files (ready to deploy)
│   ├── index.html                # Main HTML structure
│   ├── app.js                    # Vanilla JavaScript for password generation
│   ├── style.css                 # Responsive CSS styling
│   └── layouts.json              # Keyboard layout character mappings (generated)
├── preprocessing/                 # Pre-processing scripts
│   ├── parse_layouts.js          # Original parser (per-layout)
│   ├── parse_layouts_common.js   # Cross-layout parser (finds common chars)
│   └── test_cross_layout.js      # JavaScript validation tests (100 passwords)
├── tests/                         # Python keyboard input tests
│   ├── test_real_keyboard.py     # Real keyboard simulation test suite
│   ├── requirements.txt          # Python dependencies
│   ├── venv/                     # Virtual environment
│   └── README.md                 # Test documentation
├── data/                          # Source XML keyboard layout files
│   ├── us_qwerty_layout.xml
│   └── french_azerty_standard.xml
└── README.md
```

## Usage

### Viewing the Website

Simply open `website/index.html` in any modern web browser:

```bash
# Option 1: Direct file
open website/index.html

# Option 2: Local server (recommended)
cd website
python3 -m http.server 8080
# Then navigate to http://localhost:8080
```

### Generating Passwords

1. Set the desired password length using the slider (4-128 characters)
2. Choose which character types to include:
   - Lowercase letters (bcdefghijklnoprstuvxy) - 21 characters
   - Uppercase letters (BCDEFGHIJKLNOPRSTUVXY) - 21 characters
3. Click "Generate Password"
4. Copy the password using the copy button

### Available Characters (Cross-Layout Compatible)

**Compatible on BOTH QWERTY and AZERTY** (same physical key position):
- Lowercase letters: `bcdefghijklnoprstuvxy` (21 chars)
- Uppercase letters: `BCDEFGHIJKLNOPRSTUVXY` (21 chars)

**NOT Compatible (excluded from generation):**
- Letters `a, m, q, w, z`: These are at different physical key positions on QWERTY vs AZERTY
- Numbers `0-9`: Different physical key positions
- All special characters: Require different modifier states (AltGr) between layouts

## Entropy Strength Guide

The password strength is calculated and categorized as follows:

- **< 80 bits**: NOT SECURE ENOUGH (displayed in red) - Increase length or character types
- **80-99 bits**: Acceptable - Meets minimum security requirements (ANSSI recommendation)
- **100-127 bits**: Strong - Good protection
- **≥ 128 bits**: Very Strong - Excellent protection

### Security Standards

According to [ANSSI](https://cyber.gouv.fr/sites/default/files/2021/10/anssi-guide-authentification_multifacteur_et_mots_de_passe.pdf) (Agence Nationale de la Sécurité des Systèmes d'Information), the minimum recommended entropy for secure passwords is **80 bits**. For good protection, aim for **100+ bits** of entropy.

## Development

### Converting XML Layouts to JSON

The project includes two parsing scripts:

**1. Cross-Layout Parser (Current Active Version)**
```bash
cd preprocessing
node parse_layouts_common.js
```

This will:
- Analyze both QWERTY and AZERTY XML layouts
- Find only characters in identical positions on both keyboards
- Generate `website/layouts.json` with the common character set
- Display a report of compatible and incompatible characters

**2. Individual Layout Parser (Original)**
```bash
cd preprocessing
node parse_layouts.js
```

This generates separate character sets for each layout (not used in current version).

### Testing Cross-Layout Compatibility

The project includes two comprehensive test suites to verify password compatibility:

#### 1. JavaScript Character Validation Test

Tests password generation logic and character mapping:

```bash
cd preprocessing
node test_cross_layout.js
```

This test:
- Generates 100 random passwords with various configurations
- Validates each character exists at the same key position on both layouts
- Checks virtual key mappings match across QWERTY and AZERTY
- Reports detailed incompatibilities if found

**Results:** ✓ 100/100 passwords pass

#### 2. Python Keyboard Input Simulation Test

Tests with real keyboard simulation using Python:

```bash
cd tests
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python test_real_keyboard.py
```

This test:
- Validates passwords using character set verification
- Simulates keyboard layout switching (on Linux X11)
- Tests 100 passwords across 5 different configurations
- Ensures cross-layout compatibility at the input level

**Results:** ✓ 100/100 passwords pass

Both test suites confirm that all generated passwords are cross-layout compatible.

## Source Layouts

- [French AZERTY Layout](https://kbdlayout.info/KBDFRNA/download/kbdtables)
- [US QWERTY Layout](https://kbdlayout.info/KBDUSEUR/download/kbdtables)

## Browser Compatibility

Works with all modern browsers that support:
- `crypto.getRandomValues()` (IE11+, all modern browsers)
- `Math.log2()` (IE Edge+, all modern browsers)
- ES5 JavaScript

## References

### Entropy Calculation
- [What is Password Entropy?](https://proton.me/blog/what-is-password-entropy) - Proton Blog
  - Explains the concept of password entropy and how it's calculated using the formula E = L × Log₂(R)

### Security Standards
- [ANSSI - Guide Authentification Multifacteur et Mots de Passe](https://cyber.gouv.fr/sites/default/files/2021/10/anssi-guide-authentification_multifacteur_et_mots_de_passe.pdf) (PDF)
  - French cybersecurity agency recommendations for password security
  - Recommends minimum 80 bits of entropy for secure passwords

### Keyboard Layouts
- [French AZERTY Layout](https://kbdlayout.info/KBDFRNA/download/kbdtables)
- [US QWERTY Layout](https://kbdlayout.info/KBDUSEUR/download/kbdtables)

## License

This project is provided as-is for password generation purposes.
