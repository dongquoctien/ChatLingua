# Claude Streaming - Hướng dẫn chi tiết

## Mục lục

1. [Streaming là gì?](#streaming-là-gì)
2. [Tại sao cần Streaming?](#tại-sao-cần-streaming)
3. [Cách hoạt động](#cách-hoạt-động)
4. [Cài đặt](#cài-đặt)
5. [Ví dụ code chi tiết](#ví-dụ-code-chi-tiết)
6. [Streaming với MCP](#streaming-với-mcp)
7. [Best Practices](#best-practices)
8. [So sánh Streaming vs Non-Streaming](#so-sánh-streaming-vs-non-streaming)

---

## Streaming là gì?

**Streaming** là kỹ thuật nhận response từ Claude API **theo từng phần (chunks)** thay vì chờ toàn bộ response hoàn tất.

### Ví dụ trực quan

```
Non-Streaming:
[Request] -------- chờ 10 giây -------- [Nhận toàn bộ response]

Streaming:
[Request] -> [chunk 1] -> [chunk 2] -> [chunk 3] -> ... -> [done]
              "Xin"       "chào"       "bạn"              (tổng 10 giây nhưng thấy text ngay)
```

---

## Tại sao cần Streaming?

| Vấn đề | Non-Streaming | Streaming |
|--------|---------------|-----------|
| Trải nghiệm user | Chờ lâu, không biết đang xử lý | Thấy text ngay, tự nhiên hơn |
| Response dài | Timeout risk | Nhận từng phần, an toàn |
| Memory | Load toàn bộ vào RAM | Xử lý từng chunk |
| Cancel request | Phải chờ xong | Có thể dừng giữa chừng |

### Khi nào dùng Streaming?

- Chat interfaces (bắt buộc cho UX tốt)
- Response dài (> 1000 tokens)
- Real-time applications
- Khi cần hiển thị typing indicator

### Khi nào KHÔNG cần Streaming?

- API calls nội bộ
- Batch processing
- Khi cần parse JSON response hoàn chỉnh
- MCP tool calls (phải chờ hoàn tất)

---

## Cách hoạt động

### Server-Sent Events (SSE)

Claude API sử dụng SSE protocol để stream data:

```
event: message_start
data: {"type":"message_start","message":{"id":"msg_01XFDUDYJgAACzvnptvVoYEL"...}}

event: content_block_start
data: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Xin"}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":" chào"}}

event: message_stop
data: {"type":"message_stop"}
```

### Event Types

| Event | Mô tả |
|-------|-------|
| `message_start` | Bắt đầu message, chứa metadata |
| `content_block_start` | Bắt đầu một content block |
| `content_block_delta` | Phần text mới |
| `content_block_stop` | Kết thúc content block |
| `message_delta` | Cập nhật message (stop_reason, usage) |
| `message_stop` | Kết thúc hoàn toàn |

---

## Cài đặt

### 1. Cài Anthropic SDK

```bash
# Node.js / TypeScript
npm install @anthropic-ai/sdk

# Python
pip install anthropic
```

### 2. Lấy API Key

1. Đăng ký tại [console.anthropic.com](https://console.anthropic.com)
2. Tạo API key trong Settings > API Keys
3. Lưu vào environment variable:

```bash
export ANTHROPIC_API_KEY="sk-ant-api03-..."
```

---

## Ví dụ code chi tiết

### TypeScript - Basic Streaming

```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

async function basicStreaming() {
  // Tạo stream
  const stream = client.messages.stream({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [
      { role: 'user', content: 'Giải thích về Machine Learning bằng tiếng Việt' }
    ]
  });

  // Lắng nghe từng chunk text
  stream.on('text', (text) => {
    process.stdout.write(text); // In ra không xuống dòng
  });

  // Chờ hoàn tất và lấy message cuối
  const finalMessage = await stream.finalMessage();

  console.log('\n--- Hoàn tất ---');
  console.log('Stop reason:', finalMessage.stop_reason);
  console.log('Total tokens:', finalMessage.usage.output_tokens);
}

basicStreaming();
```

### TypeScript - Event-based Streaming

```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

async function eventBasedStreaming() {
  const stream = client.messages.stream({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [
      { role: 'user', content: 'Viết một bài thơ ngắn về Việt Nam' }
    ]
  });

  // Lắng nghe tất cả events
  stream.on('message', (message) => {
    console.log('Message started:', message.id);
  });

  stream.on('contentBlockStart', (block) => {
    console.log('Content block started:', block.index);
  });

  stream.on('text', (text) => {
    process.stdout.write(text);
  });

  stream.on('contentBlockStop', (block) => {
    console.log('\nContent block stopped:', block.index);
  });

  stream.on('error', (error) => {
    console.error('Stream error:', error);
  });

  stream.on('end', () => {
    console.log('Stream ended');
  });

  await stream.finalMessage();
}

eventBasedStreaming();
```

### TypeScript - Async Iterator (Modern approach)

```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

async function asyncIteratorStreaming() {
  const stream = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    stream: true, // Enable streaming
    messages: [
      { role: 'user', content: 'Liệt kê 5 món ăn Việt Nam nổi tiếng' }
    ]
  });

  let fullText = '';

  // Dùng for-await để iterate qua events
  for await (const event of stream) {
    if (event.type === 'content_block_delta') {
      const delta = event.delta;
      if ('text' in delta) {
        process.stdout.write(delta.text);
        fullText += delta.text;
      }
    }

    if (event.type === 'message_delta') {
      console.log('\nUsage:', event.usage);
    }
  }

  console.log('\n\nFull response length:', fullText.length);
}

asyncIteratorStreaming();
```

### TypeScript - Streaming với Tool Use

```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

// Định nghĩa tool
const tools: Anthropic.Tool[] = [
  {
    name: 'get_weather',
    description: 'Lấy thông tin thời tiết của một thành phố',
    input_schema: {
      type: 'object',
      properties: {
        city: {
          type: 'string',
          description: 'Tên thành phố (ví dụ: Hanoi, Ho Chi Minh City)'
        }
      },
      required: ['city']
    }
  }
];

// Giả lập function xử lý tool
function getWeather(city: string): string {
  const weatherData: Record<string, string> = {
    'Hanoi': '28°C, có mây, độ ẩm 75%',
    'Ho Chi Minh City': '32°C, nắng, độ ẩm 65%',
  };
  return weatherData[city] || 'Không có dữ liệu';
}

async function streamingWithTools() {
  const stream = client.messages.stream({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    tools,
    messages: [
      { role: 'user', content: 'Thời tiết Hà Nội hôm nay thế nào?' }
    ]
  });

  let toolName = '';
  let toolInput = '';

  stream.on('contentBlockStart', (block) => {
    if (block.content_block.type === 'tool_use') {
      toolName = block.content_block.name;
      console.log(`\nClaude đang gọi tool: ${toolName}`);
    }
  });

  stream.on('inputJson', (json) => {
    toolInput += json;
  });

  stream.on('text', (text) => {
    process.stdout.write(text);
  });

  const response = await stream.finalMessage();

  // Xử lý tool calls
  for (const block of response.content) {
    if (block.type === 'tool_use') {
      console.log(`\nTool input:`, block.input);

      // Gọi function thực tế
      const result = getWeather((block.input as { city: string }).city);
      console.log(`Tool result:`, result);

      // Gửi kết quả về Claude (cần tạo request mới)
    }
  }
}

streamingWithTools();
```

### Python - Basic Streaming

```python
import anthropic

client = anthropic.Anthropic()

def basic_streaming():
    with client.messages.stream(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        messages=[
            {"role": "user", "content": "Giải thích về AI bằng tiếng Việt"}
        ]
    ) as stream:
        for text in stream.text_stream:
            print(text, end="", flush=True)

    print("\n--- Hoàn tất ---")

basic_streaming()
```

### Python - Full Event Handling

```python
import anthropic

client = anthropic.Anthropic()

def full_event_streaming():
    with client.messages.stream(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        messages=[
            {"role": "user", "content": "Viết một câu chuyện ngắn"}
        ]
    ) as stream:
        for event in stream:
            match event.type:
                case "message_start":
                    print(f"Message ID: {event.message.id}")
                case "content_block_start":
                    print(f"Block {event.index} started")
                case "content_block_delta":
                    if hasattr(event.delta, 'text'):
                        print(event.delta.text, end="", flush=True)
                case "content_block_stop":
                    print(f"\nBlock {event.index} stopped")
                case "message_delta":
                    print(f"\nStop reason: {event.delta.stop_reason}")
                    print(f"Output tokens: {event.usage.output_tokens}")
                case "message_stop":
                    print("Message completed")

full_event_streaming()
```

### Express.js - API Endpoint với Streaming

```typescript
import express from 'express';
import Anthropic from '@anthropic-ai/sdk';

const app = express();
const client = new Anthropic();

app.use(express.json());

// Endpoint streaming response
app.post('/api/chat/stream', async (req, res) => {
  const { message } = req.body;

  // Set headers cho SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const stream = client.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [{ role: 'user', content: message }]
    });

    stream.on('text', (text) => {
      // Gửi từng chunk về client
      res.write(`data: ${JSON.stringify({ type: 'text', content: text })}\n\n`);
    });

    stream.on('error', (error) => {
      res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
      res.end();
    });

    const finalMessage = await stream.finalMessage();

    // Gửi thông tin cuối cùng
    res.write(`data: ${JSON.stringify({
      type: 'done',
      usage: finalMessage.usage
    })}\n\n`);

    res.end();

  } catch (error) {
    res.write(`data: ${JSON.stringify({ type: 'error', message: 'Stream failed' })}\n\n`);
    res.end();
  }
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

### Frontend - Nhận SSE Stream

```typescript
// React component example
import { useState, useCallback } from 'react';

function ChatWithStreaming() {
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (message: string) => {
    setIsLoading(true);
    setResponse('');

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No reader');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'text') {
              setResponse(prev => prev + data.content);
            } else if (data.type === 'done') {
              console.log('Usage:', data.usage);
            }
          }
        }
      }
    } catch (error) {
      console.error('Stream error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <div>
      <button onClick={() => sendMessage('Xin chào!')}>
        {isLoading ? 'Đang xử lý...' : 'Gửi'}
      </button>
      <pre>{response}</pre>
    </div>
  );
}
```

---

## Streaming với MCP

### Hạn chế của MCP Tool Calls

**MCP tool calls KHÔNG hỗ trợ streaming response** vì:

1. Tool call phải return kết quả hoàn chỉnh
2. Claude cần toàn bộ data để validate schema
3. Database transactions cần atomic operations

```typescript
// MCP Tool - KHÔNG stream được
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const result = await handleToolCall(name, args); // Phải chờ xong
  return {
    content: [{ type: 'text', text: JSON.stringify(result) }]
  };
});
```

### Giải pháp cho MCP

**1. Chia nhỏ tool calls:**

```typescript
// Thay vì analyze 15 từ 1 lần
analyze_conversation({ vocabulary: [15 words] }) // Chậm!

// Chia thành nhiều lần
analyze_conversation_batch({ vocabulary: [5 words], batch: 1 })
analyze_conversation_batch({ vocabulary: [5 words], batch: 2 })
analyze_conversation_batch({ vocabulary: [5 words], batch: 3 })
```

**2. Tạo tool "quick" version:**

```typescript
// Tool đầy đủ - chậm nhưng chi tiết
{
  name: 'analyze_conversation_full',
  // ... yêu cầu tất cả dictionary fields
}

// Tool nhanh - chỉ cơ bản
{
  name: 'analyze_conversation_quick',
  // ... chỉ cần english_word, vietnamese_word, part_of_speech
}
```

**3. Background processing:**

```typescript
// Tool chỉ lưu text, trả về ngay
{
  name: 'save_conversation',
  // Lưu vietnamese_text, trả về conversation_id ngay
}

// Tool khác để enrich sau
{
  name: 'enrich_vocabulary',
  // Chạy background job để thêm dictionary data
}
```

---

## Best Practices

### 1. Error Handling

```typescript
const stream = client.messages.stream({...});

stream.on('error', (error) => {
  if (error instanceof Anthropic.APIError) {
    console.error('API Error:', error.status, error.message);

    if (error.status === 429) {
      // Rate limited - implement backoff
      await sleep(error.headers['retry-after'] * 1000);
    }
  }
});
```

### 2. Timeout Handling

```typescript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

try {
  const stream = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    stream: true,
    messages: [...],
  }, {
    signal: controller.signal
  });

  for await (const event of stream) {
    // Process events
  }
} finally {
  clearTimeout(timeout);
}
```

### 3. Memory Management

```typescript
async function processLongStream() {
  const stream = client.messages.stream({...});

  let chunkCount = 0;

  // Xử lý từng chunk, không accumulate tất cả
  stream.on('text', (text) => {
    processChunk(text); // Gửi đến client hoặc lưu DB
    chunkCount++;

    // Log progress mỗi 100 chunks
    if (chunkCount % 100 === 0) {
      console.log(`Processed ${chunkCount} chunks`);
    }
  });

  await stream.finalMessage();
}
```

### 4. Reconnection Logic

```typescript
async function streamWithRetry(messages: Message[], maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const stream = client.messages.stream({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages
      });

      return await stream.finalMessage();

    } catch (error) {
      if (attempt === maxRetries) throw error;

      console.log(`Attempt ${attempt} failed, retrying...`);
      await sleep(1000 * attempt); // Exponential backoff
    }
  }
}
```

---

## So sánh Streaming vs Non-Streaming

| Aspect | Non-Streaming | Streaming |
|--------|---------------|-----------|
| **Latency (TTFB)** | Cao (chờ toàn bộ) | Thấp (nhận ngay chunk đầu) |
| **Total time** | Như nhau | Như nhau |
| **Code complexity** | Đơn giản | Phức tạp hơn |
| **Error handling** | Đơn giản | Cần xử lý partial failures |
| **Memory** | Cao (buffer toàn bộ) | Thấp (xử lý từng chunk) |
| **UX** | Chờ lâu | Typing effect tự nhiên |
| **Cancel support** | Khó | Dễ (close stream) |
| **Use with tools** | Tốt | Phức tạp |

---

## Kết luận

- **Streaming** giúp UX tốt hơn cho chat interfaces
- **MCP tool calls** vẫn cần non-streaming vì phải return complete data
- Để tối ưu MCP: **chia nhỏ requests** hoặc **tạo quick version của tools**
- Luôn implement **error handling** và **timeout** cho production

---

## Tài liệu tham khảo

- [Anthropic API Docs - Streaming](https://docs.anthropic.com/en/api/streaming)
- [Anthropic SDK - TypeScript](https://github.com/anthropics/anthropic-sdk-typescript)
- [Anthropic SDK - Python](https://github.com/anthropics/anthropic-sdk-python)
- [MCP Protocol Specification](https://modelcontextprotocol.io/)
