// N3ko Nyan model
// made by andy64lol

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

  findMatchingIntent(userInput) {
    const processedInput = this.processInput(userInput);
    const inputWords = processedInput.words;

    let maxScore = -Infinity;
    let secondMaxScore = -Infinity;
    let bestIntent = null;

    const totalPatterns = this.vocabulary.intents.reduce((sum, intent) => sum + intent.patterns.length, 0);
    const vocabSize = this.vocabularySet.size;

    for (const intent of this.vocabulary.intents) {
      const wordCounts = this.intentWordCounts[intent.name] || {};
      const totalWordsInIntent = this.intentTotalWords[intent.name] || 0;

      const prior = Math.log((intent.patterns.length + 1) / (totalPatterns + this.vocabulary.intents.length));
      let score = prior;

      for (const word of inputWords) {
        const count = wordCounts[word] || 0;
        const probability = (count + 1) / (totalWordsInIntent + vocabSize);
        score += Math.log(probability);
      }

      if (score > maxScore) {
        secondMaxScore = maxScore;
        maxScore = score;
        bestIntent = intent;
      } else if (score > secondMaxScore) {
        secondMaxScore = score;
      }
    }

    const confidenceThreshold = 2; 
    if (maxScore - secondMaxScore < confidenceThreshold) {
      return null;
    }

    return bestIntent;
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
}

export default NekoNyanChat;
