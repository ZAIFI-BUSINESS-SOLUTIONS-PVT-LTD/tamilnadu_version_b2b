from django.contrib import admin
from django.urls import path
from exam.views import auth_views, student_views, admin_views, upload_views, educator_views, institution_views, feedback_views, teacher_views
from exam.views import password_reset_views

urlpatterns = [
    path('admin/', admin.site.urls),

    # Auth Endpoints
    #path('api/login/', auth_views.login_user, name='login'),
    path('api/admin/login/', auth_views.admin_login, name='admin_login'),
    path('api/educator/login/', auth_views.educator_login, name='educator_login'),
    path('api/student/login/', auth_views.student_login, name='student_login'),
    path('api/institution/login/', auth_views.institution_login, name='institution_login'),
    # Password reset endpoints
    path('api/auth/forgot-password/', password_reset_views.forgot_password, name='forgot_password'),
    path('api/auth/reset-password/', password_reset_views.reset_password, name='reset_password'),
    

    path('api/student/details/', student_views.get_student_details, name='student_details'),
    path('api/educator/details/', educator_views.get_educator_details, name='educator_details'),

    # Dashboards
    path('api/admin_dashboard/', admin_views.admin_dashboard, name='admin_dashboard'),

    # Dashboard API (summary cards, insights, trends, etc.)
    path('api/student/dashboard/', student_views.get_student_dashboard, name='student_dashboard'),
    path('api/educator/dashboard/', educator_views.get_educator_dashboard, name='educator_dashboard'),

    # Performance API (PT + CI)
    path('api/student/performance/', student_views.get_student_performance, name='student_performance'),


    #SWOT API

    path('api/student/swot/', student_views.get_student_swot, name='student_dashboard'),
    path('api/student/swot/tests/', student_views.list_available_swot_tests, name='student_test'),

    path('api/educator/swot/', educator_views.get_educator_swot, name='educator_swot'),
    path('api/educator/swot/tests/', educator_views.list_available_swot_tests, name='educator_test'),



    #Educator register
    path("api/educator/register/", educator_views.educator_register, name="educator_register"),

    #educator tests
    path("api/educator/tests/", educator_views.get_educator_tests, name="get_educator_tests"),
    path("api/educator/tests/<int:test_num>/", educator_views.update_educator_test, name="update_educator_test"),

    # Educator student details
    path("api/educator/students/", educator_views.get_student_details, name="get_student_details"),
    path("api/educator/students/insights/", educator_views.get_educatorstudent_insights, name="get_educator_student_insights"),
    path("api/educator/students/tests/", educator_views.get_educator_student_tests, name="get_educator_student_tests"),  # Updated to use correct view function
    path("api/educator/students/results/", educator_views.get_educator_students_result, name="get_educator_student_results"),


    # Upload APIs
    
    path('api/upload_test/', upload_views.upload_test, name='upload_test'),
    path('api/test-metadata/', upload_views.save_test_metadata, name='save_test_metadata'),
    path('api/test-metadata/list/<str:class_id>/', upload_views.list_test_metadata_by_class, name='list_test_metadata_by_class'),
    path('api/test-metadata/<str:class_id>/<int:test_num>/', upload_views.get_test_metadata, name='get_test_metadata'),

    # Institution APIs (Manager viewing educators and their students)
    path('api/institution/educators/', institution_views.get_institution_educators, name='get_institution_educators'),
    path('api/institution/students/', institution_views.get_institution_students, name='get_institution_students'),
    path('api/institution/students/insights/', institution_views.get_institution_student_insights, name='get_institution_student_insights'),
    path('api/institution/students/results/', institution_views.get_institution_all_student_results, name='get_institution_all_student_results'),
    path('api/institution/teacher/dashboard/', institution_views.get_institution_teacher_dashboard, name='get_institution_teacher_dashboard'),
    path('api/institution/teacher/swot/', institution_views.get_institution_teacher_swot, name='get_institution_teacher_swot'),
    path('api/institution/educator/<int:educator_id>/dashboard/', institution_views.get_institution_educator_dashboard, name='get_institution_educator_dashboard'),
    path('api/institution/educator/<int:educator_id>/test/<int:test_num>/student-performance/', institution_views.get_institution_test_student_performance, name='get_institution_test_student_performance'),
    path('api/institution/educator/<int:educator_id>/students/results/', institution_views.get_institution_educator_students_result, name='get_institution_educator_students_result'),
    path('api/institution/educator/<int:educator_id>/swot/', institution_views.get_institution_educator_swot, name='get_institution_educator_swot'),
    path('api/institution/educator/<int:educator_id>/swot/tests/', institution_views.list_institution_educator_swot_tests, name='list_institution_educator_swot_tests'),
    path('api/institution/educator/<int:educator_id>/students/', institution_views.get_institution_educator_students, name='get_institution_educator_students'),
    path('api/institution/educator/<int:educator_id>/students/insights/', institution_views.get_institution_educator_student_insights, name='get_institution_educator_student_insights'),
    # IMPORTANT: More specific routes must come before generic ones
    path('api/institution/educator/<int:educator_id>/students/create/', institution_views.create_institution_student, name='create_institution_student'),
    path('api/institution/educator/<int:educator_id>/students/reupload-responses/', institution_views.reupload_institution_student_responses, name='reupload_institution_student_responses'),
    path('api/institution/educator/<int:educator_id>/students/<str:student_id>/tests/<int:test_num>/', institution_views.delete_institution_student_test, name='delete_institution_student_test'),
    path('api/institution/educator/<int:educator_id>/students/<str:student_id>/', institution_views.manage_institution_student, name='manage_institution_student'),

    # Feedback APIs
    path('api/student/feedback/', feedback_views.submit_student_feedback, name='submit_student_feedback'),
    path('api/educator/feedback/', feedback_views.submit_educator_feedback, name='submit_educator_feedback'),
    path('api/institution/feedback/', feedback_views.submit_institution_feedback, name='submit_institution_feedback'),
    path('api/feedback/history/', feedback_views.get_my_feedback_history, name='get_my_feedback_history'),

    # Teacher APIs
    path('api/teachers/', teacher_views.create_teacher, name='create_teacher'),
    path('api/classes/<str:class_id>/teachers/', teacher_views.list_teachers, name='list_teachers'),
    path('api/teachers/<int:teacher_id>/', teacher_views.update_teacher, name='update_teacher'),
    path('api/teachers/<int:teacher_id>/delete/', teacher_views.delete_teacher, name='delete_teacher'),

]
