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
    this.intentWordCounts = {};
    this.intentTotalWords = {};
    this.vocabularySet = new Set();
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

        const response = await fetch(this.vocabUrl, {
          signal: controller.signal,
          cache: 'force-cache'
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}`);
        }

        const data = await response.json();
        this.validateVocabulary(data);
        this.vocabulary = data;
        this.processAllPatterns();
        this.defaultResponse = this.getIntentResponses('default') || ['Meow?'];
        console.log('✅ Loaded vocabulary from remote');
        return;
      } catch (error) {
        lastError = error;
        console.warn(`Vocabulary load attempt ${attempt} failed:`, error);
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
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
      this.processAllPatterns(); 
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

  processAllPatterns() {
    this.intentWordCounts = {};
    this.intentTotalWords = {};
    this.vocabularySet.clear();

    this.vocabulary.intents.forEach(intent => {
      const wordCounts = {};
      let totalWords = 0;

      intent.patterns.forEach(pattern => {
        const processed = this.processPattern(pattern);
        processed.words.forEach(word => {
          wordCounts[word] = (wordCounts[word] || 0) + 1;
          totalWords += 1;
          this.vocabularySet.add(word);
        });
      });

      this.intentWordCounts[intent.name] = wordCounts;
      this.intentTotalWords[intent.name] = totalWords;
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
    const preserveCase = new Set(['I', 'I\'m', 'I\'ve', 'I\'ll', 'I\'d']);
    
    const contractions = {
      "won't": "will not",
      "can't": "cannot",
      "i'm": "i am",
      "you're": "you are",
      "it's": "it is",
      "that's": "that is",
      "what's": "what is",
      "where's": "where is",
      "there's": "there is",
      "who's": "who is",
      "how's": "how is",
      "n't": " not",
      "'d": " would",
      "'ll": " will",
      "'ve": " have",
      "'re": " are"
    };

    let normalized = text.toLowerCase();
    
    Object.entries(contractions).forEach(([key, val]) => {
      if (preserveCase.has(key)) {
        normalized = normalized.replace(new RegExp(key, 'g'), val);
      } else {
        normalized = normalized.replace(new RegExp(key, 'g'), val);
      }
    });

    normalized = normalized
      .replace(/[^\w\s'-]/g, ' ')
      .replace(/(^|\s)'|'(\s|$)/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return normalized;
  }

  getWords(text) {
    const keepWords = new Set(['hi', 'hello', 'hey', 'meow', 'nya', 'nyaa', 
                             'happy', 'sad', 'angry', 'hungry', 'food', 
                             'homework', 'study', 'game', 'joke', 'love']);
    const minimalStopWords = new Set(['a', 'an', 'the', 'and', 'or', 'is', 'are']);

    return this.normalizeText(text)
      .split(' ')
      .filter(word => {
        if (keepWords.has(word)) return true;
        if (word.length <= 2) return false;
        return !minimalStopWords.has(word);
      })
      .map(word => {
        return word
          .replace(/'s$/, '')
          .replace(/(ing|ed|s)$/, '');
      });
  }

  processInput(input) {
    const normalized = this.normalizeText(input);
    return {
      original: input,
      normalized: normalized,
      words: this.getWords(input),
      fullPhrase: normalized
    };
  }

  findMatchingIntent(userInput) {
    const processedInput = this.processInput(userInput);
    const inputWords = processedInput.words;
    if (inputWords.length === 0) {
      return null;
    }

    let maxScore = -Infinity;
    let secondMaxScore = -Infinity;
    let bestIntent = null;

    const totalPatterns = this.vocabulary.intents.reduce((sum, intent) => sum + intent.patterns.length, 0);
    const totalDocuments = this.vocabulary.intents.length;
    const vocabSize = this.vocabularySet.size;

    const idfCache = {};
    const documentFrequencies = {};
    this.vocabularySet.forEach(word => {
      let df = 0;
      this.vocabulary.intents.forEach(intent => {
        if (this.intentWordCounts[intent.name]?.[word] > 0) {
          df += 1;
        }
      });
      documentFrequencies[word] = df;
      idfCache[word] = Math.log((totalDocuments + 1) / (df + 1)) + 1;
    });

    for (const intent of this.vocabulary.intents) {
      const wordCounts = this.intentWordCounts[intent.name] || {};
      const totalWordsInIntent = this.intentTotalWords[intent.name] || 0;

      const prior = Math.log((intent.patterns.length + 1) / (totalPatterns + totalDocuments));
      let score = prior;

      for (const word of inputWords) {
        const tf = (wordCounts[word] || 0) / totalWordsInIntent;
        const idf = idfCache[word] || 1;
        const tfidf = tf * idf;
   
        const weight = Math.log(1 + tfidf) * Math.log(1 + idf);
        score += weight;
      }

      if (score > maxScore) {
        secondMaxScore = maxScore;
        maxScore = score;
        bestIntent = intent;
      } else if (score > secondMaxScore) {
        secondMaxScore = score;
      }
    }

    const minThreshold = 0.8;
    const maxThreshold = 2.5;
    const confidenceThreshold = Math.min(
      maxThreshold,
      Math.max(minThreshold, minThreshold + (inputWords.length * 0.1))
    );

    if (maxScore - secondMaxScore < confidenceThreshold) {
      const partialMatch = this.vocabulary.intents.find(intent => {
        const wordCounts = this.intentWordCounts[intent.name] || {};
        return inputWords.some(word => 
          (wordCounts[word] || 0) > 0 && 
          (idfCache[word] || 1) > 1.5
        );
      });
      return partialMatch || null;
    }

    return bestIntent;
  }

  getIntentResponses(intentName) {
    const intent = this.vocabulary.intents.find(i => i.name === intentName);
    return intent?.responses || null;
  }

  generateResponse(userInput) {
    if (!userInput || typeof userInput !== 'string') {
      this.contextualFallbacks.fallbackCount++;
      this.logFallback(userInput);
      return this.getContextualFallback();
    }

    try {
      const intent = this.findMatchingIntent(userInput);
      if (intent?.responses) {
        this.contextualFallbacks.lastIntent = intent.name;
        this.contextualFallbacks.fallbackCount = 0;
    
        const processedInput = this.processInput(userInput);
        const matchingResponses = intent.responses.filter(response => {
          const responseWords = this.getWords(response);
          return processedInput.words.some(word => 
            responseWords.includes(word)
          );
        });
  
        const scoredResponses = intent.responses.map(response => {
          const responseText = response.toLowerCase();
          let score = 0;
          
          const testKeywords = {
            mood: ['happy', 'sad', 'angry', 'tired', 'joy', 'hug', 'grr', 'sleep'],
            food: ['fish', 'milk', 'hungry', 'food', 'eat', 'drink'],
            academic: ['school', 'study', 'homework', 'test', 'grade', 'learn'],
            game: ['game', 'play', 'undertale', 'fun'],
            joke: ['joke', 'funny', 'laugh', 'hehe', 'haha', 'lol'],
            compliment: ['cute', 'love', 'thank', 'nice', 'blush', 'purr'],
            mischievous: ['bad', 'naughty', 'break', 'sorry', 'whoops']
          };
 
          Object.entries(testKeywords).forEach(([type, keywords]) => {
            if (intent.name.includes(type)) {
              keywords.forEach(keyword => {
                if (responseText.includes(keyword)) score += 2;
              });
            }
          });
          
          processedInput.words.forEach(word => {
            if (responseText.includes(word)) score += 1;
          });
          
          return {response, score};
        }).sort((a, b) => b.score - a.score);

        const bestResponse = scoredResponses[0]?.response || 
                           this.getRandomResponse(intent.responses);
        return bestResponse;
      }

      const processedInput = this.processInput(userInput);
      const relatedIntents = this.vocabulary.intents.filter(intent => {
        const wordCounts = this.intentWordCounts[intent.name] || {};
        return processedInput.words.some(word => wordCounts[word] > 0);
      });

      if (relatedIntents.length > 0) {
        this.contextualFallbacks.lastIntent = relatedIntents[0].name;
        return this.getRandomResponse(relatedIntents[0].responses);
      }

      this.contextualFallbacks.fallbackCount++;
      this.logFallback(userInput);
      this.updateRecentTopics(userInput);
      return this.getContextualFallback();
    } catch (error) {
      console.error('Error generating response:', error);
      this.contextualFallbacks.fallbackCount++;
      this.logFallback(userInput);
      return this.getContextualFallback();
    }
  }

  getContextualFallback() {
    const baseResponses = [
      "*tilts head* Meow? Could you say that differently? (=ↀωↀ=)",
      "*ears twitch* Nyaa~ I didn't quite catch that...",
      "*tail flicks* Could you rephrase that? I'm just a curious cat!",
      "Purr...my cat brain didn't process that. Try again?"
    ];

    if (this.contextualFallbacks.recentTopics.length > 0) {
      const lastTopic = [...new Set(this.contextualFallbacks.recentTopics)][0];
      const topicWords = this.getWords(lastTopic).join(' ');
      
      return [
        `*ears perk up* About "${topicWords}"...? (｡･ω･｡)`,
        `Nyaa~ Still thinking about "${topicWords}"...`,
        `*tail swish* You mentioned "${topicWords}" - can you clarify?`,
        `Meow? *paws at air* "${topicWords}"...what about it?`
      ][Math.floor(Math.random() * 4)];
    }

    if (this.contextualFallbacks.fallbackCount > 2) {
      return [
        "*flops over* Maybe try asking me something else?",
        "*slow blink* I'm still learning - different words please?",
        "*tail lashing* Nyaa~ Not getting this. New topic?",
        "*paws at keyboard* Let's try a different approach?"
      ][Math.floor(Math.random() * 4)];
    }

    return this.getRandomResponse(baseResponses);
  }

  updateRecentTopics(input) {
    const words = this.getWords(input);
    this.contextualFallbacks.recentTopics = [
      ...words.slice(0, 3),
      ...this.contextualFallbacks.recentTopics
    ].slice(0, 5);
  }

  logFallback(input) {
    const words = this.getWords(input);
    words.forEach(word => {
      const count = this.fallbackAnalytics.commonTriggers.get(word) || 0;
      this.fallbackAnalytics.commonTriggers.set(word, count + 1);
    });
    
    const now = Date.now();
    if (this.fallbackAnalytics.timing.lastFallback) {
      const interval = now - this.fallbackAnalytics.timing.lastFallback;
      this.fallbackAnalytics.timing.averageInterval = 
        (this.fallbackAnalytics.timing.averageInterval + interval) / 2;
    }
    this.fallbackAnalytics.timing.lastFallback = now;
  }

  getRandomResponse(responses) {
    return responses[Math.floor(Math.random() * responses.length)];
  }

  debugMatch(userInput) {
    const input = this.processInput(userInput);
    const scores = {};

    const totalPatterns = this.vocabulary.intents.reduce((sum, intent) => sum + intent.patterns.length, 0);
    const vocabSize = this.vocabularySet.size;

    this.vocabulary.intents.forEach(intent => {
      const wordCounts = this.intentWordCounts[intent.name] || {};
      const totalWordsInIntent = this.intentTotalWords[intent.name] || 0;
      const prior = Math.log((intent.patterns.length + 1) / (totalPatterns + this.vocabulary.intents.length));
      let score = prior;

      input.words.forEach(word => {
        const count = wordCounts[word] || 0;
        const probability = (count + 1) / (totalWordsInIntent + vocabSize);
        score += Math.log(probability);
      });

      scores[intent.name] = {
        score: score,
        prior: prior,
        words: input.words.map(word => ({
          word: word,
          count: wordCounts[word] || 0,
          probability: (wordCounts[word] || 0 + 1) / (totalWordsInIntent + vocabSize)
        }))
      };
    });

    return scores;
  }

  getConversationHistory() {
    return {
      messages: [...this.conversationHistory.messages],
      context: {...this.conversationHistory.context}
    };
  }
}

export default NekoNyanChat;
