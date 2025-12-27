import { MoaTimeType } from "../../../utils/MoaTone";

export abstract class BaseInstrument {
  static isNoise?: boolean | undefined;
  abstract releaseAll(): void;
  abstract triggerAttack(value: string, time: MoaTimeType | undefined): void;
  abstract triggerRelease(value: string, time: MoaTimeType | undefined): void;
}
