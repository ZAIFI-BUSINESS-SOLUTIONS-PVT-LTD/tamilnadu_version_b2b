from django.db import models

class Gemini_ApiCallLog(models.Model):
    timestamp = models.DateTimeField(auto_now_add=True)
    model_name = models.CharField(max_length=128)
    function_name = models.CharField(max_length=128)
    prompt_excerpt = models.TextField(blank=True)
    prompt_token_count = models.IntegerField(default=0)
    output_token_count = models.IntegerField(default=0)
    total_token_count = models.IntegerField(default=0)
    request_price = models.DecimalField(max_digits=16, decimal_places=8, default=0)
    status = models.CharField(max_length=32, default='success')
    duration_s = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    error_message = models.TextField(blank=True, null=True)
    input_content = models.TextField(blank=True, null=True)
    output_content = models.TextField(blank=True, null=True)
    api_key = models.CharField(max_length=128, blank=True, null=True)
    user_type = models.CharField(max_length=64, blank=True, null=True)
    user_id = models.CharField(max_length=64, blank=True, null=True)

    class Meta:
        db_table = "api_call_log"
        ordering = ["-timestamp"]

    def __str__(self):
        return f"{self.timestamp} - {self.model_name} - {self.status}"

class Gemini_ApiKeyModelMinuteStats(models.Model):
    api_key = models.CharField(max_length=128)
    model_name = models.CharField(max_length=128)
    timestamp_minute = models.DateTimeField()
    requests_per_minute = models.IntegerField(default=0)
    tokens_per_minute = models.IntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("api_key", "model_name", "timestamp_minute")
        db_table = "api_key_model_minute_stats"
        ordering = ["-timestamp_minute"]

class Gemini_ApiKeyModelDayStats(models.Model):
    api_key = models.CharField(max_length=128)
    model_name = models.CharField(max_length=128)
    timestamp_day = models.DateField()
    requests_per_day = models.IntegerField(default=0)
    tokens_per_day = models.IntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("api_key", "model_name", "timestamp_day")
        db_table = "api_key_model_day_stats"
        ordering = ["-timestamp_day"]
