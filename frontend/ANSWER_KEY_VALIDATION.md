# Answer Key CSV Validation

## Overview
The answer key CSV upload now includes **comprehensive frontend validation** that checks the file before it reaches the backend. This ensures data quality and provides immediate feedback to users.

## Validation Rules

### 1. **No Duplicate Question Numbers** ❌
- Each question number must be unique
- **Example of invalid data:**
  ```csv
  question_number,answer
  1,A
  2,B
  1,C  ← Error: Duplicate question number
  ```

### 2. **No Blank Answers** ❌
- Every question must have an answer
- **Example of invalid data:**
  ```csv
  question_number,answer
  1,A
  2,     ← Error: Answer is blank
  3,C
  ```

### 3. **Valid Question Numbers** ✓
- Question numbers must be integers
- **Valid:** `1`, `2`, `3`, `100`
- **Invalid:** `1.5`, `Q1`, `one`, `1A`

### 4. **Valid Answer Format** ✓
- Answers must be either:
  - **Single letter (A-D)** for MCQ: `A`, `B`, `C`, `D` (case-insensitive)
  - **Integer** for numeric answers: `1`, `2`, `42`, `100`
- **Valid:** `A`, `B`, `C`, `D`, `1`, `42`
- **Invalid:** `AB`, `E`, `1.5`, `A1`, `answer`

### 5. **Question Count Match** ✓
- Total questions in CSV must match metadata configuration
- If you configured 180 questions, the CSV must contain exactly 180 rows
- **Mismatch example:** Configured 180, but CSV has 175 → Error

## Required CSV Format

### Required Columns
Your CSV **must** include these columns (case-insensitive):
- `question_number` - Integer question identifier
- `answer` - Answer value (A-D or integer)

### Sample Valid CSV
```csv
question_number,answer
1,A
2,B
3,C
4,D
5,1
6,2
7,A
8,B
9,C
10,D
```

## File Requirements
- **Format:** CSV (`.csv` extension)
- **Encoding:** UTF-8
- **Max size:** 10 MB
- **Delimiter:** Comma (`,`)

## Validation Flow

1. **Upload file** → User selects answer key CSV
2. **Basic checks** → File type, size, encoding
3. **Parse CSV** → Read headers and rows
4. **Validate headers** → Check required columns exist
5. **Validate content** → Check each row for:
   - Valid question number (integer)
   - No duplicates
   - Valid answer format
   - No blank values
6. **Validate count** → Compare with metadata (if configured)
7. **Show result** → Display success or detailed errors

## Error Messages

### Grouped Error Display
Errors are grouped by type for easy fixing:

```
Validation failed:

📋 Header Issues:
  • Missing required columns: answer

🔄 Duplicate Question Numbers (2):
  • Row 5: Duplicate question number 3
  • Row 8: Duplicate question number 3

✍️ Answer Issues (3):
  • Row 12: Answer is blank
  • Row 15: Answer "AB" must be either a single letter (A-D) or a number
  • Row 20: Answer "E" must be either a single letter (A-D) or a number

📊 Count Issues:
  • Question count mismatch: Expected 180 questions, but found 175 in CSV
```

## Success Message

When validation passes, you'll see:
```
✅ Answer key validated successfully!
Total questions: 180
Unique questions: 180
```

## Best Practices

### ✅ DO
- Use the provided CSV template
- Double-check for duplicate question numbers
- Ensure all answers are filled
- Use consistent answer format (all A-D OR all numeric)
- Match the question count with your configuration

### ❌ DON'T
- Mix answer formats inconsistently
- Leave blank rows or answers
- Use invalid characters in answers
- Exceed the question count configured

## Download Template

A valid template CSV is available at:
`/templates/answer_key_template.csv`

## Technical Details

### Implementation
- **Location:** `frontend/src/utils/csvValidation.js`
- **Component:** `frontend/src/dashboards/educator/components/e_docsupload.jsx`
- **Validation runs:** Client-side, before backend upload
- **Parser:** Custom CSV parser (handles comma-delimited)

### Performance
- Validates up to 10,000 rows in < 1 second
- Streams large files without memory issues
- Shows first 5 errors per type (prevents UI overflow)

## Troubleshooting

### "Missing required columns"
→ Check header row has `question_number` and `answer`

### "Question number must be a valid integer"
→ Remove any text, decimals, or special characters

### "Duplicate question number"
→ Use Find & Replace in Excel to locate duplicates

### "Answer must be either a single letter (A-D) or a number"
→ Check for typos, extra spaces, or invalid letters

### "Question count mismatch"
→ Verify row count matches your test configuration

## Future Enhancements
- Auto-fix common issues
- Smart duplicate resolution
- Answer format auto-detection
- Bulk validation reports (downloadable)
