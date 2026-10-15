"""
ml-service/app/routers/ml.py

FastAPI router implementing all ML endpoints for NeuroLearn AI:
- POST /ml/analyze
- POST /ml/twin/update
- POST /ml/predict
- POST /ml/explain
- POST /ml/root-gap
- POST /ml/recommend
- GET  /ml/health (public, no auth)
- GET  /ml/model-info
"""

from typing import Dict, List, Any, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status

from app.schemas import (
    AnalyzeRequest,
    AnalyzeResponse,
    TwinUpdateRequest,
    TwinUpdateResponse,
    PredictRequest,
    PredictResponse,
    PredictResponseItem,
    ExplainRequest,
    ExplainResponse,
    RootGapRequest,
    RootGapResponse,
    RecommendRequest,
    RecommendResponse,
    HealthResponse,
    ModelInfoResponse,
)
from app.security import verify_api_key
from app.services.engine import get_engine, MLServiceEngine
from app.services.twin import parse_iso_dt

router = APIRouter(prefix="/ml", tags=["ML Service"])


@router.get("/health", response_model=HealthResponse, summary="Service Health Check")
def get_health() -> HealthResponse:
    """
    Public health check endpoint (does NOT require X-API-Key).
    Used by Docker healthchecks, load balancers, and orchestrators.
    """
    engine = get_engine()
    return HealthResponse(
        status="ok",
        model_version=engine.model_version,
        graph_hash=engine.graph_hash,
    )


@router.post(
    "/analyze",
    response_model=AnalyzeResponse,
    dependencies=[Depends(verify_api_key)],
    summary="Comprehensive Student Learning Twin & Risk Analysis",
)
def analyze_student(request: AnalyzeRequest) -> AnalyzeResponse:
    """
    High-performance unified analysis endpoint:
    - Replays student attempts through the Digital Learning Twin.
    - Extracts 15 features across concepts.
    - Predicts failure risk using calibrated XGBoost.
    - Computes SHAP feature attributions & human explanations for medium/high risk concepts.
    - Traverses the knowledge graph DAG to isolate root prerequisite gaps.
    - Returns full twin summary, predictions, root gaps, and timing benchmarks.
    """
    engine = get_engine()
    attempts_list = [a.model_dump(by_alias=False) for a in request.attempts]
    result = engine.analyze(
        student_id=request.student_id,
        attempts=attempts_list,
        cohort_median_attempts=request.cohort_median_attempts or 1.0,
        include_path=request.include_path,
        as_of=request.as_of,
        target_concepts=request.target_concepts,
    )
    return AnalyzeResponse(**result)


@router.post(
    "/twin/update",
    response_model=TwinUpdateResponse,
    dependencies=[Depends(verify_api_key)],
    summary="Update Digital Learning Twin State",
)
def update_twin(request: TwinUpdateRequest) -> TwinUpdateResponse:
    """
    Replays attempts and returns updated twin snapshot including effective mastery,
    practice velocity, consistency, engagement, and confidence maps.
    """
    engine = get_engine()
    attempts_list = [a.model_dump(by_alias=False) for a in request.attempts]
    as_of_dt = parse_iso_dt(request.as_of) if request.as_of else None
    _, _, twin_summary = engine.replay_twin(
        student_id=request.student_id,
        attempts=attempts_list,
        as_of=as_of_dt,
        cohort_median_7d=request.cohort_median_attempts or 1.0,
    )
    return TwinUpdateResponse(twin_summary=twin_summary)


@router.post(
    "/predict",
    response_model=PredictResponse,
    dependencies=[Depends(verify_api_key)],
    summary="Raw and Calibrated Risk Predictions",
)
def predict_risk(request: PredictRequest) -> PredictResponse:
    """
    Predicts raw and calibrated risk probabilities for target concepts.
    """
    engine = get_engine()
    attempts_list = [a.model_dump(by_alias=False) for a in request.attempts]
    as_of_dt = parse_iso_dt(request.as_of) if request.as_of else None

    twin, dt, _ = engine.replay_twin(
        student_id=request.student_id,
        attempts=attempts_list,
        as_of=as_of_dt,
        cohort_median_7d=request.cohort_median_attempts or 1.0,
    )

    if request.concept_ids:
        cids = [engine.graph_service._normalize_id(c) for c in request.concept_ids]
        cids = [c for c in cids if isinstance(c, int)]
    else:
        cids = engine.graph_service.get_topological_order()

    features_df, _ = engine.build_features_matrix(
        twin=twin,
        concept_ids=cids,
        as_of=dt,
        cohort_median_7d=request.cohort_median_attempts or 1.0,
    )

    raw_probs, cal_probs = engine.predict_batch(features_df)

    items = []
    for idx, cid in enumerate(cids):
        raw_p = float(raw_probs[idx])
        cal_p = float(cal_probs[idx])
        band = "high" if cal_p >= 0.60 else ("medium" if cal_p >= 0.30 else "low")
        conf = twin.get_confidence(cid)
        node_info = engine.graph_service.nodes_by_id.get(cid, {})

        items.append(
            PredictResponseItem(
                concept_id=cid,
                concept_code=node_info.get("code", f"C{cid:02d}"),
                concept_name=node_info.get("name", f"Concept {cid}"),
                raw_prob=round(raw_p, 4),
                calibrated_risk=round(cal_p, 4),
                band=band,
                confidence=conf,
            )
        )

    return PredictResponse(student_id=request.student_id, predictions=items)


@router.post(
    "/explain",
    response_model=ExplainResponse,
    dependencies=[Depends(verify_api_key)],
    summary="SHAP Explanation and Natural Language Reasons",
)
def explain_concept_endpoint(request: ExplainRequest) -> ExplainResponse:
    """
    Returns exact SHAP values and human-friendly template reasons for a single concept.
    """
    engine = get_engine()
    attempts_list = [a.model_dump(by_alias=False) for a in request.attempts]
    try:
        result = engine.explain_concept(
            student_id=request.student_id,
            attempts=attempts_list,
            concept_id=request.concept_id,
            as_of=request.as_of,
            cohort_median_attempts=request.cohort_median_attempts or 1.0,
        )
        return ExplainResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post(
    "/root-gap",
    response_model=RootGapResponse,
    dependencies=[Depends(verify_api_key)],
    summary="Diagnose Root Prerequisite Gaps",
)
def find_root_gap_endpoint(request: RootGapRequest) -> RootGapResponse:
    """
    Traverses the knowledge graph to identify true root missing prerequisites.
    """
    engine = get_engine()
    cid_norm = engine.graph_service._normalize_id(request.concept_id)
    if not isinstance(cid_norm, int):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Concept not found: {request.concept_id}")

    if request.mastery_map:
        mastery = {}
        for k, v in request.mastery_map.items():
            norm_k = engine.graph_service._normalize_id(k)
            if isinstance(norm_k, int):
                mastery[norm_k] = float(v)
    elif request.attempts is not None or request.student_id is not None:
        sid = request.student_id or "root-gap-query"
        att = [a.model_dump(by_alias=False) for a in (request.attempts or [])]
        as_of_dt = parse_iso_dt(request.as_of) if request.as_of else None
        twin, dt, _ = engine.replay_twin(sid, att, as_of=as_of_dt)
        mastery = {c: twin.get_effective_mastery(c, dt) for c in engine.graph_service.get_topological_order()}
    else:
        mastery = {c: engine.graph_service.nodes_by_id[c].get("difficulty", 3) * 0.1 for c in engine.graph_service.get_topological_order()}

    gaps = engine.graph_service.find_root_gaps(
        mastery,
        target_concept_id=cid_norm,
        gap_threshold=request.gap_threshold,
    )
    return RootGapResponse(concept_id=cid_norm, root_gaps=gaps)


@router.post(
    "/recommend",
    response_model=RecommendResponse,
    dependencies=[Depends(verify_api_key)],
    summary="Generate Remediation Path",
)
def recommend_path(request: RecommendRequest) -> RecommendResponse:
    """
    Remediation recommendation placeholder (Section 7).
    Returns empty path for Phase 4; will be fully expanded in Phase 6.
    """
    return RecommendResponse(
        student_id=request.student_id,
        generated_at=datetime.now(timezone.utc).isoformat(),
        path=[],
    )


@router.get(
    "/model-info",
    response_model=ModelInfoResponse,
    dependencies=[Depends(verify_api_key)],
    summary="Model Metadata and Metrics",
)
def get_model_info() -> ModelInfoResponse:
    """
    Returns registered model version, training timestamp, graph hash,
    feature list, threshold, and full test evaluation metrics.
    """
    engine = get_engine()
    return ModelInfoResponse(
        features=engine.features_meta.get("features", []),
        version=engine.model_version,
        graph_hash=engine.graph_hash,
        trained_at=engine.features_meta.get("trained_at", ""),
        threshold=engine.threshold,
        metrics=engine.metrics_meta,
    )
