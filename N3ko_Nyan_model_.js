// N3ko Nyan model
// Made by andy64lol

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
  }

  async init() {
    await this.loadBaseVocabulary();
    await this.loadDateSpecificVocabulary();
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

  async loadDateSpecificVocabulary() {
    const today = new Date();
    const dateKey = this.getDateKey(today);
    
    if (this.specialDates[dateKey] && !this.specialDates[dateKey].loaded) {
      try {
        const specialDate = this.specialDates[dateKey];
        const response = await fetch(specialDate.vocabUrl);
        
        if (response.ok) {
          const specialVocab = await response.json();
          this.mergeVocabularies(specialVocab, specialDate.priority);
          specialDate.loaded = true;
          console.log(`Loaded special vocabulary for ${dateKey}`);
        }
      } catch (error) {
        console.error(`Error loading special vocabulary for ${dateKey}:`, error);
      }
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
    return text.toLowerCase().replace(/[^\w\s]/gi, '');
  }

  getWords(text) {
    return text.toLowerCase().match(/\w+/g) || [];
  }

  getIntentResponses(intentName) {
    const intent = this.vocabulary.intents.find(i => i.name === intentName);
    return intent ? intent.responses : null;
  }
}
