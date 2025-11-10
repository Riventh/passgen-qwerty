# Password Generator - QWERTY/AZERTY Compatible

A vanilla HTML/CSS/JavaScript password generator that creates secure passwords compatible with QWERTY and AZERTY keyboard layouts.

## Features

- **Keyboard Layout Support**: Choose between QWERTY (US) and AZERTY (French) layouts
- **Customizable Character Sets**: Select from lowercase, uppercase, numbers, and special characters
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
├── website/              # Website files (ready to deploy)
│   ├── index.html       # Main HTML structure
│   ├── app.js           # Vanilla JavaScript for password generation
│   ├── style.css        # Responsive CSS styling
│   └── layouts.json     # Keyboard layout character mappings (generated)
├── preprocessing/        # Pre-processing scripts
│   └── parse_layouts.js # Node.js script to convert XML layouts to JSON
├── data/                # Source XML keyboard layout files
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

1. Select your keyboard layout (QWERTY or AZERTY)
2. Set the desired password length using the slider
3. Choose which character types to include:
   - Lowercase letters (a-z)
   - Uppercase letters (A-Z)
   - Numbers (0-9)
   - Special characters
4. Click "Generate Password"
5. Copy the password using the copy button

### Character Availability

**QWERTY Layout:**
- Lowercase: 26 characters
- Uppercase: 26 characters
- Numbers: 10 characters
- Special: 32 characters

**AZERTY Layout:**
- Lowercase: 26 characters
- Uppercase: 26 characters
- Numbers: 10 characters
- Special: 33 characters (includes French characters: à, è, é, ê, «, », etc.)

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

If you need to update the keyboard layouts:

```bash
cd preprocessing
node parse_layouts.js
```

This will:
1. Parse the XML files in the `data/` folder
2. Generate `website/layouts.json` with the character mappings for both layouts

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
