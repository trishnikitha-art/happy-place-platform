'use client';

import { useState } from 'react';

export default function VoiceFactoryPage() {
  const [text, setText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');

  const generate = async () => {
    if (!text.trim()) {
      setError('Please enter text to generate');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setStatus('Generating...');
    setAudioUrl(null);

    try {
      const response = await fetch('http://localhost:5000/generate-my-voice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Generation failed');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      setStatus('Generation complete!');
      
      // Get diagnostics from headers
      const generationTime = response.headers.get('X-Generation-Time');
      const audioDuration = response.headers.get('X-Audio-Duration');
      const rtf = response.headers.get('X-Realtime-Factor');
      const profileId = response.headers.get('X-Profile-ID');
      
      if (generationTime || audioDuration) {
        setStatus(`Generation complete! (${generationTime}s, ${audioDuration}s audio)`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
      setStatus('');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">LOCAL VOICE FACTORY</h1>
          <p className="text-slate-400">Text-to-speech with your cloned voice</p>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700">
          {/* Voice Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-3">VOICE</label>
            <div className="flex items-center gap-3 p-4 bg-slate-700/50 rounded-lg border border-slate-600">
              <div className="w-4 h-4 rounded-full bg-green-500" />
              <span className="text-white font-medium">MY VOICE</span>
              <span className="text-slate-400 text-sm ml-auto">pending review</span>
            </div>
          </div>

          {/* Text Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-3">TEXT</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste what you want me to say..."
              className="w-full h-48 p-4 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              disabled={isGenerating}
            />
          </div>

          {/* Generate Button */}
          <button
            onClick={generate}
            disabled={isGenerating || !text.trim()}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? 'GENERATING...' : 'GENERATE'}
          </button>

          {/* Status */}
          {status && (
            <div className="mt-4 text-center text-sm text-slate-300">
              {status}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Audio Output */}
          {audioUrl && (
            <div className="mt-8 pt-8 border-t border-slate-700">
              <label className="block text-sm font-medium text-slate-300 mb-3">GENERATED AUDIO</label>
              <audio
                controls
                src={audioUrl}
                className="w-full"
                onEnded={() => URL.revokeObjectURL(audioUrl)}
              />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="mt-6 text-center text-slate-500 text-sm">
          <p>Using Qwen3-TTS 1.7B Base • Zero-shot voice cloning</p>
        </div>
      </div>
    </div>
  );
}
