import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { Bot, ShieldCheck, Trash2, Sparkles } from "lucide-react";

type MousePoint = { x: number; y: number; t: number };

type DelbotProps = {
  minDataPoints?: number;
  onHumanVerified: () => void;
  onBotDetected: () => void;
  onCancel: () => void;
};

/* ------------------------------------------------------------------ */
/*  Generate a random verification code                               */
/* ------------------------------------------------------------------ */
function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return `HUMAN-${code}`;
}

/* ------------------------------------------------------------------ */
/*  Heuristic mouse-movement analysis                                 */
/* ------------------------------------------------------------------ */
function analyseMovements(points: MousePoint[]): {
  isHuman: boolean;
  confidence: number;
  details: string;
} {
  if (points.length < 10) {
    return { isHuman: false, confidence: 0, details: "Not enough data." };
  }

  const speeds: number[] = [];
  const angles: number[] = [];
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    const dt = (points[i].t - points[i - 1].t) || 1;
    speeds.push(Math.sqrt(dx * dx + dy * dy) / dt);
    angles.push(Math.atan2(dy, dx));
  }

  const avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
  const speedVar = speeds.reduce((a, b) => a + (b - avgSpeed) ** 2, 0) / speeds.length;
  const speedCV = avgSpeed > 0 ? Math.sqrt(speedVar) / avgSpeed : 0;

  let dirChanges = 0;
  for (let i = 1; i < angles.length; i++) {
    let diff = Math.abs(angles[i] - angles[i - 1]);
    if (diff > Math.PI) diff = 2 * Math.PI - diff;
    if (diff > 0.3) dirChanges++;
  }
  const dirChangeRate = dirChanges / angles.length;

  let jitterCount = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = Math.abs(points[i].x - points[i - 1].x);
    const dy = Math.abs(points[i].y - points[i - 1].y);
    if (dx <= 3 && dy <= 3 && dx + dy > 0) jitterCount++;
  }
  const jitterRate = jitterCount / (points.length - 1);

  const totalDist = speeds.reduce(
    (a, s, i) => a + s * ((points[i + 1].t - points[i].t) || 1),
    0
  );
  const displacement = Math.sqrt(
    (points[points.length - 1].x - points[0].x) ** 2 +
      (points[points.length - 1].y - points[0].y) ** 2
  );
  const straightness = totalDist > 0 ? displacement / totalDist : 1;

  let score = 0;
  if (speedCV > 0.4) score += 25;
  if (dirChangeRate > 0.25) score += 25;
  if (jitterRate > 0.05) score += 25;
  if (straightness < 0.6) score += 25;

  const isHuman = score >= 50;
  return {
    isHuman,
    confidence: score,
    details: isHuman
      ? `Human verified (${score}% confidence). Natural movement patterns confirmed.`
      : `Bot detected (${100 - score}% bot confidence). Movement is too uniform / linear.`,
  };
}

/* ------------------------------------------------------------------ */
/*  Draw metallic foil texture on a canvas                            */
/* ------------------------------------------------------------------ */
function drawFoil(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // Base silver gradient
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, "#c0c0c0");
  grad.addColorStop(0.3, "#e8e8e8");
  grad.addColorStop(0.5, "#a8a8a8");
  grad.addColorStop(0.7, "#d8d8d8");
  grad.addColorStop(1, "#b0b0b0");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Noise / grain overlay
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 40;
    data[i] = Math.min(255, Math.max(0, data[i] + noise));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
  }
  ctx.putImageData(imageData, 0, 0);

  // Subtle diagonal streaks
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1;
  for (let x = -h; x < w; x += 8) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + h, h);
    ctx.stroke();
  }
  ctx.restore();
}

/* ================================================================== */
export default function DelbotVerification({
  minDataPoints = 50,
  onHumanVerified,
  onBotDetected,
  onCancel,
}: DelbotProps) {
  const hiddenCode = useMemo(generateCode, []);
  const [points, setPoints] = useState<MousePoint[]>([]);
  const [result, setResult] = useState<{
    isHuman: boolean;
    confidence: number;
    details: string;
  } | null>(null);
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [codeRevealed, setCodeRevealed] = useState(false);
  const [isScratching, setIsScratching] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const foilReady = useRef(false);

  const CANVAS_W = 560;
  const CANVAS_H = 160;
  const SCRATCH_RADIUS = 28;
  const REVEAL_THRESHOLD = 0.45; // % of area scratched to "reveal"

  /* Paint the foil on mount */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    drawFoil(ctx, CANVAS_W, CANVAS_H);
    foilReady.current = true;
  }, []);

  /* Check how much foil has been scratched */
  const checkReveal = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const imageData = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H);
    const data = imageData.data;
    let transparent = 0;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] === 0) transparent++;
    }
    const ratio = transparent / (CANVAS_W * CANVAS_H);
    if (ratio >= REVEAL_THRESHOLD && !codeRevealed) {
      setCodeRevealed(true);
    }
  }, [codeRevealed]);

  /* Scratch under cursor */
  const scratch = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas || !foilReady.current || result) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_W / rect.width;
      const scaleY = CANVAS_H / rect.height;
      const x = (clientX - rect.left) * scaleX;
      const y = (clientY - rect.top) * scaleY;

      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.arc(x, y, SCRATCH_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";

      // Track point for movement analysis
      setPoints((prev) => [...prev, { x, y, t: Date.now() }]);
      checkReveal();
    },
    [result, checkReveal]
  );

  const handleMouseDown = useCallback(() => setIsScratching(true), []);
  const handleMouseUp = useCallback(() => setIsScratching(false), []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isScratching || result) return;
      scratch(e.clientX, e.clientY);
    },
    [isScratching, scratch, result]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (result) return;
      const touch = e.touches[0];
      if (touch) scratch(touch.clientX, touch.clientY);
    },
    [scratch, result]
  );

  /* Inject bot data (linear, uniform movement) */
  const handleInjectBot = () => {
    const now = Date.now();
    const botPts: MousePoint[] = [];
    for (let i = 0; i < minDataPoints + 10; i++) {
      botPts.push({ x: 100 + i * 5, y: 80 + i * 2, t: now + i * 16 });
    }
    setPoints(botPts);
    setResult(null);
    // Also scratch the foil programmatically so it looks scratched
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.globalCompositeOperation = "destination-out";
        for (const pt of botPts) {
          const sx = (pt.x / CANVAS_W) * CANVAS_W;
          const sy = (pt.y / CANVAS_H) * CANVAS_H;
          ctx.beginPath();
          ctx.arc(sx, sy, SCRATCH_RADIUS, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalCompositeOperation = "source-over";
      }
    }
    setCodeRevealed(true);
  };

  /* Clear / reset foil */
  const handleClear = () => {
    setPoints([]);
    setResult(null);
    setCodeRevealed(false);
    setIsScratching(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.globalCompositeOperation = "source-over";
    drawFoil(ctx, CANVAS_W, CANVAS_H);
  };

  /* Verify */
  const handleVerify = async () => {
    if (points.length < minDataPoints) return;
    setIsAnalysing(true);
    await new Promise((r) => setTimeout(r, 1200));
    const analysis = analyseMovements(points);
    setResult(analysis);
    setIsAnalysing(false);

    setTimeout(() => {
      if (analysis.isHuman) onHumanVerified();
      else onBotDetected();
    }, 2000);
  };

  const progress = Math.min(points.length / minDataPoints, 1);
  const enough = points.length >= minDataPoints;

  /* Status text */
  const statusText = isAnalysing
    ? "Verifying scratch pattern..."
    : result
    ? result.details
    : codeRevealed
    ? "Code Revealed. Verifying..."
    : "Scratch the foil to begin";

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-[#0f1631] to-[#1a1145] rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-indigo-500/20">
        {/* Header */}
        <div className="px-6 pt-6 pb-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            Delbot-Mouse AI Detection
          </h2>
          <p className="text-indigo-300/70 text-sm mt-1 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Scratch the foil to reveal the hidden code.
          </p>
        </div>

        <div className="px-6 pb-6 space-y-4">
          {/* Scratch card area */}
          <div
            ref={containerRef}
            className="relative rounded-xl overflow-hidden select-none"
            style={{ aspectRatio: `${CANVAS_W}/${CANVAS_H}` }}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onMouseMove={handleMouseMove}
            onTouchMove={handleTouchMove}
            onTouchStart={() => setIsScratching(true)}
            onTouchEnd={() => setIsScratching(false)}
          >
            {/* Background: starry / dark with hidden code */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#0a0e27] via-[#111638] to-[#0d1029] flex items-center justify-center">
              {/* Tiny star dots */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {Array.from({ length: 30 }).map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-0.5 h-0.5 bg-white/30 rounded-full"
                    style={{
                      left: `${(i * 37 + 11) % 100}%`,
                      top: `${(i * 53 + 7) % 100}%`,
                      opacity: 0.2 + Math.random() * 0.4,
                    }}
                  />
                ))}
              </div>
              {/* The hidden code */}
              <span
                className="text-4xl md:text-5xl font-extrabold tracking-widest select-none"
                style={{
                  background: "linear-gradient(135deg, #60a5fa 0%, #c084fc 50%, #60a5fa 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  textShadow: "0 0 40px rgba(96,165,250,0.3)",
                }}
              >
                {hiddenCode}
              </span>
            </div>

            {/* Canvas foil overlay (scratched away) */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full"
              style={{ cursor: isScratching ? "grabbing" : "grab" }}
            />
          </div>

          {/* Progress bar + controls */}
          <div className="flex items-center gap-3">
            {/* Data points + progress */}
            <div className="flex-1">
              <div className="flex items-baseline gap-1.5 mb-1.5">
                <span className="text-indigo-300/70 text-xs">Data Points:</span>
                <span className="text-white font-bold text-lg leading-none">
                  {points.length}
                </span>
                <span className="text-indigo-400/50 text-xs">/ {minDataPoints}</span>
              </div>
              <div className="h-1.5 bg-indigo-950/60 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-150"
                  style={{
                    width: `${progress * 100}%`,
                    background: enough
                      ? "linear-gradient(90deg,#22c55e,#16a34a)"
                      : "linear-gradient(90deg,#6366f1,#818cf8)",
                  }}
                />
              </div>
            </div>

            {/* Buttons */}
            <button
              type="button"
              onClick={handleInjectBot}
              className="flex items-center gap-1.5 bg-gradient-to-r from-orange-600 to-red-600 border border-orange-500/30 text-white text-sm px-3.5 py-2 rounded-lg hover:opacity-90 transition"
            >
              <Bot className="w-3.5 h-3.5" />
              Inject Bot Data
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="flex items-center gap-1.5 bg-indigo-950/50 border border-indigo-500/20 text-indigo-300 text-sm px-3.5 py-2 rounded-lg hover:bg-indigo-900/50 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>
            <button
              type="button"
              onClick={handleVerify}
              disabled={!enough || isAnalysing || !!result}
              className="text-sm px-4 py-2 rounded-lg font-medium transition disabled:opacity-40 disabled:cursor-not-allowed bg-indigo-600 text-white hover:bg-indigo-500"
            >
              {isAnalysing ? "Verifying..." : result ? "Done" : "Verify"}
            </button>
          </div>

          {/* Analysis result */}
          <div className="flex items-baseline gap-2">
            <span className="text-indigo-400/60 text-xs font-semibold uppercase tracking-wider shrink-0">
              Analysis Result
            </span>
            <span
              className={`text-sm font-medium ${
                result
                  ? result.isHuman
                    ? "text-green-400"
                    : "text-red-400"
                  : "text-indigo-200/80"
              }`}
            >
              {statusText}
            </span>
          </div>

          {/* Cancel */}
          <button
            type="button"
            onClick={onCancel}
            className="w-full text-center text-xs text-indigo-500/50 hover:text-indigo-300 transition py-1"
          >
            Cancel and go back
          </button>
        </div>
      </div>
    </div>
  );
}
