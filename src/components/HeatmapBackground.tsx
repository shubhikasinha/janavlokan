"use client";

import { useEffect, useRef, useState } from 'react';

interface Hotspot {
    x: number;
    y: number;
    intensity: number;
    radius: number;
    velocity: { x: number; y: number };
}

interface HeatmapBackgroundProps {
    opacity?: number;
    className?: string;
}

// Generate hotspots outside component to avoid re-renders
function generateHotspots(): Hotspot[] {
    const count = 30;
    const spots: Hotspot[] = [];
    for (let i = 0; i < count; i++) {
        spots.push({
            x: Math.random() * 100,
            y: Math.random() * 100,
            intensity: 0.2 + Math.random() * 0.8,
            radius: 80 + Math.random() * 150,
            velocity: {
                x: (Math.random() - 0.5) * 0.015,
                y: (Math.random() - 0.5) * 0.015,
            }
        });
    }
    return spots;
}

export default function HeatmapBackground({ opacity = 0.15, className = "" }: HeatmapBackgroundProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [hotspots] = useState<Hotspot[]>(() => generateHotspots());

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        window.addEventListener('resize', resize);
        resize();

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            hotspots.forEach(spot => {
                spot.x += spot.velocity.x;
                spot.y += spot.velocity.y;

                if (spot.x < 0 || spot.x > 100) spot.velocity.x *= -1;
                if (spot.y < 0 || spot.y > 100) spot.velocity.y *= -1;

                const pixelX = (spot.x / 100) * canvas.width;
                const pixelY = (spot.y / 100) * canvas.height;

                const gradient = ctx.createRadialGradient(
                    pixelX, pixelY, 0,
                    pixelX, pixelY, spot.radius
                );

                const alpha = 0.12 * spot.intensity;
                // Using subsidy/fraud detection themed colors - red for alerts, green for safe
                gradient.addColorStop(0, `rgba(239, 68, 68, ${alpha})`);      // Red - high risk
                gradient.addColorStop(0.25, `rgba(249, 115, 22, ${alpha * 0.7})`); // Orange - medium risk
                gradient.addColorStop(0.5, `rgba(234, 179, 8, ${alpha * 0.4})`);   // Yellow - low risk
                gradient.addColorStop(0.75, `rgba(16, 185, 129, ${alpha * 0.25})`); // Emerald - safe
                gradient.addColorStop(1, `rgba(6, 182, 212, 0)`);              // Cyan fade

                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            });

            animationFrameId = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrameId);
        };
    }, [hotspots]);

    return (
        <div className={`fixed inset-0 z-0 pointer-events-none overflow-hidden ${className}`}>
            {/* Animated heatmap canvas */}
            <canvas
                ref={canvasRef}
                style={{ opacity }}
                className="w-full h-full"
            />
            
            {/* Scanline / HUD Grid Overlay */}
            <div
                style={{ opacity: 0.03 }}
                className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.02),rgba(0,255,0,0.01),rgba(0,0,255,0.02))] z-10 pointer-events-none bg-[length:100%_4px,3px_100%]"
            />

            {/* Static stylized grid overlay */}
            <svg
                style={{ opacity: 0.03 }}
                className="absolute inset-0 w-full h-full text-emerald-500"
                viewBox="0 0 1000 1000"
                preserveAspectRatio="none"
            >
                <path d="M0,200 L1000,200 M0,400 L1000,400 M0,600 L1000,600 M0,800 L1000,800" stroke="currentColor" strokeWidth="1" />
                <path d="M200,0 L200,1000 M400,0 L400,1000 M600,0 L600,1000 M800,0 L800,1000" stroke="currentColor" strokeWidth="1" />
                <path d="M100,100 L900,900 M100,900 L900,100" stroke="currentColor" strokeWidth="0.5" />
            </svg>

            {/* Subtle vignette effect */}
            <div 
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.3) 100%)'
                }}
            />
        </div>
    );
}
