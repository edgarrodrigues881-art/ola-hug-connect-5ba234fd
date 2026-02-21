import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, Mic } from "lucide-react";

interface AudioPlayerProps {
  src: string;
  fromMe: boolean;
  isPtt?: boolean;
}

const AudioPlayer = ({ src, fromMe, isPtt }: AudioPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const formatTime = (s: number) => {
    if (!s || !isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoaded = () => {
      setDuration(audio.duration);
      setLoaded(true);
    };
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onEnded = () => { setIsPlaying(false); setCurrentTime(0); };

    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = pct * duration;
    setCurrentTime(audio.currentTime);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-2 min-w-[220px] max-w-[280px] py-1 px-1">
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* PTT mic icon */}
      {isPtt && (
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
          fromMe ? "bg-primary-foreground/20" : "bg-primary/10"
        }`}>
          <Mic className={`w-4 h-4 ${fromMe ? "text-primary-foreground" : "text-primary"}`} />
        </div>
      )}

      {/* Play/Pause button */}
      <button
        onClick={togglePlay}
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
          fromMe
            ? "bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground"
            : "bg-primary/10 hover:bg-primary/20 text-primary"
        }`}
      >
        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
      </button>

      {/* Waveform / progress */}
      <div className="flex-1 min-w-0 space-y-1">
        <div
          className="relative h-[6px] rounded-full cursor-pointer overflow-hidden"
          style={{ backgroundColor: fromMe ? "hsla(var(--primary-foreground) / 0.2)" : "hsla(var(--muted) / 0.8)" }}
          onClick={handleSeek}
        >
          {/* Waveform bars (decorative) */}
          <div className="absolute inset-0 flex items-center gap-[2px] px-0.5">
            {Array.from({ length: 28 }).map((_, i) => {
              const h = [3, 5, 4, 6, 3, 5, 6, 4, 5, 3, 6, 4, 5, 3, 4, 6, 5, 3, 4, 6, 5, 4, 3, 5, 6, 4, 3, 5][i];
              const barProgress = (i / 28) * 100;
              return (
                <div
                  key={i}
                  className="rounded-full flex-1 transition-colors"
                  style={{
                    height: `${h}px`,
                    backgroundColor: barProgress < progress
                      ? fromMe ? "hsl(var(--primary-foreground))" : "hsl(var(--primary))"
                      : fromMe ? "hsla(var(--primary-foreground) / 0.3)" : "hsla(var(--muted-foreground) / 0.3)",
                  }}
                />
              );
            })}
          </div>
        </div>
        <span className={`text-[10px] ${fromMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
          {isPlaying || currentTime > 0 ? formatTime(currentTime) : formatTime(duration)}
        </span>
      </div>
    </div>
  );
};

export default AudioPlayer;
