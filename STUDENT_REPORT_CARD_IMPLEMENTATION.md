# Student Report Card Implementation

## Overview
Added a comprehensive student report card feature to the student dashboard with two pages showing detailed performance metrics, study plans, and insights.

## Implementation Details

### Backend Changes

#### 1. New API Endpoint
**File:** `backend/exam/views/student_views.py`
- Added `get_student_report_card()` endpoint
- **Route:** `/api/student/report-card/` (POST)
- **Authentication:** Required (Bearer token)
- **Request Body:** `{"test_num": <optional_test_number>}` (defaults to last test if not provided)

**Response Structure:**
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
      {
        "subject": "Physics",
        "data": [{"test_num": 1, "marks": 70}, {"test_num": 2, "marks": 75}]
      }
    ],
    "mistakes_table": [
      {
        "subject": "Physics",
        "subtopic": "Acceleration",
        "mistake_detail": "F = m × a, not F = m / a",
        "checked": false
      }
    ]
  },
  "page2": {
    "study_planner": [
      {"day": 1, "Physics": "Optics", "Chemistry": "Organic Reactions", ...},
      {"day": 2, "Physics": "Physics", "Chemistry": "Liquefaction", ...}
    ],
    "subjects": ["Physics", "Chemistry", "Botany", "Zoology"],
    "frequent_mistakes": [
      {
        "subject": "Physics",
        "subtopic": "Acceleration",
        "frequency": 5
      }
    ],
    "class_vs_you": [
      {
        "question_num": 12,
        "correct_count": 25,
        "correct_option": "A",
        "student_option": "B"
      }
    ]
  }
}
```

#### 2. URL Configuration
**File:** `backend/inzighted/urls.py`
- Added route: `path('api/student/report-card/', student_views.get_student_report_card, name='student_report_card')`

#### 3. Data Sources
The endpoint aggregates data from:
- `StudentReport` model: Core metrics, subject-wise data, subtopics, trends
- `Checkpoints` model: Mistake details and insights
- `Test` model: Available tests list
- `Student` model: Student name and details

### Frontend Changes

#### 1. New Component
**File:** `frontend/src/dashboards/student/s_reportcard.jsx`

**Features:**
- Two-page report card layout
- Test dropdown selector (defaults to last test)
- Page navigation buttons
- Interactive checkboxes for mistakes table
- Responsive design (mobile & desktop)
- Color-coded subjects matching template theme

**Page 1 - Performance Report:**
- Header with student name (formatted as "Dr. {name}")
- 3 summary cards: Total Marks, Improvement %, Average Marks
- Subject-wise pie charts (correct/incorrect/skipped)
- Subject average marks display
- Improvement congratulations message
- Performance trend line graph (marks across tests)
- Mistakes table with checkboxes (from checkpoints)
- Motivational footer

**Page 2 - Study Planner & Insights:**
- 6-day study planner table (dynamic subjects)
- Frequent mistake cards (4 subjects with frequency counts)
- Class vs You comparison section
- Previous year question cloud visualization
- Motivational footer

#### 2. API Integration
**File:** `frontend/src/utils/api.js`
- Added `fetchStudentReportCard(testNum)` function
- Handles authentication and error handling

#### 3. Navigation Updates

**Desktop Header** (`frontend/src/dashboards/student/s_header.jsx`):
- Added "Report Card" tab with GraduationCap icon
- Route: `/student/report-card`
- Active pattern: `/^\/student\/report-card/`

**Mobile Navigation** (`frontend/src/dashboards/student/index-mobile.jsx`):
- Added "Report Card" item to mobile dock
- Icon: GraduationCap (Phosphor Icons)

#### 4. Routing
**File:** `frontend/src/App.jsx`
- Added route: `<Route path="report-card" element={<SReportCard />} />`
- Exported `SReportCard` component

#### 5. Index Exports
Updated both:
- `frontend/src/dashboards/student/index.jsx`
- `frontend/src/dashboards/student/index-mobile.jsx`

Added export: `export { default as SReportCard } from './s_reportcard.jsx';`

### Design & Styling

**Color Scheme:**
- Physics: Blue gradient (#3B82F6 series)
- Chemistry: Orange gradient (#F97316 series)
- Botany: Green gradient (#22C55E series)
- Zoology: Purple gradient (#A855F7 series)

**Charts Used:**
- Pie charts (Recharts) for subject-wise breakdown
- Line chart (Recharts) for performance trends
- Responsive containers for all charts

**Fonts:**
- Primary: Tenorite (custom font, already configured)
- Bold weights for headers and important metrics

**Layout:**
- Max width: 1500px (centered)
- Rounded corners: xl (1rem)
- Shadow: xl for main cards
- Gradient backgrounds for visual appeal
- Responsive grid: 1-4 columns based on screen size

### Data Flow

1. **User Action:** Student selects a test from dropdown or views default (last test)
2. **Frontend:** Calls `fetchStudentReportCard(testNum)`
3. **Backend:** 
   - Validates authentication
   - Fetches student details
   - Queries StudentReport for metrics
   - Queries Checkpoints for mistakes
   - Aggregates performance trends across all tests
   - Formats data for frontend consumption
4. **Frontend:** 
   - Displays data in two-page layout
   - Handles page navigation
   - Interactive checkboxes for completed tasks
   - Renders charts and visualizations

### Key Features Implemented

✅ Test dropdown with default to last test  
✅ Two-page layout with navigation  
✅ Dynamic student name in header  
✅ Top 3 summary cards (marks, improvement, average)  
✅ Subject-wise pie charts with color coding  
✅ Performance trend line graph across tests  
✅ Mistakes table from checkpoints (first per subject)  
✅ 6-day study planner (dynamic subjects)  
✅ Frequent mistake cards (top subtopic per subject)  
✅ Class vs You comparison section  
✅ Responsive design for mobile & desktop  
✅ Loading states and error handling  
✅ Interactive checkboxes for task tracking  
✅ Motivational messages matching template  

## Testing Instructions

### Backend Testing

1. **Test the endpoint directly:**
```bash
# From container or with correct Python environment
curl -X POST http://localhost:8000/api/student/report-card/ \
  -H "Authorization: Bearer <student_token>" \
  -H "Content-Type: application/json" \
  -d '{"test_num": 1}'
```

2. **Test with Django shell:**
```bash
docker exec -i tamilnadu_backend_app bash -lc "python3 backend/manage.py shell <<'PY'
from exam.views.student_views import get_student_report_card
from exam.models.student import Student
from rest_framework.test import APIRequestFactory
from rest_framework.request import Request

factory = APIRequestFactory()
request = factory.post('/api/student/report-card/', {'test_num': 1})
student = Student.objects.first()
request.user = student

response = get_student_report_card(request)
print(response.data)
PY"
```

### Frontend Testing

1. **Start the development server:**
```bash
cd frontend
npm run dev
```

2. **Access the report card:**
   - Log in as a student
   - Click on "Report Card" tab in sidebar
   - Or navigate to: `http://localhost:5173/student/report-card`

3. **Test scenarios:**
   - Default test selection (should show last test)
   - Change test using dropdown
   - Navigate between Page 1 and Page 2
   - Check/uncheck items in mistakes table
   - Verify responsive design on mobile
   - Test loading states and error handling

### Data Validation Checklist

- [ ] Student name displays correctly in header
- [ ] Total marks, improvement %, and average are accurate
- [ ] Subject-wise pie charts show correct counts
- [ ] Performance trend graph plots all tests correctly
- [ ] Mistakes table shows first checkpoint per subject
- [ ] Study planner has 6 days with correct subtopics
- [ ] Frequent mistakes show highest citation counts
- [ ] Class vs You section displays correctly
- [ ] Test dropdown shows all available tests
- [ ] Page navigation works smoothly

## Database Dependencies

**Required Models:**
- `StudentReport`: Main data source for all metrics
- `Checkpoints`: Mistake insights and action plans
- `Student`: Student name and class information
- `Test`: Available tests list

**Required Fields:**
- `StudentReport.mark`: Total marks
- `StudentReport.improvement_rate`: Improvement percentage
- `StudentReport.average`: Average marks
- `StudentReport.subject_wise`: Correct/incorrect/skipped counts (JSON)
- `StudentReport.subject_wise_avg`: Subject averages (JSON)
- `StudentReport.sub_wise_marks`: Cumulative marks per subject (JSON)
- `StudentReport.subtopic_list`: Top 6 subtopics per subject (JSON)
- `StudentReport.class_vs_student`: Class comparison data (JSON)
- `Checkpoints.insights`: Array of mistake objects (JSON)

## Future Enhancements

1. **PDF Export:** Add "Download PDF" button for report card
2. **Print Styling:** Optimize CSS for printing
3. **Comparison Mode:** Compare multiple tests side-by-side
4. **Sharing:** Share report card via link or email
5. **Annotations:** Allow students to add notes to mistakes
6. **Goals:** Set improvement goals and track progress
7. **Badges:** Award achievements for improvements
8. **Analytics:** Add more detailed performance analytics

## Troubleshooting

### Common Issues

**Issue:** Report card shows "No data available"
- **Solution:** Ensure StudentReport records exist for the student and test
- **Check:** Run data population script if needed

**Issue:** Pie charts not rendering
- **Solution:** Verify subject_wise data is properly formatted as JSON
- **Check:** All counts (correct, incorrect, skipped) should be integers

**Issue:** Performance trend graph is empty
- **Solution:** Check sub_wise_marks field has data for multiple tests
- **Format:** `{"Physics": 70, "Chemistry": 65, ...}`

**Issue:** Study planner shows empty cells
- **Solution:** Ensure subtopic_list has at least 6 items per subject
- **Check:** Field format: `{"Physics": [{"subtopic": "...", "rank": 1, ...}]}`

**Issue:** Mistakes table is empty
- **Solution:** Verify Checkpoints record exists for the test
- **Check:** insights field should have subject, subtopic, and checklist

## Files Modified

**Backend:**
- `backend/exam/views/student_views.py` - New endpoint
- `backend/inzighted/urls.py` - New route

**Frontend:**
- `frontend/src/dashboards/student/s_reportcard.jsx` - New component (main)
- `frontend/src/utils/api.js` - New API function
- `frontend/src/dashboards/student/s_header.jsx` - Added tab
- `frontend/src/dashboards/student/s_header-mobile.jsx` - Mobile header (imports only)
- `frontend/src/dashboards/student/index-mobile.jsx` - Added mobile navigation
- `frontend/src/dashboards/student/index.jsx` - Export component
- `frontend/src/App.jsx` - Added route

## Deployment Checklist

- [ ] Backend migrations (if any) applied
- [ ] Frontend build tested (`npm run build`)
- [ ] Docker compose updated (if needed)
- [ ] Environment variables configured
- [ ] API endpoint accessible from frontend
- [ ] CORS configured correctly
- [ ] Authentication working properly
- [ ] Charts library (recharts) installed
- [ ] Icons library available
- [ ] Mobile responsive design verified
- [ ] Error handling tested
- [ ] Loading states working
- [ ] Data populates correctly from database

## Dependencies

**Backend:**
- Django Rest Framework (already installed)
- Existing models (StudentReport, Checkpoints, Student, Test)

**Frontend:**
- recharts: `^2.x` (for charts)
- lucide-react: (for icons - already installed)
- @phosphor-icons/react: (for mobile icons - already installed)
- React Router (already installed)
- Axios (already installed)

**Install if missing:**
```bash
cd frontend
npm install recharts
```
