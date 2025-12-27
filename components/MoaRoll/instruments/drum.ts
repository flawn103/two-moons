import { BaseInstrument } from "./base";
import {
  MoaMembraneSynth,
  MoaNoiseSynth,
  MoaTimeType,
} from "../../../utils/MoaTone";

interface DrumInstrument {
  triggerAttack(time: MoaTimeType | undefined): void;
  triggerRelease(time: MoaTimeType | undefined): void;
}

class Kick implements DrumInstrument {
  synth: MoaMembraneSynth;
  triggerAttack(time: MoaTimeType | undefined): void {
    this.synth.triggerAttack("C2", time);
  }
  triggerRelease(time: MoaTimeType | undefined): void {}

  constructor() {
    this.synth = new MoaMembraneSynth().toDestination();
  }
}

class Snare implements DrumInstrument {
  synth: MoaNoiseSynth;

  triggerAttack(time: MoaTimeType | undefined) {
    this.synth.triggerAttack("", time);
  }
  triggerRelease(time: MoaTimeType | undefined) {}

  constructor() {
    this.synth = new MoaNoiseSynth({
      noise: {
        type: "white",
      },
      envelope: {
        attack: 0.005,
        decay: 0.1,
        sustain: 0.15,
      },
    }).toDestination();
  }
}

export class Drum extends BaseInstrument {
  static isNoise = true;
  kick = new Kick();
  snare = new Snare();

  static getDrumKitKeys() {
    return ["kick", "snare"];
  }

  triggerAttack(value: string, time: MoaTimeType | undefined): void {
    if (value === "kick") {
      this.kick.triggerAttack(time);
    } else if (value === "snare") {
      this.snare.triggerAttack(time);
    }
  }

  triggerRelease(value: string, time: MoaTimeType | undefined): void {
    if (value === "kick") {
      this.kick.triggerRelease(time);
    } else if (value === "snare") {
      this.snare.triggerRelease(time);
    }
  }

  releaseAll(): void {
    // Drums don't need to release all notes
  }
}
