import time
import functools
from datetime import datetime
import inspect
import os
from exam.llm_call.gemini_prices import pricing
from django.db import transaction
from exam.models.gemini_api import Gemini_ApiCallLog, Gemini_ApiKeyModelMinuteStats, Gemini_ApiKeyModelDayStats
from django.utils import timezone


# Global dict for RPM tracking
key_rpm = {}

def trace_api_call(user_type=None, user_id=None):
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            start = time.time()
            error = None
            response = ""
            prompt = kwargs.get("prompt", "")
            current_model_name = kwargs.get("model_name", "gemini-2.5-flash")
            from exam.llm_call.gemini_api import get_next_key, call_gemini_api
            import sys



            def get_caller_function_name():
                stack = inspect.stack()
                current_file = os.path.abspath(__file__)
                caller_file = os.path.abspath(stack[2].filename)
                common_root = os.path.commonpath([current_file, caller_file])
                relative_path = os.path.relpath(caller_file, common_root)
                return relative_path + "/" + stack[2].function

            caller_function_name = get_caller_function_name() or "unknown"

            trace_data = {
                "timestamp": datetime.utcnow(),
                "model_name": current_model_name,
                "function_name": caller_function_name,
                "prompt_excerpt": prompt[:100],
                "user_type": user_type,
                "user_id": user_id,
                "prompt_token_count": 0,
                "output_token_count": 0,
                "total_token_count": 0,
                "request_price": 0,
                # removed unsupported fields: candidates_token_count, rpm
            }

            def estimate_cost(input_tokens: int, outputTokens: int, input_model_name):
                input_model_name = input_model_name.strip("/models")
                matching_models = [model for model in pricing.keys() if input_model_name.startswith(model)]
                if not matching_models:
                    matching_model_name = "gemini-2.0-flash-experimental"
                else:
                    matching_model_name = max(matching_models, key=len)
                if "-exp" in input_model_name:
                    matching_model_name += "-experimental"
                for (window_lower_limit, window_upper_limit) in pricing[matching_model_name].keys():
                    if input_tokens >= window_lower_limit and input_tokens <= window_upper_limit:
                        input_price = pricing[matching_model_name][((window_lower_limit, window_upper_limit))]["input"]
                        output_price = pricing[matching_model_name][((window_lower_limit, window_upper_limit))]["output"]
                        break
                cost = (input_tokens / 1_000_000) * input_price + (outputTokens / 1_000_000) * output_price
                return f"{cost:.8f}"

            captured_key = None
            original_get_next_key = get_next_key
            def patched_get_next_key():
                nonlocal captured_key
                key = original_get_next_key()
                captured_key = key.strip()
                return key

            original_call_gemini_api = call_gemini_api
            def patched_call_gemini_api(prompt, model_name, images=None):
                nonlocal error, current_model_name
                result = ""
                current_model_name = model_name
                try:
                    result, usage = original_call_gemini_api(prompt=prompt, model_name=model_name, images=images)
                    if result == "":
                        raise ValueError("Empty response received")

                    # Only update RPM on successful response
                    now = time.time()
                    record = key_rpm.get(captured_key, {"count": 0, "start_time": now})
                    if now - record["start_time"] > 60:
                        record = {"count": 1, "start_time": now}
                    else:
                        record["count"] += 1
                    key_rpm[captured_key] = record

                    # Map token counts to correct fields
                    trace_data.update({
                        "model_name": current_model_name,
                        "prompt_token_count": getattr(usage, "prompt_token_count", 0) or 0,
                        "output_token_count": getattr(usage, "candidates_token_count", 0) or 0,  # expects output_token_count, not candidates_token_count
                        "total_token_count": getattr(usage, "total_token_count", 0) or 0,
                        "request_price": estimate_cost(getattr(usage, "prompt_token_count", 0), getattr(usage, "output_token_count", 0), current_model_name),
                        "input_content": prompt,
                        "output_content": result,
                    })
                    return result, usage
                except Exception as e:
                    error = str(e)
                    duration = int((time.time() - start) * 1000)
                    trace_data.update({
                        "model_name": current_model_name,
                        "status": "failed",
                        "duration_s": duration,
                        "error_message": error,
                        "response_excerpt": "",
                        "api_key": captured_key,
                    })
                    with transaction.atomic():
                        insert_trace(filter_trace_data_for_log(trace_data))
                    raise

            # Patch functions for module aliasing
            import exam.llm_call.gemini_api
            sys.modules["gemini_api"] = sys.modules["exam.llm_call.gemini_api"]
            sys.modules["exam.llm_call.gemini_api"].__dict__["call_gemini_api"] = patched_call_gemini_api
            sys.modules["exam.llm_call.gemini_api"].__dict__["get_next_key"] = patched_get_next_key

            # Prepare trace_data for ApiCallLog (filter only valid fields)
            def filter_trace_data_for_log(trace_data):
                allowed_fields = {
                    "timestamp", "model_name", "function_name", "prompt_excerpt",
                    "prompt_token_count", "output_token_count", "total_token_count",
                    "request_price", "status", "duration_s", "error_message",
                    "input_content", "output_content", "api_key", "user_type", "user_id"
                }
                return {k: v for k, v in trace_data.items() if k in allowed_fields}

            try:
                response = func(*args, **kwargs)
                status = "success"
            except Exception as e:
                error = str(e)
                status = "failed"
                raise
            finally:
                if status == "success":
                    duration = int((time.time() - start))
                    trace_data.update({
                        "status": status,
                        "duration_s": duration,
                        "error_message": None,
                        "response_excerpt": str(response)[:100],
                        "api_key": captured_key,
                        "model_name": current_model_name,
                        "output_content": str(response),
                    })
                    # Update per-minute and per-day stats

                    now = timezone.now()
                    minute = now.replace(second=0, microsecond=0)
                    day = now.date()
                    # Update minute stats
                    minute_stats, _ = Gemini_ApiKeyModelMinuteStats.objects.get_or_create(
                        api_key=captured_key,
                        model_name=current_model_name,
                        timestamp_minute=minute,
                        defaults={"requests_per_minute": 0, "tokens_per_minute": 0}
                    )
                    minute_stats.requests_per_minute += 1
                    minute_stats.tokens_per_minute += trace_data["total_token_count"]
                    minute_stats.save()
                    # Update day stats
                    day_stats, _ = Gemini_ApiKeyModelDayStats.objects.get_or_create(
                        api_key=captured_key,
                        model_name=current_model_name,
                        timestamp_day=day,
                        defaults={"requests_per_day": 0, "tokens_per_day": 0}
                    )
                    day_stats.requests_per_day += 1
                    day_stats.tokens_per_day += trace_data["total_token_count"]
                    day_stats.save()

                    with transaction.atomic():
                        insert_trace(filter_trace_data_for_log(trace_data))

                # Restore originals
                sys.modules["exam.llm_call.gemini_api"].__dict__["get_next_key"] = original_get_next_key
                sys.modules["exam.llm_call.gemini_api"].__dict__["call_gemini_api"] = original_call_gemini_api

            return response

        return wrapper
    return decorator


def insert_trace(trace_data):
    Gemini_ApiCallLog.objects.create(**trace_data)