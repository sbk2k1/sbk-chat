/**
 * Example usage of FileSystemManager
 * This file demonstrates how to use the filesystem loader
 */

import { getFileSystemManager } from './filesystemLoader';

/**
 * Example function showing basic filesystem operations
 */
export function demonstrateFileSystem() {
  const fs = getFileSystemManager();

  // Get current path
  console.log('Current path:', fs.getCurrentPath());

  // List current directory
  const contents = fs.listDirectory();
  console.log('Current directory contents:', contents?.map(([name]) => name));

  // Navigate to about directory
  if (fs.navigate('about')) {
    console.log('Navigated to:', fs.getCurrentPath());
    
    // List about directory
    const aboutContents = fs.listDirectory();
    console.log('About directory contents:', aboutContents?.map(([name]) => name));
    
    // Read bio.txt
    const bio = fs.readFile('bio.txt');
    console.log('Bio content:', bio?.substring(0, 100) + '...');
  }

  // Navigate back home
  fs.navigateHome();
  console.log('Back to:', fs.getCurrentPath());

  // Check if paths exist
  console.log('projects exists:', fs.exists('projects'));
  console.log('projects is directory:', fs.isDirectory('projects'));
  
  // Navigate to projects
  if (fs.navigate('projects')) {
    const projects = fs.listDirectory();
    console.log('Projects:', projects?.map(([name]) => name));
  }

  // Test script execution
  const resumeAction = fs.executeScript('about/resume.sh');
  if (resumeAction) {
    console.log('Resume script action:', resumeAction);
  }
}
