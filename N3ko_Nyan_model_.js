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

  async fetchWithRetry(url, retries = 3) {
    let lastError;
    for (let i = 0; i < retries; i++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!response.ok) throw new Error(`HTTP error ${response.status}`);
        return response;
      } catch (error) {
        lastError = error;
        if (i < retries - 1) await new Promise(r => setTimeout(r, 1000));
      }
    }
    throw lastError;
  }

  async loadBaseVocabulary() {
    try {
      const response = await this.fetchWithRetry(this.vocabUrl);
      const data = await response.json();
      if (!data.intents) throw new Error('Invalid vocabulary format');
      
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
    
    if (!this.specialDates[dateKey] || this.specialDates[dateKey].loaded) return;

    try {
      const specialDate = this.specialDates[dateKey];
      const response = await this.fetchWithRetry(specialDate.vocabUrl);
      const specialVocab = await response.json();
      
      if (!specialVocab.intents) throw new Error('Invalid special vocabulary format');
      
      this.mergeVocabularies(specialVocab, specialDate.priority);
      specialDate.loaded = true;
    } catch (error) {
      console.error(`Error loading special vocabulary for ${dateKey}:`, error);
    }
  }

  getDateKey(date) {
    return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  mergeVocabularies(specialVocab, priority = 0) {
    specialVocab.intents.forEach(intent => {
      intent.processedPatterns = intent.patterns.map(p => this.processPattern(p));
    });

    specialVocab.intents.forEach(specialIntent => {
      const existingIndex = this.vocabulary.intents.findIndex(i => i.name === specialIntent.name);
      
      if (existingIndex >= 0) {
        const existing = this.vocabulary.intents[existingIndex];
        if ((existing.priority || 0) < priority) {
          this.vocabulary.intents[existingIndex] = { ...specialIntent, priority };
        } else if (existing.priority === priority) {
          existing.patterns = [...new Set([...existing.patterns, ...specialIntent.patterns])];
          existing.responses = [...new Set([...existing.responses, ...specialIntent.responses])];
          existing.processedPatterns = [...existing.processedPatterns, ...specialIntent.processedPatterns];
        }
      } else {
        this.vocabulary.intents.push({ ...specialIntent, priority });
      }
    });

    if (specialVocab.intents.some(i => i.name === 'default')) {
      this.defaultResponse = this.getIntentResponses('default');
    }
  }

  processAllPatterns() {
    this.vocabulary.intents.forEach(intent => {
      intent.processedPatterns = intent.patterns.map(p => this.processPattern(p));
    });
  }

  processPattern(pattern) {
    const prefixSeparatorIndex = pattern.indexOf(':');
    const validTypes = [
      'exact', 'exact_phrase', 'exact_ins', 'phrase_ins',
      'partial', 'partial_ins', 'regex', 'regex_ins'
    ];

    let type = 'similarity';
    let value = pattern;

    if (prefixSeparatorIndex !== -1) {
      const possibleType = pattern.slice(0, prefixSeparatorIndex);
      if (validTypes.includes(possibleType)) {
        type = possibleType;
        value = pattern.slice(prefixSeparatorIndex + 1).trim();
      }
    }

    let processed;
    switch (type) {
      case 'exact':
        processed = { type, value };
        break;
      case 'exact_phrase':
        processed = { type, value };
        break;
      case 'exact_ins':
        processed = { type, value: value.toLowerCase() };
        break;
      case 'phrase_ins':
      case 'partial_ins':
        processed = { type, value: value.toLowerCase() };
        break;
      case 'partial':
        processed = { type, value };
        break;
      case 'regex':
      case 'regex_ins':
        try {
          processed = { type, value: new RegExp(value, type === 'regex_ins' ? 'i' : '') };
        } catch (e) {
          console.error(`Invalid regex pattern: ${value}`);
          processed = { type: 'invalid' };
        }
        break;
      default:
        processed = {
          type,
          normalized: this.normalizeText(value),
          words: this.getWords(value)
        };
    }

    return { original: pattern, processed };
  }

  normalizeText(text) {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  getWords(text) {
    return this.normalizeText(text).split(' ').filter(w => w.length > 0);
  }

  processInput(input) {
    return {
      original: input,
      normalized: this.normalizeText(input),
      words: this.getWords(input)
    };
  }

  checkPatternMatch(input, pattern) {
    try {
      switch (pattern.processed.type) {
        case 'exact': return input.original === pattern.processed.value;
        case 'exact_phrase': return input.original.includes(pattern.processed.value);
        case 'exact_ins': return input.normalized === pattern.processed.value;
        case 'phrase_ins': return input.normalized.includes(pattern.processed.value);
        case 'partial': return input.original.includes(pattern.processed.value);
        case 'partial_ins': return input.normalized.includes(pattern.processed.value);
        case 'regex': 
        case 'regex_ins': return pattern.processed.value.test(input.original);
        default: return false;
      }
    } catch (e) {
      console.error('Pattern match error:', e);
      return false;
    }
  }

  calculateSimilarity(input, pattern) {
    if (pattern.processed.type !== 'similarity') {
      return this.checkPatternMatch(input, pattern) ? 100 : 0;
    }

    const pp = pattern.processed;
    if (pp.words.length === 0) return 0;

    const inputWordSet = new Set(input.words);
    const matchingWords = pp.words.filter(w => inputWordSet.has(w)).length;
    let similarity = (matchingWords / pp.words.length) * 100;

    const regex = new RegExp(pp.words.join('.*'), 'i');
    if (regex.test(input.normalized)) similarity = Math.max(similarity, 65);

    if (pp.normalized.includes(input.normalized) || 
        input.normalized.includes(pp.normalized)) {
      similarity = 100;
    }

    return similarity;
  }

  findMatchingIntent(userInput) {
    const processedInput = this.processInput(userInput);
    let matches = [];

    for (const intent of this.vocabulary.intents) {
      for (const pattern of intent.processedPatterns) {
        const similarity = this.calculateSimilarity(processedInput, pattern);
        if (similarity >= 86) {
          matches.push({ intent, similarity });
        }
      }
    }

    if (matches.length > 0) {
      const exactMatches = matches.filter(m => m.similarity === 100);
      if (exactMatches.length > 0) {
        return exactMatches[Math.floor(Math.random() * exactMatches.length)].intent;
      }
      return matches.reduce((a, b) => a.similarity > b.similarity ? a : b).intent;
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
    return this.vocabulary.intents.map(intent => ({
      intent: intent.name,
      priority: intent.priority || 0,
      patterns: intent.processedPatterns.map(pattern => ({
        pattern: pattern.original,
        type: pattern.processed.type,
        similarity: this.calculateSimilarity(input, pattern),
        match: this.checkPatternMatch(input, pattern)
      }))
    }));
  }
}

export default NekoNyanChat;
