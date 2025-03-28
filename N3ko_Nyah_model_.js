const fs = require('fs');
const path = require('path');

//N3ko Nyan model
//Made by andy64lol

class NekoNyanChat {
  constructor(vocabPath = 'https://raw.githubusercontent.com/andy64lol/N3ko/refs/heads/main/vocab/N3ko_Nyah_model_.json') {
    this.vocabulary = { intents: [] };
    this.defaultResponse = ['Meow? (Vocabulary not loaded)'];
    this.loadVocabulary(vocabPath);
  }

  loadVocabulary(vocabPath) {
    try {
      const fullPath = path.resolve(process.cwd(), vocabPath);
      const rawData = fs.readFileSync(fullPath, 'utf8');
      this.vocabulary = JSON.parse(rawData);
      this.defaultResponse = this.getIntentResponses('default') || ['Meow?'];
    } catch (error) {
      console.error('Nyan loading error:', error);
    }
  }

  processInput(input) {
    return input.toLowerCase().trim().replace(/[^\w\s]/gi, '');
  }

  findMatchingIntent(text) {
    return this.vocabulary.intents.find(intent => 
      intent.patterns.some(pattern => 
        text.includes(pattern.toLowerCase())
      )
    );
  }

  getIntentResponses(intentName) {
    const intent = this.vocabulary.intents.find(i => i.name === intentName);
    return intent?.responses || null;
  }

  generateResponse(userInput) {
    if (!userInput) return this.getRandomResponse(this.defaultResponse);
    const cleanText = this.processInput(userInput);
    const intent = this.findMatchingIntent(cleanText);
    return intent?.responses 
      ? this.getRandomResponse(intent.responses)
      : this.getRandomResponse(this.defaultResponse);
  }

  getRandomResponse(responses) {
    return responses[Math.floor(Math.random() * responses.length)];
  }
}

module.exports = NekoNyanChat;
