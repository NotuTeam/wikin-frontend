import { useEffect, useRef } from "react";

const DURATION = 400;
const DELAY = 100;
const PAUSE = 3000;

function easeOutBack(t: number) {
  const c1 = 1.70158,
    c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function easeInCubic(t: number) {
  return t * t * t;
}

type RectConfig = {
  ref: React.RefObject<SVGRectElement | null>;
  baseY: number;
  targetH: number;
  fromBottom: boolean;
};

export default function AnimatedWLogo({
  size = 96,
  classname,
}: {
  size?: number;
  classname?: string;
}) {
  const r1 = useRef<SVGRectElement>(null);
  const r2 = useRef<SVGRectElement>(null);
  const r3 = useRef<SVGRectElement>(null);
  const r4 = useRef<SVGRectElement>(null);

  useEffect(() => {
    const rects: RectConfig[] = [
      { ref: r1, baseY: 17, targetH: 44, fromBottom: false },
      { ref: r2, baseY: 10, targetH: 48, fromBottom: true },
      { ref: r3, baseY: 16, targetH: 44, fromBottom: false },
      { ref: r4, baseY: 0, targetH: 50, fromBottom: true },
    ];

    let cancelled = false;

    function setRect(r: RectConfig, h: number) {
      const el = r.ref.current;
      if (!el) return;
      const safeH = Math.max(0, h);
      el.setAttribute("height", String(safeH));
      if (r.fromBottom)
        el.setAttribute("y", String(r.baseY + r.targetH - safeH));
    }

    function animateRect(r: RectConfig, forward: boolean): Promise<void> {
      return new Promise((resolve) => {
        const start = performance.now();
        function tick(now: number) {
          if (cancelled) return resolve();
          const t = Math.min((now - start) / DURATION, 1);
          const h = forward
            ? easeOutBack(t) * r.targetH
            : (1 - easeInCubic(t)) * r.targetH;
          setRect(r, h);
          if (t < 1) requestAnimationFrame(tick);
          else resolve();
        }
        requestAnimationFrame(tick);
      });
    }

    function wait(ms: number): Promise<void> {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }

    function runPhase(list: RectConfig[], forward: boolean): Promise<void> {
      return new Promise((resolve) => {
        let done = 0;
        list.forEach((r, i) => {
          setTimeout(() => {
            animateRect(r, forward).then(() => {
              done++;
              if (done === list.length) resolve();
            });
          }, i * DELAY);
        });
      });
    }

    async function loop() {
      while (!cancelled) {
        await runPhase(rects, true);
        await wait(PAUSE);
        await runPhase([...rects].reverse(), false);
        await wait(PAUSE / 2);
      }
    }

    loop();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <svg
      className={classname}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        ref={r4}
        x="72"
        y="0"
        width="16"
        height="0"
        rx="8"
        fill="#5d3fd3"
        transform="rotate(20 66 33)"
      />
      <rect
        ref={r3}
        x="62"
        y="16"
        width="16"
        height="0"
        rx="8"
        fill="#44289e"
        transform="rotate(-25 60 36)"
      />
      <rect
        ref={r2}
        x="50"
        y="10"
        width="16"
        height="0"
        rx="8"
        fill="#5d3fd3"
        transform="rotate(20 52 36)"
      />
      <rect
        ref={r1}
        x="36"
        y="17"
        width="16"
        height="0"
        rx="8"
        fill="#44289e"
        transform="rotate(-25 46 34)"
      />
    </svg>
  );
}
