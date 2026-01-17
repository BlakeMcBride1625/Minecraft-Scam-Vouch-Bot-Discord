/**
 * Error handling utilities
 */

import { createErrorEmbed } from './embeds.js';

/**
 * Handle database errors and return user-friendly message
 */
export function handleDatabaseError(error: unknown): string {
  if (error instanceof Error) {
    console.error('Database error:', error.message);
    
    // Check for common database errors
    if (error.message.includes('duplicate key')) {
      return 'This record already exists in the database.';
    }
    if (error.message.includes('foreign key')) {
      return 'Referenced record does not exist.';
    }
    if (error.message.includes('connection')) {
      return 'Database connection error. Please try again later.';
    }
    
    return 'A database error occurred. Please try again later.';
  }
  
  return 'An unexpected error occurred.';
}

/**
 * Handle Discord API errors and return user-friendly message
 */
export function handleDiscordError(error: unknown): string {
  if (error instanceof Error) {
    console.error('Discord API error:', error.message);
    
    // Check for common Discord errors
    if (error.message.includes('Missing Permissions')) {
      return 'The bot is missing required permissions.';
    }
    if (error.message.includes('Missing Access')) {
      return 'The bot does not have access to perform this action.';
    }
    if (error.message.includes('rate limit')) {
      return 'Rate limit exceeded. Please try again in a moment.';
    }
    if (error.message.includes('Unknown Role')) {
      return 'The specified role does not exist.';
    }
    if (error.message.includes('Unknown Member')) {
      return 'The specified member was not found.';
    }
    
    return 'A Discord API error occurred. Please try again later.';
  }
  
  return 'An unexpected error occurred.';
}

/**
 * Create an error embed from an error
 */
export function createErrorEmbedFromError(error: unknown): ReturnType<typeof createErrorEmbed> {
  let message: string;
  
  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  } else {
    message = 'An unexpected error occurred.';
  }
  
  return createErrorEmbed(message);
}

/**
 * Log error to console with context
 */
export function logError(context: string, error: unknown): void {
  const timestamp = new Date().toISOString();
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;
  
  console.error(`[${timestamp}] Error in ${context}:`, errorMessage);
  if (errorStack) {
    console.error('Stack trace:', errorStack);
  }
}
