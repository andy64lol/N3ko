# N3ko - A Simple Chatbot Library for JavaScript

N3ko is a lightweight chatbot system that uses a predefined vocabulary to generate responses. It is not an AI but a pattern-matching chatbot that operates purely in the browser.

![N3ko Badge](https://img.shields.io/badge/N3ko-JavaScript-blue)

## Website

If you're looking for the website N3koChat,click this link below:

[N3koChat](https://andy64lol.github.io/N3koChat/)


## Features

- 🐱 **Predefined Vocabulary-Based Responses** - Uses a JSON vocabulary file to determine responses.
- 🎯 **Pattern Matching System** - Matches user input based on similarity to predefined patterns.
- 🌐 **Client-Side Only** - No Node.js, npm, or external dependencies required.
- 🔧 **Simple Integration** - Easily include it in any web project.

## Installation

N3ko does not require installation. Simply include the script in your project:

```html
<!-- Example using the Nyan model of N3ko,our most advanced model at the moment. -->

<script type="module" src="https://raw.githubusercontent.com/andy64lol/N3ko/refs/heads/main/N3ko_Nyan_model_.js"></script>
```

## Usage

### Basic Example

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
            
            // Initial greeting
            addMessage('bot', chat.generateResponse('hello'));
            
```


## License

APACHE 2.0 License

## Author

~Developed by Andy (andy64lol).~ **BY CATS NYEHH HEH HEH WE WILL DOMINATE EARTH.**
