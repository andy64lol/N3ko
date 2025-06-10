// N3ko Dogo model
// Made by andy64lol

class NekoDogoChat {
  constructor(vocabUrl = 'https://raw.githubusercontent.com/andy64lol/N3ko/main/vocab/N3ko_Dogo_model_.json') {
    this.vocabulary = { intents: [] };
    this.defaultResponse = ['Woof? (Vocabulary not loaded)'];
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
          throw new Error(`HTTP error ${response.status}`);
        }

        const data = await response.json();
        this.validateVocabulary(data);
        this.vocabulary = data;
        this.processAllPatterns();
        this.defaultResponse = this.getIntentResponses('default') || ['Miau? (Default response missing)'];
        console.log('✅ Vocabulario cargado exitosamente');
        return;
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries) {
          console.warn(`Intento ${attempt} falló, reintentando...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }
    console.error('Error al cargar vocabulario:', lastError?.message || 'error desconocido');
    this.vocabulary = { intents: [] };
    this.defaultResponse = ['Miau? (Vocabulario no cargado)'];
  }

  validateVocabulary(data) {
    if (!data?.intents || !Array.isArray(data.intents)) {
      throw new Error('Formato de vocabulario inválido - falta array de intents');
    }
    data.intents.forEach(intent => {
      if (!intent.name || !intent.patterns || !intent.responses) {
        throw new Error(`Estructura de intent inválida: ${JSON.stringify(intent)}`);
      }
    });
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
    const matchingWords = pattern.words.filter(word => inputWordSet.has(word)).length;
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
      return this.handleFallback();
    }

    try {
      const intent = this.findMatchingIntent(userInput);
      if (intent) {
        this.addToHistory(userInput, intent.name);
        return this.getMultipleResponses(intent.responses, Math.min(6, Math.max(5, intent.responses.length)));
      }
      return this.handleFallback(userInput);
    } catch (error) {
      console.error('Error generando respuesta:', error);
      return this.handleFallback();
    }
  }

  getMultipleResponses(responseArray, count) {
    if (!responseArray || responseArray.length === 0) {
      return Array(count).fill("*inclina cabeza* ¿Miau?");
    }

    const results = [];
    const shuffled = [...responseArray].sort(() => Math.random() - 0.5);

    for (let i = 0; i < count; i++) {
      results.push(shuffled[i % shuffled.length]);
    }

    return results;
  }

  handleFallback(input) {
    this.logFallback(input);
    const fallbacks = [
      "*inclina cabeza* ¿Miau? ¿Podrías decirlo de otra manera?",
      "*mueve cola* Nyaa~ No estoy segura de entender...",
      "*patea el aire* ¿Tal vez prueba con otras palabras?",
      "*parpadea lentamente* ¿Miau? ¿Podrías reformularlo?",
      "*orejas caídas* Nyaa~ No entiendo... ¿intentas de nuevo?",
      "*enrolla cola* ¿Tal vez preguntes algo más? (^・ω・^ )",
      "*estira patas* Nyaa~ ¿Tal vez explicar más?",
      "*inclinación de cabeza intensificada* ¿Miau miau? ¿Enfoque diferente?",
      "*bigotes tiemblan* No lo entiendo del todo... ¿ayuda?",
      "*ronroneo suave* ¿Podrías ser más específico? Nyaa~"
    ];
    return this.getMultipleResponses(fallbacks, 6);
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
    const words = this.getWords(input);
    words.forEach(word => {
      this.fallbackAnalytics.commonTriggers.set(word, 
        (this.fallbackAnalytics.commonTriggers.get(word) || 0) + 1);
    });
    this.fallbackAnalytics.timing.lastFallback = Date.now();
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

export default NekoDogoChat;
