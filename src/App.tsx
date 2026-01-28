import { useState, useEffect, useRef, useCallback } from "react";
import BingoCage from "./components/BingoCage";
import { NumberTable } from "./components/NumberTable";

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
  const lastThreeNumbers = drawnNumbers.slice(-4).slice(0, 3);
  const [availableNumbers, setAvailableNumbers] = useState<number[]>(() => {
    const saved = localStorage.getItem("availableNumbers");
    return saved
      ? JSON.parse(saved)
      : Array.from({ length: 90 }, (_, i) => i + 1);
  });
  const audioContextRef = useRef<AudioContext | null>(null);

  // Khởi tạo Audio Context
  useEffect(() => {
    const AudioContextClass =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    audioContextRef.current = new AudioContextClass();
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
      setDrawnNumbers((prev) => [...prev, selectedNumber]);
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
    localStorage.removeItem("numberTableMatrix");
  };

  return (
    <div className="min-h-screen px-4 md:px-8 lg:px-12 text-center bg-linear-to-br from-crimson to-dark-red overflow-x-hidden py-8 pb-24">
      <h1 className="text-gold text-3xl md:text-4xl lg:text-5xl mb-4 md:mb-8 font-bold text-shadow-title">
        Đoàn Lô Tô
      </h1>

      <div className="max-w-[600px] mx-auto mb-8 md:mb-12 bg-linear-to-b from-[#fffef0] to-[#fff8dc] rounded-[20px] p-6 md:p-12 border-[3px] border-gold box-shadow-container">
        {/* Lồng cầu với Matter.js physics */}
        <div className="relative w-[clamp(250px,70vw,300px)] aspect-square max-w-full mx-auto mb-6 md:mb-8">
          <BingoCage isSpinning={isSpinning} onCollision={handleCollision} />
          {!isSpinning && currentNumber !== null && (
            <div className="current-number absolute inset-0 text-5xl md:text-7xl lg:text-8xl font-bold text-crimson text-shadow-number animation-pop-in z-[1000] flex items-center justify-center pointer-events-none backdrop-blur-xs rounded-full overflow-hidden bg-radial from-gold/60 to-transparent">
              {currentNumber}
            </div>
          )}
        </div>

        {/* Thông tin */}
        <div className="flex justify-around flex-wrap gap-4 my-6 md:my-8 text-base md:text-lg text-dark-red">
          <p className="m-0 font-semibold">
            Số còn lại: {availableNumbers.length}/90
          </p>
          <p className="m-0 font-semibold">Đã gọi: {drawnNumbers.length} số</p>
        </div>
      </div>

      {/* Danh sách số đã gọi */}
      <div className="max-w-[1200px] mx-auto bg-linear-to-b from-[#fffef0] to-[#fff8dc] rounded-[20px] p-6 md:p-8 border-[3px] border-gold box-shadow-container">
        <h2 className="text-crimson text-2xl md:text-3xl mb-4 md:mb-6 font-bold text-shadow-subtitle">
          Các số đã gọi
        </h2>
        <div className="grid grid-cols-5 md:grid-cols-10 gap-2 md:gap-4 p-2 md:p-4">
          {Array.from({ length: 90 }, (_, i) => i + 1).map((num) => (
            <div
              key={num}
              className={`aspect-square flex items-center justify-center bg-linear-to-br from-crimson to-dark-red text-gold text-base md:text-lg lg:text-xl font-bold rounded-full border-2 border-gold transition-all duration-300 box-shadow-ball ${
                drawnNumbers.includes(num)
                  ? "opacity-100 animate-fade-in"
                  : "opacity-30"
              }`}
            >
              {num}
            </div>
          ))}
        </div>
      </div>

      {/* Nút Reset ở dưới cùng */}
      <div className="mt-8 md:mt-12 pb-6 md:pb-8 flex justify-center">
        <button
          type="button"
          className="px-8 md:px-12 py-3 md:py-4 text-base md:text-xl font-bold border-none rounded-full cursor-pointer uppercase tracking-wider min-w-[120px] min-h-[44px] bg-linear-to-br from-gold to-orange-600 text-dark-red border-2 border-crimson transition-all duration-300 hover:-translate-y-0.5 hover:box-shadow-button-hover w-[90%] md:w-auto max-w-75 box-shadow-button"
          onClick={handleReset}
        >
          RESET
        </button>
      </div>

      <NumberTable drawnNumbers={drawnNumbers} />

      {/* Nút điều khiển */}
      <div className="flex gap-3 items-center justify-between md:gap-4 fixed z-10 bottom-0 left-0 right-0 bg-gold p-3 shadow">
        <div className="flex items-center">
          {isSpinning ? (
            <div className="animate-spin text-xl aspect-square w-12 flex items-center justify-center">😂</div>
          ) : (
            currentNumber && <div className="text-crimson text-xl font-bold aspect-square p-2 rounded-full border-crimson border-2 w-12 animate-pop-in transition-all">
              {currentNumber ?? ""}
            </div>
          )}
          {lastThreeNumbers.length > 0 && (
            <div className="mt-1 text-sm text-dark-red font-semibold flex items-center">
              {lastThreeNumbers.reverse().map((num) => (
                <span
                  key={num}
                  className="flex items-center justify-center aspect-square w-8 "
                >
                  {num}
                </span>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          className={`px-8 md:px-12 py-3 md:py-4 text-base md:text-xl font-bold border-none rounded-full cursor-pointer uppercase tracking-wider min-w-[120px] min-h-[44px] transition-all duration-300 ${
            isSpinning
              ? "bg-linear-to-br from-gold to-orange-500 text-dark-red animate-pulse box-shadow-button-gold"
              : "bg-linear-to-br from-crimson to-dark-red text-gold border-2 border-gold hover:enabled:-translate-y-0.5 hover:enabled:box-shadow-button-hover disabled:opacity-50 disabled:cursor-not-allowed box-shadow-button"
          }`}
          onClick={handleSpin}
          disabled={availableNumbers.length === 0 && !isSpinning}
        >
          {isSpinning ? "DỪNG" : "QUAY"}
        </button>
      </div>
    </div>
  );
}

export default App;
