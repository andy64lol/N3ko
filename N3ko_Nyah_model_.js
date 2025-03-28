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
  
      this.vocabulary.intents.forEach(intent => {
        intent.processedPatterns = intent.patterns.map(pattern => 
          this.processPattern(pattern)
        );
      });
      
      this.defaultResponse = this.getIntentResponses('default') || ['Meow?'];
    } catch (error) {
      console.error('Nyan loading error:', error);
    }
  }

  processPattern(pattern) {
    return {
      original: pattern,
      normalized: this.normalizeText(pattern),
      words: this.getWords(pattern)
    };
  }

  normalizeText(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')  
      .replace(/\s+/g, ' ')      
      .trim();          
  }

  getWords(text) {
    return this.normalizeText(text)
      .split(' ')
      .filter(word => word.length > 0);
  }

  processInput(input) {
    return {
      original: input,
      normalized: this.normalizeText(input),
      words: this.getWords(input)
    };
  }

  calculateSimilarity(input, pattern) {
    if (pattern.words.length === 0) return 0;

    const inputWordSet = new Set(input.words);
    const matchingWords = pattern.words.filter(word => 
      inputWordSet.has(word)
    ).length;

    const similarity = (matchingWords / pattern.words.length) * 100;
    
    const regexMatch = input.normalized.match(new RegExp(pattern.words.join('.*'), 'i'));
    if (regexMatch && similarity < 86) {
      return Math.min(similarity + 15, 100);
    }
    
    return similarity;
  }

  findMatchingIntent(userInput) {
    const processedInput = this.processInput(userInput);
    
    for (const intent of this.vocabulary.intents) {
      for (const pattern of intent.processedPatterns) {
        const similarity = this.calculateSimilarity(processedInput, pattern);
        if (similarity >= 86) {
          return intent;
        }
      }
    }
    return null;
  }

  getIntentResponses(intentName) {
    const intent = this.vocabulary.intents.find(i => i.name === intentName);
    return intent?.responses || null;
  }

  generateResponse(userInput) {
    if (!userInput || typeof userInput !== 'string') {
      return this.getRandomResponse(this.defaultResponse);
    }
    
    const intent = this.findMatchingIntent(userInput);
    return intent?.responses 
      ? this.getRandomResponse(intent.responses)
      : this.getRandomResponse(this.defaultResponse);
  }

  getRandomResponse(responses) {
    return responses[Math.floor(Math.random() * responses.length)];
  }

  debugMatch(userInput) {
    const input = this.processInput(userInput);
    return this.vocabulary.intents.map(intent => {
      return {
        intent: intent.name,
        patterns: intent.processedPatterns.map(pattern => {
          return {
            pattern: pattern.original,
            similarity: this.calculateSimilarity(input, pattern),
            words: pattern.words,
            matches: pattern.words.filter(w => input.words.includes(w))
          };
        })
      };
    });
  }
}

module.exports = NekoNyanChat;
