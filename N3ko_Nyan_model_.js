// N3ko Nyan model
// made by andy64lol

class NekoNyanChat {
  constructor(vocabUrl = 'https://raw.githubusercontent.com/andy64lol/N3ko/main/vocab/N3ko_Nyan_model_.json') {
    this.vocabulary = { intents: [] };
    this.defaultResponse = ['Meow? (Vocabulary not loaded)'];
    this.vocabUrl = vocabUrl;
    this.conversationHistory = {
      messages: [],
      context: {},
      maxHistory: 5
    };
    this.contextualFallbacks = {
      recentTopics: [],
      lastIntent: null,
      fallbackCount: 0
    };
    this.fallbackAnalytics = {
      commonTriggers: new Map(),
      timing: {
        lastFallback: null,
        averageInterval: 0
      }
    };
    this.specialDates = {
      '03-24': {
        vocabUrl: 'https://raw.githubusercontent.com/andy64lol/N3ko/main/vocab/additional/N3ko_Birthday_additional_.json',
        priority: 1,
        loaded: false
      },
      '12-25': {
        vocabUrl: 'https://raw.githubusercontent.com/andy64lol/N3ko/main/vocab/additional/N3ko_Xmas_additional_.json',
        priority: 2,
        loaded: false
      }
    };
    this.requestTimeout = 1000;
    this.phrasePatterns = new Map();
    this.exactMatchBonus = 2.0;
    this.minMatchThreshold = 0.65;
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

  async loadBaseVocabulary(maxRetries = 3) {
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);
        const response = await fetch(this.vocabUrl, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (!response.ok) throw new Error(`HTTP error ${response.status}`);
        
        const data = await response.json();
        this.validateVocabulary(data);
        this.processVocabulary(data);
        this.defaultResponse = this.getIntentResponses('default') || ['Meow?'];
        console.log('✅ Loaded vocabulary from remote');
        return;
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries) await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    console.error('Falling back to empty vocabulary');
    this.vocabulary = { intents: [] };
    this.defaultResponse = ['Meow? (Vocabulary not loaded)'];
  }

  validateVocabulary(data) {
    if (!data?.intents || !Array.isArray(data.intents)) {
      throw new Error('Invalid vocabulary format - missing intents array');
    }
    data.intents.forEach(intent => {
      if (!intent.name || !intent.patterns || !intent.responses) {
        throw new Error(`Invalid intent structure: ${JSON.stringify(intent)}`);
      }
    });
  }

  processVocabulary(data) {
    this.phrasePatterns.clear();
    data.intents.forEach(intent => {
      intent.patterns.forEach(pattern => {
        const processed = this.processPattern(pattern);
        const key = processed.normalized;
        
        if (!this.phrasePatterns.has(key)) {
          this.phrasePatterns.set(key, {
            intent: intent.name,
            original: pattern,
            keywords: processed.keywords,
            count: 0
          });
        }
        this.phrasePatterns.get(key).count++;
      });
    });
    this.vocabulary = data;
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
      this.processVocabulary(this.vocabulary);
      console.log(`🎉 Loaded special vocabulary for ${dateKey}`);
    } catch (error) {
      console.error(`😿 Error loading special vocabulary for ${dateKey}:`, error);
    }
  }

  getDateKey(date) {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${month}-${day}`;
  }

  mergeVocabularies(specialVocab, priority = 0) {
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

  processPattern(pattern) {
    const normalized = this.normalizeText(pattern);
    return {
      original: pattern,
      normalized: normalized,
      keywords: this.extractKeywords(normalized)
    };
  }

  normalizeText(text) {
    const contractions = {
      "won't": "will not", "can't": "cannot", "i'm": "i am",
      "you're": "you are", "it's": "it is", "that's": "that is",
      "n't": " not", "'re": " are", "'ll": " will", "'ve": " have"
    };

    return text
      .replace(/[^\w\s'-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase()
      .replace(/\b(won't|can't|i'm|you're|it's|that's|n't|'re|'ll|'ve)\b/g, match => contractions[match]);
  }

  extractKeywords(phrase) {
    const stopWords = new Set(['a', 'an', 'the', 'and', 'or', 'is', 'are', 'meow']);
    return phrase.split(' ')
      .filter(word => word.length > 2 && !stopWords.has(word))
      .map(word => word.replace(/'s$/, '').replace(/(ing|ed|s)$/, ''));
  }

  processInput(input) {
    const normalized = this.normalizeText(input);
    return {
      original: input,
      normalized: normalized,
      keywords: this.extractKeywords(normalized)
    };
  }

  findMatchingIntent(userInput) {
    const processed = this.processInput(userInput);
    if (processed.keywords.length === 0) return null;

    let bestMatch = { score: 0, intent: null };

    if (this.phrasePatterns.has(processed.normalized)) {
      const exactMatch = this.phrasePatterns.get(processed.normalized);
      return {
        name: exactMatch.intent,
        confidence: 1.0,
        matchedPhrase: exactMatch.original
      };
    }

    for (const [, data] of this.phrasePatterns) {
      const similarity = this.calculateSimilarity(processed.keywords, data.keywords);
      const score = similarity + (data.count * 0.1);
      
      if (score > bestMatch.score) {
        bestMatch = { score, intent: data.intent };
      }
    }

    return bestMatch.score >= this.minMatchThreshold 
      ? { name: bestMatch.intent, confidence: bestMatch.score }
      : null;
  }

  calculateSimilarity(inputKeywords, patternKeywords) {
    const common = inputKeywords.filter(k => patternKeywords.includes(k)).length;
    const total = new Set([...inputKeywords, ...patternKeywords]).size;
    return total > 0 ? common / total : 0;
  }

  getIntentResponses(intentName) {
    const intent = this.vocabulary.intents.find(i => i.name === intentName);
    return intent?.responses || null;
  }

  generateResponse(userInput) {
    if (!userInput || typeof userInput !== 'string') {
      return this.handleFallback();
    }

    try {
      const processed = this.processInput(userInput);
      const match = this.findMatchingIntent(userInput);
      
      if (match) {
        this.contextualFallbacks.lastIntent = match.name;
        this.contextualFallbacks.fallbackCount = 0;
        return this.selectResponse(match);
      }
      
      return this.handleFallback(userInput);
    } catch (error) {
      console.error('Response generation error:', error);
      return this.handleFallback();
    }
  }

  selectResponse(match) {
    const intent = this.vocabulary.intents.find(i => i.name === match.name);
    if (!intent) return this.defaultResponse;
    
    const responses = match.confidence >= 0.85 
      ? intent.responses
      : intent.responses.filter(r => r.includes('?') || intent.responses);
    
    return responses[Math.floor(Math.random() * responses.length)];
  }

  handleFallback(input) {
    this.contextualFallbacks.fallbackCount++;
    this.logFallback(input);
    
    const fallbacks = [
      "*tilts head* Meow? Could you say that differently?",
      "*tail flick* Nyaa~ Not sure I understand...",
      "*paws at air* Maybe try different words?",
      "*slow blink* Meow? Could you rephrase that?",
      "*ears droop* Nyaa~ I don't understand... try again?",
      "*curls tail* Maybe ask something else? (^・ω・^ )"
    ];
    
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }

  logFallback(input) {
    if (!input) return;
    const keywords = this.processInput(input).keywords;
    keywords.forEach(word => {
      this.fallbackAnalytics.commonTriggers.set(word, 
        (this.fallbackAnalytics.commonTriggers.get(word) || 0) + 1);
    });
    this.fallbackAnalytics.timing.lastFallback = Date.now();
  }

  getRandomResponse(responses) {
    return responses[Math.floor(Math.random() * responses.length)];
  }

  getConversationHistory() {
    return {
      messages: [...this.conversationHistory.messages],
      context: {...this.conversationHistory.context}
    };
  }
}

export default NekoNyanChat;
