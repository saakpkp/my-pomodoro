'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import styles from './page.module.css';

type TimerState = 'idle' | 'work' | 'break' | 'paused';

export default function Home() {
  // タイマー設定
  const [workTime, setWorkTime] = useState(25); // 作業時間（分）
  const [breakTime, setBreakTime] = useState(5); // 休憩時間（分）
  
  // タイマー状態
  const [timerState, setTimerState] = useState<TimerState>('idle');
  const [timeLeft, setTimeLeft] = useState(0); // 残り時間（秒）
  const [totalTime, setTotalTime] = useState(0); // 合計時間（秒）
  
  // BGM設定
  const [bgmUrl, setBgmUrl] = useState('');
  const [selectedBgm, setSelectedBgm] = useState('custom');
  const [selectedWorkBgm, setSelectedWorkBgm] = useState('white_noise'); // 作業中BGM
  const [audioError, setAudioError] = useState('');
  const [isTestPlaying, setIsTestPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  // 休憩時間BGMプリセット（リラックス系）
  const bgmPresets = useMemo(() => [
    { id: 'custom', name: 'カスタムURL', url: '' },
    // HURT RECORD カフェBGM
    { id: 'cafe_peaceful_afternoon', name: '穏やかな午後（カフェ）', url: 'https://www.hurtrecord.com/bgm/56/odayaka-na-gogo.mp3' },
    { id: 'cafe_hitoiki', name: '一息（喫茶店）', url: 'https://www.hurtrecord.com/bgm/149/hitoiki.mp3' },
    { id: 'cafe_afternoon_moment', name: '昼下がりの一時', url: 'https://www.hurtrecord.com/bgm/149/hirusagari-no-hitotoki.mp3' },
    { id: 'cafe_waiting', name: 'Waiting（カフェ）', url: 'https://www.hurtrecord.com/bgm/149/waiting.mp3' },
    // ブラウザ生成音源
    { id: 'rain_sound', name: '雨音（生成）', url: 'generated_rain' },
    { id: 'white_noise', name: 'ホワイトノイズ', url: 'generated_whitenoise' },
    { id: 'brown_noise', name: 'ブラウンノイズ', url: 'generated_brownnoise' },
    { id: 'ocean_waves', name: '波音（生成）', url: 'generated_ocean' },
    { id: 'forest_ambient', name: '森の環境音', url: 'generated_forest' },
    { id: 'cafe_ambient', name: 'カフェ環境音', url: 'generated_cafe' },
    { id: 'silence', name: '無音', url: 'generated_silence' }
  ], []);

  // 作業中BGMプリセット（集中系）
  const workBgmPresets = useMemo(() => [
    { id: 'silence', name: '無音', url: 'generated_silence' },
    { id: 'white_noise', name: 'ホワイトノイズ', url: 'generated_whitenoise' },
    { id: 'brown_noise', name: 'ブラウンノイズ', url: 'generated_brownnoise' },
    { id: 'cafe_ambient', name: 'カフェ環境音', url: 'generated_cafe' }
  ], []);

  // Web Audio APIで環境音を生成
  const generateAmbientSound = async (type: string) => {
    try {
      // AudioContextを初期化（ユーザージェスチャー必須）
      if (!audioContextRef.current) {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextClass) {
          throw new Error('Web Audio APIがサポートされていません');
        }
        audioContextRef.current = new AudioContextClass();
      }
      
      const audioContext = audioContextRef.current;
      
      // AudioContextがsuspendedの場合は再開
      if (audioContext.state === 'suspended') {
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
      const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
      const data = buffer.getChannelData(0);

      // 音声タイプ別の生成
      switch (type) {
        case 'generated_rain':
          // 雨音の生成（ノイズベース）
          for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() - 0.5) * 0.3 * Math.sin(i * 0.01);
          }
          break;
        case 'generated_whitenoise':
          // ホワイトノイズ
          for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() - 0.5) * 0.2;
          }
          break;
        case 'generated_brownnoise':
          // ブラウンノイズ
          let lastOut = 0;
          for (let i = 0; i < bufferSize; i++) {
            const white = (Math.random() - 0.5) * 0.2;
            data[i] = lastOut = (lastOut + white * 0.02) / 1.02;
          }
          break;
        case 'generated_ocean':
          // 波音（低周波の振動）
          for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.sin(i * 0.002) * 0.1 + (Math.random() - 0.5) * 0.05;
          }
          break;
        case 'generated_forest':
          // 森の音（複数周波数のミックス）
          for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.sin(i * 0.01) + Math.sin(i * 0.03) + Math.random() * 0.1 - 0.05) * 0.1;
          }
          break;
        case 'generated_cafe':
          // カフェ環境音（複雑なノイズミックス）
          for (let i = 0; i < bufferSize; i++) {
            data[i] = ((Math.random() - 0.5) * 0.15 + Math.sin(i * 0.005) * 0.05);
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
      setAudioError('');
      console.log('音声生成成功:', type);
    } catch (error) {
      console.error('音声生成エラー:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      setAudioError(`音声生成エラー: ${errorMsg}`);
    }
  };

  // 生成音声を停止
  const stopGeneratedSound = () => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
      } catch {
        // すでに停止している場合のエラーを無視
        console.log('音声は既に停止しています');
      }
      sourceNodeRef.current = null;
    }
    setIsTestPlaying(false);
  };

  // 休憩時BGM選択ハンドラー
  const handleBgmSelection = (presetId: string) => {
    setSelectedBgm(presetId);
    setAudioError('');
    
    // 既存の生成音声を停止
    stopGeneratedSound();
    
    const preset = bgmPresets.find(p => p.id === presetId);
    if (preset && preset.url) {
      if (preset.url.startsWith('generated_')) {
        // 生成音声の場合はURLをセットしない
        setBgmUrl('');
      } else {
        // 外部音声ファイルの場合はURLをセット
        setBgmUrl(preset.url);
      }
    } else if (presetId === 'custom') {
      setBgmUrl('');
    }
  };

  // 作業中BGM選択ハンドラー
  const handleWorkBgmSelection = (presetId: string) => {
    setSelectedWorkBgm(presetId);
    setAudioError('');
    
    // 既存の生成音声を停止
    stopGeneratedSound();
  };
  
  // タイマー参照（バックグラウンド動作用）
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // タイマー開始関数
  const startWorkTimer = () => {
    const seconds = workTime * 60;
    setTimeLeft(seconds);
    setTotalTime(seconds);
    setTimerState('work');
    // 作業時間にBGMを再生
    const preset = workBgmPresets.find(p => p.id === selectedWorkBgm);
    if (preset && preset.url.startsWith('generated_') && selectedWorkBgm !== 'silence') {
      // 生成音声の再生
      generateAmbientSound(preset.url).catch(error => {
        console.error('作業中BGM再生エラー:', error);
        setAudioError('作業中BGMの再生に失敗しました。ブラウザの設定をご確認ください。');
      });
    }
  };

  const startBreakTimer = useCallback(() => {
    const seconds = breakTime * 60;
    setTimeLeft(seconds);
    setTotalTime(seconds);
    setTimerState('break');
    // 休憩時間にBGMを再生
    const preset = bgmPresets.find(p => p.id === selectedBgm);
    if (preset && preset.url.startsWith('generated_')) {
      // 生成音声の再生
      generateAmbientSound(preset.url).catch(error => {
        console.error('BGM再生エラー:', error);
        setAudioError('BGMの再生に失敗しました。ブラウザの設定をご確認ください。');
      });
    } else if (bgmUrl && audioRef.current) {
      // 通常の音声ファイル再生
      audioRef.current.play().catch(error => {
        console.error('BGM再生エラー:', error);
        setAudioError('音声ファイルの再生に失敗しました。URLをご確認ください。');
      });
    }
  }, [breakTime, bgmUrl, selectedBgm, bgmPresets]);

  const pauseTimer = () => {
    setTimerState('paused');
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
      const previousState = timerState === 'paused' ? 
        (totalTime === workTime * 60 ? 'work' : 'break') : 'work';
      setTimerState(previousState);
      
      // 作業時間の場合は作業中BGMを再生
      if (previousState === 'work') {
        const preset = workBgmPresets.find(p => p.id === selectedWorkBgm);
        if (preset && preset.url.startsWith('generated_') && selectedWorkBgm !== 'silence') {
          generateAmbientSound(preset.url).catch(error => {
            console.error('作業中BGM再生エラー:', error);
            setAudioError('作業中BGMの再生に失敗しました。');
          });
        }
      }
      
      // 休憩時間の場合は休憩BGMを再生
      if (previousState === 'break') {
        const preset = bgmPresets.find(p => p.id === selectedBgm);
        if (preset && preset.url.startsWith('generated_')) {
          generateAmbientSound(preset.url).catch(error => {
            console.error('BGM再生エラー:', error);
            setAudioError('BGMの再生に失敗しました。');
          });
        } else if (bgmUrl && audioRef.current) {
          audioRef.current.play().catch(error => {
            console.error('BGM再生エラー:', error);
            setAudioError('音声ファイルの再生に失敗しました。');
          });
        }
      }
    }
  };

  const resetTimer = () => {
    setTimerState('idle');
    setTimeLeft(0);
    setTotalTime(0);
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
    if (timerState === 'work' || timerState === 'break') {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // タイマー終了
            if (timerState === 'work') {
              // 作業終了、休憩開始
              setTimeout(() => startBreakTimer(), 100);
            } else {
              // 休憩終了、アイドル状態に戻る
              setTimerState('idle');
              // 通常音声を停止
              if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
              }
              // 生成音声を停止
              stopGeneratedSound();
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
  }, [timerState, startBreakTimer]);

  // 時間を分:秒形式でフォーマット
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
                value={workTime}
                onChange={(e) => setWorkTime(parseInt(e.target.value) || 25)}
                disabled={timerState !== 'idle'}
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
                value={breakTime}
                onChange={(e) => setBreakTime(parseInt(e.target.value) || 5)}
                disabled={timerState !== 'idle'}
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

            {/* 作業中BGM音声テスト用ボタン */}
            {selectedWorkBgm !== 'silence' && (
              <div className={styles.testControls}>
                {!isTestPlaying ? (
                  <button 
                    onClick={async () => {
                      const preset = workBgmPresets.find(p => p.id === selectedWorkBgm);
                      if (preset && preset.url.startsWith('generated_')) {
                        setIsTestPlaying(true);
                        try {
                          await generateAmbientSound(preset.url);
                        } catch (error) {
                          console.error('テスト再生エラー:', error);
                          setIsTestPlaying(false);
                        }
                      }
                    }}
                    className={styles.testButton}
                  >
                    🎵 音声テスト
                  </button>
                ) : (
                  <button 
                    onClick={stopGeneratedSound}
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
            
            {selectedBgm === 'custom' && (
              <input
                id="bgmUrl"
                type="url"
                value={bgmUrl}
                onChange={(e) => setBgmUrl(e.target.value)}
                placeholder="https://example.com/music.mp3"
                className={styles.bgmInput}
              />
            )}
            
            {audioError && (
              <div className={styles.errorMessage}>
                {audioError}
              </div>
            )}
            
            {/* 音声テスト用ボタン */}
            {selectedBgm !== 'custom' && selectedBgm !== '' && (
              <div className={styles.testControls}>
                {!isTestPlaying ? (
                  <button 
                    onClick={async () => {
                      const preset = bgmPresets.find(p => p.id === selectedBgm);
                      if (preset && preset.url) {
                        setIsTestPlaying(true);
                        try {
                          if (preset.url.startsWith('generated_')) {
                            await generateAmbientSound(preset.url);
                          } else {
                            // 外部音声ファイルのテスト再生
                            if (audioRef.current) {
                              audioRef.current.src = preset.url;
                              await audioRef.current.play();
                            }
                          }
                        } catch (error) {
                          console.error('テスト再生エラー:', error);
                          setAudioError('音声の再生に失敗しました。URLをご確認ください。');
                          setIsTestPlaying(false);
                        }
                      }
                    }}
                    className={styles.testButton}
                  >
                    🎵 音声テスト
                  </button>
                ) : (
                  <button 
                    onClick={() => {
                      stopGeneratedSound();
                      if (audioRef.current) {
                        audioRef.current.pause();
                      }
                    }}
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
            {timerState === 'idle' && '待機中'}
            {timerState === 'work' && '作業中'}
            {timerState === 'break' && '休憩中'}
            {timerState === 'paused' && '一時停止'}
          </div>
          <div className={styles.digitalClock}>
            {formatTime(timeLeft)}
          </div>
          {(timerState === 'work' || timerState === 'break') && (
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
          {timerState === 'idle' && (
            <button 
              onClick={startWorkTimer}
              className={`${styles.button} ${styles.startButton}`}
            >
              作業開始
            </button>
          )}
          
          {(timerState === 'work' || timerState === 'break') && (
            <button 
              onClick={pauseTimer}
              className={`${styles.button} ${styles.pauseButton}`}
            >
              一時停止
            </button>
          )}
          
          {timerState === 'paused' && (
            <button 
              onClick={resumeTimer}
              className={`${styles.button} ${styles.resumeButton}`}
            >
              再開
            </button>
          )}
          
          {timerState !== 'idle' && (
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
      {bgmUrl && (
        <audio
          ref={audioRef}
          src={bgmUrl}
          loop
          preload="metadata"
          style={{ display: 'none' }}
          onCanPlay={() => setAudioError('')}
          onError={(e) => {
            const error = `音声ファイルが読み込めません: ${bgmUrl}`;
            console.error(error, e);
            setAudioError(error);
          }}
        />
      )}
    </div>
  );
}
