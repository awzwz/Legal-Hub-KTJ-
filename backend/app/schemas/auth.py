from __future__ import annotations

from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class RefreshBody(BaseModel):
    """Optional body if refresh is not only cookie."""

    refresh_token: Optional[str] = None


class ChangePasswordBody(BaseModel):
    current_password: str = Field(..., min_length=1, alias="currentPassword")
    new_password: str = Field(..., min_length=8, max_length=128, alias="newPassword")

    model_config = {"populate_by_name": True}


class CreateUserBody(BaseModel):
    """Создание нового пользователя (директор/главный юрист)."""

    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=120, alias="fullName")
    role: str = Field(..., description="director / chief_lawyer / branch_lawyer / accountant")
    password: str = Field(..., min_length=8, max_length=128)
    branch_id: Optional[UUID] = Field(default=None, alias="branchId")

    model_config = {"populate_by_name": True}


class UserOut(BaseModel):
    id: str
    email: str
    name: str
    role: str
    branch: Optional[str] = None
    branch_id: Optional[str] = Field(default=None, alias="branchId")
    is_active: bool = Field(default=True, alias="isActive")

    model_config = {"populate_by_name": True}
