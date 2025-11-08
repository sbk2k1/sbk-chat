import { FileSystemManager } from './FileSystemManager';
import filesystemYaml from '../config/filesystem.yml?raw';

/**
 * Create and initialize a FileSystemManager instance
 * @returns Initialized FileSystemManager
 */
export function loadFileSystem(): FileSystemManager {
  try {
    const fsManager = new FileSystemManager(filesystemYaml);
    return fsManager;
  } catch (error) {
    console.error('Failed to load filesystem:', error);
    throw new Error(`Filesystem initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Singleton instance of the filesystem manager
 */
let fsManagerInstance: FileSystemManager | null = null;

/**
 * Get the singleton FileSystemManager instance
 * @returns FileSystemManager instance
 */
export function getFileSystemManager(): FileSystemManager {
  if (!fsManagerInstance) {
    fsManagerInstance = loadFileSystem();
  }
  return fsManagerInstance;
}

/**
 * Reset the filesystem manager instance (useful for hot reloading)
 */
export function resetFileSystemManager(): void {
  fsManagerInstance = null;
}
