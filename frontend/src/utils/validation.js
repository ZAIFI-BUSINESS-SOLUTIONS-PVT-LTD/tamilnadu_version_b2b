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

  // 2. Prepare allowed types from the 'accept' string
  const allowedTypes = accept
    .split(',')
    .map(type => type.trim().toLowerCase())
    .filter(type => type); // Remove any empty strings from split

  // 3. Validate file type (MIME type or extension)
  const isFileTypeAllowed = allowedTypes.some(allowedType => {
    // Case 1: Allowed type is a MIME type (e.g., "application/pdf", "image/jpeg")
    if (allowedType.includes('/')) {
      // Handle wildcard MIME types (e.g., "image/*", "application/*")
      if (allowedType.endsWith('/*')) {
        const mimeTypePrefix = allowedType.slice(0, -1); // e.g., "image/"
        return file.type.toLowerCase().startsWith(mimeTypePrefix);
      }
      // Handle exact MIME type match
      return file.type.toLowerCase() === allowedType;
    }
    // Case 2: Allowed type is a file extension (e.g., ".pdf", ".jpg")
    if (allowedType.startsWith('.')) {
      return file.name.toLowerCase().endsWith(allowedType);
    }
    // Fallback: If `accept` contains just "pdf" instead of ".pdf", try matching extension.
    // This is less robust and assumes consistent input format, but handles potential user input quirks.
    return file.name.toLowerCase().endsWith(`.${allowedType}`);
  });

  if (!isFileTypeAllowed) {
    return {
      valid: false,
      error: `Please upload a file with one of the allowed types: ${accept}.`
    };
  }

  // 4. Validate file size
  const maxSizeBytes = 50 * 1024 * 1024; // 50 MB
  if (file.size > maxSizeBytes) {
    return { valid: false, error: 'File size should be less than 50MB.' };
  }

  // 5. If all checks pass, the file is valid
  return { valid: true };
};