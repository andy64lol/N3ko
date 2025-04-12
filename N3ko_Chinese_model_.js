// N3ko Chinese model
// Made by andy64lol

class NekoChineseChat {
  constructor(vocabUrl = 'https://raw.githubusercontent.com/andy64lol/N3ko/main/vocab/N3ko_chinese_model_.json') {
    this.vocabulary = { intents: [] };
    this.defaultResponse = ['喵? (词汇未加载)'];
    this.vocabUrl = vocabUrl;
    this.requestTimeout = 1000;
    this.phrasePatterns = new Map();
    this.exactMatchBonus = 2.0;
    this.minMatchThreshold = 0.65;
  }

  async init() {
    try {
      await this.loadBaseVocabulary();
      return this;
    } catch (error) {
      console.error('初始化失败:', error);
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

        if (!response.ok) throw new Error(`HTTP 错误 ${response.status}`);

        const data = await response.json();
        this.validateVocabulary(data);
        this.processVocabulary(data);
        this.defaultResponse = this.getIntentResponses('default') || ['喵?'];
        console.log('✅ 成功加载词汇');
        return;
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries) await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    console.error('加载词汇失败');
    this.vocabulary = { intents: [] };
    this.defaultResponse = ['喵? (词汇未加载)'];
  }

  validateVocabulary(data) {
    if (!data?.intents || !Array.isArray(data.intents)) {
      throw new Error('无效的词汇格式 - 缺少意图数组');
    }
    data.intents.forEach(intent => {
      if (!intent.name || !intent.patterns || !intent.responses) {
        throw new Error(`无效的意图结构: ${JSON.stringify(intent)}`);
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
      "不": "不会", "不可以": "不能", "我": "我是", 
      "你是": "你在", "它是": "它是", "那是": "那是",
      "不可以": "不能", "了": "的"
    };

    return text
      .replace(/[^\w\s'-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase()
      .replace(/\b(不|不可以|我|你是|它是|那是|不可以|了)\b/g, match => contractions[match]);
  }

  extractKeywords(phrase) {
    const stopWords = new Set(['一个', '每个', '的', '了', '吗']);
    return phrase.split(' ')
      .filter(word => word.length > 2 && !stopWords.has(word))
      .map(word => word.replace(/的$/, '').replace(/(ing|ed|s)$/, ''));
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

    for (const [phrase, data] of this.phrasePatterns) {
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
        return this.selectResponse(match);
      }

      return this.handleFallback(userInput);
    } catch (error) {
      console.error('生成响应时出错:', error);
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
    const fallbacks = [
      "*抬头* 喵？能换个说法吗？",
      "*摇尾巴* 喵~ 不太明白...",
      "*拍空气* 可以试着用其他词吗？",
      "*慢慢眨眼* 喵？可以换个说法吗？",
      "*耳朵下垂* 喵~ 我不懂...再试一次？",
      "*卷尾巴* 可以问些其他问题吗？ (^・ω・^ )"
    ];

    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }

  getRandomResponse(responses) {
    return responses[Math.floor(Math.random() * responses.length)];
  }
}

export default NekoChineseChat;
