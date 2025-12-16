# Delete Student Test API Documentation

## Overview
New API endpoint to delete a specific test for a student while preserving other test data. After deletion, the student's dashboard (Overview and Performance) is automatically regenerated based on remaining tests.

## Endpoint Details

### URL
```
DELETE /api/institution/educator/{educator_id}/students/{student_id}/tests/{test_num}/
```

### Authentication
- Requires: Bearer token (JWT)
- Permission: Authenticated Manager who owns the institution

### URL Parameters
- `educator_id` (int): ID of the educator managing the student
- `student_id` (string): Student's unique identifier
- `test_num` (int): Test number to delete

### Example Request
```bash
curl -X DELETE \
  'https://tamilnaduapi.inzighted.com/api/institution/educator/123/students/STU001/tests/5/' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN'
```

### Success Response (200 OK)
```json
{
  "message": "Test 5 deleted successfully for student STU001",
  "deleted_counts": {
    "results": 1,
    "student_results": 50,
    "responses": 50,
    "swot": 12
  },
  "neo4j": {
    "status": "ok",
    "message": null
  },
  "dashboard": {
    "status": "ok",
    "message": null
  }
}
```

### Response When No Tests Remain
```json
{
  "message": "Test 3 deleted successfully for student STU001",
  "deleted_counts": {
    "results": 1,
    "student_results": 50,
    "responses": 50,
    "swot": 12
  },
  "neo4j": {
    "status": "ok",
    "message": null
  },
  "dashboard": {
    "status": "ok",
    "message": "No tests remaining - cleared all dashboard data"
  }
}
```

### Error Responses

#### 404 - Manager Not Found
```json
{
  "error": "Manager not found"
}
```

#### 404 - Educator Not Found
```json
{
  "error": "Educator not found"
}
```

#### 403 - Unauthorized
```json
{
  "error": "Unauthorized: Educator does not belong to your institution"
}
```

#### 404 - Student Not Found
```json
{
  "error": "Student not found"
}
```

#### 500 - Server Error
```json
{
  "error": "Failed to delete Postgres records: <error details>"
}
```

## What Gets Deleted

### Neo4j (Knowledge Graph)
- Deletes `Test{n}` node and all connected nodes:
  - Subject nodes for that test
  - Chapter nodes
  - Topic nodes
  - Subtopic nodes
  - Question nodes
  - Misconception nodes
  - Feedback nodes
- Uses Cypher query:
  ```cypher
  MATCH (test:Test {name: 'Test{n}'})
  OPTIONAL MATCH (test)-[*]->(n)
  DETACH DELETE test, n
  ```

### PostgreSQL Tables
Within a single transaction, deletes records matching `student_id`, `class_id`, and `test_num`:
1. **Result** - Aggregate test scores
2. **StudentResult** - Per-question correctness
3. **StudentResponse** - Raw student answers
4. **SWOT** - Test-specific SWOT analysis

**Note:** Does NOT delete:
- `Test` table records (these are class-wide)
- `QuestionAnalysis` records (these are class-wide)
- `Student` record (only removes test data)

## Dashboard Regeneration

After successful deletion:

### If Tests Remain
1. Finds the latest remaining test number
2. Calls `update_single_student_dashboard()` with the latest test
3. Regenerates:
   - **Overview** metrics (OP, IR, TT, CS, KS, AI, QR, CV)
   - **Performance** graphs and insights per subject
   - **SWOT** cumulative analysis
   - **Action Plan**, **Checklist**, **Study Tips**

### If No Tests Remain
1. Deletes all `Overview` records for the student
2. Deletes all `Performance` records for the student
3. Returns message: "No tests remaining - cleared all dashboard data"

## Implementation Details

### Transaction Safety
- Postgres deletions wrapped in `transaction.atomic()`
- Rollback on any Postgres error
- Neo4j errors logged but don't block Postgres cleanup

### Error Handling
- Neo4j failures: logged, status returned as "failed"
- Dashboard regeneration failures: logged, status returned as "partial" or "failed"
- All operations logged with `[DELETE_TEST]` prefix for debugging

### Authorization Flow
1. Verify JWT token → get manager email
2. Fetch Manager record by email
3. Verify Educator exists
4. Verify `educator.institution == manager.institution`
5. Verify Student exists in educator's class
6. Proceed with deletion

## Frontend Integration Example

```javascript
// React/JavaScript example
async function deleteStudentTest(educatorId, studentId, testNum) {
  const response = await fetch(
    `https://tamilnaduapi.inzighted.com/api/institution/educator/${educatorId}/students/${studentId}/tests/${testNum}/`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete test');
  }
  
  const result = await response.json();
  
  // Check statuses
  if (result.neo4j.status === 'failed') {
    console.warn('Neo4j deletion failed:', result.neo4j.message);
  }
  
  if (result.dashboard.status === 'failed') {
    console.warn('Dashboard regeneration failed:', result.dashboard.message);
  }
  
  return result;
}
```

## Testing

### Manual Testing Steps
1. Create a student with multiple tests
2. Call DELETE endpoint for a middle test (e.g., Test 2 of 5)
3. Verify:
   - Neo4j: `MATCH (t:Test {name: 'Test2'}) RETURN t` returns empty
   - Postgres: Query `Result`, `StudentResponse`, etc. for that test_num - should be empty
   - Dashboard: Check `Overview` and `Performance` tables - should reflect remaining tests only
4. Delete all remaining tests one by one
5. Verify: Final deletion clears all Overview/Performance records

### Unit Test Template
```python
from django.test import TestCase
from django.contrib.auth import get_user_model
from exam.models import Manager, Educator, Student, Result
from rest_framework.test import APIClient

class DeleteStudentTestTestCase(TestCase):
    def setUp(self):
        # Create test user, manager, educator, student
        # Create multiple test records
        pass
    
    def test_delete_middle_test(self):
        # Delete Test 2 of 5
        # Verify Neo4j and Postgres
        # Verify dashboard regenerated
        pass
    
    def test_delete_last_test(self):
        # Delete only remaining test
        # Verify Overview/Performance cleared
        pass
```

## Differences from Existing Delete Student Endpoint

| Feature | Delete Student (Existing) | Delete Student Test (New) |
|---------|--------------------------|---------------------------|
| URL | `/students/{student_id}/` | `/students/{student_id}/tests/{test_num}/` |
| Neo4j | Drops entire student DB | Deletes specific Test node |
| Postgres | Deletes ALL student data | Deletes only per-test rows |
| Student Record | Deleted | Preserved |
| Dashboard | N/A (student deleted) | Regenerated |
| Use Case | Remove student entirely | Remove one bad/duplicate test |

## Non-Breaking Changes
- Existing endpoints unchanged
- No frontend changes required
- URL pattern is more specific (won't conflict with existing routes)
- Opt-in: frontend can use this endpoint when needed

## Logging
All operations logged with structured messages:
```
[DELETE_TEST] Request from email=manager@example.com for educator_id=123 student_id=STU001 test_num=5
[DELETE_TEST] Found records - Result: 1, StudentResult: 50, Response: 50, SWOT: 12
[DELETE_TEST] Attempting to delete Neo4j Test5 from database: dbstu001class1
[DELETE_TEST] Neo4j test nodes deleted successfully
[DELETE_TEST] Deleted Result records: 1
[DELETE_TEST] Regenerating dashboard for student STU001 using test_num=4
[DELETE_TEST] Dashboard regenerated successfully for STU001
[DELETE_TEST] Completed deletion for student STU001 test 5
```

## Production Checklist
- [ ] Deploy backend changes
- [ ] Verify Neo4j user has appropriate permissions
- [ ] Test with staging data
- [ ] Monitor logs for `[DELETE_TEST]` prefix
- [ ] Inform frontend team of new endpoint availability
- [ ] Update API documentation
- [ ] Add to institution dashboard UI (optional)
