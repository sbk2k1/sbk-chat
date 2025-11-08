
import { useState, useEffect, useCallback, useMemo, useRef, useReducer } from 'react';
import terminalConfig from '../config/terminal.json';
import { FileSystemManager } from '../lib/FileSystemManager';
import { CommandParser } from '../lib/CommandParser';
import { GeminiChatManager } from '../lib/GeminiChatManager';
import { LocalLLMChatManager } from '../lib/LocalLLMChatManager';
import { KnowledgeManager } from '../lib/KnowledgeManager';
import { DEFAULT_CONFIG } from '../config/terminal.config';
import filesystemYaml from '../config/filesystem.yml?raw';

export interface CommandHistory {
  command: string;
  output: string[];
  timestamp: number;
  prompt?: string;
}

type ChatMode = 'gemini' | 'local' | null;

// State management with useReducer for better performance
interface TerminalState {
  history: CommandHistory[];
  commandHistory: string[];
  historyIndex: number;
  isBooting: boolean;
  chatMode: ChatMode;
  isStreaming: boolean;
}

type TerminalAction =
  | { type: 'ADD_HISTORY'; payload: CommandHistory }
  | { type: 'ADD_COMMAND_HISTORY'; payload: string }
  | { type: 'SET_HISTORY_INDEX'; payload: number }
  | { type: 'SET_BOOTING'; payload: boolean }
  | { type: 'SET_CHAT_MODE'; payload: ChatMode }
  | { type: 'SET_STREAMING'; payload: boolean }
  | { type: 'UPDATE_STREAMING_HISTORY'; payload: { index: number; output: string } }
  | { type: 'CLEAR_HISTORY' };

const terminalReducer = (state: TerminalState, action: TerminalAction): TerminalState => {
  switch (action.type) {
    case 'ADD_HISTORY':
      return {
        ...state,
        history: [...state.history, action.payload],
      };
    case 'ADD_COMMAND_HISTORY':
      return {
        ...state,
        commandHistory: [...state.commandHistory, action.payload].slice(-50),
        historyIndex: -1,
      };
    case 'SET_HISTORY_INDEX':
      return {
        ...state,
        historyIndex: action.payload,
      };
    case 'SET_BOOTING':
      return {
        ...state,
        isBooting: action.payload,
      };
    case 'SET_CHAT_MODE':
      return {
        ...state,
        chatMode: action.payload,
      };
    case 'SET_STREAMING':
      return {
        ...state,
        isStreaming: action.payload,
      };
    case 'UPDATE_STREAMING_HISTORY':
      const newHistory = [...state.history];
      const targetIndex = action.payload.index;

      if (targetIndex >= 0 && targetIndex < newHistory.length) {
        newHistory[targetIndex] = {
          ...newHistory[targetIndex],
          output: [action.payload.output],
        };
      } else {
        newHistory.push({
          command: '',
          output: [action.payload.output],
          timestamp: Date.now(),
        });
      }

      return {
        ...state,
        history: newHistory,
      };
    case 'CLEAR_HISTORY':
      return {
        ...state,
        history: [],
      };
    default:
      return state;
  }
};

const initialState: TerminalState = {
  history: [],
  commandHistory: [],
  historyIndex: -1,
  isBooting: true,
  chatMode: null,
  isStreaming: false,
};

export const useTerminal = () => {
  const [state, dispatch] = useReducer(terminalReducer, initialState);

  // Refs for streaming response
  const streamingOutputRef = useRef<string>('');
  const streamingHistoryIndexRef = useRef<number>(-1);

  // Initialize FileSystemManager
  const fsManager = useMemo(() => {
    try {
      return new FileSystemManager(filesystemYaml);
    } catch (error) {
      console.error('Failed to initialize filesystem:', error);
      throw error;
    }
  }, []);

  // Initialize KnowledgeManager
  const knowledgeManager = useMemo(() => new KnowledgeManager({
    maxContextSize: 8000,
    priorityThreshold: 1,
  }), []);

  // Initialize GeminiChatManager
  const geminiManager = useMemo(() => {
    try {
      return new GeminiChatManager({
        apiKey: DEFAULT_CONFIG.api.geminiKey,
        model: 'gemini-2.0-flash-exp',
        temperature: 0.7,
      });
    } catch (error) {
      console.error('Failed to initialize Gemini chat manager:', error);
      return null;
    }
  }, []);

  // Initialize LocalLLMChatManager
  const localLLMManager = useMemo(() => {
    try {
      return new LocalLLMChatManager({
        endpoint: DEFAULT_CONFIG.api.localLLMEndpoint,
        model: 'llama2',
        temperature: 0.7,
      });
    } catch (error) {
      console.error('Failed to initialize local LLM chat manager:', error);
      return null;
    }
  }, []);

  // Memoize available commands list for autocomplete
  const availableCommands = useMemo(() => {
    return [...terminalConfig.commands.working, ...Object.keys(terminalConfig.commands.aliases)];
  }, []);

  // Load knowledge base on mount
  useEffect(() => {
    const loadKnowledge = async () => {
      try {
        await knowledgeManager.loadFromUrl('/knowledge.json');
        console.log('Knowledge base loaded successfully');

        const metadata = knowledgeManager.getMetadata();
        if (metadata) {
          console.log(`Loaded ${metadata.entryCount} knowledge entries (version ${metadata.version})`);
        }
      } catch (error) {
        console.error('Failed to load knowledge base:', error);
      }
    };

    loadKnowledge();
  }, [knowledgeManager]);

  useEffect(() => {
    // Boot sequence with realistic RHEL messages
    const bootMessages = [
      '<span class="boot-ok">[  OK  ]</span> Started Terminal Session',
      '<span class="boot-ok">[  OK  ]</span> Reached target Multi-User System',
      '         Starting GNOME Display Manager...',
      '<span class="boot-ok">[  OK  ]</span> Started GNOME Display Manager',
      '',
      'Red Hat Enterprise Linux 8.5 (Ootpa)',
      'Kernel 4.18.0-348.el8.x86_64 on an x86_64',
      '',
    ];

    let messageIndex = 0;
    const displayNextMessage = () => {
      if (messageIndex < bootMessages.length) {
        addToHistory('', [bootMessages[messageIndex]]);
        messageIndex++;
        setTimeout(displayNextMessage, messageIndex === 3 ? 400 : 150);
      } else {
        // Show login sequence
        setTimeout(() => {
          addToHistory('', ['saptarshi-portfolio login: <span style="color: var(--terminal-bright-green)">saptarshi</span>']);
          setTimeout(() => {
            addToHistory('', ['Password: ']);
            setTimeout(() => {
              addToHistory('', [
                'Last login: Sat Nov 8 2025 from 192.168.1.100',
                '',
                terminalConfig.startup.ascii_banner || '',
                '',
                terminalConfig.startup.quote || '',
                '',
                'Type "help" to see available commands.',
                ''
              ]);
              dispatch({ type: 'SET_BOOTING', payload: false });
            }, 800);
          }, 600);
        }, 300);
      }
    };

    const bootTimer = setTimeout(displayNextMessage, 200);

    return () => clearTimeout(bootTimer);
  }, []);

  const addToHistory = useCallback((command: string, output: string[], prompt?: string) => {
    dispatch({
      type: 'ADD_HISTORY',
      payload: {
        command,
        output,
        timestamp: Date.now(),
        prompt
      }
    });
  }, []);

  /**
   * Build system prompt with guardrails and knowledge context
   */
  const buildSystemPrompt = useCallback(() => {
    const knowledgeContext = knowledgeManager.getContext();

    return `You are an AI assistant for Saptarshi's portfolio terminal. Your role is to answer questions about Saptarshi based on the provided knowledge base.

STRICT RULES:
1. Only answer questions about Saptarshi, his work, skills, projects, and experience
2. If asked about unrelated topics, politely decline and redirect to Saptarshi-related topics
3. If the knowledge base doesn't contain the answer, admit you don't know rather than guessing or making up information
4. Refuse inappropriate or harmful questions professionally
5. Keep responses concise and terminal-appropriate (avoid excessive formatting)
6. Be helpful, friendly, and professional in your responses
7. If a question is borderline, try to relate it back to Saptarshi's work or interests if possible

KNOWLEDGE BASE:
${knowledgeContext}

Remember: You are speaking on behalf of Saptarshi's portfolio. Stay strictly on topic and be honest about the limits of your knowledge.`;
  }, [knowledgeManager]);

  const addToCommandHistory = useCallback((command: string) => {
    if (command.trim()) {
      dispatch({ type: 'ADD_COMMAND_HISTORY', payload: command });
    }
  }, []);

  const navigateHistory = useCallback((direction: 'up' | 'down') => {
    if (direction === 'up') {
      const newIndex = Math.min(state.historyIndex + 1, state.commandHistory.length - 1);
      dispatch({ type: 'SET_HISTORY_INDEX', payload: newIndex });
      return state.commandHistory[state.commandHistory.length - 1 - newIndex] || '';
    } else {
      const newIndex = Math.max(state.historyIndex - 1, -1);
      dispatch({ type: 'SET_HISTORY_INDEX', payload: newIndex });
      if (newIndex === -1) return '';
      return state.commandHistory[state.commandHistory.length - 1 - newIndex] || '';
    }
  }, [state.historyIndex, state.commandHistory]);

  const getAutocompleteOptions = useCallback((input: string) => {
    const [command, ...args] = input.split(' ');
    const currentArg = args[args.length - 1] || '';

    if (command === 'cd' || command === 'ls' || command === 'cat' || command === 'vi') {
      const basePath = currentArg.includes('/') ?
        currentArg.substring(0, currentArg.lastIndexOf('/') + 1) : '';
      const searchTerm = currentArg.includes('/') ?
        currentArg.substring(currentArg.lastIndexOf('/') + 1) : currentArg;

      const targetPath = basePath || '.';
      const entries = fsManager.listDirectory(targetPath);

      if (entries) {
        const options = entries
          .map(([name]) => name)
          .filter(name => name.toLowerCase().startsWith(searchTerm.toLowerCase()))
          .map(name => basePath + name);
        return options;
      }
    }

    if (!args.length) {
      // Command completion
      return availableCommands.filter(cmd => cmd.toLowerCase().startsWith(command.toLowerCase()));
    }

    return [];
  }, [fsManager]);

  const getCurrentPrompt = useCallback((capturePath?: string) => {
    if (state.chatMode) {
      return '<span style="color: var(--terminal-bright-green)">>>> </span>';
    }

    const currentPath = capturePath || fsManager.getCurrentPath();
    const shortPath = currentPath === '/' ? '~' : currentPath.replace(/^\//, '').split('/').pop() || '~';
    const username = '<span style="color: var(--terminal-bright-green)">saptarshi</span>';
    const hostname = '<span style="color: var(--terminal-bright-green)">portfolio</span>';
    const directory = `<span style="color: var(--terminal-bright-blue)">${shortPath}</span>`;

    return `[${username}@${hostname} ${directory}]$ `;
  }, [fsManager, state.chatMode]);

  const executeCommand = useCallback((input: string) => {
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    // Capture the current prompt and path before executing the command
    const currentPrompt = getCurrentPrompt();
    const currentPath = fsManager.getCurrentPath();

    // Shadow addToHistory to automatically include the prompt
    const addToHistory = (command: string, output: string[]) => {
      dispatch({
        type: 'ADD_HISTORY',
        payload: {
          command,
          output,
          timestamp: Date.now(),
          prompt: currentPrompt
        }
      });
    };

    addToCommandHistory(trimmedInput);

    // Handle chat mode
    if (state.chatMode) {
      if (trimmedInput === 'exit' || trimmedInput === 'quit') {
        dispatch({ type: 'SET_CHAT_MODE', payload: null });
        if (state.chatMode === 'gemini' && geminiManager) {
          geminiManager.clearHistory();
        }
        if (state.chatMode === 'local' && localLLMManager) {
          localLLMManager.clearHistory();
        }
        addToHistory('>>> ' + trimmedInput, [
          '',
          'Exiting chat mode...',
          'Returning to shell.',
          ''
        ]);
        return;
      }

      // Handle Gemini chat
      if (state.chatMode === 'gemini') {
        if (!geminiManager) {
          addToHistory('>>> ' + trimmedInput, [
            '<span style="color: var(--terminal-red)">Error: Gemini chat manager not initialized.</span>',
            'Please check your API key configuration.',
          ]);
          return;
        }

        if (!geminiManager.isConfigured()) {
          addToHistory('>>> ' + trimmedInput, [
            '<span style="color: var(--terminal-red)">Error: Gemini API key not configured.</span>',
            '',
            'To use Gemini chat, please:',
            '1. Create a .env file in the project root',
            '2. Add: VITE_GEMINI_API_KEY=your_api_key_here',
            '3. Get your API key from: https://makersuite.google.com/app/apikey',
            '4. Restart the development server',
            '',
          ]);
          return;
        }

        // Add user message to history
        addToHistory('>>> ' + trimmedInput, []);

        // Initialize streaming output
        streamingOutputRef.current = '';
        streamingHistoryIndexRef.current = state.history.length;
        dispatch({ type: 'SET_STREAMING', payload: true });

        // Send message with streaming
        geminiManager.sendMessage(
          trimmedInput,
          // onChunk - called for each token
          (chunk: string) => {
            streamingOutputRef.current += chunk;

            // Update the history with accumulated response
            dispatch({
              type: 'UPDATE_STREAMING_HISTORY',
              payload: {
                index: streamingHistoryIndexRef.current,
                output: streamingOutputRef.current
              }
            });

            // Update the index if it was just created
            if (streamingHistoryIndexRef.current === -1) {
              streamingHistoryIndexRef.current = state.history.length;
            }
          },
          // onComplete
          () => {
            dispatch({ type: 'SET_STREAMING', payload: false });
            streamingOutputRef.current = '';
            streamingHistoryIndexRef.current = -1;
          },
          // onError
          (error: Error) => {
            dispatch({ type: 'SET_STREAMING', payload: false });
            streamingOutputRef.current = '';
            streamingHistoryIndexRef.current = -1;

            // Log error for debugging
            console.error('Gemini chat error:', error);

            // Display user-friendly error message
            const errorLines = [
              '',
              `<span style="color: var(--terminal-red)">Error: ${error.message}</span>`,
            ];

            // Add helpful hints based on error type
            if (error.message.includes('rate limit') || error.message.includes('quota')) {
              errorLines.push('', 'Please wait a moment before trying again.');
            } else if (error.message.includes('network') || error.message.includes('connection')) {
              errorLines.push('', 'Please check your internet connection and try again.');
            } else if (error.message.includes('API key')) {
              errorLines.push('', 'Please verify your API key configuration in the .env file.');
            }

            errorLines.push('');

            addToHistory('', errorLines);
          }
        );

        return;
      }

      // Handle local LLM chat
      if (state.chatMode === 'local') {
        if (!localLLMManager) {
          addToHistory('>>> ' + trimmedInput, [
            '<span style="color: var(--terminal-red)">Error: Local LLM chat manager not initialized.</span>',
            'Please check your configuration.',
          ]);
          return;
        }

        if (!localLLMManager.isConfigured()) {
          addToHistory('>>> ' + trimmedInput, [
            '<span style="color: var(--terminal-red)">Error: Local LLM endpoint not configured.</span>',
            '',
            'To use local LLM chat, please:',
            '1. Install Ollama from: https://ollama.ai',
            '2. Start Ollama: ollama serve',
            '3. Pull a model: ollama pull llama2',
            '4. Create a .env file in the project root',
            '5. Add: VITE_LOCAL_LLM_ENDPOINT=http://localhost:11434',
            '6. Restart the development server',
            '',
          ]);
          return;
        }

        // Add user message to history
        addToHistory('>>> ' + trimmedInput, []);

        // Initialize streaming output
        streamingOutputRef.current = '';
        streamingHistoryIndexRef.current = state.history.length;
        dispatch({ type: 'SET_STREAMING', payload: true });

        // Send message with streaming
        localLLMManager.sendMessage(
          trimmedInput,
          // onChunk - called for each token
          (chunk: string) => {
            streamingOutputRef.current += chunk;

            // Update the history with accumulated response
            dispatch({
              type: 'UPDATE_STREAMING_HISTORY',
              payload: {
                index: streamingHistoryIndexRef.current,
                output: streamingOutputRef.current
              }
            });

            // Update the index if it was just created
            if (streamingHistoryIndexRef.current === -1) {
              streamingHistoryIndexRef.current = state.history.length;
            }
          },
          // onComplete
          () => {
            dispatch({ type: 'SET_STREAMING', payload: false });
            streamingOutputRef.current = '';
            streamingHistoryIndexRef.current = -1;
          },
          // onError
          (error: Error) => {
            dispatch({ type: 'SET_STREAMING', payload: false });
            streamingOutputRef.current = '';
            streamingHistoryIndexRef.current = -1;

            // Log error for debugging
            console.error('Local LLM chat error:', error);

            // Display user-friendly error message
            const errorLines = [
              '',
              `<span style="color: var(--terminal-red)">Error: ${error.message}</span>`,
            ];

            // Add helpful hints based on error type
            if (error.message.includes('timeout')) {
              errorLines.push('', 'The request took too long. Try again or check your local LLM setup.');
            } else if (error.message.includes('connect') || error.message.includes('running')) {
              errorLines.push('', 'Make sure Ollama is running: ollama serve');
              errorLines.push('And that you have a model installed: ollama pull llama2');
            } else if (error.message.includes('endpoint')) {
              errorLines.push('', 'Please verify your endpoint configuration in the .env file.');
            }

            errorLines.push('');

            addToHistory('', errorLines);
          }
        );

        return;
      }
    }

    // Parse command with flags
    const parsed = CommandParser.parse(trimmedInput);
    const { command, args, flags } = parsed;
    const fullCommand = trimmedInput;

    // Handle aliases
    if (terminalConfig.commands.aliases[command]) {
      const aliasedCommand = terminalConfig.commands.aliases[command];
      executeCommand(aliasedCommand + (args.length ? ' ' + args.join(' ') : ''));
      return;
    }

    // Easter eggs - handle specific commands
    switch (command) {
      case 'sl':
        // Train animation (typo of ls)
        addToHistory(fullCommand, [
          '                   (  ) (@@) ( )  (@)  ()    @@    O     @     O     @',
          '              (@@@)',
          '          (    )',
          '        (@@@@)',
          '     (   )',
          '',
          '   ====        ________                ___________',
          '_D _|  |_______/        \\__I_I_____===__|_________| ',
          ' |(_)---  |   H\\________/ |   |        =|___ ___|   _________________',
          ' /     |  |   H  |  |     |   |         ||_| |_||   _|               \\_____A',
          '|      |  |   H  |__--------------------| [___] |   =|                     |',
          '| ________|___H__/__|_____/[][]~\\_______|       |   -|                     |',
          '|/ |   |-----------I_____I [][] []  D   |=======|____|________________________|_',
          '__/ =| o |=-~~\\  /~~\\  /~~\\  /~~\\ ____Y___________|__|__________________________|_',
          ' |/-=|___|=O=====O=====O=====O   |_____/~\\___/          |_D__D__D_|  |_D__D__D_|',
          '  \\_/      \\__/  \\__/  \\__/  \\__/      \\_/               \\_/   \\_/    \\_/   \\_/',
          '',
          '<span style="color: var(--terminal-yellow)">Oops! Did you mean \'ls\'?</span>'
        ]);
        return;

      case 'cowsay':
        const cowMessage = args.join(' ') || 'Moo!';
        const messageLength = cowMessage.length;
        const topBorder = ' ' + '_'.repeat(messageLength + 2);
        const bottomBorder = ' ' + '-'.repeat(messageLength + 2);

        addToHistory(fullCommand, [
          topBorder,
          `< ${cowMessage} >`,
          bottomBorder,
          '        \\   ^__^',
          '         \\  (oo)\\_______',
          '            (__)\\       )\\/\\',
          '                ||----w |',
          '                ||     ||'
        ]);
        return;

      case 'fortune':
        const fortunes = [
          '"When you cd enough, you find your true ~/"',
          '"There are 10 types of people: those who understand binary and those who don\'t."',
          '"To err is human, to really foul things up requires the root password."',
          '"Linux: Because rebooting is for adding new hardware."',
          '"Real programmers count from 0."',
          '"There\'s no place like 127.0.0.1"',
          '"sudo: make me a sandwich"',
          '"In a world without walls, who needs Windows?"',
          '"Talk is cheap. Show me the code." - Linus Torvalds',
          '"The best thing about a boolean is even if you are wrong, you are only off by a bit."'
        ];
        const randomFortune = fortunes[Math.floor(Math.random() * fortunes.length)];
        addToHistory(fullCommand, ['', randomFortune, '']);
        return;

      case 'hack':
        // Matrix-style hacking animation
        addToHistory(fullCommand, [
          '<span style="color: var(--terminal-green)">Initializing hack sequence...</span>',
          '<span style="color: var(--terminal-green)">[████████████████████████████████] 100%</span>',
          '',
          '<span style="color: var(--terminal-green)">Access granted to mainframe...</span>',
          '<span style="color: var(--terminal-green)">Bypassing firewall...</span>',
          '<span style="color: var(--terminal-green)">Downloading secret files...</span>',
          '',
          '<span style="color: var(--terminal-bright-green)">HACK COMPLETE!</span>',
          '',
          '<span style="color: var(--terminal-yellow)">Just kidding. This is a portfolio site, not a hacking simulator 😄</span>'
        ]);
        return;

      case 'matrix':
        // Matrix reference
        addToHistory(fullCommand, [
          '<span style="color: var(--terminal-green)">Wake up, Neo...</span>',
          '<span style="color: var(--terminal-green)">The Matrix has you...</span>',
          '<span style="color: var(--terminal-green)">Follow the white rabbit.</span>',
          '',
          '<span style="color: var(--terminal-bright-green)">Knock, knock, Neo.</span>'
        ]);
        return;

      case 'xyzzy':
        // Classic adventure game easter egg
        addToHistory(fullCommand, [
          '<span style="color: var(--terminal-magenta)">Nothing happens.</span>',
          '',
          '<span style="color: var(--terminal-yellow)">(But you feel a strange sense of nostalgia...)</span>'
        ]);
        return;
    }

    // Check for sudo rm -rf variations
    if (fullCommand.match(/sudo\s+(rm\s+-rf\s*\/|rm\s+-rf\s+\/\s*|rm\s+-fr\s*\/)/i)) {
      addToHistory(fullCommand, [
        '<span style="color: var(--terminal-red)">⚠️  WARNING ⚠️</span>',
        '',
        '<span style="color: var(--terminal-red)">You are about to delete the entire filesystem!</span>',
        '<span style="color: var(--terminal-yellow)">Just kidding. This is a simulated terminal.</span>',
        '<span style="color: var(--terminal-yellow)">But in a real system, this would be catastrophic.</span>',
        '',
        '<span style="color: var(--terminal-green)">Pro tip: Never run this command on a real system.</span>',
        '<span style="color: var(--terminal-green)">Always double-check your rm commands!</span>'
      ]);
      return;
    }

    // Generic easter eggs from config
    const easterEgg = terminalConfig.commands.easter_eggs.find(egg =>
      fullCommand.toLowerCase().includes(egg.command.toLowerCase())
    );
    if (easterEgg) {
      addToHistory(fullCommand, [easterEgg.response || 'Easter egg activated!']);
      return;
    }

    // Network commands
    const networkCmd = terminalConfig.commands.network.find(net =>
      command === net.command
    );
    if (networkCmd) {
      addToHistory(fullCommand, [networkCmd.response]);
      return;
    }

    // Restricted commands
    const restrictedCmd = terminalConfig.commands.restricted.find(res =>
      fullCommand.startsWith(res.command.split('[')[0].trim()) || fullCommand === res.command
    );
    if (restrictedCmd) {
      addToHistory(fullCommand, [`<span style="color: ${terminalConfig.visuals.colors.error}">${restrictedCmd.response}</span>`]);
      return;
    }

    switch (command) {
      case 'help':
        addToHistory(fullCommand, [
          'Available commands:',
          '',
          'ls [-la] [path]      - List directory contents',
          '  -l                 - Use long listing format',
          '  -a                 - Show hidden files',
          '  --color=auto       - Colorize output',
          'cd [directory]       - Change directory',
          '  cd                 - Go to home directory',
          '  cd -               - Go to previous directory',
          '  cd ~               - Go to home directory',
          'pwd                  - Print working directory',
          'cat <file>...        - Display file contents (supports multiple files)',
          'tree                 - Show directory tree',
          'vi <file>            - View file (read-only)',
          'echo <text>          - Display text',
          'whoami               - Display user info',
          'history              - Show command history',
          'clear                - Clear terminal',
          'chatapi              - Start Gemini AI chat mode',
          'chat                 - Start local LLM chat mode',
          'fortune              - Display a random tech quote',
          'cowsay <message>     - Make a cow say something',
          'exit                 - Exit terminal',
          '',
          'Aliases:',
          'll                   - ls -al',
          'la                   - ls -a',
          '..                   - cd ..',
          '',
          'Special files:',
          './resume.sh         - View resume',
          './website.sh        - Open main website',
          '',
          'Navigation:',
          '.                    - Current directory',
          '..                   - Parent directory',
          '~                    - Home directory',
          '-                    - Previous directory (with cd)',
          '',
          '<span style="color: var(--terminal-yellow)">Hint: Try exploring. You might find some surprises...</span>',
          ''
        ]);
        break;

      case 'ls':
        const lsPath = args[0] || '.';
        const showHidden = CommandParser.hasFlag(parsed, 'a', 'all');
        const longFormat = CommandParser.hasFlag(parsed, 'l', 'long');
        const useColor = !CommandParser.hasFlag(parsed, 'color') ||
          CommandParser.getFlagValueAsString(parsed, 'color', 'auto') !== 'never';

        const lsEntries = fsManager.listDirectory(lsPath);

        if (!lsEntries) {
          const node = fsManager.getNode(lsPath);
          if (!node) {
            addToHistory(fullCommand, [`<span style="color: ${terminalConfig.visuals.colors.error}">ls: cannot access '${lsPath}': No such file or directory</span>`]);
          } else if (node.type === 'file' || node.type === 'script') {
            // If it's a file, just show the filename
            const fileName = lsPath.split('/').pop() || lsPath;
            if (longFormat && node.metadata) {
              const perms = node.permissions || (node.type === 'script' ? '-rwxr-xr-x' : '-rw-r--r--');
              const size = node.metadata.size || 0;
              const date = node.metadata.modified || 'Nov  8 2025';
              const owner = node.metadata.owner || 'saptarshi';
              addToHistory(fullCommand, [`${perms}  1 ${owner} ${owner} ${size.toString().padStart(8)} ${date} ${fileName}`]);
            } else {
              addToHistory(fullCommand, [fileName]);
            }
          } else {
            addToHistory(fullCommand, [`<span style="color: ${terminalConfig.visuals.colors.error}">ls: ${lsPath}: Not a directory</span>`]);
          }
        } else {
          // Filter hidden files if -a not specified
          let filteredEntries = lsEntries;
          if (!showHidden) {
            filteredEntries = lsEntries.filter(([name]) => !name.startsWith('.'));
          }

          if (longFormat) {
            // Long format with details
            const lines: string[] = [];

            filteredEntries.forEach(([name, node]) => {
              const perms = node.permissions || (node.type === 'directory' ? 'drwxr-xr-x' :
                node.type === 'script' ? '-rwxr-xr-x' : '-rw-r--r--');
              const size = node.metadata?.size || 0;
              const date = node.metadata?.modified || 'Nov  8 2025';
              const owner = node.metadata?.owner || 'saptarshi';

              let displayName = name;
              if (useColor) {
                if (node.type === 'directory') {
                  displayName = `<span style="color: ${terminalConfig.visuals.colors.directory}">${name}</span>`;
                } else if (node.type === 'script') {
                  displayName = `<span style="color: ${terminalConfig.visuals.colors.scripts}">${name}</span>`;
                } else {
                  displayName = `<span style="color: ${terminalConfig.visuals.colors.file}">${name}</span>`;
                }
              }

              lines.push(`${perms}  1 ${owner} ${owner} ${size.toString().padStart(8)} ${date} ${displayName}`);
            });

            addToHistory(fullCommand, lines.length > 0 ? lines : ['total 0']);
          } else {
            // Simple format
            const contents = filteredEntries.map(([name, node]) => {
              if (!useColor) {
                return node.type === 'directory' ? `${name}/` :
                  node.type === 'script' ? `${name}*` : name;
              }

              if (node.type === 'directory') {
                return `<span style="color: ${terminalConfig.visuals.colors.directory}">${name}/</span>`;
              } else if (node.type === 'script') {
                return `<span style="color: ${terminalConfig.visuals.colors.scripts}">${name}*</span>`;
              } else {
                return `<span style="color: ${terminalConfig.visuals.colors.file}">${name}</span>`;
              }
            });
            addToHistory(fullCommand, contents.length > 0 ? contents : ['(empty directory)']);
          }
        }
        break;

      case 'cd':
        if (!args[0]) {
          // cd without arguments - go to home
          fsManager.navigateHome();
          addToHistory(fullCommand, []);
        } else {
          const cdPath = args[0];

          // Special handling for cd -
          if (cdPath === '-') {
            const prevPath = fsManager.getPreviousPath();
            if (!prevPath) {
              addToHistory(fullCommand, [`<span style="color: ${terminalConfig.visuals.colors.error}">bash: cd: OLDPWD not set</span>`]);
            } else {
              const success = fsManager.navigate(cdPath);
              if (success) {
                // Print the new directory (bash behavior for cd -)
                addToHistory(fullCommand, [fsManager.getCurrentPath()]);
              }
            }
          } else {
            const success = fsManager.navigate(cdPath);

            if (!success) {
              const node = fsManager.getNode(cdPath);
              if (!node) {
                addToHistory(fullCommand, [`<span style="color: ${terminalConfig.visuals.colors.error}">bash: cd: ${cdPath}: No such file or directory</span>`]);
              } else {
                addToHistory(fullCommand, [`<span style="color: ${terminalConfig.visuals.colors.error}">bash: cd: ${cdPath}: Not a directory</span>`]);
              }
            } else {
              addToHistory(fullCommand, []);
            }
          }
        }
        break;

      case 'pwd':
        addToHistory(fullCommand, [fsManager.getCurrentPath()]);
        break;

      case 'cat':
        if (args.length === 0) {
          addToHistory(fullCommand, [`<span style="color: ${terminalConfig.visuals.colors.error}">cat: missing file operand</span>`, `Try 'cat --help' for more information.`]);
        } else {
          // Support multiple files
          const outputs: string[] = [];
          let hasError = false;

          for (const catPath of args) {
            const catNode = fsManager.getNode(catPath);

            if (!catNode) {
              outputs.push(`<span style="color: ${terminalConfig.visuals.colors.error}">cat: ${catPath}: No such file or directory</span>`);
              hasError = true;
            } else if (catNode.type === 'directory') {
              outputs.push(`<span style="color: ${terminalConfig.visuals.colors.error}">cat: ${catPath}: Is a directory</span>`);
              hasError = true;
            } else {
              const content = fsManager.readFile(catPath);
              if (content !== null) {
                // Add blank line between multiple files
                if (outputs.length > 0 && !hasError) {
                  outputs.push('');
                }
                outputs.push(...content.split('\n'));
              } else {
                outputs.push(`<span style="color: ${terminalConfig.visuals.colors.error}">cat: ${catPath}: Cannot read file</span>`);
                hasError = true;
              }
            }
          }

          addToHistory(fullCommand, outputs);
        }
        break;

      case 'tree':
        const generateTree = (path: string, prefix: string = ''): string[] => {
          const lines: string[] = [];
          const entries = fsManager.listDirectory(path);

          if (!entries) return lines;

          entries.forEach(([name, node], index) => {
            const isLastEntry = index === entries.length - 1;
            const connector = isLastEntry ? '└── ' : '├── ';

            if (node.type === 'directory') {
              lines.push(`${prefix}${connector}<span style="color: ${terminalConfig.visuals.colors.directory}">${name}/</span>`);
              const nextPrefix = prefix + (isLastEntry ? '    ' : '│   ');
              const childPath = path === '.' ? name : `${path}/${name}`;
              lines.push(...generateTree(childPath, nextPrefix));
            } else if (node.type === 'script') {
              lines.push(`${prefix}${connector}<span style="color: ${terminalConfig.visuals.colors.scripts}">${name}*</span>`);
            } else {
              lines.push(`${prefix}${connector}<span style="color: ${terminalConfig.visuals.colors.file}">${name}</span>`);
            }
          });

          return lines;
        };

        const currentPathStr = fsManager.getCurrentPath();
        const dirName = currentPathStr === '/' ? '/' : currentPathStr.split('/').pop() + '/';
        const treeOutput = [
          `<span style="color: ${terminalConfig.visuals.colors.directory}">${dirName}</span>`,
          ...generateTree('.')
        ];
        addToHistory(fullCommand, treeOutput);
        break;

      case 'vi':
      case 'vim':
        if (!args[0]) {
          addToHistory(fullCommand, [
            `<span style="color: ${terminalConfig.visuals.colors.error}">E325: ATTENTION</span>`,
            `This is a read-only terminal. Use 'cat' to view files.`
          ]);
        } else {
          const viPath = args[0];
          const viNode = fsManager.getNode(viPath);

          if (!viNode) {
            addToHistory(fullCommand, [`<span style="color: ${terminalConfig.visuals.colors.error}">"${viPath}" [New File]</span>`, `Read-only file system`]);
          } else if (viNode.type === 'directory') {
            addToHistory(fullCommand, [`<span style="color: ${terminalConfig.visuals.colors.error}">"${viPath}" is a directory</span>`]);
          } else {
            const content = fsManager.readFile(viPath);
            if (content !== null) {
              const lines = content.split('\n');
              addToHistory(fullCommand, [
                `"${viPath}" ${lines.length}L, ${content.length}C`,
                '',
                ...lines,
                '',
                `-- READ ONLY --`
              ]);
            } else {
              addToHistory(fullCommand, [`<span style="color: ${terminalConfig.visuals.colors.error}">E212: Cannot read file "${viPath}"</span>`]);
            }
          }
        }
        break;

      case 'echo':
        addToHistory(fullCommand, [args.join(' ')]);
        break;

      case 'whoami':
        addToHistory(fullCommand, [
          'Saptarshi Bhattacharya',
          'Full-stack developer & strategist',
          'Currently: Building the future of tech'
        ]);
        break;

      case 'history':
        const historyLines = commandHistory.map((entry, index) =>
          `${index + 1}  ${entry}`
        );
        addToHistory(fullCommand, historyLines);
        break;

      case 'clear':
        dispatch({ type: 'CLEAR_HISTORY' });
        break;

      case 'chatapi':
        if (!geminiManager) {
          addToHistory(fullCommand, [
            '<span style="color: var(--terminal-red)">Error: Gemini chat manager not initialized.</span>',
            'Please check your configuration.',
          ]);
          break;
        }

        if (!geminiManager.isConfigured()) {
          addToHistory(fullCommand, [
            '<span style="color: var(--terminal-red)">Error: Gemini API key not configured.</span>',
            '',
            'To use Gemini chat, please:',
            '1. Create a .env file in the project root',
            '2. Add: VITE_GEMINI_API_KEY=your_api_key_here',
            '3. Get your API key from: https://makersuite.google.com/app/apikey',
            '4. Restart the development server',
            '',
          ]);
          break;
        }

        // Check if knowledge base is loaded
        if (!knowledgeManager.isLoaded()) {
          addToHistory(fullCommand, [
            '<span style="color: var(--terminal-yellow)">Warning: Knowledge base not loaded. Chat may have limited context.</span>',
            '',
          ]);
        }

        // Set system prompt with guardrails and knowledge
        geminiManager.setSystemPrompt(buildSystemPrompt());

        dispatch({ type: 'SET_CHAT_MODE', payload: 'gemini' });
        addToHistory(fullCommand, [
          '',
          '<span style="color: var(--terminal-bright-green)">Entering Gemini chat mode...</span>',
          'Ask me anything about Saptarshi!',
          '',
          'Type <span style="color: var(--terminal-bright-yellow)">exit</span> or press <span style="color: var(--terminal-bright-yellow)">Ctrl+C</span> to return to shell.',
          ''
        ]);
        break;

      case 'chat':
        if (!localLLMManager) {
          addToHistory(fullCommand, [
            '<span style="color: var(--terminal-red)">Error: Local LLM chat manager not initialized.</span>',
            'Please check your configuration.',
          ]);
          break;
        }

        if (!localLLMManager.isConfigured()) {
          addToHistory(fullCommand, [
            '<span style="color: var(--terminal-red)">Error: Local LLM endpoint not configured.</span>',
            '',
            'To use local LLM chat, please:',
            '1. Install Ollama from: https://ollama.ai',
            '2. Start Ollama: ollama serve',
            '3. Pull a model: ollama pull llama2',
            '4. Create a .env file in the project root',
            '5. Add: VITE_LOCAL_LLM_ENDPOINT=http://localhost:11434',
            '6. Restart the development server',
            '',
          ]);
          break;
        }

        // Check if knowledge base is loaded
        if (!knowledgeManager.isLoaded()) {
          addToHistory(fullCommand, [
            '<span style="color: var(--terminal-yellow)">Warning: Knowledge base not loaded. Chat may have limited context.</span>',
            '',
          ]);
        }

        // Set system prompt with guardrails and knowledge
        localLLMManager.setSystemPrompt(buildSystemPrompt());

        dispatch({ type: 'SET_CHAT_MODE', payload: 'local' });
        addToHistory(fullCommand, [
          '',
          '<span style="color: var(--terminal-bright-green)">Entering local LLM chat mode...</span>',
          'Ask me anything about Saptarshi!',
          '',
          'Type <span style="color: var(--terminal-bright-yellow)">exit</span> or press <span style="color: var(--terminal-bright-yellow)">Ctrl+C</span> to return to shell.',
          ''
        ]);
        break;

      case 'exit':
        addToHistory(fullCommand, ['Connection to terminal closed.']);
        break;

      default:
        // Check if it's a script in current directory
        const scriptPath = `./${command}`;
        const scriptAction = fsManager.executeScript(scriptPath);

        if (scriptAction) {
          if (scriptAction.type === 'open_modal') {
            addToHistory(fullCommand, [`Opening ${scriptAction.target}...`]);
          } else if (scriptAction.type === 'open_link') {
            window.open(scriptAction.target, '_blank');
            addToHistory(fullCommand, [`Opening ${scriptAction.target}...`]);
          } else if (scriptAction.type === 'execute_command') {
            addToHistory(fullCommand, [`Executing ${scriptAction.target}...`]);
          }
        } else {
          // Check if command exists as a file/script elsewhere
          const commandNode = fsManager.getNode(command);
          if (commandNode && commandNode.type === 'script') {
            const action = fsManager.executeScript(command);
            if (action) {
              if (action.type === 'open_link') {
                window.open(action.target, '_blank');
                addToHistory(fullCommand, [`Opening ${action.target}...`]);
              } else if (action.type === 'open_modal') {
                addToHistory(fullCommand, [`Opening ${action.target}...`]);
              } else if (action.type === 'execute_command') {
                addToHistory(fullCommand, [`Executing ${action.target}...`]);
              }
              break;
            }
          }

          // Command not found
          addToHistory(fullCommand, [`<span style="color: ${terminalConfig.visuals.colors.error}">bash: ${command}: command not found</span>`]);
        }
        break;
    }
  }, [state.chatMode, state.history, addToHistory, addToCommandHistory, fsManager, geminiManager, localLLMManager, buildSystemPrompt, getCurrentPrompt]);

  const cancelCommand = useCallback((input: string) => {
    // Show the cancelled command with ^C (even if empty, to show the prompt was cancelled)
    const currentPrompt = getCurrentPrompt();
    dispatch({
      type: 'ADD_HISTORY',
      payload: {
        command: input ? input + '^C' : '^C',
        output: [],
        timestamp: Date.now(),
        prompt: currentPrompt
      }
    });
  }, [getCurrentPrompt]);

  return {
    currentPath: fsManager.getCurrentPath(),
    history: state.history,
    commandHistory: state.commandHistory,
    isBooting: state.isBooting,
    chatMode: state.chatMode,
    isStreaming: state.isStreaming,
    executeCommand,
    cancelCommand,
    getCurrentPrompt,
    navigateHistory,
    getAutocompleteOptions,
    config: terminalConfig
  };
};
