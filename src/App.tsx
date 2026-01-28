import { useState, useEffect, useRef, useCallback } from "react";
import "./App.css";
import BingoCage from "./components/BingoCage";

function App() {
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentNumber, setCurrentNumber] = useState<number | null>(() => {
    const saved = localStorage.getItem("currentNumber");
    return saved ? JSON.parse(saved) : null;
  });
  const [drawnNumbers, setDrawnNumbers] = useState<number[]>(() => {
    const saved = localStorage.getItem("drawnNumbers");
    return saved ? JSON.parse(saved) : [];
  });
  const [availableNumbers, setAvailableNumbers] = useState<number[]>(() => {
    const saved = localStorage.getItem("availableNumbers");
    return saved ? JSON.parse(saved) : Array.from({ length: 90 }, (_, i) => i + 1);
  });
  const audioContextRef = useRef<AudioContext | null>(null);

  // Khởi tạo Audio Context
  useEffect(() => {
    audioContextRef.current = new (
      window.AudioContext || (window as any).webkitAudioContext
    )();
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("currentNumber", JSON.stringify(currentNumber));
  }, [currentNumber]);

  useEffect(() => {
    localStorage.setItem("drawnNumbers", JSON.stringify(drawnNumbers));
  }, [drawnNumbers]);

  useEffect(() => {
    localStorage.setItem("availableNumbers", JSON.stringify(availableNumbers));
  }, [availableNumbers]);

  // Tạo một tiếng va chạm "tộc" ngắn - giống bóng nhựa đập vào khung
  const playCollisionSound = useCallback(() => {
    if (!audioContextRef.current || !isSpinning) return;

    const audioContext = audioContextRef.current;
    const now = audioContext.currentTime;

    // Tạo oscillator cho tiếng va chạm
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    // Sử dụng square wave để tạo âm sắc nhựa sắc, cứng
    oscillator.type = "square";

    // Tần số ngẫu nhiên trong khoảng cao (800-2500Hz) - giống tiếng nhựa va chạm
    const frequency = 800 + Math.random() * 1700;
    oscillator.frequency.setValueAtTime(frequency, now);

    // Connect oscillator -> gain -> destination
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Envelope cho tiếng va chạm: attack ngắn, decay nhanh
    const attackTime = 0.001; // Attack cực ngắn
    const decayTime = 0.04; // Decay nhanh
    const volume = 0.06 + Math.random() * 0.04; // Volume ngẫu nhiên 0.06-0.1

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(volume, now + attackTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.001,
      now + attackTime + decayTime,
    );

    // Start và stop oscillator
    oscillator.start(now);
    oscillator.stop(now + attackTime + decayTime + 0.01);
  }, [isSpinning]);

  // Callback khi có collision - sẽ được gọi từ BingoCage component
  const handleCollision = useCallback(() => {
    playCollisionSound();
  }, [playCollisionSound]);

  // Xử lý quay
  const handleSpin = () => {
    if (availableNumbers.length === 0) {
      alert("Đã hết số! Vui lòng Reset để chơi game mới.");
      return;
    }

    if (isSpinning) {
      // Dừng quay
      setIsSpinning(false);

      // Random một số từ các số còn lại
      const randomIndex = Math.floor(Math.random() * availableNumbers.length);
      const selectedNumber = availableNumbers[randomIndex];

      setCurrentNumber(selectedNumber);
      setDrawnNumbers((prev) =>
        [...prev, selectedNumber].sort((a, b) => a - b),
      );
      setAvailableNumbers((prev) =>
        prev.filter((num) => num !== selectedNumber),
      );
    } else {
      // Bắt đầu quay
      setIsSpinning(true);
      setCurrentNumber(null);
    }
  };

  // Reset game
  const handleReset = () => {
    setIsSpinning(false);
    setCurrentNumber(null);
    setDrawnNumbers([]);
    setAvailableNumbers(Array.from({ length: 90 }, (_, i) => i + 1));

    // Clear localStorage
    localStorage.removeItem("currentNumber");
    localStorage.removeItem("drawnNumbers");
    localStorage.removeItem("availableNumbers");
  };

  return (
    <div className="app">
      <h1 className="title">Game Quay Lồng Cầu Lô Tô</h1>

      <div className="game-container">
        {/* Lồng cầu với Matter.js physics */}
        <div className="bingo-cage-container">
          <BingoCage isSpinning={isSpinning} onCollision={handleCollision} />
          {
            !isSpinning && currentNumber !== null && (
              <div className="current-number">
                {currentNumber}
              </div>
            )
          }
        </div>

        {/* Thông tin */}
        <div className="info">
          <p>Số còn lại: {availableNumbers.length}/90</p>
          <p>Đã gọi: {drawnNumbers.length} số</p>
        </div>

        {/* Nút điều khiển */}
        <div className="controls">
          <button
            type="button"
            className={`btn-spin ${isSpinning ? "spinning" : ""}`}
            onClick={handleSpin}
            disabled={availableNumbers.length === 0 && !isSpinning}
          >
            {isSpinning ? "DỪNG" : "QUAY"}
          </button>
        </div>
      </div>

      {/* Danh sách số đã gọi */}
      <div className="drawn-numbers-container">
        <h2>Các số đã gọi</h2>
        <div className="drawn-numbers">
          {Array.from({ length: 90 }, (_, i) => i + 1).map((num) => (
            <div
              key={num}
              className={`drawn-number ${
                drawnNumbers.includes(num) ? "drawn" : "undrawn"
              }`}
            >
              {num}
            </div>
          ))}
        </div>
      </div>

      {/* Nút Reset ở dưới cùng */}
      <div className="reset-container">
        <button type="button" className="btn-reset" onClick={handleReset}>
          RESET
        </button>
      </div>
    </div>
  );
}

export default App;
