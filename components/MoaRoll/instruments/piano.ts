import { BaseInstrument } from "./base";
import { MoaSynth, MoaTime, MoaTimeType } from "../../../utils/MoaTone";
import { appStore } from "@/stores/store";

export class Piano extends BaseInstrument {
  synth: MoaSynth;

  constructor() {
    super();
    this.synth = new MoaSynth({
      preset: appStore.audioPreset["piano"],
    }).toDestination();
  }

  triggerAttack(value: string, time: MoaTimeType | undefined): void {
    this.synth.setPreset(appStore.audioPreset["piano"]);
    const timeInSeconds =
      time !== undefined
        ? typeof time === "string"
          ? MoaTime.toSeconds(time)
          : time
        : undefined;
    this.synth.triggerAttack(value, timeInSeconds);
  }

  triggerRelease(value: string, time: MoaTimeType | undefined): void {
    const timeInSeconds =
      time !== undefined
        ? typeof time === "string"
          ? MoaTime.toSeconds(time)
          : time
        : undefined;
    this.synth.triggerRelease(value, timeInSeconds);
  }

  releaseAll(): void {
    this.synth.releaseAll();
  }
}
