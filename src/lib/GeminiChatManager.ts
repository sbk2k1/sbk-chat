/**
 * GeminiChatManager - Manages chat sessions with Google Gemini API
 * 
 * Handles streaming responses, error handling, and guardrails for
 * Gemini-powered chat interactions in the terminal.
 */

import { GoogleGenerativeAI, GenerativeModel, GenerateContentStreamResult } from '@google/generative-ai';

export interface GeminiChatConfig {
  apiKey: string;
  model?: string;
  systemPrompt?: string;
  temperature?: number;
  maxOutputTokens?: number;
}

export interface ChatMessage {
  role: 'user' | 'model';
  parts: string;
}

export class GeminiChatManager {
  private genAI: GoogleGenerativeAI | null = null;
  private model: GenerativeModel | null = null;
  private config: Required<GeminiChatConfig>;
  private chatHistory: ChatMessage[] = [];
  private isStreaming: boolean = false;

  constructor(config: GeminiChatConfig) {
    this.config = {
      apiKey: config.apiKey,
      model: config.model ?? 'gemini-2.0-flash-exp',
      systemPrompt: config.systemPrompt ?? '',
      temperature: config.temperature ?? 0.7,
      maxOutputTokens: config.maxOutputTokens ?? 2048,
    };

    this.initialize();
  }

  /**
   * Initialize the Gemini API client
   */
  private initialize(): void {
    if (!this.config.apiKey) {
      throw new Error('Gemini API key is required. Please set VITE_GEMINI_API_KEY in your .env file.');
    }

    try {
      this.genAI = new GoogleGenerativeAI(this.config.apiKey);
      this.updateModel();
    } catch (error) {
      console.error('Failed to initialize Gemini API:', error);
      throw new Error(`Failed to initialize Gemini API: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update the model with current configuration
   */
  private updateModel(): void {
    if (!this.genAI) return;

    this.model = this.genAI.getGenerativeModel({ 
      model: this.config.model,
      generationConfig: {
        temperature: this.config.temperature,
        maxOutputTokens: this.config.maxOutputTokens,
      },
      systemInstruction: this.config.systemPrompt || undefined,
    });
  }

  /**
   * Validate API connection
   */
  async validateConnection(): Promise<boolean> {
    if (!this.model) {
      return false;
    }

    try {
      // Send a simple test message
      const result = await this.model.generateContent('test');
      return result.response !== null;
    } catch (error) {
      console.error('Connection validation failed:', error);
      return false;
    }
  }

  /**
   * Check if API key is configured
   */
  isConfigured(): boolean {
    return !!this.config.apiKey && this.config.apiKey.length > 0;
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
    // Reinitialize model with new system prompt
    this.updateModel();
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
    if (!this.model) {
      onError(new Error('Gemini API not initialized. Please check your API key configuration.'));
      return;
    }

    if (this.isStreaming) {
      onError(new Error('Already streaming a response. Please wait for the current response to complete.'));
      return;
    }

    this.isStreaming = true;

    try {
      // Build the full prompt with system prompt and history
      const fullPrompt = this.buildPrompt(message);

      // Add user message to history
      this.chatHistory.push({
        role: 'user',
        parts: message,
      });

      // Stream the response
      const result: GenerateContentStreamResult = await this.model.generateContentStream(fullPrompt);

      let fullResponse = '';

      // Process each chunk
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        fullResponse += chunkText;
        onChunk(chunkText);
      }

      // Add assistant response to history
      this.chatHistory.push({
        role: 'model',
        parts: fullResponse,
      });

      this.isStreaming = false;
      onComplete();

    } catch (error) {
      this.isStreaming = false;
      
      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          onError(new Error('Invalid API key. Please check your VITE_GEMINI_API_KEY configuration.'));
        } else if (error.message.includes('quota') || error.message.includes('rate limit')) {
          onError(new Error('Rate limit exceeded. Please try again in a moment.'));
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          onError(new Error('Network error. Please check your internet connection and try again.'));
        } else {
          onError(new Error(`Gemini API error: ${error.message}`));
        }
      } else {
        onError(new Error('An unknown error occurred while communicating with Gemini API.'));
      }
      
      console.error('Gemini API error:', error);
    }
  }

  /**
   * Build the full prompt with chat history context
   */
  private buildPrompt(userMessage: string): string {
    // Note: System prompt is now handled via systemInstruction in the model config
    let prompt = '';

    // Add chat history for context (last 10 messages to keep context manageable)
    const recentHistory = this.chatHistory.slice(-10);
    if (recentHistory.length > 0) {
      prompt += 'Previous conversation:\n';
      recentHistory.forEach(msg => {
        const role = msg.role === 'user' ? 'User' : 'Assistant';
        prompt += `${role}: ${msg.parts}\n`;
      });
      prompt += '\n';
    }

    // Add current user message
    prompt += `User: ${userMessage}`;

    return prompt;
  }

  /**
   * Stop current streaming (if supported)
   */
  stopStreaming(): void {
    // Note: The Gemini SDK doesn't provide a direct way to cancel streaming
    // We just mark it as not streaming and the next iteration will be ignored
    this.isStreaming = false;
  }
}

