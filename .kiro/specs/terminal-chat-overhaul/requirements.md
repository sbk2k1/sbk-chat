# Requirements Document

## Introduction

This spec outlines a comprehensive overhaul of the RHEL-style terminal portfolio chat application. The current implementation lacks polish and authenticity compared to real Linux terminals, and the chat functionality is only simulated. This overhaul will transform it into a production-ready terminal experience with dual AI chat implementations (Gemini with MongoDB vector search and local Ollama/vLLM), proper guardrails, and a YAML-based filesystem configuration system. The focus is on creating a hardcore Linux experience without tacky elements, while maintaining a few easter eggs for personality.

## Requirements

### Requirement 1: Authentic RHEL Terminal Experience

**User Story:** As a user visiting the portfolio, I want to experience an authentic RHEL-style terminal interface that feels polished and realistic, so that I'm immersed in a genuine command-line environment.

#### Acceptance Criteria

1. WHEN the terminal loads THEN the system SHALL display a realistic RHEL boot sequence with proper GRUB-style messages and kernel initialization logs
2. WHEN displaying text THEN the system SHALL use authentic terminal fonts (JetBrains Mono or Fira Code) with proper character spacing and line height
3. WHEN rendering the prompt THEN the system SHALL display an authentic bash prompt format with username, hostname, and current directory path
4. WHEN displaying colors THEN the system SHALL use authentic RHEL/CentOS terminal color palette matching real xterm-256color schemes
5. WHEN executing commands THEN the system SHALL provide realistic timing delays and output formatting matching actual bash behavior
6. WHEN displaying errors THEN the system SHALL use exact bash error message formats and exit codes
7. WHEN the user types THEN the system SHALL display a proper block cursor that doesn't blink excessively
8. WHEN scrolling THEN the system SHALL implement smooth scrolling behavior matching real terminal emulators

### Requirement 2: Gemini Streaming Chat with Knowledge Context

**User Story:** As a user, I want to interact with an AI chatbot powered by Gemini that has access to knowledge about Saptarshi, so that I can get accurate and contextual responses about him.

#### Acceptance Criteria

1. WHEN the user types "chatapi" THEN the system SHALL enter Gemini chat mode with a Python REPL-style prompt
2. WHEN the application loads THEN it SHALL fetch and parse knowledge.json containing information about Saptarshi
3. WHEN a user sends a message in chatapi mode THEN the system SHALL include the entire knowledge.json content in the system prompt as context
4. WHEN calling the Gemini API THEN the system SHALL use the streaming endpoint to receive responses token-by-token
5. WHEN Gemini responds THEN the system SHALL display the streamed response with a realistic typing effect
6. WHEN streaming responses THEN the system SHALL handle partial tokens and display them progressively
7. WHEN the Gemini API returns an error THEN the system SHALL display an appropriate error message and remain in chat mode
8. WHEN the API key is missing or invalid THEN the system SHALL display a configuration error with instructions
9. WHEN the user types "exit" or presses Ctrl+C THEN the system SHALL exit chat mode and return to the shell prompt

### Requirement 3: Local Ollama/vLLM Chat Implementation

**User Story:** As a user running the application locally, I want to use a custom local LLM via Ollama or vLLM, so that I can have private conversations without external API dependencies.

#### Acceptance Criteria

1. WHEN the user types "chat" THEN the system SHALL enter local LLM chat mode with a Python REPL-style prompt
2. WHEN a message is sent in chat mode THEN the system SHALL send the request to the configured Ollama or vLLM endpoint
3. WHEN the local LLM responds THEN the system SHALL stream the response token-by-token to the terminal
4. WHEN the local LLM endpoint is unreachable THEN the system SHALL display a connection error message and exit chat mode
5. WHEN streaming from local LLM THEN the system SHALL handle backpressure and connection interruptions gracefully
6. WHEN the user types "exit" or presses Ctrl+C THEN the system SHALL exit chat mode and return to the shell prompt
7. IF the local LLM is not configured THEN the system SHALL display a helpful error message with setup instructions

### Requirement 4: AI Response Guardrails

**User Story:** As the portfolio owner, I want the AI chatbots to only answer questions about Saptarshi and refuse off-topic queries, so that the chat experience stays focused and professional.

#### Acceptance Criteria

1. WHEN a user asks a question about Saptarshi THEN the system SHALL provide a relevant answer based on the knowledge base
2. WHEN a user asks an off-topic question THEN the system SHALL politely decline and redirect to Saptarshi-related topics
3. WHEN a user asks inappropriate or harmful questions THEN the system SHALL refuse to answer and provide a professional response
4. WHEN implementing guardrails THEN the system SHALL use a system prompt that enforces topic boundaries
5. WHEN a borderline question is asked THEN the system SHALL attempt to relate it back to Saptarshi's work or interests if possible
6. WHEN guardrails are triggered THEN the system SHALL log the interaction for monitoring purposes
7. WHEN the knowledge base lacks information THEN the system SHALL admit uncertainty rather than hallucinating

### Requirement 5: Client-Side Knowledge Management

**User Story:** As a developer, I want to manage Saptarshi's knowledge in a simple JSON file that loads client-side, so that the chatbot has context without requiring a backend infrastructure.

#### Acceptance Criteria

1. WHEN the application initializes THEN it SHALL load knowledge.json from the public directory or as an imported module
2. WHEN knowledge.json is loaded THEN the system SHALL validate its structure and log any parsing errors
3. WHEN the knowledge is parsed THEN it SHALL be stored in application state for use in chat prompts
4. WHEN updating knowledge.json THEN the system SHALL hot-reload the content in development mode
5. WHEN the knowledge file is missing THEN the system SHALL display a warning and operate in limited mode
6. WHEN passing knowledge to LLMs THEN the system SHALL format it as a structured context string in the system prompt
7. WHEN the knowledge is large THEN the system SHALL ensure it fits within the LLM's context window limits

### Requirement 6: Sample Knowledge Base

**User Story:** As a developer, I want a well-structured sample knowledge.json file with comprehensive information about Saptarshi, so that the chatbot has rich context to work with.

#### Acceptance Criteria

1. WHEN knowledge.json is created THEN it SHALL contain structured information about Saptarshi's background, skills, projects, and experience
2. WHEN structuring knowledge entries THEN each entry SHALL have a unique ID, category, content, and metadata fields
3. WHEN organizing content THEN the system SHALL include sections for: bio, technical skills, projects, work experience, interests, and contact information
4. WHEN writing content THEN entries SHALL be concise, factual, and written in a consistent voice
5. WHEN creating the schema THEN it SHALL support nested objects and arrays for complex information
6. WHEN defining categories THEN they SHALL align with the existing filesystem structure for consistency
7. WHEN the knowledge base is loaded THEN it SHALL be validated against a JSON schema to ensure data integrity

### Requirement 7: YAML-Based Filesystem Configuration

**User Story:** As a developer, I want to define the terminal filesystem structure using a simple YAML file instead of JSON, so that I can easily create and modify directories and files with proper hierarchy.

#### Acceptance Criteria

1. WHEN defining the filesystem THEN the system SHALL use a YAML configuration file instead of terminal.json
2. WHEN parsing YAML THEN the system SHALL support nested directory structures with intuitive indentation-based hierarchy
3. WHEN defining files THEN the system SHALL support inline content for small files and file references for larger content
4. WHEN defining scripts THEN the system SHALL support action types (open_link, open_modal, execute_command)
5. WHEN the YAML is loaded THEN the system SHALL validate the structure and report errors with line numbers
6. WHEN updating the YAML THEN the system SHALL hot-reload the filesystem without requiring application restart
7. WHEN defining permissions THEN the system SHALL support read-only flags and permission metadata per file/directory
8. WHEN organizing content THEN the YAML SHALL support comments for documentation and organization

### Requirement 8: Enhanced Command Implementation

**User Story:** As a user, I want the terminal commands to behave exactly like real Linux commands with proper flags and output formatting, so that the experience feels authentic.

#### Acceptance Criteria

1. WHEN executing "ls -la" THEN the system SHALL display detailed file listings with permissions, owner, size, and timestamps
2. WHEN executing "ls --color=auto" THEN the system SHALL apply proper color coding to different file types
3. WHEN executing "cd" without arguments THEN the system SHALL navigate to the home directory
4. WHEN executing "cd -" THEN the system SHALL navigate to the previous directory
5. WHEN executing "pwd" THEN the system SHALL display the full absolute path
6. WHEN executing "cat" on multiple files THEN the system SHALL concatenate and display all files in order
7. WHEN executing "tree" THEN the system SHALL display the directory tree with proper box-drawing characters
8. WHEN executing invalid commands THEN the system SHALL display exact bash error messages with proper formatting

### Requirement 9: Remove Test Files and Documentation

**User Story:** As a developer, I want the codebase to exclude test files and markdown documentation files, so that the implementation stays lean and focused on production code.

#### Acceptance Criteria

1. WHEN implementing features THEN the system SHALL NOT create any .test.ts, .test.tsx, .spec.ts, or .spec.tsx files
2. WHEN documenting code THEN the system SHALL use inline comments and JSDoc instead of separate markdown files
3. WHEN creating the project structure THEN the system SHALL NOT include a tests/ or __tests__/ directory
4. WHEN implementing components THEN the system SHALL include inline documentation sufficient for understanding
5. WHEN the build process runs THEN it SHALL NOT include any testing frameworks or test runners
6. WHEN creating documentation THEN the system SHALL update only the existing README.md with setup instructions
7. WHEN writing code THEN the system SHALL prioritize self-documenting code with clear naming and structure

### Requirement 10: Easter Eggs and Personality

**User Story:** As a user exploring the terminal, I want to discover subtle easter eggs that add personality without being tacky, so that the experience is both professional and memorable.

#### Acceptance Criteria

1. WHEN executing specific commands THEN the system SHALL reveal easter eggs that are contextually appropriate
2. WHEN displaying easter eggs THEN they SHALL maintain the hardcore Linux aesthetic without breaking immersion
3. WHEN implementing easter eggs THEN they SHALL be discoverable but not obvious or intrusive
4. WHEN easter eggs are triggered THEN they SHALL provide brief, witty responses in line with terminal culture
5. WHEN designing easter eggs THEN they SHALL relate to Saptarshi's interests, tech culture, or Linux humor
6. WHEN a user discovers an easter egg THEN it SHALL not interfere with normal terminal operations
7. WHEN implementing easter eggs THEN the system SHALL include no more than 5-7 total to maintain subtlety
