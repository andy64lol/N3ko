# N3ko - A Simple Chatbot Library for JavaScript

N3ko is a lightweight chatbot system that uses a predefined vocabulary to generate responses. It is not an AI but a pattern-matching chatbot that operates purely in the browser.

## Features

- 🐱 **Predefined Vocabulary-Based Responses** - Uses a JSON vocabulary file to determine responses.
- 🎯 **Pattern Matching System** - Matches user input based on similarity to predefined patterns.
- 🌐 **Client-Side Only** - No Node.js, npm, or external dependencies required.
- 🔧 **Simple Integration** - Easily include it in any web project.

## Installation

N3ko does not require installation. Simply include the script in your project:

```html
<script type="module" src="path/to/N3ko.js"></script>
```

## Usage

### Basic Example

```javascript
import NekoNyanChat from "./N3ko.js";

(async () => {
    const bot = await new NekoNyanChat().init();
    console.log(bot.generateResponse("Hello")); // Example response
})();
```


## License

APACHE 2.0 License

## Author

Developed by Andy (andy64lol).
