"""Attaches request.user from a JWT bearer token (or AnonymousUser)."""
from django.contrib.auth.models import AnonymousUser
from django.utils.functional import SimpleLazyObject

from .auth import authenticate_request


class JWTAuthMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.user = SimpleLazyObject(
            lambda: authenticate_request(request) or AnonymousUser()
        )
        return self.get_response(request)
