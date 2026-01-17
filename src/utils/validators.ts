/**
 * Input validation utilities
 */

/**
 * Validate reason length (max 1024 characters for Discord embed)
 */
export function validateReason(reason: string | null | undefined): {
  valid: boolean;
  error?: string;
} {
  if (!reason) {
    return { valid: true }; // Reason is optional
  }

  if (reason.length > 1024) {
    return {
      valid: false,
      error: 'Reason must be 1024 characters or less.',
    };
  }

  return { valid: true };
}

/**
 * Validate max value for role setup (reasonable limit)
 */
export function validateMaxValue(max: number): {
  valid: boolean;
  error?: string;
} {
  if (!Number.isInteger(max) || max < 1) {
    return {
      valid: false,
      error: 'Max value must be a positive integer.',
    };
  }

  if (max > 100) {
    return {
      valid: false,
      error: 'Max value cannot exceed 100 (Discord role limit).',
    };
  }

  return { valid: true };
}

/**
 * Validate that a user ID is not a bot
 */
export function validateNotBot(isBot: boolean): {
  valid: boolean;
  error?: string;
} {
  if (isBot) {
    return {
      valid: false,
      error: 'Cannot perform this action on a bot user.',
    };
  }

  return { valid: true };
}

/**
 * Validate guild ID format (Discord snowflake)
 */
export function validateGuildId(guildId: string): {
  valid: boolean;
  error?: string;
} {
  if (!/^\d{17,19}$/.test(guildId)) {
    return {
      valid: false,
      error: 'Invalid guild ID format.',
    };
  }

  return { valid: true };
}

/**
 * Validate user ID format (Discord snowflake)
 */
export function validateUserId(userId: string): {
  valid: boolean;
  error?: string;
} {
  if (!/^\d{17,19}$/.test(userId)) {
    return {
      valid: false,
      error: 'Invalid user ID format.',
    };
  }

  return { valid: true };
}
