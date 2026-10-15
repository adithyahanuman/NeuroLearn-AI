"""
ml-service/app/schemas.py

Pydantic v2 data models for the NeuroLearn AI ML Service.
Strict adherence to docs/api.md specifications with dual support for
camelCase (API contracts) and snake_case (internal Python).
"""

from typing import Dict, List, Any, Optional, Union
from pydantic import BaseModel, ConfigDict, Field


class BaseSchema(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        serialize_by_alias=True,
    )


class AttemptIn(BaseSchema):
    client_attempt_id: Optional[str] = Field(None, alias="clientAttemptId")
    student_id: Optional[str] = Field(None, alias="studentId")
    concept_id: Union[int, str] = Field(..., alias="conceptId")
    score: float = Field(..., ge=0.0, le=1.0)
    time_spent_seconds: Optional[int] = Field(60, ge=1, alias="timeSpentSeconds")
    hints_used: Optional[int] = Field(0, ge=0, alias="hintsUsed")
    assessment_type: Optional[str] = Field("practice", alias="assessmentType")
    attempted_at: Optional[str] = Field(None, alias="attemptedAt")


class RootGapItem(BaseSchema):
    concept_id: int = Field(..., alias="conceptId")
    root_gap_id: int = Field(..., alias="rootGapId")
    code: str
    name: str
    mastery: float
    chain: List[Union[int, str]]
    blocked_descendants: int = Field(..., alias="blockedDescendants")
    score: float
    is_target_itself: bool = Field(False, alias="isTargetItself")


class RiskPrediction(BaseSchema):
    concept_id: int = Field(..., alias="conceptId")
    concept_code: str = Field(..., alias="conceptCode")
    concept_name: str = Field(..., alias="conceptName")
    risk: float
    band: str  # "low", "medium", "high"
    confidence: str  # "low", "medium", "high"
    reasons: List[str] = Field(default_factory=list)
    root_gaps: List[RootGapItem] = Field(default_factory=list, alias="rootGaps")
    stale: bool = False
    computed_at: str = Field(..., alias="computedAt")


class TwinSummary(BaseSchema):
    student_id: str = Field(..., alias="studentId")
    computed_at: str = Field(..., alias="computedAt")
    mastery_all: Dict[str, float] = Field(..., alias="masteryAll")
    raw_mastery: Optional[Dict[str, float]] = Field(None, alias="rawMastery")
    velocity: Dict[str, float]
    consistency: float
    engagement: float
    confidence: Dict[str, str]
    total_attempts: int = Field(0, alias="totalAttempts")
    risk_summary: Dict[str, int] = Field(..., alias="riskSummary")


class AnalyzeRequest(BaseSchema):
    student_id: str = Field(..., alias="studentId")
    attempts: List[AttemptIn] = Field(default_factory=list)
    cohort_median_attempts: Optional[float] = Field(1.0, ge=1.0, alias="cohortMedianAttempts")
    include_path: bool = Field(False, alias="includePath")
    as_of: Optional[str] = Field(None, alias="asOf")
    target_concepts: Optional[List[Union[int, str]]] = Field(None, alias="targetConcepts")


class AnalyzeResponse(BaseSchema):
    student_id: str = Field(..., alias="studentId")
    predictions: List[RiskPrediction]
    twin_summary: TwinSummary = Field(..., alias="twinSummary")
    root_gaps: List[RootGapItem] = Field(default_factory=list, alias="rootGaps")
    path: List[Dict[str, Any]] = Field(default_factory=list)
    timings: Dict[str, float]


class TwinUpdateRequest(BaseSchema):
    student_id: str = Field(..., alias="studentId")
    attempts: List[AttemptIn] = Field(default_factory=list)
    as_of: Optional[str] = Field(None, alias="asOf")
    cohort_median_attempts: Optional[float] = Field(1.0, ge=1.0, alias="cohortMedianAttempts")


class TwinUpdateResponse(BaseSchema):
    twin_summary: TwinSummary = Field(..., alias="twinSummary")


class PredictRequest(BaseSchema):
    student_id: str = Field(..., alias="studentId")
    attempts: List[AttemptIn] = Field(default_factory=list)
    concept_ids: Optional[List[Union[int, str]]] = Field(None, alias="conceptIds")
    as_of: Optional[str] = Field(None, alias="asOf")
    cohort_median_attempts: Optional[float] = Field(1.0, ge=1.0, alias="cohortMedianAttempts")


class PredictResponseItem(BaseSchema):
    concept_id: int = Field(..., alias="conceptId")
    concept_code: str = Field(..., alias="conceptCode")
    concept_name: str = Field(..., alias="conceptName")
    raw_prob: float = Field(..., alias="rawProb")
    calibrated_risk: float = Field(..., alias="calibratedRisk")
    band: str
    confidence: str


class PredictResponse(BaseSchema):
    student_id: str = Field(..., alias="studentId")
    predictions: List[PredictResponseItem]


class ExplainRequest(BaseSchema):
    student_id: str = Field(..., alias="studentId")
    attempts: List[AttemptIn] = Field(default_factory=list)
    concept_id: Union[int, str] = Field(..., alias="conceptId")
    as_of: Optional[str] = Field(None, alias="asOf")
    cohort_median_attempts: Optional[float] = Field(1.0, ge=1.0, alias="cohortMedianAttempts")


class ExplainResponse(BaseSchema):
    student_id: str = Field(..., alias="studentId")
    concept_id: int = Field(..., alias="conceptId")
    concept_code: str = Field(..., alias="conceptCode")
    concept_name: str = Field(..., alias="conceptName")
    risk: float
    band: str
    confidence: str
    shap_values: Dict[str, float] = Field(..., alias="shapValues")
    reasons: List[str]


class RootGapRequest(BaseSchema):
    concept_id: Union[int, str] = Field(..., alias="conceptId")
    mastery_map: Optional[Dict[str, float]] = Field(None, alias="masteryMap")
    student_id: Optional[str] = Field(None, alias="studentId")
    attempts: Optional[List[AttemptIn]] = None
    as_of: Optional[str] = Field(None, alias="asOf")
    gap_threshold: float = Field(0.60, alias="gapThreshold")


class RootGapResponse(BaseSchema):
    concept_id: int = Field(..., alias="conceptId")
    root_gaps: List[RootGapItem] = Field(..., alias="rootGaps")


class RecommendRequest(BaseSchema):
    student_id: str = Field(..., alias="studentId")
    attempts: List[AttemptIn] = Field(default_factory=list)
    as_of: Optional[str] = Field(None, alias="asOf")


class RecommendResponse(BaseSchema):
    student_id: str = Field(..., alias="studentId")
    generated_at: str = Field(..., alias="generatedAt")
    path: List[Dict[str, Any]] = Field(default_factory=list)


class HealthResponse(BaseSchema):
    status: str = "ok"
    model_version: str = Field("v1", alias="modelVersion")
    graph_hash: str = Field(..., alias="graphHash")


class ModelInfoResponse(BaseSchema):
    features: List[str]
    version: str
    graph_hash: str = Field(..., alias="graphHash")
    trained_at: str = Field(..., alias="trainedAt")
    threshold: float
    metrics: Dict[str, Any]


class ErrorResponse(BaseSchema):
    error: str
    code: str = "ERROR"
    detail: Optional[Any] = None
