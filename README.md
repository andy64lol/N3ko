# N3ko - Multilingual Chatbot Library for JavaScript

N3ko is a comprehensive chatbot system featuring multiple language models and personality types. Each model uses pattern-matching with extensive vocabulary databases to generate culturally-aware responses in different languages and styles.

![N3ko Badge](https://img.shields.io/badge/N3ko-JavaScript-blue)

## Website

For the interactive web interface, visit:

[N3koChat](https://andy64lol.github.io/N3koChat/)

## Features

- 🌍 **7 Distinct Language Models** - Chinese, Japanese, French, Italian, Spanish, Tsundere, and English (Nyan)
- 🎭 **Unique Personalities** - Each model has culturally-appropriate responses and character traits
- 🎯 **Advanced Pattern Matching** - Sophisticated similarity algorithms for accurate intent recognition
- 🌐 **Client-Side Only** - No server dependencies, runs entirely in the browser
- 🔧 **Easy Integration** - Simple JavaScript modules for any web project

## Available Models

| Model | Language | Personality | Specialties |
|-------|----------|-------------|-------------|
| **Nyan** | English | Playful, sophisticated | General conversation, wordplay |
| **Chinese** | 中文 | Wise, cultural | Chinese history, cuisine, philosophy |
| **Japanese** | 日本語 | Kawaii, polite | Anime, culture, technology |
| **French** | Français | Elegant, refined | Art, cuisine, literature |
| **Italian** | Italiano | Passionate, dramatic | Food, art, opera |
| **Spanish** | Español | Warm, expressive | Culture, sports, traditions |
| **Tsundere** | Mixed | Shy, contradictory | Anime-style responses |

## Installation

N3ko does not require installation. Simply include the script in your project:

```html
<!-- Example using different N3ko models -->

<!-- English (Nyan) Model - Most comprehensive -->
<script type="module" src="https://raw.githubusercontent.com/andy64lol/N3ko/refs/heads/main/N3ko_Nyan_model_.js"></script>

<!-- Chinese Model -->
<script type="module" src="https://raw.githubusercontent.com/andy64lol/N3ko/refs/heads/main/N3ko_Chinese_model_.js"></script>

<!-- Japanese Model -->
<script type="module" src="https://raw.githubusercontent.com/andy64lol/N3ko/refs/heads/main/N3ko_Japanese_model_.js"></script>

<!-- French Model -->
<script type="module" src="https://raw.githubusercontent.com/andy64lol/N3ko/refs/heads/main/N3ko_French_model_.js"></script>

<!-- Italian Model -->
<script type="module" src="https://raw.githubusercontent.com/andy64lol/N3ko/refs/heads/main/N3ko_Italian_model_.js"></script>

<!-- Spanish Model -->
<script type="module" src="https://raw.githubusercontent.com/andy64lol/N3ko/refs/heads/main/N3ko_Spanish_model_.js"></script>

<!-- Tsundere Model -->
<script type="module" src="https://raw.githubusercontent.com/andy64lol/N3ko/refs/heads/main/N3ko_Tsundere_model_.js"></script>
```

## Usage

### Basic Example (English/Nyan Model)

```javascript
async function loadNekoNyanChat() {
    const response = await fetch('https://raw.githubusercontent.com/andy64lol/N3ko/refs/heads/main/N3ko_Nyan_model_.js');
    const scriptText = await response.text();
    const scriptBlob = new Blob([scriptText], { type: 'application/javascript' });
    const scriptUrl = URL.createObjectURL(scriptBlob);
    const module = await import(scriptUrl);
    return module.default;
}

(async function() {
    const NekoNyanChat = await loadNekoNyanChat();
    const chat = new NekoNyanChat();
    
    // Wait for vocabulary to load
    await chat.init();
    
    // Test multilingual input
    console.log(chat.generateResponse('hello')); // English
    console.log(chat.generateResponse('bonjour')); // French greeting
    console.log(chat.generateResponse('hola')); // Spanish greeting
    console.log(chat.generateResponse('你好')); // Chinese greeting
})();
```

### Multi-Language Example

```javascript
// Load different language models
async function loadLanguageModels() {
    const models = {};
    
    // Load Chinese model
    const chineseResponse = await fetch('https://raw.githubusercontent.com/andy64lol/N3ko/refs/heads/main/N3ko_Chinese_model_.js');
    const chineseScript = await chineseResponse.text();
    const chineseBlob = new Blob([chineseScript], { type: 'application/javascript' });
    const chineseUrl = URL.createObjectURL(chineseBlob);
    const ChineseModule = await import(chineseUrl);
    models.chinese = new ChineseModule.default();
    
    // Load Japanese model
    const japaneseResponse = await fetch('https://raw.githubusercontent.com/andy64lol/N3ko/refs/heads/main/N3ko_Japanese_model_.js');
    const japaneseScript = await japaneseResponse.text();
    const japaneseBlob = new Blob([japaneseScript], { type: 'application/javascript' });
    const japaneseUrl = URL.createObjectURL(japaneseBlob);
    const JapaneseModule = await import(japaneseUrl);
    models.japanese = new JapaneseModule.default();
    
    // Initialize all models
    await Promise.all([
        models.chinese.init(),
        models.japanese.init()
    ]);
    
    return models;
}

// Usage
(async function() {
    const models = await loadLanguageModels();
    
    // Chinese model responds in Chinese style
    console.log(models.chinese.generateResponse('你好')); 
    console.log(models.chinese.generateResponse('hello')); // Still responds in Chinese style
    
    // Japanese model responds in Japanese style
    console.log(models.japanese.generateResponse('こんにちは'));
    console.log(models.japanese.generateResponse('hello')); // Still responds in Japanese style
})();
```

## Model Features

### Cross-Language Recognition
Each model can understand inputs in multiple languages but responds in its native style:

```javascript
// French model example
const frenchChat = new NekoFrenchChat();
await frenchChat.init();

console.log(frenchChat.generateResponse('hello')); // Responds in French style
console.log(frenchChat.generateResponse('hola')); // Responds in French style  
console.log(frenchChat.generateResponse('bonjour')); // Responds in French style
```

### Cultural Content
Models include extensive cultural knowledge:

```javascript
// Italian model knows about Italian culture
console.log(italianChat.generateResponse('pizza')); // Italian pizza expertise
console.log(italianChat.generateResponse('roma')); // Roman history and culture
console.log(italianChat.generateResponse('opera')); // Italian opera knowledge

// Chinese model knows about Chinese culture  
console.log(chineseChat.generateResponse('功夫')); // Kung fu knowledge
console.log(chineseChat.generateResponse('茶')); // Tea culture
console.log(chineseChat.generateResponse('长城')); // Great Wall information
```

### Personality Traits
Each model has distinct personality characteristics:

- **Nyan (English)**: Playful, sophisticated, loves wordplay
- **Chinese**: Wise, philosophical, culturally knowledgeable  
- **Japanese**: Kawaii, polite, anime-aware
- **French**: Elegant, refined, artistically inclined
- **Italian**: Passionate, dramatic, food-loving
- **Spanish**: Warm, expressive, culturally proud
- **Tsundere**: Contradictory, shy but caring, anime-style responses


## License

APACHE 2.0 License

## Author

~Developed by Andy (andy64lol).~ **BY CATS NYEHH HEH HEH WE WILL DOMINATE EARTH.**
