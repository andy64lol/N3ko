//N3ko Nyan model
//made by andy64lol

class NekoNyanChat {
  constructor(vocabUrl = 'https://raw.githubusercontent.com/andy64lol/N3ko/main/vocab/N3ko_Nyan_model_.json') {
    this.vocabulary = { intents: [] };
    this.defaultResponse = ['Meow? (Vocabulary not loaded)'];
    this.vocabUrl = vocabUrl;
    this.specialDates = {
      '03-24': {
        vocabUrl: 'https://raw.githubusercontent.com/andy64lol/N3ko/refs/heads/main/vocab/additional/N3ko_Birthday_additional_.json',
        priority: 1,
        loaded: false
      },
      '12-25': {
        vocabUrl: 'https://raw.githubusercontent.com/andy64lol/N3ko/refs/heads/main/vocab/additional/N3ko_Xmas_additional_.json',
        priority: 2,
        loaded: false
      }
    };
    this.requestTimeout = 1000; 
  }

  async init() {
    try {
      await Promise.all([
        this.loadBaseVocabulary(),
        this.loadDateSpecificVocabulary()
      ]);
      return this;
    } catch (error) {
      console.error('Initialization failed:', error);
      throw error;
    }
  }

  async loadBaseVocabulary() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);
      
      const response = await fetch(this.vocabUrl, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data = await response.json();
      if (!data.intents) {
        throw new Error('Invalid vocabulary format');
      }

      this.vocabulary = data;
      this.processAllPatterns();
      this.defaultResponse = this.getIntentResponses('default') || ['Meow?'];
    } catch (error) {
      console.error('Failed to load base vocabulary:', error);
      throw error;
    }
  }

  async loadDateSpecificVocabulary() {
    const today = new Date();
    const dateKey = this.getDateKey(today);
    
    if (!this.specialDates[dateKey] || this.specialDates[dateKey].loaded) {
      return;
    }

    try {
      const specialDate = this.specialDates[dateKey];
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);
      
      const response = await fetch(specialDate.vocabUrl, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const specialVocab = await response.json();
      if (!specialVocab.intents) {
        throw new Error('Invalid special vocabulary format');
      }

      this.mergeVocabularies(specialVocab, specialDate.priority);
      specialDate.loaded = true;
      console.log(`Loaded special vocabulary for ${dateKey}`);
    } catch (error) {
      console.error(`Error loading special vocabulary for ${dateKey}:`, error);
    }
  }

  getDateKey(date) {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${month}-${day}`;
  }

  mergeVocabularies(specialVocab, priority = 0) {
    specialVocab.intents.forEach(intent => {
      intent.processedPatterns = intent.patterns.map(pattern => 
        this.processPattern(pattern)
      );
    });

    specialVocab.intents.forEach(specialIntent => {
      const existingIntentIndex = this.vocabulary.intents.findIndex(
        intent => intent.name === specialIntent.name
      );
      
      if (existingIntentIndex >= 0) {
        const existingIntent = this.vocabulary.intents[existingIntentIndex];
        
        if ((existingIntent.priority || 0) < priority) {
          this.vocabulary.intents[existingIntentIndex] = {
            ...specialIntent,
            priority
          };
        } else if ((existingIntent.priority || 0) === priority) {
          existingIntent.patterns = [
            ...new Set([...existingIntent.patterns, ...specialIntent.patterns])
          ];
          existingIntent.responses = [
            ...new Set([...existingIntent.responses, ...specialIntent.responses])
          ];
          existingIntent.processedPatterns = [
            ...existingIntent.processedPatterns,
            ...specialIntent.processedPatterns
          ];
        }
      } else {
        this.vocabulary.intents.push({
          ...specialIntent,
          priority
        });
      }
    });

    if (specialVocab.intents.some(i => i.name === 'default')) {
      this.defaultResponse = this.getIntentResponses('default');
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
  const presenceScore = (matchingWords / pattern.words.length) * 100;

  let patternIndex = 0;
  for (const word of input.words) {
    if (patternIndex < pattern.words.length && word === pattern.words[patternIndex]) {
      patternIndex++;
    }
  }
  const orderScore = (patternIndex / pattern.words.length) * 100;

  let similarity;
  if (presenceScore < 100) {
    similarity = presenceScore;
  } else {
    similarity = orderScore; 
  }

  const regex = new RegExp(pattern.words.join('\\s+'), 'i');
  const regexMatch = input.normalized.match(regex);
  if (regexMatch) {
    similarity = Math.max(similarity, 90); 
  }

  if (pattern.normalized === input.normalized) {
    similarity = 100;
  }

  return similarity;
}

findMatchingIntent(userInput) {
  const processedInput = this.processInput(userInput);
  
  for (const intent of this.vocabulary.intents) {
    for (const pattern of intent.processedPatterns) {
      const similarity = this.calculateSimilarity(processedInput, pattern);
      if (similarity >= 87) { 
        return intent;
      }
    }
  }
  return null;
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
    
    try {
      const intent = this.findMatchingIntent(userInput);
      return intent?.responses 
        ? this.getRandomResponse(intent.responses)
        : this.getRandomResponse(this.defaultResponse);
    } catch (error) {
      console.error('Error generating response:', error);
      return this.getRandomResponse(this.defaultResponse);
    }
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

export default NekoNyanChat;
