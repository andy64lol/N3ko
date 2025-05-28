// N3ko Japanese model
// Made by andy64lol

class NekoJapaneseChat {
  constructor(vocabUrl = 'https://raw.githubusercontent.com/andy64lol/N3ko/main/vocab/N3ko_Japanese_model_.json') {
    this.vocabulary = { intents: [] };
    this.defaultResponse = ['ニャ？ (語彙が読み込まれていません)'];
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
      console.error('初期化失敗:', error);
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

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        
        if (!this.validateVocabulary(data)) {
          throw new Error('語彙データの形式が無効です');
        }
        
        this.processVocabulary(data);
        console.log(`✅ 日本語語彙読み込み完了 - ${this.vocabulary.intents.length} インテント`);
        return;
        
      } catch (error) {
        lastError = error;
        console.warn(`⚠️ 語彙読み込み試行 ${attempt}/${maxRetries} 失敗:`, error.message);
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }
    
    console.error('❌ 語彙読み込み最終失敗:', lastError);
    throw lastError;
  }

  validateVocabulary(data) {
    return data && 
           typeof data === 'object' && 
           Array.isArray(data.intents) && 
           data.intents.length > 0;
  }

  processVocabulary(data) {
    this.vocabulary = data;
    this.phrasePatterns.clear();
    
    for (const intent of this.vocabulary.intents) {
      if (intent.patterns && Array.isArray(intent.patterns)) {
        for (const pattern of intent.patterns) {
          this.processPattern(pattern);
        }
      }
    }
  }

  processPattern(pattern) {
    const normalized = this.normalizeText(pattern);
    const keywords = this.extractKeywords(normalized);
    this.phrasePatterns.set(pattern, {
      normalized,
      keywords,
      length: normalized.length
    });
  }

  normalizeText(text) {
    return text
      .toLowerCase()
      .replace(/[。、！？\s\u3000]/g, '')
      .replace(/[ー～〜]/g, '')
      .trim();
  }

  extractKeywords(phrase) {
    // Japanese text segmentation - simplified approach
    const keywords = [];
    
    // Extract hiragana/katakana sequences
    const kanaMatches = phrase.match(/[\u3040-\u309F\u30A0-\u30FF]+/g) || [];
    keywords.push(...kanaMatches);
    
    // Extract kanji sequences
    const kanjiMatches = phrase.match(/[\u4E00-\u9FAF]+/g) || [];
    keywords.push(...kanjiMatches);
    
    // Extract individual characters for better matching
    for (let i = 0; i < phrase.length; i++) {
      const char = phrase[i];
      if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(char)) {
        keywords.push(char);
      }
    }
    
    return [...new Set(keywords)].filter(k => k.length > 0);
  }

  processInput(input) {
    const normalized = this.normalizeText(input);
    const inputKeywords = this.extractKeywords(normalized);
    
    return {
      original: input,
      normalized,
      keywords: inputKeywords,
      length: normalized.length
    };
  }

  findMatchingIntent(userInput) {
    const processedInput = this.processInput(userInput);
    let bestMatch = null;
    let highestScore = 0;

    for (const intent of this.vocabulary.intents) {
      if (!intent.patterns || intent.patterns.length === 0) continue;

      for (const pattern of intent.patterns) {
        const patternData = this.phrasePatterns.get(pattern);
        if (!patternData) continue;

        let score = this.calculateSimilarity(processedInput.keywords, patternData.keywords);
        
        // Exact match bonus
        if (processedInput.normalized === patternData.normalized) {
          score += this.exactMatchBonus;
        }
        
        // Length similarity bonus
        const lengthRatio = Math.min(processedInput.length, patternData.length) / 
                           Math.max(processedInput.length, patternData.length);
        score += lengthRatio * 0.3;

        if (score > highestScore) {
          highestScore = score;
          bestMatch = {
            intent: intent.name,
            pattern,
            score,
            confidence: Math.min(score / (processedInput.keywords.length || 1), 1.0)
          };
        }
      }
    }

    return bestMatch && bestMatch.confidence >= this.minMatchThreshold ? bestMatch : null;
  }

  calculateSimilarity(inputKeywords, patternKeywords) {
    if (!inputKeywords.length || !patternKeywords.length) return 0;

    let matches = 0;
    const inputSet = new Set(inputKeywords);
    const patternSet = new Set(patternKeywords);
    
    // Exact keyword matches
    for (const keyword of inputSet) {
      if (patternSet.has(keyword)) {
        matches += 1;
      }
    }
    
    // Partial matches for longer keywords
    for (const inputKeyword of inputKeywords) {
      if (inputKeyword.length > 1) {
        for (const patternKeyword of patternKeywords) {
          if (patternKeyword.length > 1 && inputKeyword !== patternKeyword) {
            if (inputKeyword.includes(patternKeyword) || patternKeyword.includes(inputKeyword)) {
              matches += 0.5;
            }
          }
        }
      }
    }

    return matches / Math.max(inputKeywords.length, patternKeywords.length);
  }

  getIntentResponses(intentName) {
    const intent = this.vocabulary.intents.find(i => i.name === intentName);
    return intent?.responses || this.defaultResponse;
  }

  generateResponse(userInput) {
    try {
      const match = this.findMatchingIntent(userInput);
      
      if (match) {
        this.addToHistory(userInput, match.intent);
        return this.selectResponse(match);
      } else {
        return this.handleFallback(userInput);
      }
    } catch (error) {
      console.error('応答生成エラー:', error);
      return this.getRandomResponse(this.defaultResponse);
    }
  }

  selectResponse(match) {
    const responses = this.getIntentResponses(match.intent);
    return this.getRandomResponse(responses);
  }

  handleFallback(input) {
    this.logFallback(input);
    
    const contextualFallbacks = [
      "ニャ？ よく分からないニャ〜 もう一度言ってみてニャ♪ (=^･ω･^=)",
      "難しい話ニャ〜 猫にも分かるように説明してほしいニャ♪ (*´∀｀*)",
      "ニャーン♪ 別の話をしてみるニャ〜 何か楽しいこと教えてニャ！ (◕ᴗ◕✿)",
      "首をかしげてしまうニャ〜 もう少し簡単に言ってもらえるかニャ？ ฅ(^◕ω◕^)ฅ"
    ];
    
    return this.getRandomResponse(contextualFallbacks);
  }

  addToHistory(input, intent) {
    const timestamp = Date.now();
    this.conversationHistory.messages.push({
      input,
      intent,
      timestamp
    });

    if (this.conversationHistory.messages.length > this.conversationHistory.maxHistory) {
      this.conversationHistory.messages.shift();
    }

    this.conversationHistory.context.lastIntent = intent;
    this.conversationHistory.context.lastTimestamp = timestamp;
  }

  logFallback(input) {
    const trigger = this.normalizeText(input);
    const count = this.fallbackAnalytics.commonTriggers.get(trigger) || 0;
    this.fallbackAnalytics.commonTriggers.set(trigger, count + 1);
    
    const now = Date.now();
    if (this.fallbackAnalytics.timing.lastFallback) {
      const interval = now - this.fallbackAnalytics.timing.lastFallback;
      this.fallbackAnalytics.timing.averageInterval = 
        (this.fallbackAnalytics.timing.averageInterval + interval) / 2;
    }
    this.fallbackAnalytics.timing.lastFallback = now;
  }

  getRandomResponse(responses) {
    if (!Array.isArray(responses) || responses.length === 0) {
      return this.defaultResponse[0];
    }
    return responses[Math.floor(Math.random() * responses.length)];
  }

  getConversationHistory() {
    return {
      messages: [...this.conversationHistory.messages],
      context: { ...this.conversationHistory.context },
      fallbackAnalytics: {
        commonTriggers: Array.from(this.fallbackAnalytics.commonTriggers.entries()),
        timing: { ...this.fallbackAnalytics.timing }
      }
    };
  }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NekoJapaneseChat;
} else if (typeof window !== 'undefined') {
  window.NekoJapaneseChat = NekoJapaneseChat;
}

export default NekoJapaneseChat;
