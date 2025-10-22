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
  const [isLastSet, setIsLastSet] = useState(false); // 最後のセットかどうか

  // BGM設定
  const [bgmUrl, setBgmUrl] = useState("");
  const [selectedBgm, setSelectedBgm] = useState(() => {
    // ランダムなBGMを選択（無音以外から）
    const musicPresets = [
      "acoustic07", "acoustic13", "acoustic16", "acoustic26", "acoustic29",
      "acoustic38", "acoustic41", "acoustic42", "acoustic50", "acoustic51"
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
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null); // 音声バッファをキャッシュ
  // 【重なりループ用】複数のSourceNodeを管理
  const overlappingSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const overlapTimerRef = useRef<number | null>(null);

  // 休憩時間BGMプリセット（リラックス系）
  const bgmPresets = useMemo(
    () => [
      {
        id: "acoustic07",
        name: "Acoustic 07",
        url: "/audio/break/maou_bgm_acoustic07.mp3",
      },
      {
        id: "acoustic13",
        name: "Acoustic 13",
        url: "/audio/break/maou_bgm_acoustic13.mp3",
      },
      {
        id: "acoustic16",
        name: "Acoustic 16",
        url: "/audio/break/maou_bgm_acoustic16.mp3",
      },
      {
        id: "acoustic26",
        name: "Acoustic 26",
        url: "/audio/break/maou_bgm_acoustic26.mp3",
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
      {
        id: "acoustic51",
        name: "Acoustic 51",
        url: "/audio/break/maou_bgm_acoustic51.mp3",
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
      { id: "silence", name: "無音", url: "generated_silence" },
    ],
    []
  );

  // Web Audio APIで環境音を生成
  const generateAmbientSound = async (type: string) => {
    try {
      // AudioContextを初期化（ユーザージェスチャー必須）
      if (!audioContextRef.current) {
        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        if (!AudioContextClass) {
          throw new Error("Web Audio APIがサポートされていません");
        }
        audioContextRef.current = new AudioContextClass();
      }

      const audioContext = audioContextRef.current;

      // AudioContextがsuspendedの場合は再開
      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      // 既存の音声を停止
      if (sourceNodeRef.current) {
        try {
          sourceNodeRef.current.stop();
        } catch {
          // すでに停止している場合のエラーを無視
        }
        sourceNodeRef.current = null;
      }

      const bufferSize = audioContext.sampleRate * 2; // 2秒のバッファ
      const buffer = audioContext.createBuffer(
        1,
        bufferSize,
        audioContext.sampleRate
      );
      const data = buffer.getChannelData(0);

      // 音声タイプ別の生成
      switch (type) {
        case "generated_rain":
          // 雨音の生成（ノイズベース）
          for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() - 0.5) * 0.3 * Math.sin(i * 0.01);
          }
          break;
        case "generated_whitenoise":
          // ホワイトノイズ
          for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() - 0.5) * 0.2;
          }
          break;
        case "generated_brownnoise":
          // ブラウンノイズ
          let lastOut = 0;
          for (let i = 0; i < bufferSize; i++) {
            const white = (Math.random() - 0.5) * 0.2;
            data[i] = lastOut = (lastOut + white * 0.02) / 1.02;
          }
          break;
        case "generated_ocean":
          // 波音（低周波の振動）
          for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.sin(i * 0.002) * 0.1 + (Math.random() - 0.5) * 0.05;
          }
          break;
        case "generated_forest":
          // 森の音（複数周波数のミックス）
          for (let i = 0; i < bufferSize; i++) {
            data[i] =
              (Math.sin(i * 0.01) +
                Math.sin(i * 0.03) +
                Math.random() * 0.1 -
                0.05) *
              0.1;
          }
          break;
        case "generated_cafe":
          // カフェ環境音（複雑なノイズミックス）
          for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() - 0.5) * 0.15 + Math.sin(i * 0.005) * 0.05;
          }
          break;
        default:
          // 無音
          for (let i = 0; i < bufferSize; i++) {
            data[i] = 0;
          }
          break;
      }

      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      // ボリューム制御のためのGainNodeを追加
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 0.3; // 音量を30%に設定

      source.connect(gainNode);
      gainNode.connect(audioContext.destination);
      source.start();

      sourceNodeRef.current = source;
      setAudioError("");
      console.log("音声生成成功:", type);
    } catch (error) {
      console.error("音声生成エラー:", error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      setAudioError(`音声生成エラー: ${errorMsg}`);
    }
  };

  // 【メイン関数】音声ファイルを読み込んでシームレスループ再生を開始
  const playSeamlessAudio = async (url: string, volume: number) => {
    try {
      // 【ステップ1】AudioContext（Web Audio API の基盤）を初期化
      if (!audioContextRef.current) {
        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        if (!AudioContextClass) {
          throw new Error("Web Audio APIがサポートされていません");
        }
        audioContextRef.current = new AudioContextClass();
      }

      const audioContext = audioContextRef.current;

      // 【ステップ2】AudioContextがブラウザによって停止されている場合は再開
      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      // 【ステップ3】既存の音声があれば停止（重複再生を防ぐ）
      stopAllAudio();

      // 【ステップ4】音声ファイルをネットワークから読み込み
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();

      // 【ステップ5】音声データをWeb Audio API用のバッファに変換
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      // 【ステップ6】変換した音声バッファをキャッシュ（再利用のため）
      audioBufferRef.current = audioBuffer;

      // 【ステップ7】音量制御用のGainNode（ボリューム調整器）を作成
      const gainNode = audioContext.createGain();
      gainNode.gain.value = volume / 100; // 0-100% を 0.0-1.0 に変換
      gainNode.connect(audioContext.destination); // スピーカーに接続
      gainNodeRef.current = gainNode;

      // 【ステップ8】実際のループ再生を開始
      // startSeamlessLoop(); // シンプルループ（基本版）
      startCrossfadeLoop(); // クロスフェードループ（0.1秒重複でシームレス）

      setAudioError("");
      console.log(
        "シームレス音声再生開始:",
        url,
        "バッファ長:",
        audioBuffer.duration,
        "秒"
      );
    } catch (error) {
      console.error("シームレス音声再生エラー:", error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      setAudioError(`音声再生エラー: ${errorMsg}`);
    }
  };

  // 【シンプルループ】AudioBufferSourceNodeでシームレスループを開始
  const startSeamlessLoop = () => {
    // 【前提条件チェック】必要な要素が全て揃っているか確認
    if (
      !audioContextRef.current ||
      !audioBufferRef.current ||
      !gainNodeRef.current
    )
      return;

    const audioContext = audioContextRef.current; // Web Audio APIのコンテキスト
    const audioBuffer = audioBufferRef.current; // 音声データ
    const gainNode = gainNodeRef.current; // 音量調整器

    // 【シンプルループ】基本的な無限ループ（デフォルト）
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.loop = true; // ← ここがシームレスループの核心部分
    source.connect(gainNode);
    source.start(0);
    sourceNodeRef.current = source;
  };

  // 【クロスフェードループ】音声の終わりと始まりを重ねて「ぷつっ」を防ぐ
  const startCrossfadeLoop = () => {
    if (
      !audioContextRef.current ||
      !audioBufferRef.current ||
      !gainNodeRef.current
    )
      return;

    const audioContext = audioContextRef.current;
    const audioBuffer = audioBufferRef.current;
    const gainNode = gainNodeRef.current;
    const duration = audioBuffer.duration;
    const overlapTime = 0.1; // 0.1秒重複

    console.log(
      `クロスフェードループ開始 - 音声長:${duration}秒, 重複:${overlapTime}秒`
    );

    // 【第1の音声】を開始
    const firstSource = audioContext.createBufferSource();
    firstSource.buffer = audioBuffer;
    firstSource.connect(gainNode);
    firstSource.start(0);
    sourceNodeRef.current = firstSource;

    // 【ループ制御】次の音声を再帰的にスケジュール
    const scheduleNextLoop = (startTime: number) => {
      if (
        !audioContextRef.current ||
        !audioBufferRef.current ||
        !gainNodeRef.current
      ) {
        console.log("クロスフェードループ停止: 必要な参照が無効");
        return;
      }

      // 次の音声開始時刻（現在の音声終了の0.1秒前）
      const nextStartTime = startTime + duration - overlapTime;

      // 【次の音声】を準備
      const nextSource = audioContext.createBufferSource();
      nextSource.buffer = audioBuffer;
      nextSource.connect(gainNode);

      // 指定時間に開始
      nextSource.start(nextStartTime);

      // 【現在の音声】を重複後に停止
      const currentToStop = sourceNodeRef.current;
      if (currentToStop) {
        currentToStop.stop(nextStartTime + overlapTime);
      }

      // 参照を更新
      sourceNodeRef.current = nextSource;

      console.log(
        `次のループをスケジュール - 開始時刻: ${nextStartTime.toFixed(2)}秒`
      );

      // 【次のループを再帰的にスケジュール】
      const nextScheduleTime = (duration - overlapTime) * 1000;
      overlapTimerRef.current = window.setTimeout(() => {
        scheduleNextLoop(nextStartTime);
      }, nextScheduleTime);
    };

    // 最初のループをスケジュール（音声開始時刻を基準に）
    const firstStartTime = audioContext.currentTime;
    const initialScheduleTime = (duration - overlapTime) * 1000;
    overlapTimerRef.current = window.setTimeout(() => {
      scheduleNextLoop(firstStartTime);
    }, initialScheduleTime);

    console.log(`最初のループを${initialScheduleTime}ms後にスケジュール`);
  };

  // 音量調整
  const updateSeamlessVolume = (volume: number) => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = volume / 100;
    }
  };

  // 【クロスフェードループ用停止処理】
  const stopCrossfadeLoop = () => {
    // タイマーを停止
    if (overlapTimerRef.current) {
      clearTimeout(overlapTimerRef.current);
      overlapTimerRef.current = null;
    }

    // 重複音声があれば停止
    overlappingSourcesRef.current.forEach((source) => {
      try {
        source.stop();
      } catch {
        // 既に停止済み
      }
    });
    overlappingSourcesRef.current = [];
  };

  // 【停止処理】全ての音声を確実に停止
  const stopAllAudio = () => {
    // 【クロスフェードループ音声の停止】
    stopCrossfadeLoop();

    // 【Web Audio API音声の停止】
    if (sourceNodeRef.current) {
      try {
        // AudioBufferSourceNode.stop() でループを含めて完全停止
        sourceNodeRef.current.stop();
      } catch {
        // 既に停止済みの場合のエラーを無視（二重停止防止）
        console.log("音声は既に停止しています");
      }
      // 参照をクリア（メモリリーク防止）
      sourceNodeRef.current = null;
    }

    // 【HTML5 audio の停止】（従来のaudio要素がある場合）
    if (audioRef.current) {
      audioRef.current.pause(); // 再生停止
      audioRef.current.currentTime = 0; // 再生位置をリセット
    }
  };

  // 生成音声を停止（従来の関数は互換性のため残す）
  const stopGeneratedSound = () => {
    stopAllAudio();
  };

  // 作業中BGMテストを停止
  const stopWorkBgmTest = () => {
    stopGeneratedSound();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsWorkBgmTestPlaying(false);
  };

  // 休憩中BGMテストを停止
  const stopBreakBgmTest = () => {
    stopGeneratedSound();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsBreakBgmTestPlaying(false);
  };

  // 休憩時BGM選択ハンドラー
  const handleBgmSelection = (presetId: string) => {
    setSelectedBgm(presetId);
    setAudioError("");

    // 既存の生成音声を停止
    stopGeneratedSound();

    const preset = bgmPresets.find((p) => p.id === presetId);
    if (preset && preset.url) {
      if (preset.url.startsWith("generated_")) {
        // 生成音声の場合はURLをセットしない
        setBgmUrl("");
      } else {
        // ローカル音声ファイルの場合はURLをセット
        setBgmUrl(preset.url);
      }
    }
  };

  // 作業中BGM選択ハンドラー
  const handleWorkBgmSelection = (presetId: string) => {
    setSelectedWorkBgm(presetId);
    setAudioError("");

    // 既存の生成音声を停止
    stopGeneratedSound();
  };

  // タイマー参照（バックグラウンド動作用）
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // タイマー開始関数
  const startWorkTimer = () => {
    const actualWorkTime = workTime === 0 ? 25 : workTime; // 0の場合はデフォルト値を使用
    const seconds = actualWorkTime * 60;
    setTimeLeft(seconds);
    setTotalTime(seconds);
    setTimerState("work");
    
    // セット管理の初期化
    setCurrentSet(1); // 1セット目から開始
    setIsLastSet(totalSets === 1); // 1セットのみの場合は最後のセット
    // 作業時間にBGMを再生
    const preset = workBgmPresets.find((p) => p.id === selectedWorkBgm);
    if (preset && preset.url && selectedWorkBgm !== "silence") {
      if (preset.url.startsWith("generated_")) {
        // 生成音声の再生
        generateAmbientSound(preset.url).catch((error) => {
          console.error("作業中BGM再生エラー:", error);
          setAudioError(
            "作業中BGMの再生に失敗しました。ブラウザの設定をご確認ください。"
          );
        });
      } else {
        // ローカル音声ファイルのシームレス再生
        playSeamlessAudio(preset.url, workBgmVolume).catch((error) => {
          console.error("作業中BGM再生エラー:", error);
          setAudioError("作業中BGMの再生に失敗しました。");
        });
      }
    }
  };

  const startBreakTimer = useCallback(() => {
    const actualBreakTime = breakTime === 0 ? 5 : breakTime; // 0の場合はデフォルト値を使用
    const seconds = actualBreakTime * 60;
    setTimeLeft(seconds);
    setTotalTime(seconds);
    setTimerState("break");
    
    // 最後のセットかどうかをチェック
    setIsLastSet(currentSet >= totalSets);
    // 休憩時間にBGMを再生
    const preset = bgmPresets.find((p) => p.id === selectedBgm);
    if (preset && preset.url.startsWith("generated_")) {
      // 生成音声の再生
      generateAmbientSound(preset.url).catch((error) => {
        console.error("BGM再生エラー:", error);
        setAudioError(
          "BGMの再生に失敗しました。ブラウザの設定をご確認ください。"
        );
      });
    } else if (bgmUrl) {
      // ローカル音声ファイルのシームレス再生
      playSeamlessAudio(bgmUrl, breakBgmVolume).catch((error) => {
        console.error("BGM再生エラー:", error);
        setAudioError("音声ファイルの再生に失敗しました。");
      });
    }
  }, [breakTime, bgmUrl, selectedBgm, bgmPresets, currentSet, totalSets]);

  // 次のセットに移る関数
  const startNextSet = useCallback(() => {
    const nextSetNumber = currentSet + 1;
    setCurrentSet(nextSetNumber);
    
    // 次のセットの作業時間を開始
    const actualWorkTime = workTime === 0 ? 25 : workTime;
    const seconds = actualWorkTime * 60;
    setTimeLeft(seconds);
    setTotalTime(seconds);
    setTimerState("work");
    
    console.log(`第${nextSetNumber}セット開始 (全${totalSets}セット)`);
    
    // 作業中BGMを再生
    const preset = workBgmPresets.find((p) => p.id === selectedWorkBgm);
    if (preset && preset.url && selectedWorkBgm !== "silence") {
      if (preset.url.startsWith("generated_")) {
        generateAmbientSound(preset.url).catch(error => {
          console.error('作業中BGM再生エラー:', error);
          setAudioError('作業中BGMの再生に失敗しました。');
        });
      } else {
        playSeamlessAudio(preset.url, workBgmVolume).catch(error => {
          console.error('作業中BGM再生エラー:', error);
          setAudioError('作業中BGMの再生に失敗しました。');
        });
      }
    }
  }, [currentSet, totalSets, workTime, selectedWorkBgm, workBgmPresets, workBgmVolume]);

  const pauseTimer = () => {
    setTimerState("paused");
    // 通常音声を停止
    if (audioRef.current) {
      audioRef.current.pause();
    }
    // 生成音声を停止
    stopGeneratedSound();
  };

  const resumeTimer = () => {
    if (timeLeft > 0) {
      // 現在のtimerStateから一時停止前の状態を復元
      const actualWorkTime = workTime === 0 ? 25 : workTime;
      const previousState =
        timerState === "paused"
          ? totalTime === actualWorkTime * 60
            ? "work"
            : "break"
          : "work";
      setTimerState(previousState);

      // 作業時間の場合は作業中BGMを再生
      if (previousState === "work") {
        const preset = workBgmPresets.find((p) => p.id === selectedWorkBgm);
        if (preset && preset.url && selectedWorkBgm !== "silence") {
          if (preset.url.startsWith("generated_")) {
            generateAmbientSound(preset.url).catch((error) => {
              console.error("作業中BGM再生エラー:", error);
              setAudioError("作業中BGMの再生に失敗しました。");
            });
          } else {
            // ローカル音声ファイルのシームレス再生
            playSeamlessAudio(preset.url, workBgmVolume).catch((error) => {
              console.error("作業中BGM再生エラー:", error);
              setAudioError("作業中BGMの再生に失敗しました。");
            });
          }
        }
      }

      // 休憩時間の場合は休憩BGMを再生
      if (previousState === "break") {
        const preset = bgmPresets.find((p) => p.id === selectedBgm);
        if (preset && preset.url.startsWith("generated_")) {
          generateAmbientSound(preset.url).catch((error) => {
            console.error("BGM再生エラー:", error);
            setAudioError("BGMの再生に失敗しました。");
          });
        } else if (bgmUrl) {
          // ローカル音声ファイルのシームレス再生
          playSeamlessAudio(bgmUrl, breakBgmVolume).catch((error) => {
            console.error("BGM再生エラー:", error);
            setAudioError("音声ファイルの再生に失敗しました。");
          });
        }
      }
    }
  };

  const resetTimer = () => {
    setTimerState("idle");
    setTimeLeft(0);
    setTotalTime(0);
    
    // セット管理をリセット
    setCurrentSet(0);
    setIsLastSet(false);
    
    // 通常音声を停止
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    // 生成音声を停止
    stopGeneratedSound();
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
                setIsLastSet(false);
                // 通常音声を停止
                if (audioRef.current) {
                  audioRef.current.pause();
                  audioRef.current.currentTime = 0;
                }
                // 生成音声を停止
                stopGeneratedSound();
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
              onChange={(e) => handleWorkBgmSelection(e.target.value)}
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
                    updateSeamlessVolume(newVolume);
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
                    onClick={async () => {
                      // 他のテストを停止
                      stopBreakBgmTest();

                      const preset = workBgmPresets.find(
                        (p) => p.id === selectedWorkBgm
                      );
                      if (preset && preset.url) {
                        setIsWorkBgmTestPlaying(true);
                        try {
                          if (preset.url.startsWith("generated_")) {
                            await generateAmbientSound(preset.url);
                          } else {
                            // ローカル音声ファイルのシームレステスト再生
                            await playSeamlessAudio(preset.url, workBgmVolume);
                          }
                        } catch (error) {
                          console.error("テスト再生エラー:", error);
                          setAudioError("音声の再生に失敗しました。");
                          setIsWorkBgmTestPlaying(false);
                        }
                      }
                    }}
                    className={styles.testButton}
                  >
                    🎵 音声テスト
                  </button>
                ) : (
                  <button
                    onClick={stopWorkBgmTest}
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
              onChange={(e) => handleBgmSelection(e.target.value)}
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
                    updateSeamlessVolume(newVolume);
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
                    onClick={async () => {
                      // 他のテストを停止
                      stopWorkBgmTest();

                      const preset = bgmPresets.find(
                        (p) => p.id === selectedBgm
                      );
                      if (preset && preset.url) {
                        setIsBreakBgmTestPlaying(true);
                        try {
                          if (preset.url.startsWith("generated_")) {
                            await generateAmbientSound(preset.url);
                          } else {
                            // ローカル音声ファイルのシームレステスト再生
                            await playSeamlessAudio(preset.url, breakBgmVolume);
                          }
                        } catch (error) {
                          console.error("テスト再生エラー:", error);
                          setAudioError("音声の再生に失敗しました。");
                          setIsBreakBgmTestPlaying(false);
                        }
                      }
                    }}
                    className={styles.testButton}
                  >
                    🎵 音声テスト
                  </button>
                ) : (
                  <button
                    onClick={stopBreakBgmTest}
                    className={`${styles.testButton} ${styles.stopButton}`}
                  >
                    ⏹️ 停止
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

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
