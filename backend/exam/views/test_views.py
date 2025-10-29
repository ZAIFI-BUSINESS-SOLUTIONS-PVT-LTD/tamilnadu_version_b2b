from django.http import JsonResponse
from exam.models.test import Test
from django.views.decorators.csrf import csrf_exempt

@csrf_exempt
def get_tests(request):
    if request.method == "GET":
        tests = Test.objects.all().values("id", "class_id", "test_num", "date")
        return JsonResponse({"tests": list(tests)})
    return JsonResponse({"error": "Invalid request"}, status=400)
