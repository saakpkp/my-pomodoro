"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import styles from "./page.module.css";

type TimerState = "idle" | "work" | "break" | "paused";

export default function Home() {
  // タイマー設定
  const [workTime, setWorkTime] = useState(25); // 作業時間（分）
  const [breakTime, setBreakTime] = useState(5); // 休憩時間（分）
  const [totalSets, setTotalSets] = useState(4); // 合計セット数（作業→休憩を1セットとする）

  // タイマー状態
  const [timerState, setTimerState] = useState<TimerState>("idle");
  const [timeLeft, setTimeLeft] = useState(0); // 残り時間（秒）
  const [totalTime, setTotalTime] = useState(0); // 合計時間（秒）

  // セット管理
  const [currentSet, setCurrentSet] = useState(0); // 現在のセット数（0から開始）

  // BGM設定
  const [selectedBgm, setSelectedBgm] = useState(() => {
    // ランダムなBGMを選択（無音以外から）
    const musicPresets = [
      "acoustic07",
      "acoustic16",
      "acoustic29",
      "acoustic38",
      "acoustic41",
      "acoustic42",
      "acoustic50",
    ];
    const randomIndex = Math.floor(Math.random() * musicPresets.length);
    return musicPresets[randomIndex];
  });
  const [selectedWorkBgm, setSelectedWorkBgm] = useState("white_noise"); // 作業中BGM
  const [workBgmVolume, setWorkBgmVolume] = useState(50); // 作業中BGM音量（0-100）
  const [breakBgmVolume, setBreakBgmVolume] = useState(50); // 休憩中BGM音量（0-100）
  const [audioError, setAudioError] = useState("");
  const [isWorkBgmTestPlaying, setIsWorkBgmTestPlaying] = useState(false); // 作業中BGMテスト状態
  const [isBreakBgmTestPlaying, setIsBreakBgmTestPlaying] = useState(false); // 休憩中BGMテスト状態
  const audioRef = useRef<HTMLAudioElement>(null);

  // 休憩時間BGMプリセット（リラックス系）
  const bgmPresets = useMemo(
    () => [
      {
        id: "acoustic07",
        name: "Acoustic 07",
        url: "/audio/break/maou_bgm_acoustic07.mp3",
      },
      {
        id: "acoustic16",
        name: "Acoustic 16",
        url: "/audio/break/maou_bgm_acoustic16.mp3",
      },
      {
        id: "acoustic29",
        name: "Acoustic 29",
        url: "/audio/break/maou_bgm_acoustic29.mp3",
      },
      {
        id: "acoustic38",
        name: "Acoustic 38",
        url: "/audio/break/maou_bgm_acoustic38.mp3",
      },
      {
        id: "acoustic41",
        name: "Acoustic 41",
        url: "/audio/break/maou_bgm_acoustic41.mp3",
      },
      {
        id: "acoustic42",
        name: "Acoustic 42",
        url: "/audio/break/maou_bgm_acoustic42.mp3",
      },
      {
        id: "acoustic50",
        name: "Acoustic 50",
        url: "/audio/break/maou_bgm_acoustic50.mp3",
      },
      { id: "silence", name: "無音", url: "generated_silence" },
    ],
    []
  );

  // 作業中BGMプリセット（集中系）
  const workBgmPresets = useMemo(
    () => [
      {
        id: "white_noise",
        name: "White Noise（作業用）",
        url: "/audio/work/white-niose.mp3",
      },
      {
        id: "brown_noise",
        name: "Brown Noise（作業用）",
        url: "/audio/work/soft-brown-noise-299934.mp3",
      },
      { id: "silence", name: "無音", url: "generated_silence" },
    ],
    []
  );

  // シンプルな音声再生（HTML5 audioのみ使用）
  const playAudio = (url: string, volume: number) => {
    if (!audioRef.current) return;

    // 既存の音声を停止
    audioRef.current.pause();
    audioRef.current.currentTime = 0;

    // 新しい音声を設定
    audioRef.current.src = url;
    audioRef.current.volume = volume / 100; // 0-100を0-1に変換

    // 再生
    audioRef.current
      .play()
      .then(() => {
        setAudioError("");
        console.log("音声再生開始:", url, "音量:", volume);
      })
      .catch((error) => {
        console.error("音声再生エラー:", error);
        setAudioError("音声の再生に失敗しました。");
      });
  };

  // 音量調整
  const updateVolume = (volume: number) => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  };

  // 音声停止
  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  // BGMテストを停止（作業中・休憩中共通）
  const stopBgmTest = (
    setter: typeof setIsWorkBgmTestPlaying | typeof setIsBreakBgmTestPlaying
  ) => {
    stopAudio();
    setter(false);
  };

  // BGM選択ハンドラー（休憩時・作業中共通）
  const handleBgmSelection = (
    presetId: string,
    setter: typeof setSelectedBgm | typeof setSelectedWorkBgm
  ) => {
    setter(presetId);
    setAudioError("");
    stopAudio();
  };

  // BGM再生ヘルパー関数
  const playBgmIfNotSilence = useCallback(
    (
      presets: typeof bgmPresets | typeof workBgmPresets,
      selectedId: string,
      volume: number
    ) => {
      const preset = presets.find((p) => p.id === selectedId);
      if (preset && preset.url && selectedId !== "silence") {
        playAudio(preset.url, volume);
      }
    },
    []
  );

  // タイマー参照（バックグラウンド動作用）
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // タイマー開始関数
  const startWorkTimer = () => {
    const seconds = (workTime || 25) * 60;
    setTimeLeft(seconds);
    setTotalTime(seconds);
    setTimerState("work");

    // セット管理の初期化
    setCurrentSet(1); // 1セット目から開始

    // 作業時間にBGMを再生
    playBgmIfNotSilence(workBgmPresets, selectedWorkBgm, workBgmVolume);
  };

  const startBreakTimer = useCallback(() => {
    const seconds = (breakTime || 5) * 60;
    setTimeLeft(seconds);
    setTotalTime(seconds);
    setTimerState("break");

    // 休憩時間にBGMを再生
    playBgmIfNotSilence(bgmPresets, selectedBgm, breakBgmVolume);
  }, [breakTime, selectedBgm, bgmPresets, breakBgmVolume, playBgmIfNotSilence]);

  // 次のセットに移る関数
  const startNextSet = useCallback(() => {
    const nextSetNumber = currentSet + 1;
    setCurrentSet(nextSetNumber);

    // 次のセットの作業時間を開始
    const seconds = (workTime || 25) * 60;
    setTimeLeft(seconds);
    setTotalTime(seconds);
    setTimerState("work");

    console.log(`第${nextSetNumber}セット開始 (全${totalSets}セット)`);

    // 作業中BGMを再生
    playBgmIfNotSilence(workBgmPresets, selectedWorkBgm, workBgmVolume);
  }, [currentSet, totalSets, workTime, selectedWorkBgm, workBgmPresets, workBgmVolume, playBgmIfNotSilence]);

  const pauseTimer = () => {
    setTimerState("paused");
    stopAudio();
  };

  const resumeTimer = () => {
    if (timeLeft > 0) {
      // 現在のtimerStateから一時停止前の状態を復元
      const previousState =
        timerState === "paused"
          ? totalTime === (workTime || 25) * 60
            ? "work"
            : "break"
          : "work";
      setTimerState(previousState);

      // 作業時間の場合は作業中BGMを再生
      if (previousState === "work") {
        playBgmIfNotSilence(workBgmPresets, selectedWorkBgm, workBgmVolume);
      }

      // 休憩時間の場合は休憩BGMを再生
      if (previousState === "break") {
        playBgmIfNotSilence(bgmPresets, selectedBgm, breakBgmVolume);
      }
    }
  };

  const resetTimer = () => {
    setTimerState("idle");
    setTimeLeft(0);
    setTotalTime(0);

    // セット管理をリセット
    setCurrentSet(0);

    // 音声を停止
    stopAudio();
  };

  // バックグラウンドタイマー処理
  useEffect(() => {
    if (timerState === "work" || timerState === "break") {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // タイマー終了
            if (timerState === "work") {
              // 作業終了、休憩開始
              setTimeout(() => startBreakTimer(), 100);
            } else {
              // 休憩終了
              if (currentSet < totalSets) {
                // まだセットが残っている場合は次のセットに移る
                setTimeout(() => startNextSet(), 100);
              } else {
                // 全セット完了、アイドル状態に戻る
                console.log(`全${totalSets}セット完了！お疲れ様でした！`);
                setTimerState("idle");
                setCurrentSet(0);
                // 音声を停止
                stopAudio();
              }
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [timerState, startBreakTimer, startNextSet, currentSet, totalSets]);

  // 時間を分:秒形式でフォーマット
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  // 進捗率を計算
  const getProgress = () => {
    if (totalTime === 0) return 0;
    return ((totalTime - timeLeft) / totalTime) * 100;
  };

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <h1 className={styles.title}>ポモドーロタイマー</h1>

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
              <div
                className={styles.progressFill}
                style={{ width: `${getProgress()}%` }}
              />
            </div>
          )}
        </div>

        {/* 制御ボタン */}
        <div className={styles.controls}>
          {timerState === "idle" && (
            <button
              onClick={startWorkTimer}
              className={`${styles.button} ${styles.startButton}`}
            >
              作業開始
            </button>
          )}

          {(timerState === "work" || timerState === "break") && (
            <button
              onClick={pauseTimer}
              className={`${styles.button} ${styles.pauseButton}`}
            >
              一時停止
            </button>
          )}

          {timerState === "paused" && (
            <button
              onClick={resumeTimer}
              className={`${styles.button} ${styles.resumeButton}`}
            >
              再開
            </button>
          )}

          {timerState !== "idle" && (
            <button
              onClick={resetTimer}
              className={`${styles.button} ${styles.resetButton}`}
            >
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
                    setWorkTime(0); // 空文字の場合は0に設定（一時的）
                  } else {
                    const num = parseInt(value);
                    if (!isNaN(num) && num >= 1 && num <= 120) {
                      setWorkTime(num);
                    }
                  }
                }}
                onBlur={(e) => {
                  // フォーカスが外れた時に有効な値に修正
                  const value = parseInt(e.target.value);
                  if (isNaN(value) || value < 1 || value > 120) {
                    setWorkTime(25); // デフォルト値に戻す
                  }
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
                    setBreakTime(0); // 空文字の場合は0に設定（一時的）
                  } else {
                    const num = parseInt(value);
                    if (!isNaN(num) && num >= 1 && num <= 60) {
                      setBreakTime(num);
                    }
                  }
                }}
                onBlur={(e) => {
                  // フォーカスが外れた時に有効な値に修正
                  const value = parseInt(e.target.value);
                  if (isNaN(value) || value < 1 || value > 60) {
                    setBreakTime(5); // デフォルト値に戻す
                  }
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
                    if (!isNaN(num) && num >= 1 && num <= 10) {
                      setTotalSets(num);
                    }
                  }
                }}
                onBlur={(e) => {
                  const value = parseInt(e.target.value);
                  if (isNaN(value) || value < 1 || value > 10) {
                    setTotalSets(4); // デフォルト値に戻す
                  }
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
              {workBgmPresets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </select>

            {/* 作業中BGM音量設定 */}
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
                  // 作業中で現在再生中の場合は音量をリアルタイム更新
                  if (timerState === "work" || isWorkBgmTestPlaying) {
                    updateVolume(newVolume);
                  }
                }}
                className={styles.volumeSlider}
              />
            </div>

            {/* 作業中BGM音声テスト用ボタン */}
            {selectedWorkBgm !== "silence" && (
              <div className={styles.testControls}>
                {!isWorkBgmTestPlaying ? (
                  <button
                    onClick={() => {
                      // 他のテストを停止
                      stopBgmTest(setIsBreakBgmTestPlaying);

                      const preset = workBgmPresets.find(
                        (p) => p.id === selectedWorkBgm
                      );
                      if (preset && preset.url) {
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
              value={selectedBgm}
              onChange={(e) => handleBgmSelection(e.target.value, setSelectedBgm)}
              className={styles.bgmSelect}
            >
              {bgmPresets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </select>

            {/* 休憩中BGM音量設定 */}
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
                  // 休憩中で現在再生中の場合は音量をリアルタイム更新
                  if (timerState === "break" || isBreakBgmTestPlaying) {
                    updateVolume(newVolume);
                  }
                }}
                className={styles.volumeSlider}
              />
            </div>

            {audioError && (
              <div className={styles.errorMessage}>{audioError}</div>
            )}

            {/* 音声テスト用ボタン */}
            {selectedBgm !== "silence" && (
              <div className={styles.testControls}>
                {!isBreakBgmTestPlaying ? (
                  <button
                    onClick={() => {
                      // 他のテストを停止
                      stopBgmTest(setIsWorkBgmTestPlaying);

                      const preset = bgmPresets.find(
                        (p) => p.id === selectedBgm
                      );
                      if (preset && preset.url) {
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

      {/* BGM用の音声要素 */}
      <audio
        ref={audioRef}
        loop
        preload="metadata"
        style={{ display: "none" }}
        onCanPlay={() => setAudioError("")}
        onError={(e) => {
          const error = `音声ファイルが読み込めません`;
          console.error(error, e);
          setAudioError(error);
        }}
      />
    </div>
  );
}
