from fastapi import FastAPI, Request, HTTPException, UploadFile, File
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import httpx
import assemblyai as aai
import os
import shutil
from dotenv import load_dotenv
from pydantic import BaseModel

# Load environment variables
load_dotenv()

app = FastAPI(title="Day 5 - Echo Bot", description="Voice Agent with Murf TTS Integration, Audio Playback, Echo Bot, and Audio Upload")

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


from fastapi import Form

# Echo Bot v2 endpoint
@app.post("/tts/echo")
async def tts_echo(file: UploadFile = File(...)):
    """
    Accepts an audio file, transcribes it, sends transcription to Murf API, returns Murf audio URL.
    """
    try:
        # 1. Transcribe audio using AssemblyAI
        aai_api_key = os.getenv("ASSEMBLYAI_API_KEY")
        if not aai_api_key:
            raise HTTPException(status_code=500, detail="ASSEMBLYAI_API_KEY not found in environment variables")
        aai.settings.api_key = aai_api_key
        transcriber = aai.Transcriber()
        audio_bytes = await file.read()
        transcript = transcriber.transcribe(audio_bytes)
        if not transcript.text:
            raise HTTPException(status_code=400, detail="No transcription result.")

        # 2. Send transcription to Murf API
        murf_api_key = os.getenv("MURF_API_KEY")
        if not murf_api_key:
            raise HTTPException(status_code=500, detail="MURF_API_KEY not found in environment variables")
        murf_url = "https://api.murf.ai/v1/speech/generate"
        headers = {
            "api-key": murf_api_key,
            "Content-Type": "application/json"
        }
        # Use en-IN-aarav for Echo Bot v2
        voice_id = "en-US-charles"
        payload = {
            "text": transcript.text,
            "voiceId": voice_id,
            "format": "mp3"
        }
        async with httpx.AsyncClient() as client:
            murf_response = await client.post(murf_url, json=payload, headers=headers)
            if murf_response.status_code == 200:
                murf_result = murf_response.json()
                audio_url = murf_result.get("audioFile")
                if not audio_url:
                    raise HTTPException(status_code=500, detail="No audio URL returned from Murf API.")
                return {"audio_url": audio_url, "transcript": transcript.text, "voice_id": voice_id}
            else:
                raise HTTPException(
                    status_code=murf_response.status_code,
                    detail=f"Murf API error: {murf_response.text}"
                )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Echo Bot v2 failed: {str(e)}")
class TTSRequest(BaseModel):
    text: str
    voice_id: str = "en-US-charles"
    format: str = "mp3"

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.post("/generate-tts")
async def generate_tts(request: TTSRequest):
    """
    Generate TTS audio using Murf's REST API
    """
    try:
        # Get API key from environment
        api_key = os.getenv("MURF_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="MURF_API_KEY not found in environment variables")
        
        # Murf API endpoint
        url = "https://api.murf.ai/v1/speech/generate"
        
        # Headers for Murf API
        headers = {
            "api-key": api_key,
            "Content-Type": "application/json"
        }
        
        # Request payload for Murf API - ensure voice_id uses hyphens, not underscores
        voice_id = request.voice_id.replace("_", "-") if "_" in request.voice_id else request.voice_id
        
        payload = {
            "text": request.text,
            "voiceId": voice_id,
            "format": request.format
        }
        
        # Make request to Murf API
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                # Return the audio URL from Murf's response
                return JSONResponse(content={
                    "success": True,
                    "audio_url": result.get("audioFile"),
                    "message": "Audio generated successfully",
                    "text": request.text,
                    "voice_id": voice_id
                })
            else:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Murf API error: {response.text}"
                )
                
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating TTS: {str(e)}")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "message": "Day 5 Echo Bot is running"}

@app.get("/api/voices")
async def get_available_voices():
    """Get available voices for TTS"""
    # Common Murf voices
    voices = [
        {"id": "en-US-charles", "name": "Charles (US English)", "language": "en-US"},
        {"id": "en-US-julia", "name": "Julia (US English)", "language": "en-US"},
        {"id": "en-IN-aarav", "name": "Aarav (Indian English)", "language": "en-IN"},
        {"id": "en-UK-juliet", "name": "Juliet (UK English)", "language": "en-UK"},
        {"id": "en-AU-kylie", "name": "Kylie (Australian English)", "language": "en-AU"}
    ]
    return {"voices": voices}
