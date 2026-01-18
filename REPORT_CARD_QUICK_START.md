# Student Report Card - Quick Start Guide

## What Was Built

A comprehensive **two-page student report card** has been added to the student dashboard. It displays:

### Page 1: Performance Report
- Student name as "Dr. {Name}"
- 3 summary cards (Total Marks, Improvement %, Average Marks)
- Subject-wise pie charts (correct/incorrect/skipped)
- Performance trend line graph across all tests
- Mistakes table with interactive checkboxes
- Improvement congratulations message

### Page 2: Study Planner & Insights
- 6-day study plan table (dynamic subjects)
- Frequent mistake cards (one per subject)
- Class vs You comparison
- Previous year question cloud visualization

## Quick Test Steps

### 1. Start the Services

If using Docker:
```bash
cd /home/ubuntu/Inzighted_V1
docker-compose up
```

Or start services individually:

**Backend:**
```bash
cd backend
source ../.venv/bin/activate  # or your venv path
python manage.py runserver
```

**Frontend:**
```bash
cd frontend
npm install  # first time only
npm run dev
```

### 2. Access the Report Card

1. Navigate to: `http://localhost:5173` (or your frontend URL)
2. Log in as a **student**
3. Click on **"Report Card"** tab in the sidebar (with graduation cap icon)
4. Or directly visit: `http://localhost:5173/student/report-card`

### 3. Test Features

**Test Selector:**
- Dropdown should show all available tests
- Default selection should be the last test taken
- Change test → data should update

**Page Navigation:**
- Click "Page 2" button → Navigate to study planner page
- Click "Page 1" button → Return to performance page
- Page indicator shows "Page X of 2"

**Page 1 Checks:**
- ✓ Student name appears in header
- ✓ 3 summary cards show correct values
- ✓ Pie charts render for each subject
- ✓ Line graph shows performance trend
- ✓ Mistakes table populated from checkpoints
- ✓ Checkboxes are clickable and toggle

**Page 2 Checks:**
- ✓ Study planner shows 6 days
- ✓ Each subject has subtopics per day
- ✓ 4 frequent mistake cards display
- ✓ Class vs You section shows questions (if data exists)

**Responsive Design:**
- Test on desktop (full width)
- Test on mobile (responsive layout)
- All charts should resize properly

### 4. Backend API Test

Test the endpoint directly:

```bash
# Get a student token first (from login)
TOKEN="your_student_jwt_token"

# Test default (last test)
curl -X POST http://localhost:8000/api/student/report-card/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'

# Test specific test
curl -X POST http://localhost:8000/api/student/report-card/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"test_num": 1}'
```

Expected response: JSON with `page1`, `page2`, `test_num`, and `available_tests` keys.

## Troubleshooting

### Issue: "No data available"

**Check:**
1. StudentReport records exist for the logged-in student
2. Run the data population script if needed:
   ```bash
   docker exec -i tamilnadu_backend_app bash -lc "python3 backend/manage.py shell"
   # Then run population logic
   ```

### Issue: Charts not rendering

**Check:**
1. `recharts` is installed: `cd frontend && npm list recharts`
2. If missing: `npm install recharts`
3. Restart dev server: `npm run dev`

### Issue: 404 on route

**Check:**
1. Route is added in `App.jsx`: `/student/report-card`
2. Component is exported in `index.jsx`
3. Frontend dev server is running

### Issue: Unauthorized error

**Check:**
1. Student is logged in
2. Token is valid in localStorage
3. Backend is running and accessible

## Data Requirements

For the report card to display properly, ensure:

**StudentReport table:**
- `mark`: Student's total marks
- `improvement_rate`: Percentage improvement
- `average`: Average marks
- `subject_wise`: JSON with correct/incorrect/skipped counts
- `subject_wise_avg`: JSON with subject averages
- `sub_wise_marks`: JSON with cumulative marks per subject
- `subtopic_list`: JSON with top 6 subtopics per subject
- `class_vs_student`: JSON with class comparison data

**Checkpoints table:**
- `insights`: JSON array with subject, subtopic, checklist fields

**Test table:**
- Multiple test records for the class

**Student table:**
- Student name for header display

## Color Scheme

The report card uses these colors for subjects:

- **Physics:** Blue (#3B82F6 series)
- **Chemistry:** Orange (#F97316 series)
- **Botany:** Green (#22C55E series)
- **Zoology:** Purple (#A855F7 series)

These match the template design and are consistent across charts and cards.

## Next Steps

Once tested successfully:

1. **Deploy to staging** for further testing
2. **Get user feedback** on UI/UX
3. **Consider enhancements:**
   - PDF export functionality
   - Print optimization
   - Multi-test comparison view
   - Student goal setting
   - Achievement badges

## Support

For issues or questions:
- Check implementation doc: `STUDENT_REPORT_CARD_IMPLEMENTATION.md`
- Review code comments in `s_reportcard.jsx`
- Check backend logs for API errors
- Verify database data structure

## Files to Review

**Backend:**
- `backend/exam/views/student_views.py` (line ~240 onwards)
- `backend/inzighted/urls.py` (report-card route)

**Frontend:**
- `frontend/src/dashboards/student/s_reportcard.jsx` (main component)
- `frontend/src/utils/api.js` (fetchStudentReportCard function)
- `frontend/src/dashboards/student/s_header.jsx` (navigation)
- `frontend/src/App.jsx` (route definition)

---

**Status:** ✅ Implementation Complete  
**Ready for:** Testing & Feedback  
**Next:** Deploy to staging environment
