import { appStore } from "@/stores/store";
import { getFrequency, parseNote } from "./calc";

interface AudioNodeChain {
  output: AudioNode;
  start: (when?: number) => void;
  stop: (when?: number) => void;
  setFrequency: (frequency: number, when?: number) => void;
}

// 频率转音符名称
function frequencyToNote(frequency: number): string {
  // 计算最接近的音符（基于A4=440Hz）
  const A4 = 440;
  const semitoneRatio = Math.pow(2, 1 / 12);

  // 计算相对于A4的半音数
  const semitonesFromA4 = Math.round(12 * Math.log2(frequency / A4));

  // A4对应的MIDI音符号是69，计算目标音符号
  const midiNote = 69 + semitonesFromA4;

  // 计算八度和音符名称
  const octave = Math.floor(midiNote / 12) - 1;
  const noteIndex = midiNote % 12;

  const noteNames = [
    "C",
    "C#",
    "D",
    "D#",
    "E",
    "F",
    "F#",
    "G",
    "G#",
    "A",
    "A#",
    "B",
  ];
  const noteName = noteNames[noteIndex];

  return `${noteName}${octave}`;
}

// 音符名称转频率
function noteToFrequency(note: string): number {
  try {
    const { note: noteName, octave } = parseNote(note);
    return getFrequency({ name: noteName, octave });
  } catch (error) {
    console.warn(`Invalid note format: ${note}`);
    return 440; // Default to A4
  }
}

export const soundPresets = {
  sine: {
    requiredResources: [],
    createNodes: (audioContext: AudioContext) => {
      // 创建振荡器

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      const filterNode = audioContext.createBiquadFilter();

      // Configure oscillator
      oscillator.type = "triangle";
      // Configure filter for more piano-like sound
      filterNode.type = "lowpass";

      // Connect nodes
      oscillator.connect(filterNode);
      filterNode.connect(gainNode);

      return {
        output: gainNode,
        start: (when = audioContext.currentTime) => {
          gainNode.gain.setValueAtTime(0, when);
          gainNode.gain.linearRampToValueAtTime(0.5, when + 0.01);
          gainNode.gain.exponentialRampToValueAtTime(0.15, when + 0.11);
          oscillator.start(when);
        },
        stop: (when = audioContext.currentTime) => {
          gainNode.gain.cancelScheduledValues(when);
          // 这里不能用 when，因为 gain.value 是当前的值，而不是 when 时候的值
          gainNode.gain.setValueAtTime(
            gainNode.gain.value,
            audioContext.currentTime
          );
          gainNode.gain.exponentialRampToValueAtTime(0.001, when + 0.3);
          oscillator.stop(when + 0.3);
        },
        setFrequency: (frequency: number, when = audioContext.currentTime) => {
          oscillator.frequency.setValueAtTime(frequency, when);
          filterNode.frequency.setValueAtTime(frequency * 3, when);
          filterNode.Q.setValueAtTime(1, when);
        },
      };
    },
  },

  piano: {
    requiredResources: ["piano"],
    createNodes: (audioContext: AudioContext) => {
      let currentSource: AudioBufferSourceNode | null = null;
      let currentGain: GainNode | null = null;

      const gainNode = audioContext.createGain();
      gainNode.gain.setValueAtTime(0.7, audioContext.currentTime); // 降低整体音量

      return {
        output: gainNode,
        start: (when = audioContext.currentTime) => {
          if (currentSource) {
            currentSource.start(when);
          }
        },
        stop: (when = audioContext.currentTime + 3) => {
          if (currentSource && currentGain) {
            currentGain.gain.cancelScheduledValues(when);
            currentGain.gain.setValueAtTime(
              currentGain.gain.value,
              audioContext.currentTime
            );
            currentGain.gain.exponentialRampToValueAtTime(0.001, when + 2);
            try {
              currentSource.stop(when + 2);
            } catch (e) {
              // 忽略已停止的音源错误
            }
          }
        },
        setFrequency: (frequency: number, when = audioContext.currentTime) => {
          // 如果 currentSource 不存在，先创建它
          if (!currentSource) {
            currentSource = audioContext.createBufferSource();
            currentGain = audioContext.createGain();

            // 连接音频节点：source -> filter -> gain -> output
            currentSource.connect(currentGain);
            currentGain.connect(gainNode);

            currentGain.gain.setValueAtTime(0.8, when);
          }

          // 将频率转换为音符名称
          const targetNote = frequencyToNote(frequency);

          // 获取最接近的采样
          const closestSample = appStore.resourceManager.getClosestSample(
            "piano",
            targetNote
          );

          console.log(closestSample);
          if (!closestSample) {
            console.warn("No piano samples available");
            return;
          }

          // 设置音频缓冲区
          currentSource.buffer = closestSample.buffer;

          // 计算音高调整比率
          const sampleFreq = noteToFrequency(closestSample.note);
          const pitchRatio = frequency / sampleFreq;

          currentSource.playbackRate.setValueAtTime(pitchRatio, when);
        },
      };
    },
  },
  guitar: {
    requiredResources: ["guitar"],
    createNodes: (audioContext: AudioContext) => {
      let currentSource: AudioBufferSourceNode | null = null;
      let currentGain: GainNode | null = null;

      const gainNode = audioContext.createGain();
      gainNode.gain.setValueAtTime(0.7, audioContext.currentTime); // 降低整体音量

      return {
        output: gainNode,
        start: (when = audioContext.currentTime) => {
          if (currentSource) {
            currentSource.start(when);
          }
        },
        stop: (when = audioContext.currentTime + 3) => {
          if (currentSource && currentGain) {
            currentGain.gain.cancelScheduledValues(when);
            currentGain.gain.setValueAtTime(
              currentGain.gain.value,
              audioContext.currentTime
            );
            currentGain.gain.exponentialRampToValueAtTime(0.001, when + 2);
            try {
              currentSource.stop(when + 2);
            } catch (e) {
              // 忽略已停止的音源错误
            }
          }
        },
        setFrequency: (frequency: number, when = audioContext.currentTime) => {
          if (!currentSource) {
            currentSource = audioContext.createBufferSource();
            currentGain = audioContext.createGain();

            // 连接音频节点：source -> filter -> gain -> output
            currentSource.connect(currentGain);
            currentGain.connect(gainNode);

            // 优化音量包络，吉他特有的攻击特性
            currentGain.gain.setValueAtTime(0.9, when);
          }

          const targetNote = frequencyToNote(frequency);
          const closestSample = appStore.resourceManager.getClosestSample(
            "guitar",
            targetNote
          );

          if (!closestSample) {
            console.warn("No guitar samples available");
            return;
          }
          currentSource.buffer = closestSample.buffer;

          const sampleFreq = noteToFrequency(closestSample.note);
          const pitchRatio = frequency / sampleFreq;

          currentSource.playbackRate.setValueAtTime(pitchRatio, when);
        },
      };
    },
  },
  //     let currentSource: AudioBufferSourceNode | null = null;
  //     let currentGain: GainNode | null = null;

  //     const gainNode = audioContext.createGain();
  //     gainNode.gain.setValueAtTime(0.7, audioContext.currentTime); // 降低整体音量

  //     return {
  //       output: gainNode,
  //       start: (when = audioContext.currentTime) => {
  //         if (currentSource) {
  //           currentSource.start(when);
  //         }
  //       },
  //       stop: (when = audioContext.currentTime + 3) => {
  //         if (currentSource) {
  //           try {
  //             currentSource.stop(when);
  //           } catch (e) {
  //             // 忽略已停止的音源错误
  //           }
  //         }
  //       },
  //       setFrequency: (frequency: number, when = audioContext.currentTime) => {
  //         if (!currentSource) {
  //           currentSource = audioContext.createBufferSource();
  //           currentGain = audioContext.createGain();

  //           // 连接音频节点：source -> filter -> gain -> output
  //           currentSource.connect(currentGain);
  //           currentGain.connect(gainNode);

  //           // 优化音量包络，爵士吉他特有的攻击特性
  //           currentGain.gain.setValueAtTime(0, when);
  //           currentGain.gain.linearRampToValueAtTime(0.85, when + 0.008); // 稍微柔和的攻击，模拟爵士吉他拨弦
  //           currentGain.gain.exponentialRampToValueAtTime(0.5, when + 0.4); // 较慢的初始衰减，更温暖的音色
  //           currentGain.gain.exponentialRampToValueAtTime(0.01, when + 3.0); // 较长的释放时间，更多的余音
  //         }

  //         const targetNote = frequencyToNote(frequency);
  //         const closestSample = appStore.resourceManager.getClosestSample(
  //           "jazz-guitar",
  //           targetNote
  //         );

  //         if (!closestSample) {
  //           console.warn("No jazz-guitar samples available");
  //           return;
  //         }
  //         currentSource.buffer = closestSample.buffer;

  //         const sampleFreq = noteToFrequency(closestSample.note);
  //         const pitchRatio = frequency / sampleFreq;

  //         currentSource.playbackRate.setValueAtTime(pitchRatio, when);
  //       },
  //     };
  //   },
  // },
  marimba: {
    requiredResources: ["marimba"],
    createNodes: (audioContext: AudioContext) => {
      let currentSource: AudioBufferSourceNode | null = null;
      let currentGain: GainNode | null = null;

      const gainNode = audioContext.createGain();
      gainNode.gain.setValueAtTime(0.7, audioContext.currentTime); // 降低整体音量

      return {
        output: gainNode,
        start: (when = audioContext.currentTime) => {
          if (currentSource) {
            currentSource.start(when);
          }
        },
        stop: (when = audioContext.currentTime + 3) => {
          if (currentSource && currentGain) {
            currentGain.gain.cancelScheduledValues(when);
            currentGain.gain.setValueAtTime(
              currentGain.gain.value,
              audioContext.currentTime
            );
            currentGain.gain.exponentialRampToValueAtTime(0.001, when + 1.5);
            try {
              currentSource.stop(when + 1.5);
            } catch (e) {
              // 忽略已停止的音源错误
            }
          }
        },
        setFrequency: (frequency: number, when = audioContext.currentTime) => {
          if (!currentSource) {
            currentSource = audioContext.createBufferSource();
            currentGain = audioContext.createGain();

            // 连接音频节点：source -> filter -> gain -> output
            currentSource.connect(currentGain);
            currentGain.connect(gainNode);

            // 优化音量包络，marimba 特有的攻击特性
            currentGain.gain.setValueAtTime(0.9, when);
          }

          const targetNote = frequencyToNote(frequency);
          const closestSample = appStore.resourceManager.getClosestSample(
            "marimba",
            targetNote
          );

          currentSource.buffer = closestSample.buffer;

          const sampleFreq = noteToFrequency(closestSample.note);
          const pitchRatio = frequency / sampleFreq;

          currentSource.playbackRate.setValueAtTime(pitchRatio, when);
        },
      };
    },
  },
  "8bit": {
    requiredResources: [],
    createNodes: (audioContext: AudioContext) => {
      let oscillator1: OscillatorNode | null = null;
      let oscillator2: OscillatorNode | null = null;
      let gainNode1: GainNode | null = null;
      let gainNode2: GainNode | null = null;
      let waveShaperNode: WaveShaperNode | null = null;

      const masterGain = audioContext.createGain();

      return {
        output: masterGain,
        start: (when = audioContext.currentTime) => {
          masterGain.gain.setValueAtTime(0, when);
          masterGain.gain.linearRampToValueAtTime(0.5, when + 0.01); // 8bit音色整体音量
          masterGain.gain.exponentialRampToValueAtTime(0.001, when + 1);

          if (oscillator1 && oscillator2) {
            oscillator1.start(when);
            oscillator2.start(when);
          }
        },
        stop: (when = audioContext.currentTime + 0.5) => {
          if (oscillator1 && oscillator2) {
            masterGain.gain.cancelScheduledValues(when);
            masterGain.gain.setValueAtTime(
              masterGain.gain.value,
              audioContext.currentTime
            );
            masterGain.gain.exponentialRampToValueAtTime(0.001, when + 1);
            try {
              oscillator1.stop(when + 0.5);
              oscillator2.stop(when + 0.5);
            } catch (e) {
              // 忽略已停止的振荡器错误
            }
          }
        },
        setFrequency: (frequency: number, when = audioContext.currentTime) => {
          // 创建纯粹的8bit音色
          oscillator1 = audioContext.createOscillator();
          oscillator2 = audioContext.createOscillator();
          gainNode1 = audioContext.createGain();
          gainNode2 = audioContext.createGain();
          waveShaperNode = audioContext.createWaveShaper();

          // 主振荡器：纯方波，更尖锐
          oscillator1.type = "square";
          oscillator1.frequency.setValueAtTime(frequency, when);

          // 副振荡器：脉冲波模拟，更大失谐增加粗糙感
          oscillator2.type = "square";
          oscillator2.frequency.setValueAtTime(frequency * 1.02, when); // 更大的失谐

          // 创建数字失真效果，模拟8bit DAC的量化噪声
          const curve = new Float32Array(65536);
          for (let i = 0; i < 65536; i++) {
            const x = (i - 32768) / 32768;
            // 8bit量化效果：将信号量化到256个级别
            const quantized = Math.round(x * 127) / 127;
            curve[i] =
              Math.sign(quantized) * Math.pow(Math.abs(quantized), 0.8); // 轻微压缩
          }
          waveShaperNode.curve = curve;
          waveShaperNode.oversample = "none"; // 不使用过采样，保持数字感

          // 音量配置，突出方波的尖锐特性
          gainNode1.gain.setValueAtTime(0.8, when); // 主方波更突出
          gainNode2.gain.setValueAtTime(0.2, when); // 副方波作为失真层

          // 连接音频节点：直接连接，不使用滤波器
          oscillator1.connect(gainNode1);
          oscillator2.connect(gainNode2);
          gainNode1.connect(waveShaperNode);
          gainNode2.connect(waveShaperNode);
          waveShaperNode.connect(masterGain);

          // 8bit特有的即时攻击
          masterGain.gain.setValueAtTime(0.7, when);
        },
      };
    },
  },
};
