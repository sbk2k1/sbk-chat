/**
 * KnowledgeManager - Manages the knowledge base for AI chat context
 * 
 * Loads and parses knowledge.json, formats entries for LLM context,
 * and provides filtering capabilities by category and tags.
 */

export interface KnowledgeEntry {
  id: string;
  category: string;
  content: string;
  metadata?: {
    tags?: string[];
    priority?: number;
    lastUpdated?: string;
  };
}

export interface KnowledgeBase {
  version: string;
  lastUpdated?: string;
  entries: KnowledgeEntry[];
}

export interface KnowledgeManagerConfig {
  maxContextSize?: number; // Maximum characters for context
  priorityThreshold?: number; // Minimum priority to include (1-5)
}

export class KnowledgeManager {
  private knowledge: KnowledgeBase | null = null;
  private config: Required<KnowledgeManagerConfig>;

  constructor(config: KnowledgeManagerConfig = {}) {
    this.config = {
      maxContextSize: config.maxContextSize ?? 8000,
      priorityThreshold: config.priorityThreshold ?? 1,
    };
  }

  /**
   * Load and parse knowledge.json from a URL or JSON string
   */
  async loadFromUrl(url: string): Promise<void> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch knowledge base: ${response.statusText}`);
      }
      const data = await response.json();
      this.loadFromData(data);
    } catch (error) {
      console.error('Error loading knowledge base:', error);
      throw new Error(`Failed to load knowledge base: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load knowledge from parsed JSON data
   */
  loadFromData(data: unknown): void {
    this.validate(data);
    this.knowledge = data as KnowledgeBase;
  }

  /**
   * Validate the knowledge base structure
   */
  private validate(data: unknown): void {
    if (!data || typeof data !== 'object') {
      throw new Error('Knowledge base must be an object');
    }

    const kb = data as Partial<KnowledgeBase>;

    if (!kb.version || typeof kb.version !== 'string') {
      throw new Error('Knowledge base must have a version string');
    }

    if (!Array.isArray(kb.entries)) {
      throw new Error('Knowledge base must have an entries array');
    }

    // Validate each entry
    kb.entries.forEach((entry, index) => {
      if (!entry.id || typeof entry.id !== 'string') {
        throw new Error(`Entry at index ${index} must have an id string`);
      }
      if (!entry.category || typeof entry.category !== 'string') {
        throw new Error(`Entry ${entry.id} must have a category string`);
      }
      if (!entry.content || typeof entry.content !== 'string') {
        throw new Error(`Entry ${entry.id} must have content string`);
      }
      
      // Validate metadata if present
      if (entry.metadata) {
        if (entry.metadata.tags && !Array.isArray(entry.metadata.tags)) {
          throw new Error(`Entry ${entry.id} metadata.tags must be an array`);
        }
        if (entry.metadata.priority !== undefined && typeof entry.metadata.priority !== 'number') {
          throw new Error(`Entry ${entry.id} metadata.priority must be a number`);
        }
      }
    });
  }

  /**
   * Check if knowledge base is loaded
   */
  isLoaded(): boolean {
    return this.knowledge !== null;
  }

  /**
   * Get all entries
   */
  getAllEntries(): KnowledgeEntry[] {
    if (!this.knowledge) {
      return [];
    }
    return this.knowledge.entries;
  }

  /**
   * Filter entries by category
   */
  filterByCategory(category: string): KnowledgeEntry[] {
    if (!this.knowledge) {
      return [];
    }
    return this.knowledge.entries.filter(
      entry => entry.category.toLowerCase() === category.toLowerCase()
    );
  }

  /**
   * Filter entries by tags (returns entries that have ANY of the specified tags)
   */
  filterByTags(tags: string[]): KnowledgeEntry[] {
    if (!this.knowledge || tags.length === 0) {
      return [];
    }

    const lowerTags = tags.map(t => t.toLowerCase());
    
    return this.knowledge.entries.filter(entry => {
      if (!entry.metadata?.tags) {
        return false;
      }
      return entry.metadata.tags.some(tag => 
        lowerTags.includes(tag.toLowerCase())
      );
    });
  }

  /**
   * Filter entries by priority threshold
   */
  filterByPriority(minPriority: number): KnowledgeEntry[] {
    if (!this.knowledge) {
      return [];
    }
    return this.knowledge.entries.filter(
      entry => (entry.metadata?.priority ?? 1) >= minPriority
    );
  }

  /**
   * Get entries by multiple filters
   */
  filterEntries(filters: {
    categories?: string[];
    tags?: string[];
    minPriority?: number;
  }): KnowledgeEntry[] {
    if (!this.knowledge) {
      return [];
    }

    let filtered = this.knowledge.entries;

    // Filter by categories
    if (filters.categories && filters.categories.length > 0) {
      const lowerCategories = filters.categories.map(c => c.toLowerCase());
      filtered = filtered.filter(entry =>
        lowerCategories.includes(entry.category.toLowerCase())
      );
    }

    // Filter by tags
    if (filters.tags && filters.tags.length > 0) {
      const lowerTags = filters.tags.map(t => t.toLowerCase());
      filtered = filtered.filter(entry => {
        if (!entry.metadata?.tags) {
          return false;
        }
        return entry.metadata.tags.some(tag =>
          lowerTags.includes(tag.toLowerCase())
        );
      });
    }

    // Filter by priority
    if (filters.minPriority !== undefined) {
      filtered = filtered.filter(
        entry => (entry.metadata?.priority ?? 1) >= filters.minPriority!
      );
    }

    return filtered;
  }

  /**
   * Format entries as a context string for LLM prompts
   */
  formatForPrompt(entries?: KnowledgeEntry[]): string {
    const entriesToFormat = entries ?? this.getAllEntries();
    
    if (entriesToFormat.length === 0) {
      return 'No knowledge available.';
    }

    // Sort by priority (higher first) and then by category
    const sorted = [...entriesToFormat].sort((a, b) => {
      const priorityA = a.metadata?.priority ?? 1;
      const priorityB = b.metadata?.priority ?? 1;
      
      if (priorityA !== priorityB) {
        return priorityB - priorityA; // Higher priority first
      }
      
      return a.category.localeCompare(b.category);
    });

    // Group by category
    const grouped = sorted.reduce((acc, entry) => {
      if (!acc[entry.category]) {
        acc[entry.category] = [];
      }
      acc[entry.category].push(entry);
      return acc;
    }, {} as Record<string, KnowledgeEntry[]>);

    // Format as structured text
    let context = '';
    
    for (const [category, categoryEntries] of Object.entries(grouped)) {
      context += `\n## ${category.toUpperCase()}\n\n`;
      
      categoryEntries.forEach(entry => {
        context += `${entry.content}\n\n`;
      });
    }

    return context.trim();
  }

  /**
   * Get formatted context with size validation
   * Automatically truncates if exceeds maxContextSize
   */
  getContext(filters?: {
    categories?: string[];
    tags?: string[];
    minPriority?: number;
  }): string {
    let entries = filters 
      ? this.filterEntries(filters)
      : this.getAllEntries();

    // If no filters applied, use priority threshold from config
    if (!filters) {
      entries = entries.filter(
        entry => (entry.metadata?.priority ?? 1) >= this.config.priorityThreshold
      );
    }

    let context = this.formatForPrompt(entries);

    // Validate and truncate if necessary
    if (context.length > this.config.maxContextSize) {
      console.warn(
        `Context size (${context.length}) exceeds maximum (${this.config.maxContextSize}). Truncating...`
      );
      
      // Try with higher priority entries only
      const highPriorityEntries = entries.filter(
        entry => (entry.metadata?.priority ?? 1) >= 1
      );
      
      context = this.formatForPrompt(highPriorityEntries);
      
      // If still too large, truncate
      if (context.length > this.config.maxContextSize) {
        context = context.substring(0, this.config.maxContextSize - 100) + 
          '\n\n[Context truncated due to size limits]';
      }
    }

    return context;
  }

  /**
   * Get knowledge base metadata
   */
  getMetadata(): { version: string; lastUpdated?: string; entryCount: number } | null {
    if (!this.knowledge) {
      return null;
    }
    
    return {
      version: this.knowledge.version,
      lastUpdated: this.knowledge.lastUpdated,
      entryCount: this.knowledge.entries.length,
    };
  }

  /**
   * Get all unique categories
   */
  getCategories(): string[] {
    if (!this.knowledge) {
      return [];
    }
    
    const categories = new Set(
      this.knowledge.entries.map(entry => entry.category)
    );
    
    return Array.from(categories).sort();
  }

  /**
   * Get all unique tags
   */
  getTags(): string[] {
    if (!this.knowledge) {
      return [];
    }
    
    const tags = new Set<string>();
    
    this.knowledge.entries.forEach(entry => {
      entry.metadata?.tags?.forEach(tag => tags.add(tag));
    });
    
    return Array.from(tags).sort();
  }

  /**
   * Search entries by content
   */
  search(query: string): KnowledgeEntry[] {
    if (!this.knowledge || !query) {
      return [];
    }

    const lowerQuery = query.toLowerCase();
    
    return this.knowledge.entries.filter(entry => {
      // Search in content
      if (entry.content.toLowerCase().includes(lowerQuery)) {
        return true;
      }
      
      // Search in category
      if (entry.category.toLowerCase().includes(lowerQuery)) {
        return true;
      }
      
      // Search in tags
      if (entry.metadata?.tags?.some(tag => 
        tag.toLowerCase().includes(lowerQuery)
      )) {
        return true;
      }
      
      return false;
    });
  }
}

// Export a singleton instance for convenience
export const knowledgeManager = new KnowledgeManager();
