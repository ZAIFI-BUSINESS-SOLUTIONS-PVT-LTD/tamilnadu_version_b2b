# Answer Key CSV Validation

## Overview

Frontend validation runs on the answer key CSV **before** it reaches the backend, providing immediate error feedback.

**Location:** `frontend/src/utils/csvValidation.js`  
**Component:** `frontend/src/dashboards/educator/components/e_docsupload.jsx`

---

## Required CSV Format

```csv
question_number,answer
1,A
2,B
3,C
180,D
```

- Columns: `question_number` (integer), `answer` (A–D or integer)
- Encoding: UTF-8 | Delimiter: comma | Max size: 10 MB

---

## Validation Rules

| Rule | Valid | Invalid |
|------|-------|---------|
| No duplicate question numbers | `1,A` then `2,B` | `1,A` then `1,C` |
| No blank answers | `2,B` | `2,` |
| Question numbers are integers | `1`, `42` | `1.5`, `Q1`, `one` |
| Answers are A–D or integer | `A`, `B`, `1`, `42` | `AB`, `E`, `1.5` |
| Question count matches metadata config | 180 rows for 180-question test | 175 rows for 180-question test |

---

## Error Display

Errors are grouped by category:
```
Validation failed:

📋 Header Issues:
  • Missing required columns: answer

🔄 Duplicate Question Numbers (2):
  • Row 5: Duplicate question number 3

✍️ Answer Issues (3):
  • Row 12: Answer is blank
  • Row 15: Answer "AB" must be either a single letter (A-D) or a number

📊 Count Issues:
  • Question count mismatch: Expected 180 questions, but found 175 in CSV
```

---

## Common Fixes

| Error | Fix |
|-------|-----|
| "Missing required columns" | Check header row has `question_number` and `answer` |
| "Duplicate question number" | Use Find & Replace in Excel to locate and remove duplicates |
| "Answer must be A-D or a number" | Check for typos, extra spaces, or invalid letters like `E` |
| "Question count mismatch" | Verify row count matches test configuration |
