// N3ko Italian model
// Made by andy64lol

class NekoItalianChat {
  constructor(vocabUrl = 'https://raw.githubusercontent.com/andy64lol/N3ko/main/vocab/N3ko_Italian_model_.json') {
    this.vocabulary = { intents: [] };
    this.defaultResponse = ['Miao? (Vocabulario non caricato)'];
    this.vocabUrl = vocabUrl;
    this.requestTimeout = 5000;
    this.phrasePatterns = new Map();
    this.exactMatchBonus = 2.0;
    this.minMatchThreshold = 0.65;
    this.conversationHistory = {
      messages: [],
      context: {},
      maxHistory: 5
    };
    this.fallbackAnalytics = {
      commonTriggers: new Map(),
      timing: {
        lastFallback: null,
        averageInterval: 0
      }
    };
  }

  async init() {
    try {
      await this.loadBaseVocabulary();
      return this;
    } catch (error) {
      console.error('Inizializzazione fallita:', error);
      throw error;
    }
  }

  async loadBaseVocabulary(maxRetries = 3) {
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

        const response = await fetch(this.vocabUrl, {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`Errore HTTP ${response.status}`);
        }

        const data = await response.json();
        this.validateVocabulary(data);
        this.processVocabulary(data);
        this.defaultResponse = this.getIntentResponses('default') || ['Miao?'];
        console.log('✅ Vocabulario caricato con successo');
        return;
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries) {
          console.warn(`Tentativo ${attempt} fallito, riprovo...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }
    console.error('Errore nel caricamento del vocabulario:', lastError?.message || 'errore sconosciuto');
    this.vocabulary = { intents: [] };
    this.defaultResponse = ['Miao? (Vocabulario non caricato)'];
  }

  validateVocabulary(data) {
    if (!data?.intents || !Array.isArray(data.intents)) {
      throw new Error('Formato vocabulario non valido - manca array intents');
    }
    data.intents.forEach(intent => {
      if (!intent.name || !intent.patterns || !intent.responses) {
        throw new Error(`Struttura intent non valida: ${JSON.stringify(intent)}`);
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
      "non posso": "non riesco", "sono": "io sono", "stai": "tu stai",
      "è": "e", "perché": "perche", "'": " "
    };

    return text
      .replace(/[^\w\s'-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase()
      .replace(/\b(non posso|sono|stai|è|perché|')\b/g, match => contractions[match] || match);
  }

  extractKeywords(phrase) {
    const stopWords = new Set(['un', 'una', 'il', 'la', 'e', 'o', 'è', 'sono', 'miao']);
    return phrase.split(' ')
      .filter(word => word.length > 2 && !stopWords.has(word))
      .map(word => word.replace(/'s$/, '').replace(/(ando|endo|ato|ito)$/, ''));
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
      const match = this.findMatchingIntent(userInput);
      if (match) {
        this.addToHistory(userInput, match.name);
        return this.selectResponse(match);
      }
      return this.handleFallback(userInput);
    } catch (error) {
      console.error('Errore nella generazione della risposta:', error);
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
    this.logFallback(input);
    const fallbacks = [
      "*inclina la testa* Miao? Potresti dirlo diversamente?",
      "*muove la coda* Nyaa~ Non sono sicura di capire...",
      "*zampe nell'aria* Forse prova con altre parole?",
      "*battito lento* Miao? Potresti riformulare?",
      "*orecchie abbassate* Nyaa~ Non capisco... prova ancora?",
      "*arriccia la coda* Forse chiedi qualcos'altro? (^・ω・^ )"
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }

  addToHistory(input, intent) {
    this.conversationHistory.messages.push({
      input,
      intent,
      timestamp: Date.now()
    });
    
    if (this.conversationHistory.messages.length > this.conversationHistory.maxHistory) {
      this.conversationHistory.messages.shift();
    }
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

export default NekoItalianChat;
