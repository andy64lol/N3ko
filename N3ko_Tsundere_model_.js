// N3ko Tsundere model
// Made by andy64lol

class NekoTsundereChat {
  constructor(vocabUrl = 'https://raw.githubusercontent.com/andy64lol/N3ko/main/vocab/N3ko_Tsundere_model_.json') {
    this.vocabulary = { intents: [] };
    this.defaultResponse = ['Baka... (Vocabulary not loaded)'];
    this.vocabUrl = vocabUrl;
  }

  async init() {
    await this.loadBaseVocabulary();
    return this;
  }

  async loadBaseVocabulary() {
    try {
      const response = await fetch(this.vocabUrl);
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      this.vocabulary = await response.json();
      this.processAllPatterns();
      this.defaultResponse = this.getIntentResponses('default') || ['Meow?'];
    } catch (error) {
      console.error('Nyan loading error:', error);
    }
  }

  processAllPatterns() {
    this.vocabulary.intents.forEach(intent => {
      intent.processedPatterns = intent.patterns.map(pattern => 
        this.processPattern(pattern)
      );
    });
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

    let similarity = (matchingWords / pattern.words.length) * 100;

    const regex = new RegExp(pattern.words.join('.*'), 'i');
    const regexMatch = input.normalized.match(regex);
    if (regexMatch) {
        similarity = Math.max(similarity, 65); 
    }

    if (
        pattern.normalized.includes(input.normalized) ||
        input.normalized.includes(pattern.normalized)
    ) {
        similarity = 100;
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
        priority: intent.priority || 0,
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

export default NekoTsundereChat;
