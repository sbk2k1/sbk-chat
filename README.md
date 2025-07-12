
# Terminal Portfolio - Saptarshi Bhattacharya

A fully interactive terminal-style portfolio built with React, TypeScript, and Tailwind CSS. Experience a RHEL-inspired dark terminal interface with complete filesystem navigation, command execution, and integrated LLM chat functionality.

## ✨ Features

### 🖥️ Authentic Terminal Experience
- **RHEL-style Interface**: Dark theme with classic terminal colors
- **Boot Sequence**: Realistic startup animation with ASCII banner
- **Monospace Font**: JetBrains Mono for authentic terminal feel
- **Responsive Design**: Perfect on desktop, tablet, and mobile

### 🗂️ Interactive Filesystem
- **Complete Directory Structure**: Navigate through `/about`, `/projects`, `/experience`, `/skills`, `/interests`
- **File Operations**: `ls`, `cd`, `pwd`, `cat`, `tree`, `vi` commands
- **Script Execution**: Run `.sh` files for resume, website links
- **Read-only System**: Realistic permission handling

### 💬 Integrated LLM Chat
- **Chat Mode**: Type `chat` to enter Python-style REPL
- **Streaming Support**: Ready for real LLM backend integration
- **Session Memory**: Maintains conversation context
- **Easy Exit**: Ctrl+C or `exit` to return to shell

### 🎮 Interactive Commands
- **Unix Commands**: `ls`, `cd`, `pwd`, `cat`, `tree`, `vi`, `echo`, `whoami`, `history`, `clear`
- **Easter Eggs**: `fortune`, `play music`, `sudo make me coffee`
- **Network Simulation**: Realistic network command responses
- **Error Handling**: Proper bash-style error messages

## 🚀 Quick Start

```bash
# Clone the repository
git clone <your-repo-url>
cd terminal-portfolio

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## 🔧 Configuration

The entire terminal behavior is driven by `src/config/terminal.json`. You can easily:

### Update Filesystem Structure
```json
{
  "filesystem": {
    "structure": {
      "/": {
        "type": "directory",
        "children": {
          "your-folder": {
            "type": "directory",
            "children": {
              "your-file.md": "Your content here"
            }
          }
        }
      }
    }
  }
}
```

### Customize Colors & Theme
```json
{
  "visuals": {
    "colors": {
      "background": "#1C1C1C",
      "text": "#D0D0D0",
      "prompt": "#FF5F5F",
      "directory": "#5FAFFF",
      "file": "#AFD700",
      "highlight": "#FFAF00"
    }
  }
}
```

### Add/Remove Commands
```json
{
  "commands": {
    "working": ["ls", "cd", "your-command"],
    "easter_eggs": [
      {
        "command": "your easter egg",
        "response": "Your response here"
      }
    ]
  }
}
```

### Connect LLM Backend
```json
{
  "chatbot": {
    "enabled": true,
    "llm": {
      "backend": "Your LLM endpoint",
      "streaming": true,
      "memory": "session-only"
    }
  }
}
```

## 📁 Project Structure

```
src/
├── config/
│   └── terminal.json          # Complete terminal configuration
├── hooks/
│   └── useTerminal.ts         # Terminal logic and state management
├── components/
│   └── Terminal.tsx           # Main terminal UI component
└── pages/
    └── Index.tsx              # Entry point
```

## 🎯 Available Commands

### Navigation & Files
- `ls [directory]` - List directory contents
- `cd <directory>` - Change directory
- `pwd` - Print working directory
- `cat <file>` - Display file contents
- `tree` - Show directory tree structure
- `vi <file>` - View file in read-only mode

### System & Info
- `whoami` - Display user information
- `history` - Show command history
- `clear` - Clear terminal screen
- `help` - Show all available commands

### Interactive Features
- `chat` - Enter LLM chat mode
- `./resume.sh` - View resume (opens modal)
- `./website.sh` - Open main website
- `./minimal.sh` - Open minimal portfolio

### Easter Eggs
- `fortune` - Display random fortune
- `play music` - Music player reference
- `sudo make me coffee` - Classic terminal humor

## 🌐 Deployment

Built as a static single-page application, ready for:
- **Vercel**: Zero-config deployment
- **Netlify**: Drag-and-drop deployment
- **GitHub Pages**: Static hosting
- **Any CDN**: Standard HTML/CSS/JS output

## 📱 Accessibility

- **Keyboard Navigation**: Full keyboard support
- **Screen Reader Compatible**: Semantic HTML structure
- **High Contrast Support**: Respects system preferences
- **Reduced Motion**: Honors motion preferences
- **Mobile Optimized**: Touch-friendly interface

## 🛠️ Customization Examples

### Add New Project
```json
"projects": {
  "type": "directory",
  "children": {
    "your-new-project": {
      "type": "directory",
      "children": {
        "description.md": "Your project description",
        "tech-stack.md": "Technologies used",
        "demo.sh": {
          "type": "script",
          "action": "open_link",
          "target": "https://your-demo-url.com"
        }
      }
    }
  }
}
```

### Connect Real LLM
Replace the simulated response in `useTerminal.ts`:
```typescript
// In chat mode command handling
const response = await fetch('your-llm-endpoint', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: trimmedInput })
});
const data = await response.json();
addToHistory('>>> ' + trimmedInput, [data.response]);
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Update `terminal.json` for configuration changes
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🔗 Links

- **Portfolio**: [Live Demo](https://your-portfolio-url.com)
- **Email**: sb@sbk2k1.in
- **GitHub**: [github.com/sbk2k1](https://github.com/sbk2k1)

---

*Built with ❤️ using React, TypeScript, and the terminal aesthetic we all love.*
