import React, { useRef, useState, useEffect } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  RotateCcw,
  FastForward,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Youtube,
  Film
} from 'lucide-react';

export interface VideoPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  onEnded?: () => void;
  className?: string;
}

// Reliable, verified public video stream for educational demos
const RELIABLE_FALLBACK_VIDEO = 'https://vjs.zencdn.net/v/oceans.mp4';
const SECONDARY_FALLBACK_VIDEO = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';

interface ParsedSource {
  type: 'youtube' | 'vimeo' | 'html5';
  embedUrl?: string;
  directUrl: string;
  videoId?: string;
}

function parseVideoSource(rawUrl: string): ParsedSource {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return {
      type: 'html5',
      directUrl: RELIABLE_FALLBACK_VIDEO
    };
  }

  const trimmed = rawUrl.trim();

  // If pointing to the deprecated/forbidden gtv-videos-bucket sample
  if (trimmed.includes('commondatastorage.googleapis.com/gtv-videos-bucket')) {
    return {
      type: 'html5',
      directUrl: RELIABLE_FALLBACK_VIDEO
    };
  }

  // YouTube parser (supports youtu.be, youtube.com/watch?v=, youtube.com/embed/, youtube.com/shorts/)
  const ytRegex = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/;
  const ytMatch = trimmed.match(ytRegex);
  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    return {
      type: 'youtube',
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=0&rel=0&modestbranding=1&enablejsapi=1`,
      directUrl: trimmed,
      videoId
    };
  }

  // Vimeo parser
  const vimeoRegex = /(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/;
  const vimeoMatch = trimmed.match(vimeoRegex);
  if (vimeoMatch && vimeoMatch[1]) {
    const videoId = vimeoMatch[1];
    return {
      type: 'vimeo',
      embedUrl: `https://player.vimeo.com/video/${videoId}?title=0&byline=0&portrait=0`,
      directUrl: trimmed,
      videoId
    };
  }

  return {
    type: 'html5',
    directUrl: trimmed
  };
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  poster,
  title,
  onEnded,
  className = '',
}) => {
  const parsed = parseVideoSource(src);
  const [activeDirectUrl, setActiveDirectUrl] = useState<string>(parsed.directUrl);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Update active source if prop changes
  useEffect(() => {
    const newParsed = parseVideoSource(src);
    setActiveDirectUrl(newParsed.directUrl);
    setHasError(false);
    setErrorMessage(null);
  }, [src]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    if (parsed.type !== 'html5') return;

    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleLoadedMetadata = () => {
      setDuration(video.duration || 0);
      setHasError(false);
    };
    const handleEnded = () => {
      setIsPlaying(false);
      setIsCompleted(true);
      onEnded?.();
    };
    const handleError = () => {
      setHasError(true);
      setIsPlaying(false);
      setErrorMessage('A URL do vídeo não pôde ser carregada pelo navegador (bloqueio de acesso ou arquivo indisponível).');
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleError);
    };
  }, [parsed.type, onEnded, activeDirectUrl]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          setHasError(false);
        })
        .catch((err) => {
          console.warn('Playback error:', err);
          if (videoRef.current?.error) {
            setHasError(true);
          }
        });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const cyclePlaybackRate = () => {
    const rates = [1, 1.25, 1.5, 2];
    const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (videoRef.current) {
      videoRef.current.playbackRate = nextRate;
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen?.();
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSwitchToDemo = (fallbackUrl: string) => {
    setActiveDirectUrl(fallbackUrl);
    setHasError(false);
    setErrorMessage(null);
    if (videoRef.current) {
      videoRef.current.src = fallbackUrl;
      videoRef.current.load();
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  // --- Render YouTube / Vimeo Embed ---
  if (parsed.type === 'youtube' || parsed.type === 'vimeo') {
    return (
      <div
        ref={containerRef}
        className={`relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-xl group ${className}`}
      >
        {/* Title bar */}
        {title && (
          <div className="flex items-center justify-between p-3.5 bg-slate-900 border-b border-slate-800 text-white text-xs">
            <div className="flex items-center gap-2 truncate">
              {parsed.type === 'youtube' ? (
                <Youtube className="w-4 h-4 text-red-500 shrink-0" />
              ) : (
                <Film className="w-4 h-4 text-sky-400 shrink-0" />
              )}
              <span className="font-semibold truncate">{title}</span>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={parsed.directUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1 text-[11px] text-slate-300 hover:text-white bg-white/10 px-2 py-1 rounded-md transition-colors"
              >
                <span>Abrir no {parsed.type === 'youtube' ? 'YouTube' : 'Vimeo'}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              {onEnded && (
                <button
                  onClick={() => {
                    setIsCompleted(true);
                    onEnded();
                  }}
                  className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md font-medium transition-colors ${
                    isCompleted
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  <CheckCircle className="w-3 h-3" />
                  {isCompleted ? 'Concluído' : 'Marcar como visto'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Responsive Iframe */}
        <div className="relative w-full aspect-video bg-black">
          <iframe
            src={parsed.embedUrl}
            title={title || 'Player de Videoaula'}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      </div>
    );
  }

  // --- Render HTML5 Video Player ---
  return (
    <div
      ref={containerRef}
      className={`relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-xl group select-none ${className}`}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* Fallback / Error Overlay */}
      {hasError ? (
        <div className="w-full aspect-video bg-slate-900 flex flex-col items-center justify-center p-6 text-center text-white">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-3 border border-amber-500/30">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h4 className="text-sm font-semibold text-white mb-1">
            Não foi possível reproduzir este vídeo diretamente
          </h4>
          <p className="text-xs text-slate-400 max-w-md mb-4 leading-relaxed">
            {errorMessage || 'A URL original retornou erro 403/bloqueio pelo servidor de hospedagem.'}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => handleSwitchToDemo(RELIABLE_FALLBACK_VIDEO)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Carregar Vídeo Demo (Oceans MP4)
            </button>
            <button
              onClick={() => handleSwitchToDemo(SECONDARY_FALLBACK_VIDEO)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
            >
              <Film className="w-3.5 h-3.5" />
              Demo 2 (MDN Flower)
            </button>
            {activeDirectUrl && (
              <a
                href={activeDirectUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white text-xs font-medium transition-colors"
              >
                <span>Abrir URL original</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      ) : (
        <video
          ref={videoRef}
          src={activeDirectUrl}
          poster={poster}
          className="w-full h-full object-contain cursor-pointer aspect-video bg-black"
          onClick={togglePlay}
          playsInline
        />
      )}

      {/* Play/Pause Overlay indicator */}
      {!isPlaying && !hasError && (
        <div
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/35 cursor-pointer transition-opacity"
        >
          <div className="w-16 h-16 rounded-full bg-blue-600/90 text-white flex items-center justify-center shadow-lg hover:bg-blue-600 hover:scale-105 transition-all">
            <Play className="w-8 h-8 ml-1" />
          </div>
        </div>
      )}

      {/* Top Title Bar */}
      {title && !hasError && (
        <div
          className={`absolute top-0 inset-x-0 p-4 bg-gradient-to-b from-black/85 via-black/40 to-transparent transition-opacity duration-200 ${
            showControls ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="flex items-center justify-between text-white">
            <span className="text-sm font-semibold truncate drop-shadow-xs">{title}</span>
            {isCompleted && (
              <span className="inline-flex items-center gap-1 text-xs bg-emerald-500/30 text-emerald-300 border border-emerald-400/40 px-2.5 py-0.5 rounded-full font-medium">
                <CheckCircle className="w-3.5 h-3.5" /> Concluído
              </span>
            )}
          </div>
        </div>
      )}

      {/* Bottom Controls Bar */}
      {!hasError && (
        <div
          className={`absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/95 via-black/60 to-transparent transition-opacity duration-200 ${
            showControls ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {/* Progress Bar */}
          <div className="flex items-center gap-3 mb-3">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1.5 bg-white/25 rounded-lg appearance-none cursor-pointer accent-blue-500 focus:outline-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between text-white text-xs">
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlay}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>

              <button
                onClick={() => {
                  if (videoRef.current) {
                    videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
                  }
                }}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-slate-300 hover:text-white"
                title="Voltar 10s"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* Volume */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={toggleMute}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-slate-300 hover:text-white"
                >
                  {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-16 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              {/* Time display */}
              <span className="text-slate-300 font-mono text-[11px] ml-2">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Speed */}
              <button
                onClick={cyclePlaybackRate}
                className="px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 font-bold transition-colors text-[11px] flex items-center gap-1"
                title="Velocidade de reprodução"
              >
                <FastForward className="w-3 h-3" /> {playbackRate}x
              </button>

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-slate-300 hover:text-white"
                title="Tela Cheia"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
