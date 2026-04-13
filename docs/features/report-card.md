# Student Report Card Feature

## Overview

A two-page interactive report card in the student dashboard showing detailed performance metrics, study plans, and insights. Accessible at `/student/report-card`.

---

## API Endpoint

**File:** `backend/exam/views/student_views.py`

```
POST /api/student/report-card/
Authorization: Bearer <student_token>
Content-Type: application/json

Body: { "test_num": <optional_int> }   # omit or null → defaults to last test taken
```

### Response Structure

```json
{
  "test_num": 1,
  "available_tests": [1, 2, 3],
  "page1": {
    "student_name": "Student Name",
    "total_marks": 340,
    "improvement_percentage": 12.0,
    "average_marks": 295.0,
    "subject_wise_data": [
      {
        "subject": "Physics",
        "correct_count": 15,
        "incorrect_count": 3,
        "skipped_count": 2,
        "subject_average_marks": 72.0
      }
    ],
    "performance_trend": [
      { "subject": "Physics", "data": [{ "test_num": 1, "marks": 70 }] }
    ],
    "mistakes_table": [
      { "subject": "Physics", "subtopic": "Acceleration", "mistake_detail": "F = m × a, not F = m / a", "checked": false }
    ]
  },
  "page2": {
    "study_planner": [
      { "day": 1, "Physics": "Optics", "Chemistry": "Organic Reactions" }
    ],
    "subjects": ["Physics", "Chemistry", "Botany", "Zoology"],
    "frequent_mistakes": [
      { "subject": "Physics", "subtopic": "Acceleration", "frequency": 5 }
    ],
    "class_vs_you": [
      { "question_num": 12, "correct_count": 25, "correct_option": "A", "student_option": "B" }
    ]
  }
}
```

---

## Data Sources

| Data | Source Model | Field |
|------|-------------|-------|
| Total marks, improvement, average | `StudentReport` | `mark`, `improvement_rate`, `average` |
| Subject-wise pie chart data | `StudentReport` | `subject_wise` (JSON) |
| Subject averages | `StudentReport` | `subject_wise_avg` (JSON) |
| Performance trend | `StudentReport` | `sub_wise_marks` (JSON, cumulative per test) |
| Study planner subtopics | `StudentReport` | `subtopic_list` (JSON, top 6 per subject) |
| Class vs You comparison | `StudentReport` | `class_vs_student` (JSON) |
| Mistakes table | `Checkpoints` | `insights` (JSON array) |
| Available tests | `Test` | distinct `test_num` values |
| Student name | `Student` | name field |

---

## Frontend Component

**File:** `frontend/src/dashboards/student/s_reportcard.jsx`

### Page 1 — Performance Report
- Header: student name formatted as "Dr. {name}"
- 3 summary cards: Total Marks, Improvement %, Average Marks
- Subject-wise pie charts (correct / incorrect / skipped) using Recharts
- Performance trend line graph (marks across tests) using Recharts
- Mistakes table with interactive checkboxes (from Checkpoints)

### Page 2 — Study Planner & Insights
- 6-day study plan table (dynamic subjects from `subtopic_list`)
- Frequent mistake cards (top subtopic per subject)
- Class vs You comparison (question-level)
- Motivational footer

### Color Scheme (consistent across charts and cards)
| Subject | Color |
|---------|-------|
| Physics | Blue `#3B82F6` |
| Chemistry | Orange `#F97316` |
| Botany | Green `#22C55E` |
| Zoology | Purple `#A855F7` |

---

## Navigation

| Location | Change |
|----------|--------|
| `frontend/src/dashboards/student/s_header.jsx` | "Report Card" tab with GraduationCap icon, route `/student/report-card` |
| `frontend/src/dashboards/student/index-mobile.jsx` | Mobile dock item with GraduationCap icon |
| `frontend/src/App.jsx` | Route: `<Route path="report-card" element={<SReportCard />} />` |

---

## URL Configuration

**File:** `backend/inzighted/urls.py`
```python
path('api/student/report-card/', student_views.get_student_report_card, name='student_report_card')
```

---

## Dependencies

- `recharts` — charts (install: `cd frontend && npm install recharts`)
- `@phosphor-icons/react` — mobile icons (already installed)
- `lucide-react` — desktop icons (already installed)
- Django REST Framework, existing models (no new migrations required)

---

## Testing

### Backend
```bash
TOKEN="your_student_jwt_token"

# Default (last test)
curl -X POST http://localhost:8000/api/student/report-card/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'

# Specific test
curl -X POST http://localhost:8000/api/student/report-card/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"test_num": 1}'
```

### Frontend Checklist
- [ ] Student name appears in header
- [ ] 3 summary cards show correct values
- [ ] Pie charts render for each subject
- [ ] Line graph shows performance trend across tests
- [ ] Mistakes table populated from Checkpoints
- [ ] Checkboxes toggle correctly
- [ ] Page 2: Study planner shows 6 days with subtopics
- [ ] Page 2: Frequent mistake cards per subject
- [ ] Page 2: Class vs You section renders
- [ ] Test dropdown changes data correctly
- [ ] Responsive on mobile

---

## Troubleshooting

| Issue | Solution |
|-------|---------|
| "No data available" | Ensure `StudentReport` records exist for student and test |
| Charts not rendering | Run `npm install recharts` and restart dev server |
| 404 on route | Verify `App.jsx` has the route and component is exported |
| Unauthorized error | Check Bearer token is valid; student is logged in |
| Empty study planner | `subtopic_list` must have ≥ 6 items per subject |
| Empty mistakes table | Verify `Checkpoints.insights` exists for the test |
