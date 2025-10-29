from django.shortcuts import render
from django.http import JsonResponse

def admin_dashboard(request):
    return JsonResponse({"message": "Welcome to the Admin Dashboard!"})
