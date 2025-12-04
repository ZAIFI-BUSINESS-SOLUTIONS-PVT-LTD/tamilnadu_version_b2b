# Institution Dashboard Feature Implementation

## Overview
This document describes the implementation of the Institution Dashboard feature, which allows institution managers to view and manage educators and their students' performance data.

## Changes Made

### 1. Model Updates

#### Manager Model (`backend/exam/models/manager.py`)
- **Added field**: `institution` (CharField, max_length=255, blank=True, null=True)
- **Purpose**: Links managers to their respective institutions
- **Migration required**: Yes - run `python manage.py makemigrations` and `python manage.py migrate`

### 2. New Files Created

#### Institution Views (`backend/exam/views/institution_views.py`)
Complete views file with the following endpoints:

1. **`get_institution_educators()`**
   - Endpoint: `GET /api/institution/educators/`
   - Returns list of all educators in the manager's institution

2. **`get_institution_educator_dashboard(educator_id)`**
   - Endpoint: `GET /api/institution/educator/<educator_id>/dashboard/`
   - Returns dashboard data (summary cards & key insights) for a specific educator

3. **`get_institution_educator_students_result(educator_id)`**
   - Endpoint: `GET /api/institution/educator/<educator_id>/students/results/`
   - Returns all student results for a specific educator's class

4. **`get_institution_educator_swot(educator_id)`**
   - Endpoint: `POST /api/institution/educator/<educator_id>/swot/`
   - Returns SWOT analysis for a specific educator
   - Requires: `test_num` in request body

5. **`list_institution_educator_swot_tests(educator_id)`**
   - Endpoint: `GET /api/institution/educator/<educator_id>/swot/tests/`
   - Returns list of available test numbers for SWOT analysis

6. **`get_institution_educator_students(educator_id)`**
   - Endpoint: `GET /api/institution/educator/<educator_id>/students/`
   - Returns list of students in a specific educator's class

### 3. Authentication Updates

#### Auth Views (`backend/exam/views/auth_views.py`)
- **Added**: `institution_login()` function
- **Endpoint**: `POST /api/institution/login/`
- **Purpose**: Handles institution (manager) login using Manager model
- **Returns**: JWT token with role='manager' and institution name

### 4. URL Configuration

#### URLs (`backend/inzighted/urls.py`)
Added the following URL patterns:

```python
# Institution Login
path('api/institution/login/', auth_views.institution_login, name='institution_login'),

# Institution Data Endpoints
path('api/institution/educators/', institution_views.get_institution_educators, name='get_institution_educators'),
path('api/institution/educator/<int:educator_id>/dashboard/', institution_views.get_institution_educator_dashboard, name='get_institution_educator_dashboard'),
path('api/institution/educator/<int:educator_id>/students/results/', institution_views.get_institution_educator_students_result, name='get_institution_educator_students_result'),
path('api/institution/educator/<int:educator_id>/swot/', institution_views.get_institution_educator_swot, name='get_institution_educator_swot'),
path('api/institution/educator/<int:educator_id>/swot/tests/', institution_views.list_institution_educator_swot_tests, name='list_institution_educator_swot_tests'),
path('api/institution/educator/<int:educator_id>/students/', institution_views.get_institution_educator_students, name='get_institution_educator_students'),
```

## Security Features

All institution endpoints include:
- **Authentication**: Requires valid JWT token (UniversalJWTAuthentication)
- **Authorization**: Verifies that the educator belongs to the manager's institution
- **Error handling**: Comprehensive error logging and user-friendly error messages

## Frontend Integration

The frontend API calls in `frontend/src/utils/api.js` are already implemented and ready to use:

1. `fetchInstitutionEducators()`
2. `getInstitutionEducatorDashboardData(educatorId)`
3. `fetchInstitutionEducatorAllStudentResults(educatorId)`
4. `fetchInstitutionEducatorSWOT(educatorId, testNum)`
5. `fetchAvailableSwotTests_InstitutionEducator(educatorId)`
6. `fetchInstitutionEducatorStudents(educatorId)`
7. `institutionLogin(email, password)`

## Database Migration Steps

After implementing these changes, run:

```bash
cd backend
python manage.py makemigrations
python manage.py migrate
```

This will add the `institution` field to the `Manager` table.

## Testing Checklist

- [ ] Run migrations successfully
- [ ] Test institution login endpoint
- [ ] Test fetching educators list
- [ ] Test educator dashboard data retrieval
- [ ] Test student results retrieval
- [ ] Test SWOT analysis retrieval
- [ ] Test available SWOT tests list
- [ ] Test students list retrieval
- [ ] Verify authorization (manager can only access their institution's data)
- [ ] Verify existing educator/student/admin functionality still works

## Data Flow

1. **Manager logs in** → Receives JWT token with role='manager'
2. **Frontend requests educators** → Backend filters by manager's institution
3. **Frontend selects educator** → Backend verifies institution match
4. **Frontend fetches data** → Backend returns educator's class data
5. **Authorization check** → All requests verify institution ownership

## Notes

- **Manager = Institution Representative**: The Manager model represents institution administrators
- **No breaking changes**: All existing functionality remains intact
- **Reuses existing models**: Leverages Educator, Student, Overview, Result, and SWOT models
- **Follows existing patterns**: Uses same authentication and response formats as educator/student endpoints

## Future Enhancements

Consider adding:
- Institution-level analytics (aggregated across all educators)
- Bulk operations for institution managers
- Institution settings/configuration
- Multi-institution support for super-admins
- Institution-specific branding/customization
