// N3ko Nyan model
// Made by andy64lol

class NekoNyanChat {
  constructor(vocabUrl = 'https://raw.githubusercontent.com/andy64lol/N3ko/main/vocab/N3ko_Nyan_model_.json') {
    this.vocabUrl = vocabUrl;
    this.vocabulary = { intents: [] };
    this.defaultResponse = ['Meow? (Vocabulary not loaded)'];
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
    this.maxRetries = 3;
  }

  async init() {
    try {
      await this.loadBaseVocabulary();
      await this.loadDateSpecificVocabulary();
    } catch (error) {
      console.error('[NekoNyanChat] Initialization failed:', error.message);
    }
    return this;
  }

  async fetchJsonWithRetry(url, retries = this.maxRetries) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error ${response.status}`);
        const data = await response.json();
        this.validateVocabulary(data);
        return data;
      } catch (error) {
        console.warn(`[NekoNyanChat] Fetch attempt ${attempt} failed for ${url}:`, error.message);
        if (attempt === retries) {
          throw new Error(`[NekoNyanChat] Failed to fetch ${url} after ${retries} attempts`);
        }
        await this.delay(500 * attempt); // backoff
      }
    }
  }

  validateVocabulary(vocab) {
    if (!vocab || typeof vocab !== 'object' || !Array.isArray(vocab.intents)) {
      throw new Error('Vocabulary must have an "intents" array');
    }
    for (const intent of vocab.intents) {
      if (!intent.name || !Array.isArray(intent.patterns) || !Array.isArray(intent.responses)) {
        throw new Error(`Invalid intent structure detected: ${JSON.stringify(intent)}`);
      }
    }
  }

  async loadBaseVocabulary() {
    try {
      const vocab = await this.fetchJsonWithRetry(this.vocabUrl);
      this.vocabulary = vocab;
      this.processAllPatterns();
      this.defaultResponse = this.getIntentResponses('default') || ['Meow?'];
      console.info('[NekoNyanChat] Base vocabulary loaded.');
    } catch (error) {
      console.error('[NekoNyanChat] Failed to load base vocabulary:', error.message);
    }
  }

  async loadDateSpecificVocabulary() {
    const todayKey = this.getDateKey(new Date());
    const special = this.specialDates[todayKey];
    if (special && !special.loaded) {
      try {
        const vocab = await this.fetchJsonWithRetry(special.vocabUrl);
        this.mergeVocabularies(vocab, special.priority);
        special.loaded = true;
        console.info(`[NekoNyanChat] Special vocabulary loaded for ${todayKey}.`);
      } catch (error) {
        console.error(`[NekoNyanChat] Failed to load special vocabulary for ${todayKey}:`, error.message);
      }
    }
  }

  mergeVocabularies(newVocab, priority = 0) {
    try {
      this.validateVocabulary(newVocab);
      for (const newIntent of newVocab.intents) {
        newIntent.processedPatterns = newIntent.patterns.map(pattern => this.processPattern(pattern));
        const existingIndex = this.vocabulary.intents.findIndex(i => i.name === newIntent.name);
        if (existingIndex !== -1) {
          const existingIntent = this.vocabulary.intents[existingIndex];
          if ((existingIntent.priority || 0) < priority) {
            this.vocabulary.intents[existingIndex] = newIntent;
            console.info(`[NekoNyanChat] Replaced intent "${newIntent.name}" with higher priority ${priority}.`);
          } else {
            console.info(`[NekoNyanChat] Skipped merging lower-priority intent "${newIntent.name}".`);
          }
        } else {
          this.vocabulary.intents.push(newIntent);
          console.info(`[NekoNyanChat] Added new intent "${newIntent.name}".`);
        }
      }
    } catch (error) {
      console.error('[NekoNyanChat] Failed to merge vocabularies:', error.message);
    }
  }

  processAllPatterns() {
    for (const intent of this.vocabulary.intents) {
      if (Array.isArray(intent.patterns)) {
        intent.processedPatterns = intent.patterns.map(pattern => this.processPattern(pattern));
      }
    }
  }

  processPattern(pattern) {
    try {
      return new RegExp(pattern, 'i');
    } catch (error) {
      console.warn(`[NekoNyanChat] Failed to compile pattern: "${pattern}".`, error.message);
      return null;
    }
  }

  getIntentResponses(name) {
    const intent = this.vocabulary.intents.find(i => i.name === name);
    return intent && Array.isArray(intent.responses) ? intent.responses : null;
  }

  async chat(input) {
    if (!input || typeof input !== 'string') {
      console.warn('[NekoNyanChat] Invalid input, must be a string.');
      return this.pickRandom(this.defaultResponse);
    }

    for (const intent of this.vocabulary.intents) {
      if (Array.isArray(intent.processedPatterns)) {
        for (const pattern of intent.processedPatterns) {
          if (pattern && pattern.test(input)) {
            return this.pickRandom(intent.responses);
          }
        }
      }
    }

    return this.pickRandom(this.defaultResponse);
  }

  pickRandom(arr) {
    if (!Array.isArray(arr) || arr.length === 0) return 'Meow? (No responses available)';
    return arr[Math.floor(Math.random() * arr.length)];
  }

  getDateKey(date) {
    return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
