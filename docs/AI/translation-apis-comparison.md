# So sánh Translation APIs

## Tổng quan chi phí

| API | Free Tier | Giá sau Free | Ưu điểm | Nhược điểm |
|-----|-----------|--------------|---------|------------|
| **Google Translate** | 500K chars/tháng | $20/1M chars | Nhiều ngôn ngữ, chính xác | Tốn phí nếu dùng nhiều |
| **DeepL** | 500K chars/tháng | €5.49/1M chars | Chất lượng cao nhất | Ít ngôn ngữ hơn |
| **Microsoft Translator** | 2M chars/tháng | $10/1M chars | Free tier lớn | Cần Azure account |
| **LibreTranslate** | Unlimited (self-host) | $0 | Miễn phí hoàn toàn | Cần tự host, chậm hơn |
| **MyMemory** | 5K words/ngày | $0.002/word | Có API key miễn phí | Giới hạn request |

---

## Chi tiết từng API

### 1. Google Cloud Translation

```bash
# Cài đặt
npm install @google-cloud/translate
```

```typescript
import { Translate } from '@google-cloud/translate/build/src/v2';

const translate = new Translate({ projectId: 'your-project-id' });

async function translateText(text: string, target: string) {
  const [translation] = await translate.translate(text, target);
  return translation;
}

// Sử dụng
const result = await translateText('Xin chào', 'en');
console.log(result); // "Hello"
```

**Pricing:**
- 0-500K chars/tháng: FREE
- 500K-1B chars: $20/1M chars
- Neural Machine Translation: $20/1M chars

---

### 2. DeepL API

```bash
npm install deepl-node
```

```typescript
import * as deepl from 'deepl-node';

const translator = new deepl.Translator('your-auth-key');

async function translateText(text: string) {
  const result = await translator.translateText(text, 'vi', 'en-US');
  return result.text;
}

// Với context
const result = await translator.translateText(
  'Anh ấy đá bóng rất giỏi',
  'vi',
  'en-US',
  { context: 'Sports article about football' }
);
```

**Pricing:**
- Free tier: 500K chars/tháng
- Pro: €5.49/1M chars
- Business: Custom pricing

---

### 3. LibreTranslate (Self-hosted - FREE)

```bash
# Chạy với Docker
docker run -ti --rm -p 5000:5000 libretranslate/libretranslate
```

```typescript
async function translateWithLibre(text: string, source: string, target: string) {
  const response = await fetch('http://localhost:5000/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      q: text,
      source: source,
      target: target
    })
  });

  const data = await response.json();
  return data.translatedText;
}

// Sử dụng
const result = await translateWithLibre('Xin chào', 'vi', 'en');
console.log(result); // "Hello"
```

**Ưu điểm:**
- Hoàn toàn miễn phí
- Privacy - data không gửi đi đâu
- Có thể chạy offline

**Nhược điểm:**
- Cần server để host
- Chất lượng kém hơn Google/DeepL
- Chậm hơn cloud APIs

---

### 4. Microsoft Translator

```bash
npm install @azure-rest/ai-translation-text
```

```typescript
import TextTranslationClient from '@azure-rest/ai-translation-text';

const client = TextTranslationClient(
  'https://api.cognitive.microsofttranslator.com',
  { key: 'your-subscription-key' }
);

async function translateText(text: string) {
  const response = await client.path('/translate').post({
    queryParameters: {
      'api-version': '3.0',
      from: 'vi',
      to: 'en'
    },
    body: [{ text }]
  });

  return response.body[0].translations[0].text;
}
```

**Pricing:**
- Free tier: 2M chars/tháng (cần credit card)
- Standard: $10/1M chars

---

## Tích hợp vào ChatLingua

### Option 1: Hybrid approach (Khuyến nghị)

```typescript
// packages/mcp-server/src/utils/translator.ts

interface TranslationResult {
  text: string;
  source: 'claude' | 'google' | 'deepl' | 'libre';
}

class TranslationService {
  private libreUrl = process.env.LIBRE_TRANSLATE_URL || 'http://localhost:5000';

  // Dùng LibreTranslate cho translation nhanh
  async quickTranslate(text: string): Promise<TranslationResult> {
    try {
      const response = await fetch(`${this.libreUrl}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: text,
          source: 'vi',
          target: 'en'
        })
      });

      const data = await response.json();
      return { text: data.translatedText, source: 'libre' };
    } catch (error) {
      // Fallback to Claude if LibreTranslate unavailable
      return { text: '', source: 'claude' };
    }
  }

  // Claude cho dictionary data (definitions, examples, etc.)
  // - Không cần translate, Claude tự generate
}

export const translator = new TranslationService();
```

### Option 2: Chia nhỏ MCP tool

```typescript
// Tool 1: Quick save (fast)
{
  name: 'save_conversation_quick',
  description: 'Quickly save Vietnamese text with basic translation',
  // Chỉ cần: vietnamese_text, english_translation
  // KHÔNG cần: definitions, collocations, word_family, etc.
}

// Tool 2: Enrich later (can be slow)
{
  name: 'enrich_vocabulary',
  description: 'Add dictionary data to existing vocabulary',
  // Thêm: definitions, examples, collocations, etc.
}
```

---

## Khuyến nghị cho ChatLingua

| Use case | Solution |
|----------|----------|
| Translation nhanh | LibreTranslate (self-host, free) |
| Dictionary data chi tiết | Để Claude generate (như hiện tại) |
| Production với traffic cao | DeepL/Google (tốn phí nhưng nhanh) |

### Setup LibreTranslate

Thêm vào `docker-compose.yml`:

```yaml
services:
  libretranslate:
    image: libretranslate/libretranslate
    ports:
      - "5000:5000"
    environment:
      - LT_LOAD_ONLY=vi,en  # Chỉ load Vietnamese và English
    volumes:
      - lt-models:/home/libretranslate/.local:rw

volumes:
  lt-models:
```

```bash
docker-compose up -d libretranslate
```

---

## Kết luận

1. **Miễn phí hoàn toàn**: LibreTranslate (self-host)
2. **Free tier lớn nhất**: Microsoft (2M chars/tháng)
3. **Chất lượng tốt nhất**: DeepL
4. **Đơn giản nhất**: Để Claude làm hết (như hiện tại, nhưng chậm)

Đề xuất: **Kết hợp LibreTranslate cho translation + Claude cho dictionary enrichment**
