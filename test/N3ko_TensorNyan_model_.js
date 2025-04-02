import * as tf from '@tensorflow/tfjs';
import * as use from '@tensorflow-models/universal-sentence-encoder';

class N3koTensorNyan {
constructor(vocabUrl = 'https://raw.githubusercontent.com/andy64lol/N3ko/refs/heads/main/test/N3ko_TensorNyan_model_.json') {
    this.vocabulary = { intents: [] };
    this.defaultResponse = ['Meow? (Vocabulary not loaded)'];
    this.vocabUrl = vocabUrl;
    this.useModel = null;
    this.specialDates = {
      '03-24': {
        vocabUrl: 'https://raw.githubusercontent.com/andy64lol/N3ko/refs/heads/main/vocab/additional/N3ko_Birthday_additional_.json',
        priority: 1,
        loaded: false
      }
    };
  }

  async init() {
    await this.loadBaseVocabulary();
    await this.loadDateSpecificVocabulary();
    this.useModel = await use.load();
    await this.precomputeEmbeddings();
    return this;
  }

  async precomputeEmbeddings() {
    for (const intent of this.vocabulary.intents) {
      for (const pattern of intent.processedPatterns) {
        const embedding = await this.useModel.embed(pattern.original);
        const embeddingArray = await embedding.array();
        pattern.embedding = embeddingArray[0];
        tf.dispose(embedding);
      }
    }
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

  async processInput(input) {
    const embedding = await this.useModel.embed(input);
    const embeddingArray = await embedding.array();
    tf.dispose(embedding);
    
    return {
      original: input,
      normalized: this.normalizeText(input),
      words: this.getWords(input),
      embedding: embeddingArray[0]
    };
  }

  cosineSimilarity(a, b) {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return (dotProduct / (magnitudeA * magnitudeB)) * 100;
  }

  async findMatchingIntent(userInput) {
    try {
      const processedInput = await this.processInput(userInput);
      let maxSimilarity = -Infinity;
      let bestIntent = null;

      for (const intent of this.vocabulary.intents) {
        for (const pattern of intent.processedPatterns) {
          const similarity = this.cosineSimilarity(
            processedInput.embedding,
            pattern.embedding
          );
          
          if (similarity > maxSimilarity) {
            maxSimilarity = similarity;
            bestIntent = intent;
          }
        }
      }

      return maxSimilarity >= 86 ? bestIntent : null;
    } catch (error) {
      console.error('Error processing input:', error);
      return null;
    }
  }

  getIntentResponses(intentName) {
    const intent = this.vocabulary.intents.find(i => i.name === intentName);
    return intent?.responses || null;
  }

  async generateResponse(userInput) {
    if (!userInput || typeof userInput !== 'string') {
      return this.getRandomResponse(this.defaultResponse);
    }
    
    try {
      const intent = await this.findMatchingIntent(userInput);
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

  async debugMatch(userInput) {
    const input = await this.processInput(userInput);
    return this.vocabulary.intents.map(intent => {
      return {
        intent: intent.name,
        priority: intent.priority || 0,
        patterns: intent.processedPatterns.map(pattern => {
          return {
            pattern: pattern.original,
            similarity: this.cosineSimilarity(input.embedding, pattern.embedding),
            words: pattern.words,
            matches: pattern.words.filter(w => input.words.includes(w))
          };
        })
      };
    });
  }
}

export default N3koTensorNyan;
