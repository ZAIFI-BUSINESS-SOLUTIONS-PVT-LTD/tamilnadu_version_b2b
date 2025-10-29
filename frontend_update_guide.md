# Gemini CLI Guide: Frontend Updates for Biology Subject Split

This guide details the step-by-step implementation of the frontend changes for the "Biology Subject Split" feature.

## Phase 1: Educator Registration Form

### 1.1. Add State for Biology Preference

*   **File:** `frontend/src/auth/educator/educatorregister.jsx`
*   **Action:** Add a new state variable to manage the educator's preference for splitting Biology.

    ```javascript
    // ... inside the EducatorSignup component
    const [separateBiology, setSeparateBiology] = useState(false);
    ```

### 1.2. Add Checkbox to the Form

*   **File:** `frontend/src/auth/educator/educatorregister.jsx`
*   **Action:** Add a checkbox to the registration form to allow educators to set their preference.

    ```jsx
    // ... inside the form, after the student CSV upload
    <div className="form-control">
      <label className="label cursor-pointer">
        <span className="label-text">Split Biology into Botany and Zoology?</span> 
        <input type="checkbox" checked={separateBiology} onChange={(e) => setSeparateBiology(e.target.checked)} className="checkbox checkbox-primary" />
      </label>
    </div>
    ```

### 1.3. Update Form Submission

*   **File:** `frontend/src/auth/educator/educatorregister.jsx`
*   **Action:** Update the `handleSubmit` function to include the `separate_biology_subjects` field in the form data sent to the backend.

    ```javascript
    // ... inside the handleSubmit function
    formData.append('separate_biology_subjects', separateBiology);
    ```

## Phase 2: Student Dashboard Data Processing

### 2.1. Handle "Biology" in `useStudentDashboardData`

*   **File:** `frontend/src/dashboards/components/hooks/z_dashboard/z_useDashboardData.js`
*   **Action:** Modify the `useStudentDashboardData` hook to correctly process "Biology" as a subject.

    ```javascript
    // ... inside the useStudentDashboardData hook
    let subjectWiseData = {};
    if (Array.isArray(data.subjectWiseDataMapping)) {
      data.subjectWiseDataMapping.forEach((row) => {
        const testName = row.Test || 'Unknown Test';
        subjectWiseData[testName] = [
          row.Botany || 0,
          row.Chemistry || 0,
          row.Physics || 0,
          row.Zoology || 0,
          row.Biology || 0, // <-- ADD THIS LINE
        ];
      });
    }
    ```

### 2.2. Update `s_dashboard.jsx` to pass dynamic `subjectLabels`

*   **File:** `frontend/src/dashboards/student/s_dashboard.jsx`
*   **Action:** Extract the subject labels from `subjectWiseDataMapping` and pass them as a prop to `SubjectWiseAnalysisChart`.

    ```javascript
    // ... inside the SDashboard component
    const { /* ... */ subjectWiseDataMapping, /* ... */ } = useStudentDashboardData();
    // ...
    const subjectLabels = subjectWiseDataMapping.length > 0 ? Object.keys(subjectWiseDataMapping[0]).filter(key => key !== 'Test') : [];
    // ...
    <SubjectWiseAnalysisChart
      // ...
      subjectLabels={subjectLabels}
    />
    ```

### 2.3. Modify `SubjectWiseAnalysisChart.jsx` to use dynamic `subjectLabels`

*   **File:** `frontend/src/dashboards/components/charts/s_subjectwiseanalysis.jsx`
*   **Action:** Remove the hardcoded default value for the `subjectLabels` prop.

    ```javascript
    // ... inside the SubjectWiseAnalysisChart component
    const SubjectWiseAnalysisChart = ({
      // ...
      subjectLabels = [], // Removed hardcoded default
      // ...
    }) => {
    ```

This concludes the necessary frontend modifications. The educator dashboard is already generic enough to handle the data without changes, and the student dashboard will now correctly process and display "Biology" scores when they are not split.

---

## Implementation Log

This log details the steps taken by the Gemini CLI to implement the frontend changes for the "Biology Subject Split" feature, following the guide above.

### Phase 1: Educator Registration Form - ✅ Completed

*   **Step 1.1: Add State for Biology Preference** - ✅ Completed
    *   **File:** `frontend/src/auth/educator/educatorregister.jsx`
    *   **Action:** Added the `separateBiology` state variable to the `EducatorSignup` component.

*   **Step 1.2: Add Checkbox to the Form** - ✅ Completed
    *   **File:** `frontend/src/auth/educator/educatorregister.jsx`
    *   **Action:** Added a checkbox to the registration form to control the `separateBiology` state.

*   **Step 1.3: Update Form Submission** - ✅ Completed
    *   **File:** `frontend/src/auth/educator/educatorregister.jsx`
    *   **Action:** Updated the `handleSubmit` function to append the `separate_biology_subjects` field to the form data.

### Phase 2: Student Dashboard Data Processing - ✅ Completed

*   **Step 2.1: Handle "Biology" in `useStudentDashboardData`** - ✅ Completed
    *   **File:** `frontend/src/dashboards/components/hooks/z_dashboard/z_useDashboardData.js`
    *   **Action:** Modified the `useStudentDashboardData` hook to include `row.Biology || 0` in the `subjectWiseData` object, ensuring that "Biology" scores are processed correctly.

*   **Step 2.2: Update `s_dashboard.jsx` to pass dynamic `subjectLabels`** - ✅ Completed
    *   **File:** `frontend/src/dashboards/student/s_dashboard.jsx`
    *   **Action:** Modified `s_dashboard.jsx` to extract `subjectLabels` from `subjectWiseDataMapping` and pass them to `SubjectWiseAnalysisChart`.

*   **Step 2.3: Modify `SubjectWiseAnalysisChart.jsx` to use dynamic `subjectLabels`** - ✅ Completed
    *   **File:** `frontend/src/dashboards/components/charts/s_subjectwiseanalysis.jsx`
    *   **Action:** Removed the hardcoded default value for the `subjectLabels` prop in `SubjectWiseAnalysisChart.jsx`.