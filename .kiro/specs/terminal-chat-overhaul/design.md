# Design Document

## Overview

This design transforms the existing RHEL-style terminal portfolio into a production-grade terminal emulator with dual AI chat capabilities. The architecture remains a pure client-side React application with direct API integrations to Gemini and Ollama/vLLM. The design emphasizes authenticity, performance, and maintainability while eliminating all test files and markdown documentation per requirements.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     React Application                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Terminal Component                       │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐ │  │
│  │  │   Display   │  │   Command    │  │    Chat     │ │  │
│  │  │   Engine    │  │   Processor  │  │   Manager   │ │  │
│  │  └─────────────┘  └──────────────┘  └─────────────┘ │  │
│  └───────────────────────────────────────────────────────┘  │
│                           │                                  │
│  ┌────────────────────────┼──────────────────────────────┐  │
│  │                        ▼                              │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │  │
│  │  │   YAML FS    │  │  Knowledge   │  │   Config   │ │  │
│  │  │   Loader     │  │   Manager    │  │   Store    │ │  │
│  │  └──────────────┘  └──────────────┘  └────────────┘ │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
┌───────────────┐  ┌──────────────┐  ┌──────────────┐
│  Gemini API   │  │ Ollama/vLLM  │  │   Browser    │
│  (chatapi)    │  │   (chat)     │  │   Storage    │
└───────────────┘  └──────────────┘  └──────────────┘
```

### Component Breakdown

**Terminal Component** - Main UI component rendering the terminal interface with authentic RHEL styling
**Display Engine** - Handles text rendering, cursor management, scrolling, and color formatting
**Command Processor** - Parses and executes commands, manages filesystem navigation
**Chat Manager** - Orchestrates chat sessions for both Gemini and local LLM modes
**YAML FS Loader** - Parses YAML filesystem configuration and builds in-memory filesystem
**Knowledge Manager** - Loads and manages knowledge.json for AI context
**Config Store** - Centralized configuration management

## Components and Interfaces

### Core Types

```typescript
// Filesystem types
interface FSNode {
  type: 'file' | 'directory' | 'script';
  content?: string;
  contentRef?: string; // Reference to external file
  children?: Record<string, FSNode>;
  permissions?: string;
  metadata?: {
    size?: number;
    modified?: string;
    owner?: string;
  };
  action?: {
    type: 'open_link' | 'open_modal' | 'execute_command';
    target: string;
  };
}

interface FileSystem {
  root: FSNode;
  currentPath: string[];
}

// Knowledge base types
interface KnowledgeEntry {
  id: string;
  category: string;
  content: string;
  metadata?: {
    tags?: string[];
    priority?: number;
    lastUpdated?: string;
  };
}

interface KnowledgeBase {
  version: string;
  entries: KnowledgeEntry[];
}

// Chat types
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

interface ChatSession {
  mode: 'gemini' | 'local' | null;
  messages: ChatMessage[];
  streaming: boolean;
}

// Terminal state
interface TerminalState {
  history: HistoryEntry[];
  filesystem: FileSystem;
  chatSession: ChatSession;
  config: TerminalConfig;
  knowledge: KnowledgeBase;
}

interface HistoryEntry {
  command: string;
  output: string[];
  timestamp: number;
  exitCode: number;
}
```

### Terminal Component

Main component managing terminal state and rendering. Uses custom hook `useTerminal` for all logic.

**Props**: None (self-contained)
**State**: Managed via useTerminal hook
**Rendering**: Full-screen terminal with input line, history display, and cursor

Key features:
- Authentic RHEL color scheme using CSS variables
- JetBrains Mono or Fira Code font
- Smooth scrolling with auto-scroll to bottom
- Block cursor with proper positioning
- Keyboard event handling for all terminal interactions

### useTerminal Hook

Central state management and command processing logic.

**Responsibilities**:
- Command parsing and execution
- Filesystem navigation
- Chat mode management
- History tracking
- Configuration loading

**Key Functions**:
```typescript
executeCommand(input: string): Promise<void>
navigateDirectory(path: string): boolean
enterChatMode(mode: 'gemini' | 'local'): void
exitChatMode(): void
sendChatMessage(message: string): Promise<void>
loadFilesystem(): void
loadKnowledge(): void
```

### YAML Filesystem Loader

Parses YAML configuration and builds filesystem structure.

**Input**: filesystem.yml
**Output**: FileSystem object

YAML structure:
```yaml
# Root directory
/:
  type: directory
  children:
    home:
      type: directory
      children:
        saptarshi:
          type: directory
          children:
            about:
              type: directory
              children:
                bio.txt:
                  type: file
                  content: "Software engineer passionate about..."
                resume.sh:
                  type: script
                  action:
                    type: open_link
                    target: "https://resume-url.com"
            projects:
              type: directory
              children:
                project1:
                  type: directory
                  children:
                    README.txt:
                      type: file
                      contentRef: "projects/project1.txt"
```

Features:
- Nested directory support with indentation
- Inline content for small files
- Content references for larger files
- Script actions (open_link, open_modal, execute_command)
- Metadata support (permissions, timestamps)
- Comment support for documentation

### Knowledge Manager

Loads and formats knowledge.json for AI context.

**Input**: knowledge.json
**Output**: Formatted context string for LLM prompts

Knowledge structure:
```json
{
  "version": "1.0",
  "entries": [
    {
      "id": "bio_001",
      "category": "personal",
      "content": "Saptarshi is a software engineer...",
      "metadata": {
        "tags": ["background", "education"],
        "priority": 1
      }
    }
  ]
}
```

Functions:
- Load and validate knowledge.json
- Format entries into context string
- Filter by category or tags
- Ensure context fits within token limits

### Chat Manager

Handles both Gemini and local LLM chat sessions.

**Gemini Integration**:
- Uses Google Generative AI SDK
- Streaming API with token-by-token display
- System prompt with knowledge context and guardrails
- Error handling for API failures

**Local LLM Integration**:
- HTTP requests to Ollama or vLLM endpoint
- Streaming response handling
- Connection error recovery
- Configurable endpoint URL

**Guardrails Implementation**:
System prompt template:
```
You are an AI assistant for Saptarshi's portfolio terminal. Your role is to answer questions about Saptarshi based on the provided knowledge base.

STRICT RULES:
1. Only answer questions about Saptarshi, his work, skills, projects, and experience
2. If asked about unrelated topics, politely decline and redirect to Saptarshi-related topics
3. If the knowledge base doesn't contain the answer, admit you don't know rather than guessing
4. Refuse inappropriate or harmful questions professionally
5. Keep responses concise and terminal-appropriate

KNOWLEDGE BASE:
{knowledge_context}

Respond in a professional, helpful manner while staying strictly on topic.
```

### Command Processor

Executes terminal commands with authentic bash behavior.

**Supported Commands**:
- `ls [-la] [path]` - List directory contents with optional flags
- `cd [path]` - Change directory (supports ., .., -, ~)
- `pwd` - Print working directory
- `cat <file>...` - Display file contents
- `tree [path]` - Display directory tree
- `vi <file>` - View file (read-only)
- `echo <text>` - Print text
- `whoami` - Display user info
- `history` - Show command history
- `clear` - Clear screen
- `help` - Show available commands
- `chatapi` - Enter Gemini chat mode
- `chat` - Enter local LLM chat mode

**Command Parsing**:
```typescript
interface ParsedCommand {
  command: string;
  args: string[];
  flags: Record<string, boolean | string>;
}

function parseCommand(input: string): ParsedCommand {
  // Parse command, arguments, and flags
  // Handle quoted strings
  // Support flag formats: -l, --long, --color=auto
}
```

**Error Handling**:
- Exact bash error message formats
- Proper exit codes
- Command not found: "bash: <command>: command not found"
- File not found: "cat: <file>: No such file or directory"
- Permission denied: "bash: <file>: Permission denied"

### Display Engine

Renders terminal output with authentic styling.

**Features**:
- ANSI color code support
- Syntax highlighting for file types
- Box-drawing characters for tree command
- Proper line wrapping
- Cursor positioning and blinking
- Smooth scrolling

**Color Scheme** (RHEL/xterm-256color):
```typescript
const colors = {
  background: '#1C1C1C',
  foreground: '#D0D0D0',
  black: '#000000',
  red: '#CD0000',
  green: '#00CD00',
  yellow: '#CDCD00',
  blue: '#0000EE',
  magenta: '#CD00CD',
  cyan: '#00CDCD',
  white: '#E5E5E5',
  brightBlack: '#7F7F7F',
  brightRed: '#FF0000',
  brightGreen: '#00FF00',
  brightYellow: '#FFFF00',
  brightBlue: '#5C5CFF',
  brightMagenta: '#FF00FF',
  brightCyan: '#00FFFF',
  brightWhite: '#FFFFFF',
  prompt: '#5F87FF',
  directory: '#5FAFFF',
  file: '#D0D0D0',
  executable: '#00FF00',
  link: '#00FFFF'
};
```

**Typography**:
- Primary: JetBrains Mono
- Fallback: Fira Code, Consolas, monospace
- Font size: 14px
- Line height: 1.5
- Letter spacing: 0.5px

## Data Models

### Filesystem Model

In-memory tree structure representing the virtual filesystem.

```typescript
class FileSystemManager {
  private root: FSNode;
  private currentPath: string[];
  
  constructor(yamlConfig: string) {
    this.root = this.parseYAML(yamlConfig);
    this.currentPath = ['home', 'saptarshi'];
  }
  
  navigate(path: string): boolean;
  getCurrentNode(): FSNode;
  resolvePath(path: string): string[];
  listDirectory(path?: string): FSNode[];
  readFile(path: string): string | null;
  executeScript(path: string): void;
}
```

### Knowledge Model

Structured knowledge base for AI context.

```typescript
class KnowledgeManager {
  private knowledge: KnowledgeBase;
  
  constructor(jsonData: string) {
    this.knowledge = JSON.parse(jsonData);
    this.validate();
  }
  
  getContext(): string;
  filterByCategory(category: string): KnowledgeEntry[];
  filterByTags(tags: string[]): KnowledgeEntry[];
  formatForPrompt(): string;
}
```

### Chat Model

Chat session state and message history.

```typescript
class ChatManager {
  private session: ChatSession;
  private knowledgeContext: string;
  
  async startGeminiChat(): Promise<void>;
  async startLocalChat(): Promise<void>;
  async sendMessage(message: string): Promise<void>;
  async streamResponse(response: ReadableStream): Promise<void>;
  exitChat(): void;
  private buildSystemPrompt(): string;
  private checkGuardrails(message: string): boolean;
}
```

## Error Handling

### Command Errors

All errors follow bash conventions:
- Exit code 0: Success
- Exit code 1: General error
- Exit code 2: Misuse of command
- Exit code 127: Command not found

Error message formats:
```
bash: <command>: command not found
cat: <file>: No such file or directory
cd: <directory>: Not a directory
bash: <file>: Permission denied
```

### API Errors

**Gemini API**:
- Network errors: Display connection error, remain in chat mode
- API key errors: Show configuration instructions
- Rate limiting: Display retry message
- Invalid response: Log error, show generic error message

**Local LLM**:
- Connection refused: Show setup instructions, exit chat mode
- Timeout: Display timeout message, allow retry
- Invalid endpoint: Show configuration error

### Filesystem Errors

- Invalid path: "No such file or directory"
- Not a directory: "Not a directory"
- Permission denied: "Permission denied"
- File not found: "No such file or directory"

### Configuration Errors

- Invalid YAML: Display parse error with line number
- Invalid JSON: Display parse error
- Missing required fields: Show validation error
- Schema mismatch: Display detailed validation message

## Testing Strategy

Per requirements, NO test files will be created. Code quality ensured through:

1. **Type Safety**: Strict TypeScript with no implicit any
2. **Inline Validation**: Runtime checks with descriptive errors
3. **JSDoc Comments**: Comprehensive inline documentation
4. **Error Boundaries**: React error boundaries for graceful failures
5. **Console Logging**: Development mode logging for debugging
6. **Manual Testing**: Comprehensive manual testing checklist in README

## Implementation Details

### Boot Sequence

Realistic RHEL boot animation on initial load:

```
[  OK  ] Started Terminal Session
[  OK  ] Reached target Multi-User System
         Starting GNOME Display Manager...
[  OK  ] Started GNOME Display Manager

Red Hat Enterprise Linux 8.5 (Ootpa)
Kernel 4.18.0-348.el8.x86_64 on an x86_64

saptarshi-portfolio login: saptarshi
Password: 
Last login: Sat Nov 8 2025 from 192.168.1.100

[saptarshi@portfolio ~]$ 
```

### Prompt Format

Authentic bash prompt with color coding:

```
[username@hostname current_directory]$ 
```

Colors:
- Username: bright green
- @: white
- Hostname: bright green
- Directory: bright blue
- $: white

### Chat Mode Prompt

Python REPL-style prompt for chat modes:

```
>>> your message here
AI response streams here...
>>> 
```

### Easter Eggs

Subtle, non-intrusive easter eggs:
1. `sl` - ASCII train animation (typo of ls)
2. `cowsay` - ASCII cow with message
3. `fortune` - Random tech quotes
4. `sudo rm -rf /` - Humorous warning
5. `hack` - Matrix-style animation

All easter eggs maintain terminal aesthetic and don't break immersion.

### Performance Optimizations

- Virtual scrolling for long history
- Debounced input handling
- Lazy loading of file contents
- Memoized component rendering
- Efficient state updates with useReducer
- Stream processing for chat responses

### Accessibility

- Semantic HTML structure
- ARIA labels for screen readers
- Keyboard navigation support
- High contrast mode support
- Reduced motion support
- Focus management

## Configuration Files

### filesystem.yml

Complete filesystem structure in YAML format. Located at `src/config/filesystem.yml`.

### knowledge.json

AI knowledge base. Located at `public/knowledge.json` for easy updates.

### terminal.config.ts

Terminal configuration including:
- Color scheme
- Font settings
- API endpoints
- Feature flags
- Easter egg definitions

### .env

Environment variables:
```
VITE_GEMINI_API_KEY=your_key_here
VITE_LOCAL_LLM_ENDPOINT=http://localhost:11434
VITE_ENABLE_CHAT=true
```

## Deployment Considerations

- Static build output
- Environment variable injection at build time
- API keys secured via environment variables
- CORS configuration for API calls
- CDN-ready static assets
- Service worker for offline support (optional)

## Migration Path

From current implementation:
1. Replace terminal.json with filesystem.yml
2. Add knowledge.json
3. Integrate Gemini SDK
4. Add Ollama/vLLM client
5. Enhance command processor
6. Update styling for authenticity
7. Remove all test files
8. Update README with new instructions