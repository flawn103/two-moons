import { useState, useEffect, useRef } from "react";
import Head from "next/head";
import { Midi } from "@tonejs/midi";
import {
  BasicPitch,
  noteFramesToTime,
  addPitchBendsToNoteEvents,
  outputToNotesPoly,
} from "@spotify/basic-pitch";
import { Card, Button, Tabs, Upload, message, Spin, Space } from "antd";
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  UploadOutlined,
  AudioOutlined,
  StopOutlined,
} from "@ant-design/icons";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { GetStaticProps } from "next";
import { useSnapshot } from "valtio";
import { midiStore, midiActions } from "@/stores/midiPageStore";
import { MidiData, MidiNote } from "@/typings/midi";
import styles from "./index.module.scss";
import { convertMidiToTimeData } from "@/utils/midiConverter";
import { MidiPianoRoll } from "@/components/MidiEditor/components/midi-roll";
import { v4 } from "uuid";

interface RecordingState {
  isRecording: boolean;
  isProcessing: boolean;
  transcription?: any;
}

const { TabPane } = Tabs;

interface RecordingState {
  isRecording: boolean;
  isProcessing: boolean;
}

export default function MidiPage() {
  const { t } = useTranslation("common");
  const storeSnapshot = useSnapshot(midiStore);

  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    isProcessing: false,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const basicPitchRef = useRef<BasicPitch | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    initializeBasicPitch();

    // 添加默认空MIDI
    if (midiStore.midiArr.length === 0) {
      const defaultMidi: MidiData = {
        name: "新MIDI文件",
        id: `default-${Date.now()}`,
        total: 16 * 4, // 4拍
        notes: [], // 空音符列表
        tempo: 120, // 默认BPM
      };
      midiActions.addMidi(defaultMidi);
    }

    return () => {
      // 清理资源
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const initializeBasicPitch = async () => {
    try {
      const modelPath =
        "https://unpkg.com/@spotify/basic-pitch@1.0.1/model/model.json";
      const basicPitch = new BasicPitch(modelPath);
      basicPitchRef.current = basicPitch;
      console.log("Basic Pitch initialized successfully");
    } catch (error) {
      console.error("Failed to initialize Basic Pitch:", error);
      message.error("Basic Pitch初始化失败");
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 22050,
        },
      });

      streamRef.current = stream;
      audioContextRef.current = new AudioContext({ sampleRate: 22050 });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });

      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        await processAudioWithBasicPitch(blob);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();

      setRecordingState((prev) => ({ ...prev, isRecording: true }));
      message.success("开始录音...");
    } catch (error) {
      console.error("录音启动失败:", error);
      message.error("无法启动录音，请检查麦克风权限");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recordingState.isRecording) {
      mediaRecorderRef.current.stop();
      setRecordingState((prev) => ({ ...prev, isRecording: false }));
      message.info("录音停止，正在处理音频...");
    }
  };

  const processAudioWithBasicPitch = async (audioBlob: Blob) => {
    if (!basicPitchRef.current) {
      message.error("Basic Pitch未初始化");
      return;
    }

    try {
      setRecordingState((prev) => ({ ...prev, isProcessing: true }));
      const basicPitch = basicPitchRef.current;
      const frames: number[][] = [];
      const onsets: number[][] = [];
      const contours: number[][] = [];

      // 将Blob转换为AudioBuffer
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer =
        await audioContextRef.current?.decodeAudioData(arrayBuffer);

      await basicPitch.evaluateModel(
        audioBuffer,
        (f: number[][], o: number[][], c: number[][]) => {
          frames.push(...f);
          onsets.push(...o);
          contours.push(...c);
        },
        (p: number) => {
          console.log({ p });
        }
      );

      const rawNotes = noteFramesToTime(
        addPitchBendsToNoteEvents(contours, outputToNotesPoly(frames, onsets))
      );

      function trimEmptyTime(notes: any[]) {
        if (!notes.length) return notes;
        const firstNoteTime = Math.min(
          ...notes.map((note) => note.startTimeSeconds)
        );
        return notes.map((note) => ({
          ...note,
          startTimeSeconds: note.startTimeSeconds - firstNoteTime,
        }));
      }

      const trimmedNotes = trimEmptyTime(rawNotes);

      // 时间转换函数：将秒转换为 beat 数
      const tempo = 120; // 默认 BPM
      const secondsToBeats = (seconds: number) => {
        const beatsPerSecond = tempo / 60;
        return seconds * beatsPerSecond;
      };

      // 转换为 MidiData 格式，所有时间都转换为 beat 数
      const midiNotes: MidiNote[] = trimmedNotes.map((note, index) => ({
        id: `note-${Date.now()}-${index}`,
        pitch: Math.round(note.pitchMidi),
        start: secondsToBeats(note.startTimeSeconds), // 转换为 beat 数
        duration: secondsToBeats(note.durationSeconds), // 转换为 beat 数
        velocity: Math.round((note.amplitude || 0.8) * 127),
      }));

      const duration =
        midiNotes.length > 0
          ? Math.max(...midiNotes.map((note) => note.start + note.duration))
          : 0;

      const midiData: MidiData = {
        name: `录音 ${new Date().toLocaleTimeString()}`,
        notes: midiNotes,
        total: duration, // duration 现在也是 beat 数
        id: v4(),
        tempo: tempo,
      };

      // 添加到 store
      midiActions.addMidi(midiData);

      console.log("转换后的 MIDI 数据:", midiData);

      setRecordingState((prev) => ({
        ...prev,
        isProcessing: false,
      }));

      message.success(`音频转录完成，检测到 ${midiNotes.length} 个音符`);
    } catch (error) {
      console.error("音频处理失败:", error);
      setRecordingState((prev) => ({ ...prev, isProcessing: false }));
      message.error("音频转录失败，请重试");
    }
  };

  return (
    <>
      <Head>
        <title>{t("MIDI文件分析器")}</title>
        <meta name="description" content={t("MIDI文件分析器")} />
      </Head>

      <div className={styles.container} style={{ padding: 24 }}>
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          {/* 录音功能区域 */}
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            <div style={{ textAlign: "center" }}>
              <Space>
                <Button
                  type="primary"
                  icon={<AudioOutlined />}
                  onClick={startRecording}
                  disabled={
                    recordingState.isRecording || recordingState.isProcessing
                  }
                  loading={recordingState.isRecording}
                >
                  {t("开始录音")}
                </Button>
                <Button
                  type="default"
                  icon={<StopOutlined />}
                  onClick={stopRecording}
                  disabled={!recordingState.isRecording}
                  danger
                >
                  {t("停止录音")}
                </Button>
              </Space>
            </div>

            {/* 处理状态 */}
            {recordingState.isProcessing && (
              <div style={{ textAlign: "center" }}>
                <Spin tip={t("正在处理音频...")} />
              </div>
            )}

            {/* 录音状态提示 */}
            {storeSnapshot.midiArr.length === 0 &&
              !recordingState.isProcessing && (
                <div style={{ textAlign: "center", color: "#666" }}>
                  <p>{t("开始录音或编辑下方的空MIDI文件")}</p>
                </div>
              )}
          </Space>

          {/* MIDI 列表 */}
          {storeSnapshot.midiArr.length > 0 && (
            <Space direction="vertical" size="middle" style={{ width: "100%" }}>
              {midiStore.midiArr.map((midiData, index) => (
                <MidiPianoRoll
                  key={`midi-${index}`}
                  id={midiData.id}
                  data={midiData}
                />
              ))}
            </Space>
          )}
        </Space>
      </div>
    </>
  );
}

export const getStaticProps: GetStaticProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? "zh", ["common"])),
    },
  };
};
