"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import styles from "./page.module.css";

type TimerState = "idle" | "work" | "break" | "paused";

// 休憩時間BGMプリセット（リラックス系）
const BREAK_BGM_PRESETS = [
  { id: "acoustic07", name: "Acoustic 07", url: "/audio/break/maou_bgm_acoustic07.mp3" },
  { id: "acoustic16", name: "Acoustic 16", url: "/audio/break/maou_bgm_acoustic16.mp3" },
  { id: "acoustic29", name: "Acoustic 29", url: "/audio/break/maou_bgm_acoustic29.mp3" },
  { id: "acoustic38", name: "Acoustic 38", url: "/audio/break/maou_bgm_acoustic38.mp3" },
  { id: "acoustic41", name: "Acoustic 41", url: "/audio/break/maou_bgm_acoustic41.mp3" },
  { id: "acoustic42", name: "Acoustic 42", url: "/audio/break/maou_bgm_acoustic42.mp3" },
  { id: "acoustic50", name: "Acoustic 50", url: "/audio/break/maou_bgm_acoustic50.mp3" },
  { id: "silence", name: "無音", url: "" },
] as const;

// 作業中BGMプリセット（集中系）
const WORK_BGM_PRESETS = [
  { id: "white_noise", name: "White Noise（作業用）", url: "/audio/work/white-niose.mp3" },
  { id: "brown_noise", name: "Brown Noise（作業用）", url: "/audio/work/soft-brown-noise-299934.mp3" },
  { id: "silence", name: "無音", url: "" },
] as const;

// 休憩BGMの音楽プリセット（無音を除く）
const BREAK_MUSIC_IDS = BREAK_BGM_PRESETS.filter((p) => p.id !== "silence").map((p) => p.id);

function getRandomBreakBgmId(): string {
  return BREAK_MUSIC_IDS[Math.floor(Math.random() * BREAK_MUSIC_IDS.length)];
}

export default function Home() {
  // タイマー設定
  const [workTime, setWorkTime] = useState(50);
  const [breakTime, setBreakTime] = useState(5);
  const [totalSets, setTotalSets] = useState(8);

  // タイマー状態
  const [timerState, setTimerState] = useState<TimerState>("idle");
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  // 一時停止前の状態を保持
  const pausedFromRef = useRef<"work" | "break">("work");

  // セット管理
  const [currentSet, setCurrentSet] = useState(0);

  // BGM設定
  const [selectedBreakBgm, setSelectedBreakBgm] = useState(getRandomBreakBgmId);
  const [selectedWorkBgm, setSelectedWorkBgm] = useState("white_noise");
  const [workBgmVolume, setWorkBgmVolume] = useState(1);
  const [breakBgmVolume, setBreakBgmVolume] = useState(2);
  const [audioError, setAudioError] = useState("");
  const [isWorkBgmTestPlaying, setIsWorkBgmTestPlaying] = useState(false);
  const [isBreakBgmTestPlaying, setIsBreakBgmTestPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // 音声再生
  const playAudio = useCallback((url: string, volume: number) => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    audioRef.current.src = url;
    audioRef.current.volume = volume / 100;
    audioRef.current.play().then(() => setAudioError("")).catch(() => setAudioError("音声の再生に失敗しました。"));
  }, []);

  const stopAudio = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
  }, []);

  // BGM再生（無音以外）
  const playBgm = useCallback(
    (presets: readonly { id: string; url: string }[], selectedId: string, volume: number) => {
      if (selectedId === "silence") return;
      const preset = presets.find((p) => p.id === selectedId);
      if (preset?.url) playAudio(preset.url, volume);
    },
    [playAudio]
  );

  // 音量調整
  const updateVolume = useCallback((volume: number) => {
    if (audioRef.current) audioRef.current.volume = volume / 100;
  }, []);

  // BGMテスト停止
  const stopBgmTest = useCallback(
    (setter: (v: boolean) => void) => {
      stopAudio();
      setter(false);
    },
    [stopAudio]
  );

  // BGM選択ハンドラー
  const handleBgmSelection = useCallback(
    (presetId: string, setter: (v: string) => void) => {
      setter(presetId);
      setAudioError("");
      stopAudio();
    },
    [stopAudio]
  );

  // タイマー参照
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // タイマー開始
  const startWorkTimer = useCallback(() => {
    const seconds = (workTime || 25) * 60;
    setTimeLeft(seconds);
    setTotalTime(seconds);
    setTimerState("work");
    setCurrentSet(1);
    playBgm(WORK_BGM_PRESETS, selectedWorkBgm, workBgmVolume);
  }, [workTime, selectedWorkBgm, workBgmVolume, playBgm]);

  const startBreakTimer = useCallback(() => {
    const seconds = (breakTime || 5) * 60;
    setTimeLeft(seconds);
    setTotalTime(seconds);
    setTimerState("break");
    playBgm(BREAK_BGM_PRESETS, selectedBreakBgm, breakBgmVolume);
  }, [breakTime, selectedBreakBgm, breakBgmVolume, playBgm]);

  const startNextSet = useCallback(() => {
    setCurrentSet((prev) => prev + 1);
    const seconds = (workTime || 25) * 60;
    setTimeLeft(seconds);
    setTotalTime(seconds);
    setTimerState("work");
    playBgm(WORK_BGM_PRESETS, selectedWorkBgm, workBgmVolume);
  }, [workTime, selectedWorkBgm, workBgmVolume, playBgm]);

  const pauseTimer = useCallback(() => {
    // 一時停止前の状態を記録
    if (timerState === "work" || timerState === "break") {
      pausedFromRef.current = timerState;
    }
    setTimerState("paused");
    stopAudio();
  }, [timerState, stopAudio]);

  const resumeTimer = useCallback(() => {
    if (timeLeft <= 0) return;
    const previousState = pausedFromRef.current;
    setTimerState(previousState);

    if (previousState === "work") {
      playBgm(WORK_BGM_PRESETS, selectedWorkBgm, workBgmVolume);
    } else {
      playBgm(BREAK_BGM_PRESETS, selectedBreakBgm, breakBgmVolume);
    }
  }, [timeLeft, selectedWorkBgm, workBgmVolume, selectedBreakBgm, breakBgmVolume, playBgm]);

  const resetTimer = useCallback(() => {
    setTimerState("idle");
    setTimeLeft(0);
    setTotalTime(0);
    setCurrentSet(0);
    stopAudio();
  }, [stopAudio]);

  // バックグラウンドタイマー処理
  useEffect(() => {
    if (timerState !== "work" && timerState !== "break") {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerState === "work") {
            setTimeout(startBreakTimer, 100);
          } else if (currentSet < totalSets) {
            setTimeout(startNextSet, 100);
          } else {
            setTimerState("idle");
            setCurrentSet(0);
            stopAudio();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerState, startBreakTimer, startNextSet, currentSet, totalSets, stopAudio]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = totalTime === 0 ? 0 : ((totalTime - timeLeft) / totalTime) * 100;

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <h1 className={styles.title}>Pomodoro Timer</h1>

        {/* デジタル時計表示 */}
        <div className={styles.timerDisplay}>
          <div className={styles.timerState}>
            {timerState === "idle" && "待機中"}
            {timerState === "work" && `作業中 (${currentSet}/${totalSets})`}
            {timerState === "break" && `休憩中 (${currentSet}/${totalSets})`}
            {timerState === "paused" && "一時停止"}
          </div>
          {timerState !== "idle" && (
            <div className={styles.setProgress}>
              セット {currentSet} / {totalSets}
            </div>
          )}
          <div className={styles.digitalClock}>{formatTime(timeLeft)}</div>
          {(timerState === "work" || timerState === "break") && (
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>

        {/* 制御ボタン */}
        <div className={styles.controls}>
          {timerState === "idle" && (
            <button onClick={startWorkTimer} className={`${styles.button} ${styles.startButton}`}>
              作業開始
            </button>
          )}
          {(timerState === "work" || timerState === "break") && (
            <button onClick={pauseTimer} className={`${styles.button} ${styles.pauseButton}`}>
              一時停止
            </button>
          )}
          {timerState === "paused" && (
            <button onClick={resumeTimer} className={`${styles.button} ${styles.resumeButton}`}>
              再開
            </button>
          )}
          {timerState !== "idle" && (
            <button onClick={resetTimer} className={`${styles.button} ${styles.resetButton}`}>
              リセット
            </button>
          )}
        </div>

        {/* 設定パネル */}
        <div className={styles.settingsPanel}>
          <div className={styles.timeSettings}>
            <div className={styles.timeSetting}>
              <label htmlFor="workTime">作業時間（分）:</label>
              <input
                id="workTime"
                type="number"
                min="1"
                max="120"
                value={workTime === 0 ? "" : workTime}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "") {
                    setWorkTime(0);
                  } else {
                    const num = parseInt(value);
                    if (!isNaN(num) && num >= 1 && num <= 120) setWorkTime(num);
                  }
                }}
                onBlur={(e) => {
                  const value = parseInt(e.target.value);
                  if (isNaN(value) || value < 1 || value > 120) setWorkTime(25);
                }}
                disabled={timerState !== "idle"}
                className={styles.timeInput}
              />
            </div>
            <div className={styles.timeSetting}>
              <label htmlFor="breakTime">休憩時間（分）:</label>
              <input
                id="breakTime"
                type="number"
                min="1"
                max="60"
                value={breakTime === 0 ? "" : breakTime}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "") {
                    setBreakTime(0);
                  } else {
                    const num = parseInt(value);
                    if (!isNaN(num) && num >= 1 && num <= 60) setBreakTime(num);
                  }
                }}
                onBlur={(e) => {
                  const value = parseInt(e.target.value);
                  if (isNaN(value) || value < 1 || value > 60) setBreakTime(5);
                }}
                disabled={timerState !== "idle"}
                className={styles.timeInput}
              />
            </div>
            <div className={styles.timeSetting}>
              <label htmlFor="totalSets">セット数:</label>
              <input
                id="totalSets"
                type="number"
                min="1"
                max="10"
                value={totalSets === 0 ? "" : totalSets}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "") {
                    setTotalSets(0);
                  } else {
                    const num = parseInt(value);
                    if (!isNaN(num) && num >= 1 && num <= 10) setTotalSets(num);
                  }
                }}
                onBlur={(e) => {
                  const value = parseInt(e.target.value);
                  if (isNaN(value) || value < 1 || value > 10) setTotalSets(4);
                }}
                disabled={timerState !== "idle"}
                className={styles.timeInput}
              />
            </div>
          </div>

          <div className={styles.bgmSetting}>
            <label htmlFor="workBgmSelect">作業中BGM:</label>
            <select
              id="workBgmSelect"
              value={selectedWorkBgm}
              onChange={(e) => handleBgmSelection(e.target.value, setSelectedWorkBgm)}
              className={styles.bgmSelect}
            >
              {WORK_BGM_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </select>

            <div className={styles.volumeControl}>
              <label htmlFor="workBgmVolume">音量: {workBgmVolume}%</label>
              <input
                id="workBgmVolume"
                type="range"
                min="0"
                max="100"
                value={workBgmVolume}
                onChange={(e) => {
                  const newVolume = parseInt(e.target.value);
                  setWorkBgmVolume(newVolume);
                  if (timerState === "work" || isWorkBgmTestPlaying) updateVolume(newVolume);
                }}
                className={styles.volumeSlider}
              />
            </div>

            {selectedWorkBgm !== "silence" && (
              <div className={styles.testControls}>
                {!isWorkBgmTestPlaying ? (
                  <button
                    onClick={() => {
                      stopBgmTest(setIsBreakBgmTestPlaying);
                      const preset = WORK_BGM_PRESETS.find((p) => p.id === selectedWorkBgm);
                      if (preset?.url) {
                        setIsWorkBgmTestPlaying(true);
                        playAudio(preset.url, workBgmVolume);
                      }
                    }}
                    className={styles.testButton}
                  >
                    🎵 音声テスト
                  </button>
                ) : (
                  <button
                    onClick={() => stopBgmTest(setIsWorkBgmTestPlaying)}
                    className={`${styles.testButton} ${styles.stopButton}`}
                  >
                    ⏹️ 停止
                  </button>
                )}
              </div>
            )}
          </div>

          <div className={styles.bgmSetting}>
            <label htmlFor="bgmSelect">休憩時間BGM:</label>
            <select
              id="bgmSelect"
              value={selectedBreakBgm}
              onChange={(e) => handleBgmSelection(e.target.value, setSelectedBreakBgm)}
              className={styles.bgmSelect}
            >
              {BREAK_BGM_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </select>

            <div className={styles.volumeControl}>
              <label htmlFor="breakBgmVolume">音量: {breakBgmVolume}%</label>
              <input
                id="breakBgmVolume"
                type="range"
                min="0"
                max="100"
                value={breakBgmVolume}
                onChange={(e) => {
                  const newVolume = parseInt(e.target.value);
                  setBreakBgmVolume(newVolume);
                  if (timerState === "break" || isBreakBgmTestPlaying) updateVolume(newVolume);
                }}
                className={styles.volumeSlider}
              />
            </div>

            {audioError && <div className={styles.errorMessage}>{audioError}</div>}

            {selectedBreakBgm !== "silence" && (
              <div className={styles.testControls}>
                {!isBreakBgmTestPlaying ? (
                  <button
                    onClick={() => {
                      stopBgmTest(setIsWorkBgmTestPlaying);
                      const preset = BREAK_BGM_PRESETS.find((p) => p.id === selectedBreakBgm);
                      if (preset?.url) {
                        setIsBreakBgmTestPlaying(true);
                        playAudio(preset.url, breakBgmVolume);
                      }
                    }}
                    className={styles.testButton}
                  >
                    🎵 音声テスト
                  </button>
                ) : (
                  <button
                    onClick={() => stopBgmTest(setIsBreakBgmTestPlaying)}
                    className={`${styles.testButton} ${styles.stopButton}`}
                  >
                    ⏹️ 停止
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <audio
        ref={audioRef}
        loop
        preload="metadata"
        style={{ display: "none" }}
        onCanPlay={() => setAudioError("")}
        onError={() => setAudioError("音声ファイルが読み込めません")}
      />
    </div>
  );
}
