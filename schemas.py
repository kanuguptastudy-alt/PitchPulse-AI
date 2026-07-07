"""Pydantic validation schemas for the PitchPulse AI FastAPI system.

Provides strict data validation, type enforcement, and regex validations
to prevent SQL and Prompt Injection attacks, aligning with OWASP safety guidelines.
"""

from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator


class OperationalPriority(str, Enum):
    """Priority level of the routed operations."""
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class Department(str, Enum):
    """Stadium operations departments for routing."""
    SECURITY = "SECURITY"
    MEDICAL = "MEDICAL"
    CROWD_CONTROL = "CROWD_CONTROL"
    FACILITIES = "FACILITIES"
    TRANSPORT = "TRANSPORT"
    ACCESSIBILITY_SERVICES = "ACCESSIBILITY_SERVICES"


class FanInputRequest(BaseModel):
    """Validation schema for fan multilingual feedback or emergency requests."""

    raw_message: str = Field(
        ...,
        min_length=3,
        max_length=500,
        description="The multilingual raw text input submitted by the fan.",
        examples=["Hay un gran embotellamiento en la puerta A, apenas nos movemos."]
    )
    current_gate: str = Field(
        ...,
        min_length=1,
        max_length=20,
        pattern=r"^[a-zA-Z0-9\s\-]+$",
        description="The fan's current gate or coordinates (alphanumeric, spaces, or hyphens allowed)."
    )
    requires_accessibility: bool = Field(
        default=False,
        description="Flag indicating if the fan requires step-free or wheelchair-accessible routing."
    )

    @field_validator("raw_message")
    @classmethod
    def sanitize_message(cls, value: str) -> str:
        """Sanitizes inputs and rejects suspicious prompt-injection or exploit patterns.

        Args:
            value (str): Raw input message text.

        Returns:
            str: Checked and sanitized message text.

        Raises:
            ValueError: If a prompt injection attempt or illegal pattern is detected.
        """
        # Lowercase for easy check
        test_val = value.lower()
        injection_keywords = [
            "ignore previous instructions",
            "system prompt",
            "sql injection",
            "drop table",
            "select * from",
            "delete from",
            "you are now an admin"
        ]
        for keyword in injection_keywords:
            if keyword in test_val:
                raise ValueError("Potential malicious input or injection pattern detected.")
        return value


class NavigationStep(BaseModel):
    """Individual step in the optimized routing path."""
    instruction: str = Field(..., description="Actionable directions in English/target language.")
    distance_meters: int = Field(..., description="Distance for this movement step.")
    estimated_seconds: int = Field(..., description="Estimated time based on local density.")


class OperationalRouteResponse(BaseModel):
    """Complete structured output from the Multilingual Fan Navigation & Operational Intelligence system."""

    detected_language: str = Field(..., description="The ISO code or display name of the detected fan language.")
    translated_message: str = Field(..., description="The English translation of the user's input.")
    priority: OperationalPriority = Field(..., description="Determined priority level (LOW to CRITICAL).")
    routed_department: Department = Field(..., description="Operations team best equipped to handle this request.")
    crowd_density_index: float = Field(..., description="Simulated local crowd density level at the gate (0.0 to 1.0).")
    optimized_path: List[NavigationStep] = Field(..., description="Chronological path steps bypassing high congestion.")
    accessibility_routing_applied: bool = Field(..., description="Specifies if step-free path validation occurred.")
    staff_action_memo: str = Field(..., description="Actionable directive compiled for the stadium staff.")
