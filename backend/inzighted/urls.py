from django.contrib import admin
from django.urls import path
from exam.views import auth_views, student_views, admin_views, upload_views, educator_views, institution_views

urlpatterns = [
    path('admin/', admin.site.urls),

    # Auth Endpoints
    #path('api/login/', auth_views.login_user, name='login'),
    path('api/admin/login/', auth_views.admin_login, name='admin_login'),
    path('api/educator/login/', auth_views.educator_login, name='educator_login'),
    path('api/student/login/', auth_views.student_login, name='student_login'),
    path('api/institution/login/', auth_views.institution_login, name='institution_login'),
    

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
    path('api/institution/educator/<int:educator_id>/dashboard/', institution_views.get_institution_educator_dashboard, name='get_institution_educator_dashboard'),
    path('api/institution/educator/<int:educator_id>/students/results/', institution_views.get_institution_educator_students_result, name='get_institution_educator_students_result'),
    path('api/institution/educator/<int:educator_id>/swot/', institution_views.get_institution_educator_swot, name='get_institution_educator_swot'),
    path('api/institution/educator/<int:educator_id>/swot/tests/', institution_views.list_institution_educator_swot_tests, name='list_institution_educator_swot_tests'),
    path('api/institution/educator/<int:educator_id>/students/', institution_views.get_institution_educator_students, name='get_institution_educator_students'),
    # IMPORTANT: More specific routes must come before generic ones
    path('api/institution/educator/<int:educator_id>/students/create/', institution_views.create_institution_student, name='create_institution_student'),
    path('api/institution/educator/<int:educator_id>/students/<str:student_id>/', institution_views.manage_institution_student, name='manage_institution_student'),

]
