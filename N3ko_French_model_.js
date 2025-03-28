// N3ko French Model
// Adapted by andy64lol

class N3koFrenchModel {
  constructor(vocabUrl = 'https://raw.githubusercontent.com/andy64lol/N3ko/main/vocab/N3ko_Nyah_model_.json') {
    this.vocabulary = { intents: [] };
    this.defaultResponse = ['Miaou ? (Vocabulaire non chargé)'];
    this.vocabUrl = vocabUrl;
  }

  async init() {
    await this.loadVocabulary();
    return this;
  }

  async loadVocabulary() {
    try {
      const response = await fetch(this.vocabUrl);
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      this.vocabulary = await response.json();

      this.vocabulary.intents.forEach(intent => {
        intent.processedPatterns = intent.patterns.map(pattern => 
          this.processPattern(pattern)
        );
      });
      
      this.defaultResponse = this.getIntentResponses('default') || ['Miaou ?'];
    } catch (error) {
      console.error('Erreur de chargement:', error);
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
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') 
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

export default N3koFrenchModel;
