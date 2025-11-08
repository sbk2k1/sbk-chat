/**
 * Filesystem module exports
 * Provides easy access to filesystem management utilities
 */

export { FileSystemManager } from './FileSystemManager';
export type { FSNode } from './FileSystemManager';
export { 
  loadFileSystem, 
  getFileSystemManager, 
  resetFileSystemManager 
} from './filesystemLoader';
