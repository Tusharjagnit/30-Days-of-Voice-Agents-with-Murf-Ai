// DOM elements
const textInput = document.getElementById('text-input');
const voiceSelect = document.getElementById('voice-select');
const generateBtn = document.getElementById('generate-btn');
const audioSection = document.getElementById('audio-section');
const audioPlayer = document.getElementById('audio-player');
const generatedText = document.getElementById('generated-text');
const generatedVoice = document.getElementById('generated-voice');
const audioStatus = document.getElementById('audio-status');
const errorSection = document.getElementById('error-section');
const errorMessage = document.getElementById('error-message');
const charCount = document.getElementById('char-count');

// Echo Bot DOM elements
const startRecordingBtn = document.getElementById('start-recording-btn');
const stopRecordingBtn = document.getElementById('stop-recording-btn');
const echoAudioSection = document.getElementById('echo-audio-section');
const echoAudioPlayer = document.getElementById('echo-audio-player');
const echoAudioStatus = document.getElementById('echo-audio-status');
const aiEchoSection = document.getElementById('ai-echo-section');
const aiEchoPlayer = document.getElementById('ai-echo-player');
const aiEchoStatus = document.getElementById('ai-echo-status');
const echoErrorSection = document.getElementById('echo-error-section');
const echoErrorMessage = document.getElementById('echo-error-message');

// MediaRecorder variables
let mediaRecorder;
let audioChunks = [];
let audioBlob;
let audioUrl;
let uploadStatus = null;
// Helper to show upload status
function showUploadStatus(message, color = '#2b6cb0') {
    if (!uploadStatus) {
        uploadStatus = document.createElement('div');
        uploadStatus.id = 'upload-status';
        uploadStatus.style.marginTop = '10px';
        uploadStatus.style.fontWeight = 'bold';
        echoAudioSection.appendChild(uploadStatus);
    }
    uploadStatus.textContent = message;
    uploadStatus.style.color = color;
}

function hideUploadStatus() {
    if (uploadStatus) {
        uploadStatus.textContent = '';
    }
}

// Character counter
textInput.addEventListener('input', function() {
    const count = this.value.length;
    charCount.textContent = count;
    
    // Change color based on character count
    if (count > 450) {
        charCount.style.color = '#e53e3e';
    } else if (count > 400) {
        charCount.style.color = '#d69e2e';
    } else {
        charCount.style.color = '#718096';
    }
});

// Generate audio function
async function generateAudio() {
    const text = textInput.value.trim();
    const voiceId = voiceSelect.value;
    
    // Validation
    if (!text) {
        showError('Please enter some text to convert to speech.');
        return;
    }
    
    if (text.length > 500) {
        showError('Text is too long. Please keep it under 500 characters.');
        return;
    }
    
    // Show loading state
    setLoadingState(true);
    hideError();
    hideAudioSection();
    
    try {
        // Make API call to generate TTS
        const response = await fetch('/generate-tts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: text,
                voice_id: voiceId,
                format: 'mp3'
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            // Success - show audio player
            showAudioPlayer(data);
        } else {
            // API error
            showError(data.detail || 'Failed to generate audio. Please try again.');
        }
    } catch (error) {
        console.error('Error generating audio:', error);
        showError('Network error. Please check your connection and try again.');
    } finally {
        setLoadingState(false);
    }
}

// Show audio player with generated audio
function showAudioPlayer(data) {
    // Set audio source
    audioPlayer.src = data.audio_url;
    
    // Update info
    generatedText.textContent = data.text;
    generatedVoice.textContent = getVoiceDisplayName(data.voice_id);
    
    // Show audio section
    audioSection.style.display = 'block';
    
    // Update status
    audioStatus.textContent = 'Audio loaded successfully';
    audioStatus.style.color = '#2f855a';
    
    // Auto-play audio (optional - some browsers block this)
    audioPlayer.play().catch(error => {
        console.log('Auto-play blocked:', error);
        audioStatus.textContent = 'Click play to start audio';
    });
    
    audioPlayer.addEventListener('loadstart', () => {
        audioStatus.textContent = 'Loading audio...';
    });
    
    audioPlayer.addEventListener('canplay', () => {
        audioStatus.textContent = 'Ready to play';
    });
    
    audioPlayer.addEventListener('play', () => {
        audioStatus.textContent = 'Playing...';
    });
    
    audioPlayer.addEventListener('pause', () => {
        audioStatus.textContent = 'Paused';
    });
    
    audioPlayer.addEventListener('ended', () => {
        audioStatus.textContent = 'Playback completed';
    });
    
    audioPlayer.addEventListener('error', () => {
        audioStatus.textContent = 'Error loading audio';
        audioStatus.style.color = '#e53e3e';
    });
}

function getVoiceDisplayName(voiceId) {
    const voiceMap = {
        'en-US-charles': 'Charles (US English)',
        'en-US-julia': 'Julia (US English)',
        'en-IN-aarav': 'Aarav (Indian English)',
        'en-UK-juliet': 'Juliet (UK English)',
        'en-AU-kylie': 'Kylie (Australian English)'
    };
    return voiceMap[voiceId] || voiceId;
}

function setLoadingState(loading) {
    const btnText = generateBtn.querySelector('.btn-text');
    const btnLoading = generateBtn.querySelector('.btn-loading');
    
    if (loading) {
        btnText.style.display = 'none';
        btnLoading.style.display = 'inline';
        generateBtn.disabled = true;
    } else {
        btnText.style.display = 'inline';
        btnLoading.style.display = 'none';
        generateBtn.disabled = false;
    }
}

function showError(message) {
    errorMessage.textContent = message;
    errorSection.style.display = 'block';
    audioSection.style.display = 'none';
}

function hideError() {
    errorSection.style.display = 'none';
}

function hideAudioSection() {
    audioSection.style.display = 'none';
}

generateBtn.addEventListener('click', generateAudio);

textInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        generateAudio();
    }
});

voiceSelect.addEventListener('change', function() {
    hideAudioSection();
    hideError();
});

document.addEventListener('DOMContentLoaded', function() {
    charCount.textContent = textInput.value.length;
    textInput.focus();
});

// Echo Bot Functions
async function startRecording() {
    try {
        audioChunks = [];
        hideEchoAudioSection();
        hideEchoError();
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.addEventListener('dataavailable', event => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        });
        mediaRecorder.addEventListener('stop', () => {
            audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            // Do not play original recording, just show section and status
            echoAudioSection.style.display = 'block';
            echoAudioStatus.textContent = 'Processing your voice...';
            echoAudioStatus.style.color = '#3182ce';
            stream.getTracks().forEach(track => track.stop());
        });
        mediaRecorder.start();
        startRecordingBtn.disabled = true;
        stopRecordingBtn.disabled = false;
        echoAudioStatus.textContent = 'Recording...';
        echoAudioStatus.style.color = '#e53e3e';
        echoAudioSection.style.display = 'block';
    } catch (error) {
        console.error('Error starting recording:', error);
        showEchoError('Could not access microphone. Please ensure you have granted microphone permissions.');
    }
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        startRecordingBtn.disabled = false;
        stopRecordingBtn.disabled = true;
        // Upload audio after stopping
        setTimeout(uploadEchoAudio, 500); // slight delay to ensure blob is ready
    }
}

// Upload the recorded audio to the server and get Murf voice echo
async function uploadEchoAudio() {
    if (!audioBlob) {
        showUploadStatus('No audio to upload.', '#e53e3e');
        return;
    }
    showUploadStatus('Transcribing and generating voice...', '#3182ce');
    const formData = new FormData();
    const filename = `echo_recording_${Date.now()}.webm`;
    formData.append('file', audioBlob, filename);
    try {
        const response = await fetch('/tts/echo', {
            method: 'POST',
            body: formData
        });
        if (response.ok) {
            const data = await response.json();
            showUploadStatus('Echo generated with Murf voice!', '#38a169');
            showTranscript(data.transcript);
            // Play Murf-generated audio in AI Echo section
            aiEchoSection.style.display = 'block';
            aiEchoPlayer.src = data.audio_url;
            aiEchoPlayer.play().catch(error => {
                aiEchoStatus.textContent = 'Click play to hear your Murf voice echo';
            });
            aiEchoStatus.textContent = 'Playing Murf voice echo...';
            aiEchoStatus.style.color = '#2f855a';
        } else {
            const err = await response.json();
            showUploadStatus('Echo failed: ' + (err.detail || 'Unknown error'), '#e53e3e');
            showTranscript('');
        }
    } catch (error) {
        showUploadStatus('Echo failed: ' + error, '#e53e3e');
        showTranscript('');
    }
}
// Show transcript in the UI
function showTranscript(text) {
    let transcriptDiv = document.getElementById('transcript-section');
    if (!transcriptDiv) {
        transcriptDiv = document.createElement('div');
        transcriptDiv.id = 'transcript-section';
        transcriptDiv.style.marginTop = '15px';
        transcriptDiv.style.padding = '15px';
        transcriptDiv.style.background = '#f7fafc';
        transcriptDiv.style.borderRadius = '8px';
        transcriptDiv.style.border = '1px solid #e2e8f0';
        transcriptDiv.style.color = '#2b6cb0';
        echoAudioSection.appendChild(transcriptDiv);
    }
    transcriptDiv.innerHTML = text ? `<b>Transcript:</b> ${text}` : '';
}

function showEchoError(message) {
    echoErrorMessage.textContent = message;
    echoErrorSection.style.display = 'block';
}

function hideEchoError() {
    echoErrorSection.style.display = 'none';
}

function hideEchoAudioSection() {
    echoAudioSection.style.display = 'none';
}

startRecordingBtn.addEventListener('click', startRecording);
stopRecordingBtn.addEventListener('click', stopRecording);
echoAudioPlayer.addEventListener('play', () => {
    echoAudioStatus.textContent = 'Playing recording...';
});
echoAudioPlayer.addEventListener('pause', () => {
    echoAudioStatus.textContent = 'Paused';
});
echoAudioPlayer.addEventListener('ended', () => {
    echoAudioStatus.textContent = 'Playback completed';
});
echoAudioPlayer.addEventListener('error', () => {
    echoAudioStatus.textContent = 'Error playing recording';
    echoAudioStatus.style.color = '#e53e3e';
});
