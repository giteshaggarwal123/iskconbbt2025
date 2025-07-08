// Input validation and sanitization utilities
import { logger } from './utils';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedValue?: string;
}

// Email validation
export const validateEmail = (email: string): ValidationResult => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!email || typeof email !== 'string') {
    return { isValid: false, error: 'Email is required' };
  }
  
  const sanitizedEmail = email.trim().toLowerCase();
  
  if (!emailRegex.test(sanitizedEmail)) {
    return { isValid: false, error: 'Invalid email format' };
  }
  
  // Check for common XSS patterns
  if (sanitizedEmail.includes('<script>') || sanitizedEmail.includes('javascript:')) {
    logger.warn('Potential XSS attempt in email:', sanitizedEmail);
    return { isValid: false, error: 'Invalid email format' };
  }
  
  return { isValid: true, sanitizedValue: sanitizedEmail };
};

// Password validation
export const validatePassword = (password: string): ValidationResult => {
  if (!password || typeof password !== 'string') {
    return { isValid: false, error: 'Password is required' };
  }
  
  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters long' };
  }
  
  if (!/[A-Za-z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one letter' };
  }
  
  if (!/[0-9]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one number' };
  }
  
  return { isValid: true, sanitizedValue: password };
};

// Phone number validation
export const validatePhone = (phone: string): ValidationResult => {
  if (!phone) {
    return { isValid: true, sanitizedValue: '' }; // Optional field
  }
  
  if (typeof phone !== 'string') {
    return { isValid: false, error: 'Invalid phone number format' };
  }
  
  const sanitizedPhone = phone.replace(/\s+/g, '').replace(/[^\d+]/g, '');
  
  // Basic phone validation (10-15 digits, optionally starting with +)
  const phoneRegex = /^\+?[0-9]{10,15}$/;
  
  if (!phoneRegex.test(sanitizedPhone)) {
    return { isValid: false, error: 'Invalid phone number format' };
  }
  
  return { isValid: true, sanitizedValue: sanitizedPhone };
};

// Name validation
export const validateName = (name: string, fieldName: string = 'Name'): ValidationResult => {
  if (!name || typeof name !== 'string') {
    return { isValid: false, error: `${fieldName} is required` };
  }
  
  const sanitizedName = name.trim();
  
  if (sanitizedName.length < 2) {
    return { isValid: false, error: `${fieldName} must be at least 2 characters long` };
  }
  
  if (sanitizedName.length > 50) {
    return { isValid: false, error: `${fieldName} must be less than 50 characters` };
  }
  
  // Check for common XSS patterns
  if (sanitizedName.includes('<script>') || sanitizedName.includes('javascript:')) {
    logger.warn('Potential XSS attempt in name:', sanitizedName);
    return { isValid: false, error: `Invalid ${fieldName.toLowerCase()} format` };
  }
  
  return { isValid: true, sanitizedValue: sanitizedName };
};

// Text content sanitization
export const sanitizeText = (text: string, maxLength: number = 1000): string => {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  // Remove HTML tags
  let sanitized = text.replace(/<[^>]*>/g, '');
  
  // Remove script tags and javascript: protocol
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  sanitized = sanitized.replace(/javascript:/gi, '');
  
  // Trim and limit length
  sanitized = sanitized.trim().slice(0, maxLength);
  
  return sanitized;
};

// URL validation
export const validateUrl = (url: string): ValidationResult => {
  if (!url || typeof url !== 'string') {
    return { isValid: false, error: 'URL is required' };
  }
  
  try {
    const urlObj = new URL(url);
    const sanitizedUrl = urlObj.toString();
    
    // Check for safe protocols
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return { isValid: false, error: 'Only HTTP and HTTPS URLs are allowed' };
    }
    
    return { isValid: true, sanitizedValue: sanitizedUrl };
  } catch {
    return { isValid: false, error: 'Invalid URL format' };
  }
};

// File name validation
export const validateFileName = (fileName: string): ValidationResult => {
  if (!fileName || typeof fileName !== 'string') {
    return { isValid: false, error: 'File name is required' };
  }
  
  const sanitizedName = fileName.trim();
  
  if (sanitizedName.length === 0) {
    return { isValid: false, error: 'File name cannot be empty' };
  }
  
  if (sanitizedName.length > 255) {
    return { isValid: false, error: 'File name is too long' };
  }
  
  // Check for invalid characters
  const invalidChars = /[<>:"/\\|?*]/;
  if (invalidChars.test(sanitizedName)) {
    return { isValid: false, error: 'File name contains invalid characters' };
  }
  
  return { isValid: true, sanitizedValue: sanitizedName };
};

// Form validation helper
export const validateForm = (fields: Record<string, any>): Record<string, string> => {
  const errors: Record<string, string> = {};
  
  for (const [fieldName, value] of Object.entries(fields)) {
    let validation: ValidationResult;
    
    switch (fieldName) {
      case 'email':
        validation = validateEmail(value);
        break;
      case 'password':
        validation = validatePassword(value);
        break;
      case 'phone':
        validation = validatePhone(value);
        break;
      case 'firstName':
      case 'first_name':
        validation = validateName(value, 'First name');
        break;
      case 'lastName':
      case 'last_name':
        validation = validateName(value, 'Last name');
        break;
      default:
        // For other fields, just check if they're not empty
        if (!value || (typeof value === 'string' && value.trim().length === 0)) {
          errors[fieldName] = `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;
        }
        continue;
    }
    
    if (!validation.isValid) {
      errors[fieldName] = validation.error!;
    }
  }
  
  return errors;
}; 