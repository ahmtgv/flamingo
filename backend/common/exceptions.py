"""Domain exceptions. Strawberry surfaces the message as a GraphQL error."""


class FlamingoError(Exception):
    """Base class for expected, user-facing errors."""


class ValidationError(FlamingoError):
    pass


class AuthError(FlamingoError):
    pass


class PermissionDenied(FlamingoError):
    pass


class NotFound(FlamingoError):
    pass
