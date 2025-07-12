
import { useState, useEffect, useCallback } from 'react';
import terminalConfig from '../config/terminal.json';

export interface FileSystemNode {
  type: 'directory' | 'file' | 'script';
  children?: Record<string, FileSystemNode | string>;
  action?: string;
  target?: string;
}

export interface CommandHistory {
  command: string;
  output: string[];
  timestamp: number;
}

export const useTerminal = () => {
  const [currentPath, setCurrentPath] = useState('/');
  const [history, setHistory] = useState<CommandHistory[]>([]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isBooting, setIsBooting] = useState(true);
  const [isChatMode, setIsChatMode] = useState(false);
  const [chatHistory, setChatHistory] = useState<string[]>([]);
  const [autocompleteOptions, setAutocompleteOptions] = useState<string[]>([]);

  const filesystem = terminalConfig.filesystem.structure as Record<string, FileSystemNode>;

  useEffect(() => {
    // Boot sequence
    const bootTimer = setTimeout(() => {
      setIsBooting(false);
      addToHistory('', [
        terminalConfig.startup.ascii_banner,
        '',
        terminalConfig.startup.quote,
        '',
        'Type "help" to see available commands.',
        ''
      ]);
    }, 1500);

    return () => clearTimeout(bootTimer);
  }, []);

  const addToHistory = useCallback((command: string, output: string[]) => {
    setHistory(prev => [...prev, {
      command,
      output,
      timestamp: Date.now()
    }]);
  }, []);

  const addToCommandHistory = useCallback((command: string) => {
    if (command.trim()) {
      setCommandHistory(prev => {
        const newHistory = [...prev, command];
        return newHistory.slice(-50); // Keep last 50 commands
      });
      setHistoryIndex(-1);
    }
  }, []);

  const navigateHistory = useCallback((direction: 'up' | 'down') => {
    if (direction === 'up') {
      const newIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
      setHistoryIndex(newIndex);
      return commandHistory[commandHistory.length - 1 - newIndex] || '';
    } else {
      const newIndex = Math.max(historyIndex - 1, -1);
      setHistoryIndex(newIndex);
      if (newIndex === -1) return '';
      return commandHistory[commandHistory.length - 1 - newIndex] || '';
    }
  }, [historyIndex, commandHistory]);

  const getAutocompleteOptions = useCallback((input: string) => {
    const [command, ...args] = input.split(' ');
    const currentArg = args[args.length - 1] || '';
    
    if (command === 'cd' || command === 'ls' || command === 'cat' || command === 'vi') {
      const targetPath = currentArg.startsWith('/') ? currentArg : currentPath;
      const basePath = currentArg.includes('/') ? 
        currentArg.substring(0, currentArg.lastIndexOf('/') + 1) : '';
      const searchTerm = currentArg.includes('/') ? 
        currentArg.substring(currentArg.lastIndexOf('/') + 1) : currentArg;
      
      const node = getNode(targetPath);
      if (node && typeof node === 'object' && 'children' in node && node.children) {
        const options = Object.keys(node.children)
          .filter(name => name.toLowerCase().startsWith(searchTerm.toLowerCase()))
          .map(name => basePath + name);
        return options;
      }
    }
    
    if (!args.length) {
      // Command completion
      const commands = [...terminalConfig.commands.working, ...Object.keys(terminalConfig.commands.aliases)];
      return commands.filter(cmd => cmd.toLowerCase().startsWith(command.toLowerCase()));
    }
    
    return [];
  }, [currentPath]);

  const resolvePath = useCallback((path: string): string => {
    if (path.startsWith('/')) {
      return path;
    }
    
    const segments = currentPath.split('/').filter(Boolean);
    const pathSegments = path.split('/');

    for (const segment of pathSegments) {
      if (segment === '..') {
        segments.pop();
      } else if (segment !== '.' && segment !== '') {
        segments.push(segment);
      }
    }

    return '/' + segments.join('/');
  }, [currentPath]);

  const getNode = useCallback((path: string): FileSystemNode | string | null => {
    const normalizedPath = path === '/' ? '/' : path.replace(/\/$/, '');
    const segments = normalizedPath === '/' ? [] : normalizedPath.split('/').filter(Boolean);
    
    let current: FileSystemNode | string = filesystem['/'];
    
    for (const segment of segments) {
      if (typeof current === 'object' && current !== null && 'children' in current && current.children && segment in current.children) {
        current = current.children[segment];
      } else {
        return null;
      }
    }
    
    return current;
  }, [filesystem]);

  const executeCommand = useCallback((input: string) => {
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    addToCommandHistory(trimmedInput);

    if (isChatMode) {
      if (trimmedInput === 'exit' || trimmedInput === 'quit') {
        setIsChatMode(false);
        addToHistory('>>> ' + trimmedInput, [terminalConfig.chatbot.reentry_message]);
        return;
      }
      
      setChatHistory(prev => [...prev, `>>> ${trimmedInput}`]);
      addToHistory('>>> ' + trimmedInput, ['This is a simulated LLM response. Connect your backend here!']);
      return;
    }

    const [command, ...args] = trimmedInput.split(' ');
    const fullCommand = trimmedInput;

    // Handle aliases
    if (terminalConfig.commands.aliases[command]) {
      const aliasedCommand = terminalConfig.commands.aliases[command];
      executeCommand(aliasedCommand + (args.length ? ' ' + args.join(' ') : ''));
      return;
    }

    // Easter eggs
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
          'ls                   - List directory contents',
          'cd <directory>       - Change directory',
          'pwd                  - Print working directory',
          'cat <file>           - Display file contents',
          'tree                 - Show directory tree',
          'vi <file>            - View file (read-only)',
          'echo <text>          - Display text',
          'whoami               - Display user info',
          'history              - Show command history',
          'clear                - Clear terminal',
          'chat                 - Start LLM chat mode',
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
          './minimal.sh        - Open minimal site',
          '',
          'Easter eggs: fortune, play music, sudo make me coffee'
        ]);
        break;

      case 'ls':
        const targetPath = args[0] ? resolvePath(args[0]) : currentPath;
        const node = getNode(targetPath);
        
        if (!node) {
          addToHistory(fullCommand, [`<span style="color: ${terminalConfig.visuals.colors.error}">ls: cannot access '${targetPath}': No such file or directory</span>`]);
        } else if (typeof node === 'string') {
          addToHistory(fullCommand, [args[0] || targetPath.split('/').pop() || '/']);
        } else if (node.type === 'directory' && node.children) {
          const contents = Object.entries(node.children).map(([name, child]) => {
            if (typeof child === 'string') {
              return `<span style="color: ${terminalConfig.visuals.colors.file}">${name}</span>`;
            } else if (child.type === 'directory') {
              return `<span style="color: ${terminalConfig.visuals.colors.directory}">${name}/</span>`;
            } else {
              return `<span style="color: ${terminalConfig.visuals.colors.scripts}">${name}*</span>`;
            }
          });
          addToHistory(fullCommand, contents.length > 0 ? contents : ['(empty directory)']);
        } else {
          addToHistory(fullCommand, [`<span style="color: ${terminalConfig.visuals.colors.error}">ls: ${targetPath}: Not a directory</span>`]);
        }
        break;

      case 'cd':
        if (!args[0]) {
          setCurrentPath('/');
          addToHistory(fullCommand, []);
        } else {
          const targetPath = resolvePath(args[0]);
          const node = getNode(targetPath);
          
          if (!node) {
            addToHistory(fullCommand, [`<span style="color: ${terminalConfig.visuals.colors.error}">cd: ${targetPath}: No such file or directory</span>`]);
          } else if (typeof node === 'string') {
            addToHistory(fullCommand, [`<span style="color: ${terminalConfig.visuals.colors.error}">cd: ${targetPath}: Not a directory</span>`]);
          } else if (node.type === 'directory') {
            setCurrentPath(targetPath);
            addToHistory(fullCommand, []);
          } else {
            addToHistory(fullCommand, [`<span style="color: ${terminalConfig.visuals.colors.error}">cd: ${targetPath}: Not a directory</span>`]);
          }
        }
        break;

      case 'pwd':
        addToHistory(fullCommand, [currentPath]);
        break;

      case 'cat':
        if (!args[0]) {
          addToHistory(fullCommand, [`<span style="color: ${terminalConfig.visuals.colors.error}">cat: missing file operand</span>`]);
        } else if (args[0] === '/etc/info') {
          const infoNode = getNode('/etc');
          if (infoNode && typeof infoNode !== 'string' && infoNode.children) {
            addToHistory(fullCommand, [infoNode.children.info as string]);
          }
        } else {
          const filePath = resolvePath(args[0]);
          const node = getNode(filePath);
          
          if (!node) {
            addToHistory(fullCommand, [`<span style="color: ${terminalConfig.visuals.colors.error}">cat: ${filePath}: No such file or directory</span>`]);
          } else if (typeof node === 'string') {
            addToHistory(fullCommand, [node]);
          } else {
            addToHistory(fullCommand, [`<span style="color: ${terminalConfig.visuals.colors.error}">cat: ${filePath}: Is a directory</span>`]);
          }
        }
        break;

      case 'tree':
        const generateTree = (node: FileSystemNode | string, prefix: string = '', isLast: boolean = true): string[] => {
          const lines: string[] = [];
          
          if (typeof node === 'object' && node !== null && 'children' in node && node.children) {
            const entries = Object.entries(node.children);
            entries.forEach(([name, child], index) => {
              const isLastEntry = index === entries.length - 1;
              const connector = isLastEntry ? '└── ' : '├── ';
              
              if (typeof child === 'string') {
                lines.push(`${prefix}${connector}<span style="color: ${terminalConfig.visuals.colors.file}">${name}</span>`);
              } else if (child.type === 'directory') {
                lines.push(`${prefix}${connector}<span style="color: ${terminalConfig.visuals.colors.directory}">${name}/</span>`);
                const nextPrefix = prefix + (isLastEntry ? '    ' : '│   ');
                lines.push(...generateTree(child, nextPrefix, isLastEntry));
              } else {
                lines.push(`${prefix}${connector}<span style="color: ${terminalConfig.visuals.colors.scripts}">${name}*</span>`);
              }
            });
          }
          
          return lines;
        };

        const currentNode = getNode(currentPath);
        const treeOutput = [
          `<span style="color: ${terminalConfig.visuals.colors.directory}">${currentPath === '/' ? '/' : currentPath.split('/').pop() + '/'}</span>`,
          ...generateTree(currentNode || { type: 'directory', children: {} })
        ];
        addToHistory(fullCommand, treeOutput);
        break;

      case 'vi':
        if (!args[0]) {
          addToHistory(fullCommand, [`<span style="color: ${terminalConfig.visuals.colors.error}">vi: missing file argument</span>`]);
        } else {
          const filePath = resolvePath(args[0]);
          const node = getNode(filePath);
          
          if (!node) {
            addToHistory(fullCommand, [`<span style="color: ${terminalConfig.visuals.colors.error}">Permission denied: Read-only file system</span>`]);
          } else if (typeof node === 'string') {
            addToHistory(fullCommand, [
              `--- ${filePath} ---`,
              node,
              `--- (read-only) ---`
            ]);
          } else {
            addToHistory(fullCommand, [`<span style="color: ${terminalConfig.visuals.colors.error}">vi: ${filePath}: Is a directory</span>`]);
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
        setHistory([]);
        break;

      case 'chat':
        setIsChatMode(true);
        addToHistory(fullCommand, [
          'Entering chat mode. Type your questions below.',
          'Use Ctrl+C or type "exit" to return to shell.',
          ''
        ]);
        break;

      case 'exit':
        addToHistory(fullCommand, ['Connection to terminal closed.']);
        break;

      default:
        // Check if it's a script
        const scriptPath = resolvePath(`./${command}`);
        const scriptNode = getNode(scriptPath);
        
        if (scriptNode && typeof scriptNode !== 'string' && scriptNode.type === 'script') {
          if (scriptNode.action === 'open_modal') {
            addToHistory(fullCommand, [`Opening ${scriptNode.target}...`]);
          } else if (scriptNode.action === 'open_link') {
            window.open(scriptNode.target, '_blank');
            addToHistory(fullCommand, [`Opening ${scriptNode.target}...`]);
          }
        } else {
          const errorMsg = terminalConfig.commands.not_found.response.replace('{command}', command);
          addToHistory(fullCommand, [`<span style="color: ${terminalConfig.visuals.colors.error}; font-style: italic;">${errorMsg}</span>`]);
        }
        break;
    }
  }, [currentPath, isChatMode, addToHistory, addToCommandHistory, resolvePath, getNode, commandHistory]);

  const getCurrentPrompt = useCallback(() => {
    if (isChatMode) {
      return terminalConfig.chatbot.prompt;
    }
    
    const shortPath = currentPath === '/' ? '~' : currentPath.replace(/^\//, '').split('/').pop() || '~';
    return `[saptarshi@terminal ${shortPath}]$ `;
  }, [currentPath, isChatMode]);

  return {
    currentPath,
    history,
    commandHistory,
    isBooting,
    isChatMode,
    executeCommand,
    getCurrentPrompt,
    navigateHistory,
    getAutocompleteOptions,
    config: terminalConfig
  };
};
