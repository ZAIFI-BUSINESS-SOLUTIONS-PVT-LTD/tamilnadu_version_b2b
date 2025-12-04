from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework.response import Response
from rest_framework.decorators import api_view
from rest_framework_simplejwt.tokens import RefreshToken
from exam.models import Educator, Student, Manager
from django.core.exceptions import ObjectDoesNotExist
from django.contrib.auth.hashers import check_password
import logging

logger = logging.getLogger(__name__)

# Function to generate JWT tokens
def get_tokens_for_user(user, role):
    """
    Generates JWT tokens for a given user and includes role information.
    """
    refresh = RefreshToken.for_user(user)
    refresh["email"] = user.email if hasattr(user, "email") else user.student_id
    refresh["role"] = role  # ✅ Include role in token

    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }

# ✅ Manager (Admin) Login API
@api_view(['POST'])
def admin_login(request):
    email = request.data.get('email')
    password = request.data.get('password')

    logger.info(f"🔍 Admin Login Attempt: {email}")
    #print(f"🔍 Admin Login Attempt: {email}")

    try:
        manager = Manager.objects.get(email=email)
        if check_password(password, manager.password):
            tokens = get_tokens_for_user(manager, "manager")
            logger.info("✅ Manager Login Successful")
            #print("✅ Manager Login Successful")
            return Response({'token': tokens['access'], 'role': 'manager'}, status=200)
        logger.warning("❌ Manager Login Failed: Invalid credentials")
        #print("❌ Manager Login Failed: Invalid credentials")
        return Response({'error': 'Invalid credentials'}, status=401)

    except ObjectDoesNotExist:
        logger.error("❌ Manager Not Found")
        #print("❌ Manager Not Found")
        return Response({'error': 'Admin not found'}, status=404)
    

# ✅ Educator Login API
@api_view(['POST'])
def educator_login(request):
    email = request.data.get('email')
    password = request.data.get('password')

    logger.info(f"🔍 Educator Login Attempt: {email}")
    #print(f"🔍 Educator Login Attempt: {email}")

    try:
        educator = Educator.objects.get(email=email)
        if check_password(password, educator.password):
            tokens = get_tokens_for_user(educator, "educator")
            logger.info("✅ Educator Login Successful")
            #print("✅ Educator Login Successful")
            return Response({
                'token': tokens['access'],
                'csv_status': educator.csv_status,
                'role': 'educator'
            }, status=200)

        logger.warning("❌ Educator Login Failed: Invalid credentials")
        #print("❌ Educator Login Failed: Invalid credentials")
        return Response({'error': 'Invalid credentials'}, status=401)

    except Educator.DoesNotExist:
        logger.error("❌ Educator Not Found")
        #print("❌ Educator Not Found")
        return Response({'error': 'Educator not found'}, status=404)

# ✅ Student Login API
@api_view(['POST'])
def student_login(request):
    student_id = request.data.get('studentId')
    password = request.data.get('password')

    logger.info(f"🔍 Student Login Attempt: {student_id}")
    #print(f"🔍 Student Login Attempt: {student_id}")

    try:
        student = Student.objects.get(student_id=student_id)
        if check_password(password, student.password):
            tokens = get_tokens_for_user(student, "student")
            logger.info("✅ Student Login Successful")
            #print("✅ Student Login Successful")
            return Response({'token': tokens['access'], 'role': 'student'}, status=200)
        logger.warning("❌ Student Login Failed: Invalid credentials")
        #print("❌ Student Login Failed: Invalid credentials")
        return Response({'error': 'Invalid credentials'}, status=401)

    except ObjectDoesNotExist:
        logger.error("❌ Student Not Found")
        #print("❌ Student Not Found")
        return Response({'error': 'Student not found'}, status=404)


# ✅ Institution (Manager) Login API
@api_view(['POST'])
def institution_login(request):
    """
    Institution login using Manager model.
    Manager acts as an institution representative.
    """
    email = request.data.get('email')
    password = request.data.get('password')

    logger.info(f"🔍 Institution Login Attempt: {email}")

    try:
        manager = Manager.objects.get(email=email)
        if check_password(password, manager.password):
            tokens = get_tokens_for_user(manager, "manager")
            logger.info("✅ Institution Login Successful")
            return Response({
                'token': tokens['access'],
                'role': 'manager',
                'institution': manager.institution
            }, status=200)
        
        logger.warning("❌ Institution Login Failed: Invalid credentials")
        return Response({'error': 'Invalid credentials'}, status=401)

    except ObjectDoesNotExist:
        logger.error("❌ Institution Manager Not Found")
        return Response({'error': 'Institution not found'}, status=404)

