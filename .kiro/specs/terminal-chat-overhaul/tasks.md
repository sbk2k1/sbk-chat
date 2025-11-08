# Implementation Plan

- [x] 1. Setup project dependencies and configuration
  - Install required packages: js-yaml, @google/generative-ai
  - Create .env.example with API key placeholders
  - Update vite.config.ts to handle YAML imports
  - Create terminal.config.ts with color schemes and settings
  - _Requirements: 1.1, 1.2, 1.3, 1.4_
  - _NO TESTS, NO MARKDOWN FILES_

- [x] 2. Create YAML filesystem configuration
  - [x] 2.1 Create filesystem.yml structure
    - Define complete directory hierarchy in YAML format
    - Include all directories: about, projects, experience, skills, interests
    - Add inline content for small files
    - Configure script actions for resume, website links
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
    - _NO TESTS, NO MARKDOWN FILES_
  
  - [x] 2.2 Implement YAML filesystem loader
    - Create FileSystemManager class to parse YAML
    - Build in-memory tree structure from YAML
    - Implement path resolution and navigation methods
    - Add validation for YAML structure
    - _Requirements: 7.5, 7.6, 7.7_
    - _NO TESTS, NO MARKDOWN FILES_

- [x] 3. Create knowledge base
  - [x] 3.1 Create knowledge.json with sample data
    - Structure with categories: bio, skills, projects, experience, interests
    - Add comprehensive entries about Saptarshi
    - Include metadata: tags, priority, timestamps
    - Validate JSON schema
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_
    - _NO TESTS, NO MARKDOWN FILES_
  
  - [x] 3.2 Implement KnowledgeManager class
    - Load and parse knowledge.json
    - Format entries for LLM context
    - Implement filtering by category and tags
    - Add context size validation
    - _Requirements: 5.1, 5.2, 5.3, 5.6_
    - _NO TESTS, NO MARKDOWN FILES_

- [x] 4. Enhance terminal styling for authenticity
  - [x] 4.1 Update CSS with RHEL color scheme
    - Implement xterm-256color palette
    - Configure JetBrains Mono/Fira Code fonts
    - Set proper character spacing and line height
    - Add smooth scrolling styles
    - _Requirements: 1.2, 1.3, 1.7_
    - _NO TESTS, NO MARKDOWN FILES_
  
  - [x] 4.2 Implement boot sequence animation
    - Create realistic RHEL boot messages
    - Add GRUB-style initialization logs
    - Implement timed sequence display
    - Show login prompt after boot
    - _Requirements: 1.1_
    - _NO TESTS, NO MARKDOWN FILES_
  
  - [x] 4.3 Enhance prompt and cursor rendering
    - Implement authentic bash prompt format with colors
    - Create proper block cursor with positioning
    - Add cursor blinking with appropriate timing
    - Style Python REPL prompt for chat modes
    - _Requirements: 1.3, 1.7_
    - _NO TESTS, NO MARKDOWN FILES_

- [x] 5. Migrate terminal to use FileSystemManager and enhance commands
  - [x] 5.1 Integrate FileSystemManager into useTerminal hook
    - Replace terminal.json filesystem with FileSystemManager
    - Update all filesystem operations to use FileSystemManager methods
    - Remove old filesystem logic from useTerminal
    - Test basic navigation and file operations
    - _Requirements: 7.5, 7.6, 7.7_
    - _NO TESTS, NO MARKDOWN FILES_
  
  - [x] 5.2 Create command parser with flag support
    - Parse command, arguments, and flags
    - Handle quoted strings properly
    - Support flag formats: -l, --long, --color=auto
    - Implement command validation
    - _Requirements: 8.1, 8.2, 8.8_
    - _NO TESTS, NO MARKDOWN FILES_
  
  - [x] 5.3 Implement ls command with flags
    - Support -l flag for detailed listing with permissions, size, date
    - Support -a flag for hidden files
    - Implement --color=auto with proper file type colors
    - Format output matching real ls command
    - _Requirements: 8.1, 8.2_
    - _NO TESTS, NO MARKDOWN FILES_
  
  - [x] 5.4 Enhance cd command
    - Support cd without arguments (go to home)
    - Implement cd - (previous directory tracking)
    - Handle . and .. properly (already works via FileSystemManager)
    - Support ~ for home directory (already works via FileSystemManager)
    - _Requirements: 8.3, 8.4_
    - _NO TESTS, NO MARKDOWN FILES_
  
  - [x] 5.5 Implement remaining enhanced commands
    - Update pwd to show full absolute path
    - Enhance cat to support multiple files
    - Update tree to use FileSystemManager
    - Add proper bash-style error messages for all commands
    - _Requirements: 8.5, 8.6, 8.7, 8.8_
    - _NO TESTS, NO MARKDOWN FILES_

- [x] 6. Implement Gemini chat integration




  - [x] 6.1 Setup Gemini API client


    - Install and configure @google/generative-ai SDK (already installed)
    - Create GeminiChatManager class with API client
    - Implement error handling for missing API key
    - Add connection validation
    - _Requirements: 2.8_
    - _NO TESTS, NO MARKDOWN FILES_
  
  - [x] 6.2 Implement chatapi command


    - Create command to enter Gemini chat mode
    - Display Python REPL-style prompt (>>> )
    - Handle mode state transition in useTerminal
    - Implement exit command and Ctrl+C handling
    - _Requirements: 2.1, 2.9_
    - _NO TESTS, NO MARKDOWN FILES_
  
  - [x] 6.3 Implement streaming response handler


    - Use Gemini streaming API endpoint (streamGenerateContent)
    - Display tokens progressively as they arrive
    - Handle partial tokens and buffering
    - Add realistic typing effect with proper timing
    - _Requirements: 2.4, 2.5, 2.6_
    - _NO TESTS, NO MARKDOWN FILES_
  
  - [x] 6.4 Integrate knowledge context


    - Load knowledge.json on app initialization using KnowledgeManager
    - Format knowledge as context string using getContext()
    - Include in system prompt for every request
    - Ensure context fits within token limits
    - _Requirements: 2.2, 2.3, 5.6_
    - _NO TESTS, NO MARKDOWN FILES_
  
  - [x] 6.5 Implement guardrails system prompt


    - Create system prompt template with strict rules
    - Enforce topic boundaries (Saptarshi-only)
    - Handle inappropriate questions professionally
    - Admit uncertainty when knowledge is lacking
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.7_
    - _NO TESTS, NO MARKDOWN FILES_
  
  - [x] 6.6 Add error handling for Gemini API


    - Handle network errors gracefully
    - Display API key configuration errors
    - Manage rate limiting with retry messages
    - Log errors for debugging
    - _Requirements: 2.7, 2.8_
    - _NO TESTS, NO MARKDOWN FILES_

- [x] 7. Implement local LLM chat integration




  - [x] 7.1 Create Ollama/vLLM HTTP client


    - Implement LocalLLMChatManager class with HTTP client
    - Configure endpoint URL from environment (VITE_LOCAL_LLM_ENDPOINT)
    - Add connection timeout handling
    - Implement streaming response parsing
    - _Requirements: 3.2, 3.4_
    - _NO TESTS, NO MARKDOWN FILES_
  
  - [x] 7.2 Implement chat command


    - Create command to enter local LLM mode
    - Display Python REPL-style prompt (>>> )
    - Handle mode state transition in useTerminal
    - Implement exit command and Ctrl+C handling
    - _Requirements: 3.1, 3.6_
    - _NO TESTS, NO MARKDOWN FILES_
  
  - [x] 7.3 Implement streaming for local LLM

    - Stream response token-by-token from Ollama/vLLM endpoint
    - Handle backpressure and buffering
    - Manage connection interruptions
    - Display tokens with typing effect
    - _Requirements: 3.3, 3.5_
    - _NO TESTS, NO MARKDOWN FILES_
  
  - [x] 7.4 Add local LLM error handling

    - Handle connection refused errors
    - Display setup instructions when not configured
    - Manage timeout errors with retry option
    - Exit chat mode on fatal errors
    - _Requirements: 3.4, 3.7_
    - _NO TESTS, NO MARKDOWN FILES_
  
  - [x] 7.5 Apply guardrails to local LLM

    - Use same system prompt as Gemini
    - Include knowledge context in requests
    - Enforce topic boundaries
    - Log guardrail triggers
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.6_
    - _NO TESTS, NO MARKDOWN FILES_

- [x] 8. Implement easter eggs





  - Create 5-7 subtle easter eggs
  - Implement sl (train animation)
  - Add cowsay command
  - Create fortune command with tech quotes
  - Add sudo rm -rf / warning
  - Ensure all maintain terminal aesthetic
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_
  - _NO TESTS, NO MARKDOWN FILES_

- [ ] 9. Update configuration and documentation
  - [ ] 9.1 Create environment configuration
    - Update .env.example with all required variables (already done)
    - Document API key setup process in comments
    - Add local LLM endpoint configuration (already done)
    - Include feature flags (already done)
    - _Requirements: 2.8, 3.7_
    - _NO TESTS, NO MARKDOWN FILES_
  
  - [ ] 9.2 Update README with setup instructions
    - Document new chat commands (chatapi, chat)
    - Add API key configuration steps
    - Include local LLM setup instructions
    - Document YAML filesystem configuration
    - Explain knowledge.json structure
    - _Requirements: 5.4, 9.6_
    - _NO TESTS, NO MARKDOWN FILES (except updating existing README)_

- [x] 10. Remove test infrastructure
  - Delete any existing test files (.test.ts, .spec.ts)
  - Remove test directories (__tests__, tests/)
  - Remove testing dependencies from package.json
  - Remove test scripts from package.json
  - _Requirements: 9.1, 9.2, 9.3, 9.5_
  - _NO TESTS, NO MARKDOWN FILES_

- [ ] 11. Final integration and polish
  - [ ] 11.1 Integrate all components
    - Connect chat managers to command processor in useTerminal
    - Integrate knowledge manager with chat modes
    - Ensure smooth transitions between modes
    - Wire script execution (resume.sh, website.sh) to open links (already done)
    - _Requirements: 1.5, 2.9, 3.6_
    - _NO TESTS, NO MARKDOWN FILES_
  
  - [x] 11.2 Add performance optimizations





    - Implement virtual scrolling for history
    - Add debounced input handling
    - Optimize state updates with useReducer
    - Memoize expensive computations
    - _Requirements: 1.8_
    - _NO TESTS, NO MARKDOWN FILES_
  
  - [x] 11.3 Verify authentic terminal behavior








    - Test all commands match bash behavior
    - Verify error messages are exact
    - Check timing delays are realistic
    - Ensure colors match RHEL palette
    - Test script execution and link opening
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.8_
    - _NO TESTS, NO MARKDOWN FILES_
