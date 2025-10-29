import jwt
from django.conf import settings
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from exam.models.educator import Educator
from exam.models.student import Student
from exam.models.manager import Manager
from django.contrib.auth.models import User

class UniversalJWTAuthentication(BaseAuthentication):
    """
    Custom authentication for Admin (User), Educator, Student, and Manager.
    """

    def authenticate(self, request):
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return None  # No token, DRF will move to next authentication backend.

        token = auth_header.split(" ")[1]
        try:
            decoded = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
            email = decoded.get("email")
            role = decoded.get("role")

            if not email or not role:
                raise AuthenticationFailed("Invalid token: missing fields.")

            # Map role to model
            user_model_map = {
                "admin": User,
                "educator": Educator,
                "student": Student,
                "manager": Manager,
            }
            model = user_model_map.get(role)
            if not model:
                raise AuthenticationFailed("Invalid role.")

            # For students, you use student_id, for others, email
            if role == "student":
                user = model.objects.filter(student_id=email).first()
            else:
                user = model.objects.filter(email=email).first()

            if not user:
                # Generic error, do not reveal which user type failed.
                raise AuthenticationFailed("Invalid authentication credentials.")

            # Ensure user-like properties exist
            user.is_authenticated = True

            return (user, token)

        except jwt.ExpiredSignatureError:
            raise AuthenticationFailed("Token has expired")
        except jwt.InvalidTokenError:
            raise AuthenticationFailed("Invalid token")
