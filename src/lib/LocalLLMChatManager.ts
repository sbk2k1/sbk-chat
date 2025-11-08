/**
 * LocalLLMChatManager - Manages chat sessions with local LLM (Ollama/vLLM)
 * 
 * Handles streaming responses, error handling, and guardrails for
 * local LLM-powered chat interactions in the terminal.
 */

export interface LocalLLMConfig {
  endpoint: string;
  model?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export class LocalLLMChatManager {
  private config: Required<LocalLLMConfig>;
  private chatHistory: ChatMessage[] = [];
  private isStreaming: boolean = false;
  private abortController: AbortController | null = null;

  constructor(config: LocalLLMConfig) {
    this.config = {
      endpoint: config.endpoint,
      model: config.model ?? 'llama2',
      systemPrompt: config.systemPrompt ?? '',
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens ?? 2048,
      timeout: config.timeout ?? 30000, // 30 seconds default
    };
  }

  /**
   * Validate endpoint configuration
   */
  isConfigured(): boolean {
    return !!this.config.endpoint && this.config.endpoint.length > 0;
  }

  /**
   * Check if currently streaming
   */
  getIsStreaming(): boolean {
    return this.isStreaming;
  }

  /**
   * Update system prompt
   */
  setSystemPrompt(prompt: string): void {
    this.config.systemPrompt = prompt;
  }

  /**
   * Get current system prompt
   */
  getSystemPrompt(): string {
    return this.config.systemPrompt;
  }

  /**
   * Clear chat history
   */
  clearHistory(): void {
    this.chatHistory = [];
  }

  /**
   * Get chat history
   */
  getHistory(): ChatMessage[] {
    return [...this.chatHistory];
  }

  /**
   * Validate connection to local LLM endpoint
   */
  async validateConnection(): Promise<boolean> {
    if (!this.isConfigured()) {
      return false;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.config.endpoint}/api/tags`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      console.error('Connection validation failed:', error);
      return false;
    }
  }

  /**
   * Send a message and get streaming response
   * @param message User message
   * @param onChunk Callback for each token/chunk received
   * @param onComplete Callback when streaming completes
   * @param onError Callback for errors
   */
  async sendMessage(
    message: string,
    onChunk: (text: string) => void,
    onComplete: () => void,
    onError: (error: Error) => void
  ): Promise<void> {
    if (!this.isConfigured()) {
      onError(new Error('Local LLM endpoint not configured. Please set VITE_LOCAL_LLM_ENDPOINT in your .env file.'));
      return;
    }

    if (this.isStreaming) {
      onError(new Error('Already streaming a response. Please wait for the current response to complete.'));
      return;
    }

    this.isStreaming = true;
    this.abortController = new AbortController();

    try {
      // Build messages array with system prompt and history
      const messages = this.buildMessages(message);

      // Add user message to history
      this.chatHistory.push({
        role: 'user',
        content: message,
      });

      // Create timeout
      const timeoutId = setTimeout(() => {
        if (this.abortController) {
          this.abortController.abort();
        }
      }, this.config.timeout);

      // Make request to Ollama/vLLM endpoint
      const response = await fetch(`${this.config.endpoint}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: messages,
          stream: true,
          options: {
            temperature: this.config.temperature,
            num_predict: this.config.maxTokens,
          },
        }),
        signal: this.abortController.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      // Process streaming response
      await this.processStream(response.body, onChunk);

      this.isStreaming = false;
      this.abortController = null;
      onComplete();

    } catch (error) {
      this.isStreaming = false;
      this.abortController = null;

      // Handle specific error types
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          onError(new Error('Request timeout. The local LLM took too long to respond.'));
        } else if (error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
          onError(new Error(`Cannot connect to local LLM at ${this.config.endpoint}. Is Ollama/vLLM running?`));
        } else if (error.message.includes('HTTP error')) {
          onError(new Error(`Local LLM returned an error: ${error.message}`));
        } else {
          onError(new Error(`Local LLM error: ${error.message}`));
        }
      } else {
        onError(new Error('An unknown error occurred while communicating with local LLM.'));
      }

      console.error('Local LLM error:', error);
    }
  }

  /**
   * Process streaming response from Ollama/vLLM
   */
  private async processStream(
    body: ReadableStream<Uint8Array>,
    onChunk: (text: string) => void
  ): Promise<void> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        // Decode chunk
        buffer += decoder.decode(value, { stream: true });

        // Process complete JSON lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const data = JSON.parse(line);

            // Ollama format: { message: { content: "..." }, done: false }
            if (data.message && data.message.content) {
              const content = data.message.content;
              fullResponse += content;
              onChunk(content);
            }

            // Check if streaming is complete
            if (data.done) {
              break;
            }
          } catch (parseError) {
            console.warn('Failed to parse streaming chunk:', line, parseError);
            // Continue processing other lines
          }
        }
      }

      // Add assistant response to history
      if (fullResponse) {
        this.chatHistory.push({
          role: 'assistant',
          content: fullResponse,
        });
      }

    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Build messages array with system prompt and history
   */
  private buildMessages(userMessage: string): ChatMessage[] {
    const messages: ChatMessage[] = [];

    // Add system prompt if configured
    if (this.config.systemPrompt) {
      messages.push({
        role: 'system',
        content: this.config.systemPrompt,
      });
    }

    // Add chat history (last 10 messages to keep context manageable)
    const recentHistory = this.chatHistory.slice(-10);
    messages.push(...recentHistory);

    // Add current user message
    messages.push({
      role: 'user',
      content: userMessage,
    });

    return messages;
  }

  /**
   * Stop current streaming
   */
  stopStreaming(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.isStreaming = false;
    this.abortController = null;
  }
}
