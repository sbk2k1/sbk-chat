
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTerminal } from '../hooks/useTerminal';

const Terminal: React.FC = () => {
  const [input, setInput] = useState('');
  const [autocompleteIndex, setAutocompleteIndex] = useState(-1);
  const [showingAutocomplete, setShowingAutocomplete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  
  const { 
    history, 
    isBooting, 
    isChatMode, 
    executeCommand, 
    getCurrentPrompt, 
    navigateHistory,
    getAutocompleteOptions,
    config 
  } = useTerminal();

  useEffect(() => {
    if (inputRef.current && !isBooting) {
      inputRef.current.focus();
    }
  }, [isBooting]);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [history]);

  const handleAutocomplete = useCallback(() => {
    const options = getAutocompleteOptions(input);
    if (options.length > 0) {
      const [command, ...args] = input.split(' ');
      const currentArg = args[args.length - 1] || '';
      const selectedOption = options[0];
      
      if (args.length === 0) {
        setInput(selectedOption + ' ');
      } else {
        const newArgs = [...args.slice(0, -1), selectedOption];
        setInput(command + ' ' + newArgs.join(' ') + ' ');
      }
    }
  }, [input, getAutocompleteOptions]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      executeCommand(input);
      setInput('');
      setAutocompleteIndex(-1);
      setShowingAutocomplete(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'c') {
      e.preventDefault();
      if (isChatMode) {
        executeCommand('exit');
      } else {
        setInput('');
        setAutocompleteIndex(-1);
        setShowingAutocomplete(false);
      }
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      handleAutocomplete();
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const previousCommand = navigateHistory('up');
      setInput(previousCommand);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextCommand = navigateHistory('down');
      setInput(nextCommand);
      return;
    }

    setAutocompleteIndex(-1);
    setShowingAutocomplete(false);
  };

  if (isBooting) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ 
          backgroundColor: config.visuals.colors.background,
          color: config.visuals.colors.palette.green,
          fontFamily: config.visuals.font
        }}
      >
        <div className="text-center">
          <div className="text-xl mb-4">
            System initializing...
          </div>
          <div className="w-64 bg-gray-700 rounded-full h-2">
            <div 
              className="h-2 rounded-full" 
              style={{ 
                backgroundColor: config.visuals.colors.palette.green,
                width: '75%' 
              }}
            ></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen p-4 font-mono text-sm"
      style={{ 
        backgroundColor: config.visuals.colors.background,
        color: config.visuals.colors.foreground,
        fontFamily: config.visuals.font
      }}
      onClick={() => inputRef.current?.focus()}
    >
      <div 
        ref={terminalRef}
        className="max-w-full overflow-auto terminal-scroll"
        style={{ maxHeight: 'calc(100vh - 100px)' }}
      >
        {history.map((entry, index) => (
          <div key={index} className="mb-1">
            {entry.command && (
              <div className="flex">
                <span 
                  className="mr-2"
                  style={{ color: config.visuals.colors.cursor }}
                >
                  {entry.command.startsWith('>>>') ? '' : getCurrentPrompt()}
                </span>
                <span>{entry.command}</span>
              </div>
            )}
            {entry.output.map((line, lineIndex) => (
              <div 
                key={lineIndex} 
                className="whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: line }}
              />
            ))}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="flex items-center">
          <span 
            className="mr-2"
            style={{ color: config.visuals.colors.cursor }}
          >
            {getCurrentPrompt()}
          </span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent outline-none border-none"
            style={{ 
              color: config.visuals.colors.foreground,
              caretColor: config.visuals.colors.cursor
            }}
            autoComplete="off"
            spellCheck={false}
          />
          <span 
            className={config.visuals.cursor.blinking ? 'animate-pulse' : ''}
            style={{ color: config.visuals.colors.cursor }}
          >
            █
          </span>
        </div>
      </form>
    </div>
  );
};

export default Terminal;
