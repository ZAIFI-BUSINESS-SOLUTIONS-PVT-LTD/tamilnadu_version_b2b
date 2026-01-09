/**
 * @file Utility function for validating file uploads.
 */

/**
 * Validates a given File object against allowed types and maximum size.
 *
 * @param {File | null | undefined} file - The File object to validate (e.g., from an input[type="file"]).
 * @param {string} accept - A comma-separated string of allowed MIME types or file extensions,
 * similar to the HTML `accept` attribute (e.g., "image/png, .jpg, application/pdf").
 * @returns {{ valid: boolean, error?: string }} An object indicating validity and an error message if invalid.
 */
export const validateFile = (file, accept) => {
  // 1. Check if a file was actually provided
  if (!file) {
    return { valid: false, error: 'No file selected.' };
  }

  // Normalize file properties safely
  const fileType = (file.type || '').toLowerCase();
  const fileName = (file.name || '').toLowerCase();

  // If no accept is provided, only validate size
  const maxSizeBytes = 50 * 1024 * 1024; // 50 MB
  if (!accept) {
    if (file.size > maxSizeBytes) return { valid: false, error: 'File size should be less than 50MB.' };
    return { valid: true };
  }

  // 2. Prepare allowed types from the 'accept' string (or array)
  const allowedTypes = Array.isArray(accept)
    ? accept.map(t => String(t).trim().toLowerCase()).filter(Boolean)
    : String(accept).split(',').map(type => type.trim().toLowerCase()).filter(Boolean);

  // 3. Validate file type (MIME type or extension)
  const isFileTypeAllowed = allowedTypes.some(allowedType => {
    if (!allowedType) return false;

    // MIME wildcard like image/* or application/*
    if (allowedType.endsWith('/*') && allowedType.includes('/')) {
      const mimePrefix = allowedType.slice(0, -1); // 'image/'
      return fileType.startsWith(mimePrefix);
    }

    // Exact MIME type
    if (allowedType.includes('/')) {
      return fileType === allowedType;
    }

    // Extension check (with or without leading dot)
    const normalizedExt = allowedType.startsWith('.') ? allowedType : `.${allowedType}`;
    return fileName.endsWith(normalizedExt);
  });

  if (!isFileTypeAllowed) {
    return {
      valid: false,
      error: `Please upload a file with one of the allowed types: ${allowedTypes.join(', ')}`
    };
  }

  // 4. Validate file size
  if (file.size > maxSizeBytes) {
    return { valid: false, error: 'File size should be less than 50MB.' };
  }

  // 5. If all checks pass, the file is valid
  return { valid: true };
};