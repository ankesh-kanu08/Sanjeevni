from fastapi import APIRouter
from app.models.schemas import VoiceTurnRequest, VoiceTurnResponse
from app.services.voice_agent_service import voice_agent_service

router = APIRouter()

@router.post("/voice-checkin/turn", response_model=VoiceTurnResponse)
def handle_voice_turn(request: VoiceTurnRequest) -> VoiceTurnResponse:
    """
    Processes a reactive voice turn for a post-discharge patient.
    Extracts structured clinical observations, updates conversation state,
    and dynamically selects the next clinical question.
    """
    return voice_agent_service.process_turn(request)
