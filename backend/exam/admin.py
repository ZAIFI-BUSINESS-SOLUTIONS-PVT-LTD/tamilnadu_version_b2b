from django.contrib import admin
from exam.models import Educator, Manager, TestProcessingStatus, Test, Student, Result, StudentResponse,Gemini_ApiCallLog, Gemini_ApiKeyModelMinuteStats, Gemini_ApiKeyModelDayStats, SWOT
from django.contrib import admin



admin.site.register(TestProcessingStatus)
admin.site.register(Test)
admin.site.register(StudentResponse)


@admin.register(Educator)
class EducatorAdmin(admin.ModelAdmin):
    list_display = ('id','name', 'email', 'class_id', 'institution', 'csv_status', 'separate_biology_subjects')
    search_fields = ('email', 'name', 'class_id')
    list_filter = ('institution', 'csv_status', 'separate_biology_subjects')

    def save_model(self, request, obj, form, change):
        if 'password' in form.changed_data:  # ✅ If password is changed, hash it
            obj.set_password(obj.password)
        super().save_model(request, obj, form, change)
    def save(self, *args, **kwargs):
        if not self.id:  # Ensure object is created, not updated
            super().save(*args, **kwargs)

@admin.register(Manager)
class ManagerAdmin(admin.ModelAdmin):
    list_display = ('id','name', 'email')
    search_fields = ('email', 'name')

    def save_model(self, request, obj, form, change):
        if 'password' in form.changed_data:  # ✅ If password is changed, hash it
            obj.set_password(obj.password)
        super().save_model(request, obj, form, change)
    def save(self, *args, **kwargs):
        if not self.id:  # Ensure object is created, not updated
            super().save(*args, **kwargs)

@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ('student_id', 'name', 'class_id', 'dob')
    search_fields = ('student_id', 'name', 'class_id', 'dob')
    ordering = ('student_id','class_id')
    list_filter = ('class_id','independant')   # ✅ Add this line to filter students by class_id

    def save_model(self, request, obj, form, change):
        if 'password' in form.changed_data:  # ✅ Hash password if changed
            obj.set_password(obj.password)
        super().save_model(request, obj, form, change)
    def save(self, *args, **kwargs):
        if not self.id:  # Ensure object is created, not updated
            super().save(*args, **kwargs)

@admin.register(Result)
class ResultAdmin(admin.ModelAdmin):
    list_display = ('student_id', 'class_id', 'test_num', 'phy_total', 'phy_attended', 
                    'phy_correct', 'phy_score', 'chem_total', 'chem_attended', 
                    'chem_correct', 'chem_score', 'bot_total', 'bot_attended', 
                    'bot_correct', 'bot_score', 'zoo_total', 'zoo_attended', 
                    'zoo_correct', 'zoo_score', 'total_attended', 'total_correct', 
                    'total_score')
    search_fields = ('student_id', 'class_id', 'test_num')
    ordering = ('student_id','class_id','test_num','total_score')
    list_filter = ('class_id', 'test_num')

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)

@admin.register(Gemini_ApiCallLog)
class ApiCallLogAdmin(admin.ModelAdmin):
    list_display = (
        "timestamp", "model_name", "function_name", "status", "user_type", "user_id", "api_key", "prompt_token_count", "output_token_count", "total_token_count", "request_price"
    )
    search_fields = ("model_name", "function_name", "user_type", "user_id", "status", "api_key")
    list_filter = ("model_name", "status", "user_type", "user_id", "api_key")
    date_hierarchy = "timestamp"
    readonly_fields = ("timestamp",)
    ordering = ("-timestamp",)
    list_per_page = 25
    list_max_show_all = 200
    actions_on_top = True
    actions_on_bottom = True
    show_full_result_count = True
    fieldsets = (
        (None, {
            'fields': (
                ('timestamp', 'status', 'duration_s'),
                ('model_name', 'function_name', 'api_key'),
                ('user_type', 'user_id'),
                'prompt_excerpt',
                'input_content',
                'output_content',
                'error_message',
                ('prompt_token_count', 'output_token_count', 'total_token_count', 'request_price'),
            ),
        }),
    )
    def has_add_permission(self, request):
        return False
    def has_delete_permission(self, request, obj=None):
        return False

@admin.register(Gemini_ApiKeyModelMinuteStats)
class ApiKeyModelMinuteStatsAdmin(admin.ModelAdmin):
    list_display = (
        "api_key", "model_name", "timestamp_minute", "requests_per_minute", "tokens_per_minute", "updated_at"
    )
    search_fields = ("api_key", "model_name")
    list_filter = ("model_name", "api_key")
    date_hierarchy = "timestamp_minute"
    readonly_fields = ("timestamp_minute", "updated_at")
    ordering = ("-timestamp_minute",)
    list_per_page = 25
    list_max_show_all = 200
    actions_on_top = True
    actions_on_bottom = True
    show_full_result_count = True
    fieldsets = (
        (None, {
            'fields': (
                ('api_key', 'model_name'),
                ('timestamp_minute', 'updated_at'),
                ('requests_per_minute', 'tokens_per_minute'),
            ),
        }),
    )
    def has_add_permission(self, request):
        return False
    def has_delete_permission(self, request, obj=None):
        return False

@admin.register(Gemini_ApiKeyModelDayStats)
class ApiKeyModelDayStatsAdmin(admin.ModelAdmin):
    list_display = (
        "api_key", "model_name", "timestamp_day", "requests_per_day", "tokens_per_day", "updated_at"
    )
    search_fields = ("api_key", "model_name")
    list_filter = ("model_name", "api_key")
    date_hierarchy = "timestamp_day"
    readonly_fields = ("timestamp_day", "updated_at")
    ordering = ("-timestamp_day","api_key", "model_name")
    list_per_page = 25
    list_max_show_all = 200
    actions_on_top = True
    actions_on_bottom = True
    show_full_result_count = True
    fieldsets = (
        (None, {
            'fields': (
                ('api_key', 'model_name'),
                ('timestamp_day', 'updated_at'),
                ('requests_per_day', 'tokens_per_day'),
            ),
        }),
    )
    def has_add_permission(self, request):
        return False
    def has_delete_permission(self, request, obj=None):
        return False

@admin.register(SWOT)
class SWOTAdmin(admin.ModelAdmin):
    list_display = ('user_id', 'class_id', 'test_num', 'swot_parameter', 'swot_value')
    search_fields = ('user_id', 'class_id', 'test_num', 'swot_parameter')
    ordering = ('user_id', 'class_id', 'test_num')
    list_filter = ('swot_parameter',)

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)