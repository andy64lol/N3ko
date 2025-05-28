// N3ko French model
// Made by andy64lol

class NekoFrenchChat {
  constructor(vocabUrl = 'https://raw.githubusercontent.com/andy64lol/N3ko/main/vocab/N3ko_French_model_.json') {
    this.vocabulary = { intents: [] };
    this.defaultResponse = ['Miaou? (Vocabulaire non chargé)'];
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
    await this.loadBaseVocabulary();
    return this;
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
          throw new Error(`Erreur HTTP ${response.status}`);
        }

        const data = await response.json();
        this.validateVocabulary(data);
        this.processVocabulary(data);
        this.defaultResponse = this.getIntentResponses('default') || ['Miaou?'];
        console.log('✅ Vocabulaire chargé avec succès');
        return;
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries) {
          console.warn(`Tentative ${attempt} échouée, nouvelle tentative...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }
    console.error('Erreur lors du chargement du vocabulaire:', lastError?.message || 'erreur inconnue');
    this.vocabulary = { intents: [] };
    this.defaultResponse = ['Miaou? (Vocabulaire non chargé)'];
  }

  validateVocabulary(data) {
    if (!data?.intents || !Array.isArray(data.intents)) {
      throw new Error('Format de vocabulaire invalide - tableau d\'intents manquant');
    }
    data.intents.forEach(intent => {
      if (!intent.name || !intent.patterns || !intent.responses) {
        throw new Error(`Structure d'intent invalide: ${JSON.stringify(intent)}`);
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
      "n'ai": "ne ai", "n'est": "ne est", "j'ai": "je ai",
      "c'est": "ce est", "qu'est": "que est", "d'": "de "
    };

    return text
      .replace(/[^\w\s'-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase()
      .replace(/\b(n'ai|n'est|j'ai|c'est|qu'est|d')\b/g, match => contractions[match] || match);
  }

  extractKeywords(phrase) {
    const stopWords = new Set(['un', 'une', 'le', 'la', 'et', 'ou', 'est', 'sont', 'miaou']);
    return phrase.split(' ')
      .filter(word => word.length > 2 && !stopWords.has(word))
      .map(word => word.replace(/'s$/, '').replace(/(ant|ent|er|ir)$/, ''));
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
      console.error('Erreur lors de la génération de réponse:', error);
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
      "*incline la tête* Miaou? Pourrais-tu le dire différemment?",
      "*remue la queue* Nyaa~ Je ne suis pas sûre de comprendre...",
      "*pattes dans l'air* Peut-être essayer avec d'autres mots?",
      "*clignement lent* Miaou? Pourrais-tu reformuler?",
      "*oreilles baissées* Nyaa~ Je ne comprends pas... essaie encore?",
      "*enroule la queue* Peut-être demander autre chose? (^・ω・^ )"
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

export default NekoFrenchChat;
