import { useEffect, useRef } from "react";
import Matter from "matter-js";

interface BingoCageProps {
  isSpinning: boolean;
  onCollision?: () => void;
}

const BingoCage = ({ isSpinning, onCollision }: BingoCageProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);
  const ballsRef = useRef<Matter.Body[]>([]);
  const cageBodiesRef = useRef<Matter.Body[]>([]);
  const visualRotationRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const spinSoundOscillatorRef = useRef<OscillatorNode | null>(null);
  const spinSoundGainRef = useRef<GainNode | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    console.log("Canvas found, initializing Matter.js...");

    // Initialize Audio Context for spinning sound
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioContextRef.current = new AudioContextClass();

    // Create engine
    const engine = Matter.Engine.create({
      gravity: { x: 0, y: 0.5, scale: 0.001 },
    });
    engineRef.current = engine;

    // Create renderer
    const render = Matter.Render.create({
      canvas: canvas,
      engine: engine,
      options: {
        width: 600,
        height: 600,
        wireframes: false,
        background: "transparent",
      },
    });

    // Create cage boundaries (circular cage) - STATIC, never moves
    const cageRadius = 240;
    const centerX = 300;
    const centerY = 300;
    const segments = 180; // Many segments to create a smooth circle
    const cageBodies: Matter.Body[] = [];

    // Create circular cage using overlapping static rectangles
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const x = centerX + Math.cos(angle) * cageRadius;
      const y = centerY + Math.sin(angle) * cageRadius;

      const segment = Matter.Bodies.rectangle(x, y, 30, 20, {
        isStatic: true,
        angle: angle + Math.PI / 2,
        render: {
          fillStyle: "#8B4513",
          strokeStyle: "#654321",
          lineWidth: 2,
        },
      });
      cageBodies.push(segment);
    }

    cageBodiesRef.current = cageBodies;

    // Create balls with numbers (1-90 for bingo)
    const balls: Matter.Body[] = [];
    const ballCount = 90;
    const ballRadius = 12;

    for (let i = 0; i < ballCount; i++) {
      const angle = (i / ballCount) * Math.PI * 2;
      const distance = Math.random() * (cageRadius - 80) + 30;
      const x = centerX + Math.cos(angle) * distance;
      const y = centerY + Math.sin(angle) * distance;

      const ball = Matter.Bodies.circle(x, y, ballRadius, {
        restitution: 0.7,
        friction: 0.05,
        frictionAir: 0.01,
        density: 0.002,
        label: `ball-${i + 1}`,
        render: {
          fillStyle: `hsl(${(i * 4) % 360}, 70%, 60%)`,
          strokeStyle: "#fff",
          lineWidth: 2,
        },
      });

      balls.push(ball);
    }

    ballsRef.current = balls;

    // Add all bodies to the world
    Matter.Composite.add(engine.world, [...cageBodies, ...balls]);

    // Run the engine and renderer
    const runner = Matter.Runner.create();
    runnerRef.current = runner;
    Matter.Runner.run(runner, engine);
    Matter.Render.run(render);

    console.log("Matter.js initialized successfully");

    // Collision detection
    Matter.Events.on(engine, "collisionStart", (event) => {
      event.pairs.forEach((pair) => {
        const { bodyA, bodyB } = pair;
        if (
          (bodyA.label?.startsWith("ball-") ||
            bodyB.label?.startsWith("ball-")) &&
          onCollision
        ) {
          onCollision();
        }
      });
    });

    // Custom rendering for numbers on balls and rotating grid
    Matter.Events.on(render, "afterRender", () => {
      const context = canvas.getContext("2d");
      if (!context) return;

      // Draw rotating vertical bars to show cage rotation
      const barCount = 8;
      context.save();
      context.translate(centerX, centerY);
      context.rotate(visualRotationRef.current);

      for (let i = 0; i < barCount; i++) {
        const angle = (i / barCount) * Math.PI * 2;
        const x = Math.cos(angle) * cageRadius;
        const y = Math.sin(angle) * cageRadius;

        context.strokeStyle = "#A0522D";
        context.lineWidth = 3;
        context.beginPath();
        context.moveTo(x * 0.85, y * 0.85);
        context.lineTo(x * 1.05, y * 1.05);
        context.stroke();
      }
      context.restore();

      // Draw numbers on balls
      balls.forEach((ball, index) => {
        const { x, y } = ball.position;
        context.save();
        context.translate(x, y);
        context.rotate(ball.angle);

        // Draw number
        context.fillStyle = "#fff";
        context.font = "bold 12px Arial";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText((index + 1).toString(), 0, 0);

        context.restore();
      });
    });

    // Cleanup
    return () => {
      console.log("Cleaning up Matter.js...");
      Matter.Render.stop(render);
      if (runnerRef.current) {
        Matter.Runner.stop(runnerRef.current);
      }
      Matter.World.clear(engine.world, false);
      Matter.Engine.clear(engine);
      render.canvas = document.createElement("canvas");
      render.context = render.canvas.getContext("2d")!;
      render.textures = {};

      // Cleanup audio
      if (spinSoundOscillatorRef.current) {
        spinSoundOscillatorRef.current.stop();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [onCollision]);

  // Handle spinning sound effect
  useEffect(() => {
    if (!audioContextRef.current) return;

    if (isSpinning) {
      // Start spinning sound
      const audioContext = audioContextRef.current;

      // Create oscillator for rumbling sound
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(60, audioContext.currentTime); // Low rumbling frequency

      // Connect nodes
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Start with 0 volume and fade in
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.08, audioContext.currentTime + 1);

      oscillator.start();

      spinSoundOscillatorRef.current = oscillator;
      spinSoundGainRef.current = gainNode;
    } else {
      // Fade out and stop spinning sound
      if (spinSoundGainRef.current && spinSoundOscillatorRef.current && audioContextRef.current) {
        const audioContext = audioContextRef.current;
        const gainNode = spinSoundGainRef.current;
        const oscillator = spinSoundOscillatorRef.current;

        // Fade out
        gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.8);

        // Stop after fade out
        setTimeout(() => {
          try {
            oscillator.stop();
          } catch {
            // Oscillator may already be stopped
          }
          spinSoundOscillatorRef.current = null;
          spinSoundGainRef.current = null;
        }, 900);
      }
    }

    return () => {
      // Cleanup on unmount
      const oscillator = spinSoundOscillatorRef.current;
      if (oscillator) {
        try {
          oscillator.stop();
        } catch {
          // Already stopped
        }
      }
    };
  }, [isSpinning]);

  // Handle spinning - cage NEVER moves, only balls are affected
  useEffect(() => {
    if (!engineRef.current || ballsRef.current.length === 0) return;

    let animationFrameId: number;
    let rotationAngle = 0;
    let speedMultiplier = 0; // Starts at 0, gradually increases/decreases

    const spin = () => {
      if (isSpinning) {
        // Gradually increase speed when starting (0 -> 1)
        speedMultiplier = Math.min(speedMultiplier + 0.01, 1);
      } else {
        // Gradually decrease speed when stopping (1 -> 0)
        speedMultiplier = Math.max(speedMultiplier - 0.015, 0);
      }

      if (speedMultiplier > 0) {
        // Increment rotation angle based on speed multiplier
        rotationAngle += 0.03 * speedMultiplier;

        // Update visual rotation (for grid display)
        visualRotationRef.current = rotationAngle;

        // Simulate gravity rotating around the cage
        const gravityStrength = 0.8 * speedMultiplier;
        const gravityX = Math.cos(rotationAngle) * gravityStrength;
        const gravityY = Math.sin(rotationAngle) * gravityStrength;

        if (engineRef.current) {
          engineRef.current.gravity.x = gravityX;
          engineRef.current.gravity.y = gravityY;
        }

        // Update spinning sound frequency based on speed
        if (spinSoundOscillatorRef.current && audioContextRef.current) {
          const baseFreq = 60;
          const maxFreq = 120;
          const targetFreq = baseFreq + (maxFreq - baseFreq) * speedMultiplier;
          spinSoundOscillatorRef.current.frequency.linearRampToValueAtTime(
            targetFreq,
            audioContextRef.current.currentTime + 0.1
          );
        }

        // Apply additional tumbling forces to balls (scales with speed)
        ballsRef.current.forEach((ball) => {
          // Add small random forces for chaos
          if (Math.random() > 0.95) {
            const randomForce = 0.0005 * speedMultiplier;
            Matter.Body.applyForce(ball, ball.position, {
              x: (Math.random() - 0.5) * randomForce,
              y: (Math.random() - 0.5) * randomForce,
            });
          }
        });
      } else {
        // Fully stopped - reset gravity to normal
        if (engineRef.current) {
          engineRef.current.gravity.x = 0;
          engineRef.current.gravity.y = 0.5;
        }
      }

      animationFrameId = requestAnimationFrame(spin);
    };

    spin();

    return () => {
      cancelAnimationFrame(animationFrameId);
      // Reset gravity on cleanup
      if (engineRef.current) {
        engineRef.current.gravity.x = 0;
        engineRef.current.gravity.y = 0.5;
      }
    };
  }, [isSpinning]);

  return (
    <div className="flex justify-center items-center aspect-square w-full">
      <canvas
        ref={canvasRef}
        width={600}
        height={600}
        className="w-full h-full"
      />
    </div>
  );
};

export default BingoCage;
