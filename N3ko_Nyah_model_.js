//N3ko Nyan model
//Made by andy64lol

const fs = require('fs');
const path = require('path');

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
      // Preprocess patterns during loading
      this.vocabulary.intents.forEach(intent => {
        intent.patterns = intent.patterns.map(pattern => this.processInput(pattern));
      });
      this.defaultResponse = this.getIntentResponses('default') || ['Meow?'];
    } catch (error) {
      console.error('Nyan loading error:', error);
    }
  }

  processInput(input) {
    return input.toLowerCase().trim().replace(/[^\w\s]/gi, '');
  }

  calculateSimilarity(inputStr, patternStr) {
    const inputWords = new Set(inputStr.split(/\s+/));
    const patternWords = patternStr.split(/\s+/);
    if (patternWords.length === 0) return 0;
    const commonWords = patternWords.filter(word => inputWords.has(word)).length;
    return (commonWords / patternWords.length) * 100;
  }

  findMatchingIntent(text) {
    return this.vocabulary.intents.find(intent => 
      intent.patterns.some(pattern => {
        const similarity = this.calculateSimilarity(text, pattern);
        return similarity >= 86;
      })
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
