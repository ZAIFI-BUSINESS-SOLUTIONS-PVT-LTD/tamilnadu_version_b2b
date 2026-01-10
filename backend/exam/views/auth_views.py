from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework.response import Response
from rest_framework.decorators import api_view
from rest_framework_simplejwt.tokens import RefreshToken
from exam.models import Educator, Student, Manager, Institution
import re
from django.core.exceptions import ObjectDoesNotExist
from django.contrib.auth.hashers import check_password
import logging

logger = logging.getLogger(__name__)


def normalize_subdomain(raw_value):
    """Normalize a raw institution value into a DNS-safe subdomain slug."""
    if not raw_value:
        return None
    slug = re.sub(r'[^a-z0-9-]', '-', str(raw_value).strip().lower())
    slug = re.sub(r'-+', '-', slug).strip('-')
    return slug or None

def resolve_institution_for_name(raw_name):
    """
    Resolve an Institution record from a user-provided institution string.
    Strategy (best-effort):
    1) Exact display_name match (case-insensitive)
    2) Fallback to normalized subdomain + ".inzighted.com" matching Institution.domain
    Returns (inst or None)
    """
    if not raw_name:
        return None
    name = str(raw_name).strip()
    inst = Institution.objects.filter(display_name__iexact=name).first()
    if inst:
        return inst
    candidate_sub = normalize_subdomain(name)
    if candidate_sub:
        candidate_domain = f"{candidate_sub}.inzighted.com"
        inst = Institution.objects.filter(domain=candidate_domain).first()
        if inst:
            return inst
    return None

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
            inst = resolve_institution_for_name(manager.institution)
            tenant_domain = inst.domain if inst else None
            redirect_on_login = bool(inst.redirect_on_login) if inst else False
            # Derive subdomain part for backward compatibility
            institute_subdomain = None
            if tenant_domain and isinstance(tenant_domain, str) and '.' in tenant_domain:
                institute_subdomain = tenant_domain.split('.')[0]
            return Response({
                'token': tokens['access'],
                'role': 'manager',
                'tenant_domain': tenant_domain,
                'redirect_on_login': redirect_on_login,
                'institute_subdomain': institute_subdomain,
            }, status=200)
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
            inst = resolve_institution_for_name(educator.institution)
            tenant_domain = inst.domain if inst else None
            redirect_on_login = bool(inst.redirect_on_login) if inst else False
            institute_subdomain = None
            if tenant_domain and isinstance(tenant_domain, str) and '.' in tenant_domain:
                institute_subdomain = tenant_domain.split('.')[0]
            return Response({
                'token': tokens['access'],
                'csv_status': educator.csv_status,
                'role': 'educator',
                'tenant_domain': tenant_domain,
                'redirect_on_login': redirect_on_login,
                'institute_subdomain': institute_subdomain,
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
            # Best-effort institution resolution via associated educator class
            educator = Educator.objects.filter(class_id=student.class_id).first()
            inst = resolve_institution_for_name(educator.institution) if educator else None
            tenant_domain = inst.domain if inst else None
            redirect_on_login = bool(inst.redirect_on_login) if inst else False
            institute_subdomain = None
            if tenant_domain and isinstance(tenant_domain, str) and '.' in tenant_domain:
                institute_subdomain = tenant_domain.split('.')[0]
            return Response({
                'token': tokens['access'],
                'role': 'student',
                'tenant_domain': tenant_domain,
                'redirect_on_login': redirect_on_login,
                'institute_subdomain': institute_subdomain,
            }, status=200)
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
            inst = resolve_institution_for_name(manager.institution)
            tenant_domain = inst.domain if inst else None
            redirect_on_login = bool(inst.redirect_on_login) if inst else False
            institute_subdomain = None
            if tenant_domain and isinstance(tenant_domain, str) and '.' in tenant_domain:
                institute_subdomain = tenant_domain.split('.')[0]
            return Response({
                'token': tokens['access'],
                'role': 'manager',
                'institution': manager.institution,
                'tenant_domain': tenant_domain,
                'redirect_on_login': redirect_on_login,
                'institute_subdomain': institute_subdomain,
            }, status=200)
        
        logger.warning("❌ Institution Login Failed: Invalid credentials")
        return Response({'error': 'Invalid credentials'}, status=401)

    except ObjectDoesNotExist:
        logger.error("❌ Institution Manager Not Found")
        return Response({'error': 'Institution not found'}, status=404)

