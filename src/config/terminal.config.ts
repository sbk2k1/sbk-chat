/**
 * Terminal Configuration
 * Central configuration for terminal appearance, behavior, and features
 */

export interface TerminalColors {
  background: string;
  foreground: string;
  black: string;
  red: string;
  green: string;
  yellow: string;
  blue: string;
  magenta: string;
  cyan: string;
  white: string;
  brightBlack: string;
  brightRed: string;
  brightGreen: string;
  brightYellow: string;
  brightBlue: string;
  brightMagenta: string;
  brightCyan: string;
  brightWhite: string;
  prompt: string;
  directory: string;
  file: string;
  executable: string;
  link: string;
}

export interface TerminalConfig {
  colors: TerminalColors;
  font: {
    family: string;
    size: string;
    lineHeight: number;
    letterSpacing: string;
  };
  cursor: {
    style: 'block' | 'underline' | 'bar';
    blink: boolean;
    blinkSpeed: number;
  };
  prompt: {
    username: string;
    hostname: string;
    format: string;
  };
  features: {
    bootSequence: boolean;
    chat: boolean;
    easterEggs: boolean;
  };
  api: {
    geminiKey: string;
    localLLMEndpoint: string;
  };
}

// RHEL/xterm-256color color scheme
export const TERMINAL_COLORS: TerminalColors = {
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
  link: '#00FFFF',
};

export const DEFAULT_CONFIG: TerminalConfig = {
  colors: TERMINAL_COLORS,
  font: {
    family: '"JetBrains Mono", "Fira Code", Consolas, monospace',
    size: '14px',
    lineHeight: 1.5,
    letterSpacing: '0.5px',
  },
  cursor: {
    style: 'block',
    blink: true,
    blinkSpeed: 530, // milliseconds
  },
  prompt: {
    username: 'saptarshi',
    hostname: 'portfolio',
    format: '[{username}@{hostname} {directory}]$ ',
  },
  features: {
    bootSequence: import.meta.env.VITE_ENABLE_BOOT_SEQUENCE !== 'false',
    chat: import.meta.env.VITE_ENABLE_CHAT !== 'false',
    easterEggs: true,
  },
  api: {
    geminiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
    localLLMEndpoint: import.meta.env.VITE_LOCAL_LLM_ENDPOINT || 'http://localhost:11434',
  },
};

// Easter egg definitions
export const EASTER_EGGS = [
  {
    command: 'sl',
    description: 'ASCII train animation (typo of ls)',
  },
  {
    command: 'cowsay',
    description: 'ASCII cow with message',
  },
  {
    command: 'fortune',
    description: 'Random tech quotes',
  },
  {
    command: 'sudo rm -rf /',
    description: 'Humorous warning',
  },
  {
    command: 'hack',
    description: 'Matrix-style animation',
  },
];

// Boot sequence messages
export const BOOT_SEQUENCE = [
  '[  OK  ] Started Terminal Session',
  '[  OK  ] Reached target Multi-User System',
  '         Starting GNOME Display Manager...',
  '[  OK  ] Started GNOME Display Manager',
  '',
  'Red Hat Enterprise Linux 8.5 (Ootpa)',
  'Kernel 4.18.0-348.el8.x86_64 on an x86_64',
  '',
  'saptarshi-portfolio login: saptarshi',
  'Password: ',
  'Last login: Sat Nov 8 2025 from 192.168.1.100',
  '',
];
