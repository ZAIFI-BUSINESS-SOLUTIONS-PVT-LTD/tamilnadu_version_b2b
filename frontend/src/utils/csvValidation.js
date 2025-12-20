/**
 * @file CSV validation utilities for answer keys and response sheets
 * Validates CSV structure, content, and business rules before upload
 */

/**
 * Parse CSV file and return rows as array of objects
 * @param {File} file - CSV file to parse
 * @returns {Promise<{headers: string[], rows: object[], rawRows: string[][]}>}
 */
const parseCSV = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const lines = text.split(/\r?\n/).filter(line => line.trim());

        if (lines.length === 0) {
          reject(new Error('CSV file is empty'));
          return;
        }

        // Parse header row - handle both comma and tab delimiters
        const firstLine = lines[0];
        const delimiter = firstLine.includes('\t') ? '\t' : ',';
        const headerParts = firstLine.split(delimiter).map(h => h.trim().toLowerCase());

        // Filter out empty headers and map to standard names
        const headers = [];
        const headerIndices = [];
        headerParts.forEach((h, idx) => {
          if (h && h !== '') {
            // Map common variations to standard names
            if (h.includes('question') && h.includes('number')) {
              headers.push('question_number');
              headerIndices.push(idx);
            } else if (h.includes('answer')) {
              headers.push('answer');
              headerIndices.push(idx);
            } else {
              headers.push(h);
              headerIndices.push(idx);
            }
          }
        });

        // Parse data rows
        const rawRows = [];
        const rows = [];

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(delimiter).map(v => v.trim());
          rawRows.push(values);

          const rowObj = {};
          headers.forEach((header, hIdx) => {
            const valueIndex = headerIndices[hIdx];
            rowObj[header] = values[valueIndex] || '';
          });

          // Only add row if it has data
          if (rowObj.question_number || rowObj.answer) {
            rows.push(rowObj);
          }
        }

        resolve({ headers, rows, rawRows });
      } catch (error) {
        reject(new Error(`Failed to parse CSV: ${error.message}`));
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
};

/**
 * Validate Answer Key CSV
 * Checks for:
 * 1. Duplicate question numbers
 * 2. Blank values in answer column
 * 3. Invalid content in question_number (must be integer)
 * 4. Invalid content in answer column (must be int or single char A-D)
 * 5. Total question count matches metadata
 * 
 * @param {File} file - Answer key CSV file
 * @param {object} options - Validation options
 * @param {number} options.expectedQuestionCount - Expected total questions from metadata
 * @returns {Promise<{valid: boolean, errors: Array, warnings: Array, summary: object}>}
 */
export const validateAnswerKeyCSV = async (file, options = {}) => {
  const errors = [];
  const warnings = [];
  const { expectedQuestionCount } = options;

  try {
    // Basic file validation
    if (!file) {
      return { valid: false, errors: [{ type: 'file', message: 'No file selected' }] };
    }

    if (!file.name.toLowerCase().endsWith('.csv')) {
      return { valid: false, errors: [{ type: 'file', message: 'File must be a CSV file' }] };
    }

    if (file.size > 10 * 1024 * 1024) {
      return { valid: false, errors: [{ type: 'file', message: 'File size must be less than 10MB' }] };
    }

    // Parse CSV
    const { headers, rows } = await parseCSV(file);

    // Check required headers
    const requiredHeaders = ['question_number', 'answer'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));

    if (missingHeaders.length > 0) {
      errors.push({
        type: 'header',
        message: `Missing required columns: ${missingHeaders.join(', ')}. Required columns are: ${requiredHeaders.join(', ')}`
      });
      return { valid: false, errors, warnings, summary: {} };
    }

    // Track question numbers for duplicate detection
    const questionNumbers = new Set();
    const duplicates = new Set();

    // Validate each row
    rows.forEach((row, index) => {
      const rowNumber = index + 2; // +2 because index 0 is row 1 (after header)
      const questionNum = row['question_number'];
      const answer = row['answer'];

      // Check 1: Validate question_number is present and is an integer
      if (!questionNum || questionNum === '') {
        errors.push({
          type: 'question_number',
          row: rowNumber,
          message: `Row ${rowNumber}: Question number is blank`
        });
      } else {
        const parsedNum = parseInt(questionNum, 10);
        if (isNaN(parsedNum) || parsedNum.toString() !== questionNum.toString().trim()) {
          errors.push({
            type: 'question_number',
            row: rowNumber,
            value: questionNum,
            message: `Row ${rowNumber}: Question number "${questionNum}" must be a valid integer`
          });
        } else {
          // Check for duplicates
          if (questionNumbers.has(parsedNum)) {
            duplicates.add(parsedNum);
            errors.push({
              type: 'duplicate',
              row: rowNumber,
              value: parsedNum,
              message: `Row ${rowNumber}: Duplicate question number ${parsedNum}`
            });
          } else {
            questionNumbers.add(parsedNum);
          }
        }
      }

      // Check 2: Validate answer is not blank
      if (!answer || answer === '') {
        errors.push({
          type: 'answer',
          row: rowNumber,
          message: `Row ${rowNumber}: Answer is blank`
        });
      } else {
        // Check 3: Validate answer format
        // Answer should be either:
        // - A single uppercase letter (A, B, C, D) for MCQ
        // - An integer for numeric answers
        // - We'll accept both formats
        const trimmedAnswer = answer.trim();

        // Check if it's a single letter (A-D), a whole number, a float-integer like 1.0-4.0, or 'grace'
        const isSingleChar = /^[A-Da-d]$/.test(trimmedAnswer);
        const isNumber = /^\d+$/.test(trimmedAnswer);
        const isFloat1to4 = /^[1-4](?:\.0+)?$/.test(trimmedAnswer); // 1.0, 2.00, etc.
        const isGrace = /^grace$/i.test(trimmedAnswer);

        if (!isSingleChar && !isNumber && !isFloat1to4 && !isGrace) {
          errors.push({
            type: 'answer',
            row: rowNumber,
            value: answer,
            message: `Row ${rowNumber}: Answer "${answer}" must be either a single letter (A-D) or a number`
          });
        }
      }
    });

    // Check 4: Validate total question count if metadata provided
    if (expectedQuestionCount !== undefined && expectedQuestionCount !== null) {
      const actualCount = rows.length;
      if (actualCount !== expectedQuestionCount) {
        errors.push({
          type: 'count_mismatch',
          message: `Question count mismatch: Expected ${expectedQuestionCount} questions, but found ${actualCount} in CSV`
        });
      }
    }

    // Generate summary
    const summary = {
      totalRows: rows.length,
      uniqueQuestions: questionNumbers.size,
      duplicateQuestions: duplicates.size,
      errorCount: errors.length,
      warningCount: warnings.length
    };

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      summary
    };

  } catch (error) {
    return {
      valid: false,
      errors: [{ type: 'parse', message: `Failed to validate CSV: ${error.message}` }],
      warnings: [],
      summary: {}
    };
  }
};

/**
 * Validate Response Sheet CSV
 * Checks for:
 * 1. Total question count matches metadata
 * 2. Headers are not null
 * 3. Auto-corrects invalid multi-choice options (e.g., B,D) to a wrong answer
 * 
 * @param {File} responseFile - Response sheet CSV file
 * @param {File} answerKeyFile - Answer key CSV file (to check correct answers)
 * @param {object} options - Validation options
 * @param {number} options.expectedQuestionCount - Expected total questions from metadata
 * @returns {Promise<{valid: boolean, errors: Array, warnings: Array, correctedFile: File, corrections: Array, summary: object}>}
 */
export const validateResponseSheetCSV = async (responseFile, answerKeyFile, options = {}) => {
  const errors = [];
  const warnings = [];
  const { expectedQuestionCount } = options;

  try {
    // Basic file validation
    if (!responseFile) {
      return { valid: false, errors: [{ type: 'file', message: 'No response file selected' }] };
    }

    if (!responseFile.name.toLowerCase().endsWith('.csv')) {
      return { valid: false, errors: [{ type: 'file', message: 'Response file must be a CSV file' }] };
    }

    // Parse Response CSV
    const responseText = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Failed to read response file'));
      reader.readAsText(responseFile);
    });

    const lines = responseText.split(/\r?\n/).filter(line => line.trim());
    if (lines.length === 0) {
      return { valid: false, errors: [{ type: 'file', message: 'Response file is empty' }] };
    }

    // Parse header
    const delimiter = lines[0].includes('\t') ? '\t' : ',';
    const headerParts = lines[0].split(delimiter).map(h => h.trim());

    // Check headers not null
    if (headerParts.every(h => !h || h === '')) {
      errors.push({ type: 'header', message: 'All headers are null or empty' });
      return { valid: false, errors, warnings, summary: {} };
    }

    // First column is question number, remaining columns are student IDs
    const studentIds = headerParts.slice(1).filter(h => h && h !== '');

    if (studentIds.length === 0) {
      errors.push({ type: 'header', message: 'No student ID columns found in header' });
      return { valid: false, errors, warnings, summary: {} };
    }

    // Count data rows (excluding header) - each row represents one question
    const dataRowCount = lines.length - 1;

    console.log('Response CSV Validation:', {
      totalLines: lines.length,
      dataRowCount,
      expectedQuestionCount,
      expectedType: typeof expectedQuestionCount,
      studentCount: studentIds.length,
      metadataProvided: options
    });

    // Check 1: Question count mismatch - ALWAYS check if metadata provided
    if (expectedQuestionCount !== undefined && expectedQuestionCount !== null && expectedQuestionCount > 0) {
      const expectedCount = parseInt(expectedQuestionCount, 10);
      console.log(`Comparing: dataRowCount=${dataRowCount} vs expectedCount=${expectedCount}`);

      if (dataRowCount !== expectedCount) {
        const errorMsg = `Question count mismatch: Expected ${expectedCount} questions, but found ${dataRowCount} rows in CSV`;
        console.log('COUNT MISMATCH ERROR:', errorMsg);
        errors.push({
          type: 'count_mismatch',
          message: errorMsg
        });
      }
    } else {
      console.log('Skipping count check - no expectedQuestionCount provided');
    }

    // Check 2: Validate student responses
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(delimiter).map(v => v.trim());
      const questionNumber = values[0] || `Row ${i + 1}`;

      // Validate each student's response for this question
      for (let j = 1; j < values.length && j <= studentIds.length; j++) {
        const response = values[j];
        const studentId = studentIds[j - 1];

        // Skip empty responses (blank answers allowed)
        if (!response || response === '') continue;

        // Validate response: accept
        // - integers 1-4
        // - float integers like 1.0, 2.0, 3.0, 4.0 (optional trailing zeros)
        // - single letters A-D (case-insensitive)
        // - the value "grace" (case-insensitive)
        // Empty responses are skipped above and considered valid
        const trimmedResp = (response || '').toString().trim();
        const isNumeric1to4 = /^[1-4](?:\.0+)?$/.test(trimmedResp);
        const isLetterAtoD = /^[A-Da-d]$/.test(trimmedResp);
        const isGrace = /^grace$/i.test(trimmedResp);
        const isValidResponse = isNumeric1to4 || isLetterAtoD || isGrace;
        if (!isValidResponse) {
          errors.push({
            type: 'invalid_response',
            row: i + 1,
            student_id: studentId,
            question_number: questionNumber,
            value: response,
            message: `Row ${i + 1}, Student ${studentId}, Q${questionNumber}: Invalid response "${response}" (expected 1-4 or A-D)`
          });
        }
      }
    }

    // Create corrected file (same as original since we don't modify)
    const correctedFile = new File([responseText], responseFile.name, { type: 'text/csv' });

    // Summary
    const summary = {
      totalQuestions: dataRowCount,
      totalStudents: studentIds.length,
      errorCount: errors.length,
      warningCount: warnings.length
    };

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      correctedFile,
      summary
    };

  } catch (error) {
    return {
      valid: false,
      errors: [{ type: 'parse', message: `Failed to validate response CSV: ${error.message}` }],
      warnings: [],
      summary: {}
    };
  }
};

/**
 * Format validation errors for display
 * @param {Array} errors - Array of error objects
 * @returns {string} Formatted error message
 */
export const formatValidationErrors = (errors) => {
  if (errors.length === 0) return '';

  // Group errors by type
  const grouped = errors.reduce((acc, error) => {
    const type = error.type || 'general';
    if (!acc[type]) acc[type] = [];
    acc[type].push(error);
    return acc;
  }, {});

  let message = 'Validation failed:\n\n';

  // File errors
  if (grouped.file) {
    message += '📄 File Issues:\n';
    grouped.file.forEach(e => message += `  • ${e.message}\n`);
    message += '\n';
  }

  // Header errors
  if (grouped.header) {
    message += '📋 Header Issues:\n';
    grouped.header.forEach(e => message += `  • ${e.message}\n`);
    message += '\n';
  }

  // Duplicate errors
  if (grouped.duplicate) {
    message += `🔄 Duplicate Question Numbers (${grouped.duplicate.length}):\n`;
    grouped.duplicate.slice(0, 5).forEach(e => message += `  • ${e.message}\n`);
    if (grouped.duplicate.length > 5) {
      message += `  • ... and ${grouped.duplicate.length - 5} more duplicates\n`;
    }
    message += '\n';
  }

  // Question number errors
  if (grouped.question_number) {
    message += `🔢 Question Number Issues (${grouped.question_number.length}):\n`;
    grouped.question_number.slice(0, 5).forEach(e => message += `  • ${e.message}\n`);
    if (grouped.question_number.length > 5) {
      message += `  • ... and ${grouped.question_number.length - 5} more issues\n`;
    }
    message += '\n';
  }

  // Answer errors
  if (grouped.answer) {
    message += `✍️ Answer Issues (${grouped.answer.length}):\n`;
    grouped.answer.slice(0, 5).forEach(e => message += `  • ${e.message}\n`);
    if (grouped.answer.length > 5) {
      message += `  • ... and ${grouped.answer.length - 5} more issues\n`;
    }
    message += '\n';
  }

  // Invalid response values (response CSV)
  if (grouped.invalid_response) {
    message += `✖️ Invalid Responses (${grouped.invalid_response.length}):\n`;
    grouped.invalid_response.slice(0, 10).forEach(e => message += `  • ${e.message}\n`);
    if (grouped.invalid_response.length > 10) {
      message += `  • ... and ${grouped.invalid_response.length - 10} more invalid responses\n`;
    }
    message += '\n';
  }

  // Row length mismatch errors
  if (grouped.row_length_mismatch) {
    message += `📐 Row Length Mismatches (${grouped.row_length_mismatch.length}):\n`;
    grouped.row_length_mismatch.slice(0, 10).forEach(e => message += `  • ${e.message}\n`);
    if (grouped.row_length_mismatch.length > 10) {
      message += `  • ... and ${grouped.row_length_mismatch.length - 10} more rows\n`;
    }
    message += '\n';
  }

  // Count mismatch
  if (grouped.count_mismatch) {
    message += '📊 Count Issues:\n';
    grouped.count_mismatch.forEach(e => message += `  • ${e.message}\n`);
    message += '\n';
  }

  // Parse errors
  if (grouped.parse) {
    message += '⚠️ Parse Errors:\n';
    grouped.parse.forEach(e => message += `  • ${e.message}\n`);
  }

  return message.trim();
};
