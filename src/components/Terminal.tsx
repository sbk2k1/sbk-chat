
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTerminal } from '../hooks/useTerminal';
import { useDebounce } from '../hooks/useDebounce';

const Terminal: React.FC = () => {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const historyEndRef = useRef<HTMLDivElement>(null);
  
  const { 
    history, 
    isBooting, 
    chatMode, 
    executeCommand,
    cancelCommand,
    getCurrentPrompt, 
    navigateHistory,
    getAutocompleteOptions,
    config 
  } = useTerminal();

  // Debounce input for autocomplete to reduce computation
  const debouncedInput = useDebounce(input, 150);

  useEffect(() => {
    if (inputRef.current && !isBooting) {
      inputRef.current.focus();
    }
  }, [isBooting]);

  // Auto-scroll to bottom when history changes
  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  // Memoize autocomplete options to avoid recalculation
  const autocompleteOptions = useMemo(() => {
    return getAutocompleteOptions(debouncedInput);
  }, [debouncedInput, getAutocompleteOptions]);

  const handleAutocomplete = useCallback(() => {
    if (autocompleteOptions.length > 0) {
      const [command, ...args] = input.split(' ');
      const selectedOption = autocompleteOptions[0];
      
      if (args.length === 0) {
        setInput(selectedOption + ' ');
      } else {
        const newArgs = [...args.slice(0, -1), selectedOption];
        setInput(command + ' ' + newArgs.join(' ') + ' ');
      }
    }
  }, [input, autocompleteOptions]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      executeCommand(input);
      setInput('');
    }
  }, [input, executeCommand]);

  // Memoize keyboard handler to prevent recreation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Check for Ctrl+C (also handle lowercase 'c')
    if (e.ctrlKey && (e.key === 'c' || e.key === 'C')) {
      e.preventDefault();
      e.stopPropagation();
      
      if (chatMode) {
        executeCommand('exit');
      } else {
        // Show the cancelled command with ^C and create a new prompt line
        cancelCommand(input);
        setInput('');
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
  }, [chatMode, executeCommand, cancelCommand, input, handleAutocomplete, navigateHistory]);

  // Memoize history rendering to avoid unnecessary re-renders
  const renderedHistory = useMemo(() => {
    return history.map((entry, index) => (
      <div key={`${entry.timestamp}-${index}`} className="mb-1">
        {entry.command && (
          <div className="flex">
            <span 
              className="mr-2"
              dangerouslySetInnerHTML={{ 
                __html: entry.command.startsWith('>>>') ? '' : (entry.prompt || getCurrentPrompt())
              }}
            />
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
    ));
  }, [history, getCurrentPrompt]);

  // Memoize terminal styles
  const terminalStyle = useMemo(() => ({
    backgroundColor: config.visuals.colors.background,
    color: config.visuals.colors.foreground,
    fontFamily: config.visuals.font
  }), [config]);

  const inputStyle = useMemo(() => ({
    color: config.visuals.colors.foreground,
    caretColor: 'transparent'
  }), [config]);

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
      ref={terminalRef}
      className="min-h-screen p-4 font-mono text-sm overflow-auto terminal-scroll"
      style={terminalStyle}
      onClick={() => inputRef.current?.focus()}
    >
      {renderedHistory}
      <div ref={historyEndRef} />

      <form onSubmit={handleSubmit}>
        <div className="flex items-center">
          <span 
            className="mr-2"
            dangerouslySetInnerHTML={{ __html: getCurrentPrompt() }}
          />
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-transparent outline-none border-none"
              style={inputStyle}
              autoComplete="off"
              spellCheck={false}
            />
            <span 
              className="terminal-cursor-block cursor-blink absolute top-0"
              style={{ 
                left: `${input.length * 0.6}em`,
                visibility: 'visible'
              }}
            >
              █
            </span>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Terminal;
