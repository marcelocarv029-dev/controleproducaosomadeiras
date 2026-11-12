/**
 * Wrapper para Web Speech API (pt-BR) com fallback amigável
 */
export function isSpeechSupported() {
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function startVoiceCapture({ onStart, onResult, onError, onEnd, placeholder = 'Ex: Produzi 120 canaletas 14' }) {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRec) {
    // Fallback clean inline prompt when browser does not expose SpeechRecognition
    if (onError) {
      onError('FALLBACK', placeholder);
    }
    return { stop: () => {} };
  }

  const recognition = new SpeechRec();
  recognition.lang = 'pt-BR';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  let finished = false;

  recognition.onstart = () => {
    if (onStart) onStart();
  };

  recognition.onresult = (event) => {
    finished = true;
    const transcript = event.results?.[0]?.[0]?.transcript || '';
    if (onResult) onResult(transcript);
  };

  recognition.onerror = (event) => {
    finished = true;
    if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
      if (onError) onError('Permissão do microfone negada. Digite o comando abaixo:', placeholder);
    } else if (event.error === 'no-speech') {
      if (onError) onError('Nenhuma fala detectada. Tente novamente.', placeholder);
    } else {
      if (onError) onError(`Não foi possível capturar áudio (${event.error}).`, placeholder);
    }
  };

  recognition.onend = () => {
    if (onEnd) onEnd(finished);
  };

  try {
    recognition.start();
  } catch {
    if (onError) onError('FALLBACK', placeholder);
  }

  return {
    stop: () => {
      try {
        recognition.stop();
      } catch {
        // ignore
      }
    }
  };
}
