const fs = require('fs');
const path = require('path');

class N3ko_Nyah_model_ {
  constructor(vocabPath = './vocab/N3ko_Nyah_model_.json') {
    try {
      const fullPath = path.resolve(process.cwd(), vocabPath);
      const rawData = fs.readFileSync(fullPath);
      this.vocabulary = JSON.parse(rawData);
      this.defaultResponse = this.vocabulary.intents.find(intent => intent.name === 'default')?.responses || ['Meow?'];
    } catch (error) {
      console.error('Error loading vocabulary:', error);
      this.vocabulary = { intents: [] };
      this.defaultResponse = ['Meow? (Failed to load vocabulary)'];
    }
  }

  processInput(input) {
    return input.toLowerCase().trim();
  }

  findMatchingIntent(processedInput) {
    return this.vocabulary.intents.find(intent => 
      intent.patterns.some(pattern =>
        processedInput.includes(pattern.toLowerCase())
      )
    );
  }

  generateResponse(userInput) {
    const cleanInput = this.processInput(userInput);
    const matchedIntent = this.findMatchingIntent(cleanInput);
    
    if (matchedIntent && matchedIntent.responses.length > 0) {
      const randomIndex = Math.floor(Math.random() * matchedIntent.responses.length);
      return matchedIntent.responses[randomIndex];
    }
    
    const defaultIndex = Math.floor(Math.random() * this.defaultResponse.length);
    return this.defaultResponse[defaultIndex];
  }
}

module.exports = N3ko_Nyah_model_;
