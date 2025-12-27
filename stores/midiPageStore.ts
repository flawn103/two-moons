import { proxy } from "valtio";
import { MidiData } from "@/typings/midi";

interface MidiState {
  midiArr: MidiData[];
}

export const midiStore = proxy<MidiState>({
  midiArr: [],
});

export const midiActions = {
  addMidi: (midiData: MidiData) => {
    midiStore.midiArr.push(midiData);
  },

  removeMidi: (index: number) => {
    if (index >= 0 && index < midiStore.midiArr.length) {
      midiStore.midiArr.splice(index, 1);
    }
  },

  updateMidi: (index: number, midiData: MidiData) => {
    if (index >= 0 && index < midiStore.midiArr.length) {
      midiStore.midiArr[index] = midiData;
    }
  },

  clearMidis: () => {
    midiStore.midiArr.length = 0;
  },
};
