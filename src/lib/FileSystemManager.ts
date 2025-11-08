import yaml from 'js-yaml';

/**
 * Represents a node in the virtual filesystem
 */
export interface FSNode {
  type: 'file' | 'directory' | 'script';
  content?: string;
  contentRef?: string;
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

/**
 * Manages the virtual filesystem loaded from YAML configuration
 */
export class FileSystemManager {
  private root: FSNode;
  private currentPath: string[];
  private previousPath: string[] | null;

  constructor(yamlConfig: string) {
    this.root = this.parseYAML(yamlConfig);
    this.currentPath = ['home', 'saptarshi'];
    this.previousPath = null;
  }

  /**
   * Parse YAML configuration and build filesystem tree
   */
  private parseYAML(yamlConfig: string): FSNode {
    try {
      const parsed = yaml.load(yamlConfig) as Record<string, any>;
      
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid YAML structure: root must be an object');
      }

      // The YAML should have a root key '/'
      const rootKey = Object.keys(parsed)[0];
      if (!rootKey) {
        throw new Error('Invalid YAML structure: no root directory found');
      }

      const rootNode = parsed[rootKey];
      this.validateNode(rootNode, rootKey);
      
      return rootNode as FSNode;
    } catch (error) {
      if (error instanceof yaml.YAMLException) {
        throw new Error(`YAML parsing error at line ${error.mark?.line}: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Validate a filesystem node structure
   */
  private validateNode(node: any, path: string): void {
    if (!node || typeof node !== 'object') {
      throw new Error(`Invalid node at ${path}: must be an object`);
    }

    if (!node.type || !['file', 'directory', 'script'].includes(node.type)) {
      throw new Error(`Invalid node type at ${path}: must be 'file', 'directory', or 'script'`);
    }

    if (node.type === 'directory') {
      if (node.children && typeof node.children !== 'object') {
        throw new Error(`Invalid children at ${path}: must be an object`);
      }
      
      // Recursively validate children
      if (node.children) {
        for (const [childName, childNode] of Object.entries(node.children)) {
          this.validateNode(childNode, `${path}/${childName}`);
        }
      }
    }

    if (node.type === 'script' && node.action) {
      if (!node.action.type || !['open_link', 'open_modal', 'execute_command'].includes(node.action.type)) {
        throw new Error(`Invalid action type at ${path}: must be 'open_link', 'open_modal', or 'execute_command'`);
      }
      if (!node.action.target) {
        throw new Error(`Invalid action at ${path}: missing target`);
      }
    }
  }

  /**
   * Navigate to a directory
   * @param path - Path to navigate to (absolute or relative)
   * @returns true if navigation successful, false otherwise
   */
  navigate(path: string): boolean {
    const resolvedPath = this.resolvePath(path);
    
    if (!resolvedPath) {
      return false;
    }

    const node = this.getNodeAtPath(resolvedPath);
    
    if (!node || node.type !== 'directory') {
      return false;
    }

    // Save current path as previous before changing
    this.previousPath = [...this.currentPath];
    this.currentPath = resolvedPath;
    return true;
  }

  /**
   * Get the current directory node
   */
  getCurrentNode(): FSNode | null {
    return this.getNodeAtPath(this.currentPath);
  }

  /**
   * Get the current path as a string
   */
  getCurrentPath(): string {
    return '/' + this.currentPath.join('/');
  }

  /**
   * Get the current path as an array
   */
  getCurrentPathArray(): string[] {
    return [...this.currentPath];
  }

  /**
   * Resolve a path (absolute or relative) to an absolute path array
   * @param path - Path to resolve
   * @returns Resolved path array, or null if invalid
   */
  resolvePath(path: string): string[] | null {
    if (!path || path.trim() === '') {
      return null;
    }

    // Handle special cases
    if (path === '~') {
      return ['home', 'saptarshi'];
    }

    if (path === '-') {
      // Previous directory
      return this.previousPath ? [...this.previousPath] : null;
    }

    let workingPath: string[];

    // Absolute path
    if (path.startsWith('/')) {
      workingPath = [];
      path = path.substring(1);
    } else {
      // Relative path
      workingPath = [...this.currentPath];
    }

    // Split path and process each segment
    const segments = path.split('/').filter(s => s.length > 0);

    for (const segment of segments) {
      if (segment === '.') {
        // Current directory - do nothing
        continue;
      } else if (segment === '..') {
        // Parent directory
        if (workingPath.length > 0) {
          workingPath.pop();
        }
      } else {
        // Regular directory/file name
        workingPath.push(segment);
      }
    }

    return workingPath;
  }

  /**
   * Get a node at a specific path
   * @param path - Path array
   * @returns FSNode or null if not found
   */
  private getNodeAtPath(path: string[]): FSNode | null {
    let current: FSNode = this.root;

    for (const segment of path) {
      if (!current.children || !current.children[segment]) {
        return null;
      }
      current = current.children[segment];
    }

    return current;
  }

  /**
   * Get a node at a specific path (public version)
   * @param path - Path string (absolute or relative)
   * @returns FSNode or null if not found
   */
  getNode(path: string): FSNode | null {
    const resolvedPath = this.resolvePath(path);
    if (!resolvedPath) {
      return null;
    }
    return this.getNodeAtPath(resolvedPath);
  }

  /**
   * List directory contents
   * @param path - Optional path to list (defaults to current directory)
   * @returns Array of [name, node] tuples, or null if path is invalid
   */
  listDirectory(path?: string): Array<[string, FSNode]> | null {
    const targetPath = path ? this.resolvePath(path) : this.currentPath;
    
    if (!targetPath) {
      return null;
    }

    const node = this.getNodeAtPath(targetPath);
    
    if (!node || node.type !== 'directory' || !node.children) {
      return null;
    }

    return Object.entries(node.children);
  }

  /**
   * Read file contents
   * @param path - Path to file
   * @returns File content or null if not found/not a file
   */
  readFile(path: string): string | null {
    const node = this.getNode(path);
    
    if (!node || node.type === 'directory') {
      return null;
    }

    return node.content || '';
  }

  /**
   * Execute a script
   * @param path - Path to script
   * @returns Action object or null if not a script
   */
  executeScript(path: string): { type: string; target: string } | null {
    const node = this.getNode(path);
    
    if (!node || node.type !== 'script' || !node.action) {
      return null;
    }

    return node.action;
  }

  /**
   * Check if a path exists
   * @param path - Path to check
   * @returns true if path exists, false otherwise
   */
  exists(path: string): boolean {
    return this.getNode(path) !== null;
  }

  /**
   * Check if a path is a directory
   * @param path - Path to check
   * @returns true if path is a directory, false otherwise
   */
  isDirectory(path: string): boolean {
    const node = this.getNode(path);
    return node !== null && node.type === 'directory';
  }

  /**
   * Check if a path is a file
   * @param path - Path to check
   * @returns true if path is a file, false otherwise
   */
  isFile(path: string): boolean {
    const node = this.getNode(path);
    return node !== null && node.type === 'file';
  }

  /**
   * Check if a path is a script
   * @param path - Path to check
   * @returns true if path is a script, false otherwise
   */
  isScript(path: string): boolean {
    const node = this.getNode(path);
    return node !== null && node.type === 'script';
  }

  /**
   * Get the home directory path
   */
  getHomePath(): string[] {
    return ['home', 'saptarshi'];
  }

  /**
   * Navigate to home directory
   */
  navigateHome(): void {
    this.previousPath = [...this.currentPath];
    this.currentPath = this.getHomePath();
  }

  /**
   * Get the previous directory path
   */
  getPreviousPath(): string | null {
    return this.previousPath ? '/' + this.previousPath.join('/') : null;
  }
}
