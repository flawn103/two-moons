import { InstrumentData } from "@/typings/chordEditor";

export const DEFAULT_COLLECTIONS = [
  {
    id: "fly-me-to-the-moon",
    name: "Fly Me To The Moon",
    ids: [
      "57c6e3ed-91fd-4fdc-993a-9faa862af607",
      "842335c8-1b5f-4fb6-af74-ef23d7e11887",
      "8affa60b-a679-40f9-bd45-cc7a8e4553bd",
      "c9314a28-822a-4d84-9244-1a0db2e201be",
      "2f599d10-320c-4709-b0fd-23f0e824c863",
      "b07d4a1f-d106-45a5-b6ef-30a202c3c6ef",
      "b083eb23-4d55-45d8-a29a-097966673b1d",
      "083df96d-3b15-481e-af10-180df63ae6ac",
      "16069ee8-8285-43ce-8055-60510794b95e",
      "fa12102d-d60e-4815-8339-a9dbca77aeb4",
      "3fd3d970-c98b-4205-a030-0b1969579926",
      "94e2a9ba-9330-449d-b55c-75865b2adb61",
      "2868fc31-651d-48fe-b820-84db758b6f14",
      "98b3d4a5-95fc-4763-9b80-9e94707019dc",
      "f4a76770-c51a-4a30-986b-fbc622f4af35",
      "8bed0cdb-4d3d-4bdc-851e-e3f77a5ea9b1",
      "7e09662f-5293-4485-a169-dd965e6af784",
      "aba2ecd2-59a1-4f5c-93e6-b7e360750467",
    ],
    lengths: [1, 1, 1, 1, 1, 1, 1, 0.5, 0.5, 1, 1, 1, 1, 1, 1, 1, 0.5, 0.5],
    instrument: "guitar",
    playConfig: {
      beats: 4,
      bpm: 110,
      rhythmPattern: [
        {
          type: "root",
          time: 0,
        },
        {
          type: "high",
          time: 0.25,
        },
        {
          type: "root",
          time: 0.375,
        },
        {
          type: "root",
          time: 0.5,
        },
        {
          type: "high",
          time: 0.625,
        },
        {
          type: "root",
          time: 0.875,
        },
      ],
    },
  },
];

export const DEFAULT_FAVORITES: InstrumentData[] = [
  {
    notes: [
      {
        name: "A",
        octave: 3,
      },
      {
        name: "C",
        octave: 4,
      },
      {
        name: "E",
        octave: 4,
      },
      {
        name: "G",
        octave: 4,
      },
    ],
    range: {
      start: 4,
      end: 8,
    },
    userSelectedRoot: null,
    rawData: null,
    guitarData: [
      {
        string: 0,
        fret: 5,
      },
      {
        string: 1,
        fret: 7,
      },
      {
        string: 4,
        fret: 5,
      },
      {
        string: 2,
        fret: 5,
      },
      {
        string: 3,
        fret: 5,
      },
    ],
    pianoUserSelectedRoot: {
      name: "A",
      octave: 3,
    },
    id: "57c6e3ed-91fd-4fdc-993a-9faa862af607",
    name: "Amin7",
  },
  {
    notes: [
      {
        name: "G",
        octave: 3,
      },
      {
        name: "B",
        octave: 3,
      },
      {
        name: "D",
        octave: 4,
      },
      {
        name: "F",
        octave: 4,
      },
    ],
    range: {
      start: 2,
      end: 6,
    },
    userSelectedRoot: null,
    rawData: null,
    guitarData: [
      {
        string: 0,
        fret: 3,
      },
      {
        string: 1,
        fret: 5,
      },
      {
        string: 3,
        fret: 4,
      },
      {
        string: 2,
        fret: 3,
      },
      {
        string: 4,
        fret: 3,
      },
    ],
    pianoUserSelectedRoot: {
      name: "G",
      octave: 3,
    },
    id: "8affa60b-a679-40f9-bd45-cc7a8e4553bd",
    name: "G7",
  },
  {
    notes: [
      {
        name: "C",
        octave: 3,
      },
      {
        name: "E",
        octave: 3,
      },
      {
        name: "G",
        octave: 3,
      },
      {
        name: "B",
        octave: 3,
      },
    ],
    range: {
      start: 2,
      end: 6,
    },
    userSelectedRoot: null,
    rawData: null,
    guitarData: [
      {
        string: 1,
        fret: 3,
      },
      {
        string: 2,
        fret: 5,
      },
      {
        string: 4,
        fret: 5,
      },
      {
        string: 3,
        fret: 4,
      },
      {
        string: 5,
        fret: 3,
      },
    ],
    pianoUserSelectedRoot: {
      name: "C",
      octave: 3,
    },
    id: "c9314a28-822a-4d84-9244-1a0db2e201be",
    name: "Cmaj7",
  },
  {
    notes: [
      {
        name: "F",
        octave: 3,
      },
      {
        name: "A",
        octave: 3,
      },
      {
        name: "C",
        octave: 4,
      },
      {
        name: "E",
        octave: 4,
      },
    ],
    range: {
      start: 0,
      end: 4,
    },
    userSelectedRoot: null,
    rawData: null,
    guitarData: [
      {
        string: 4,
        fret: 1,
      },
      {
        string: 0,
        fret: 1,
      },
      {
        string: 2,
        fret: 2,
      },
      {
        string: 3,
        fret: 2,
      },
    ],
    pianoUserSelectedRoot: {
      name: "F",
      octave: 3,
    },
    id: "2f599d10-320c-4709-b0fd-23f0e824c863",
    name: "Fmaj7",
  },
  {
    notes: [
      {
        name: "D",
        octave: 4,
      },
      {
        name: "F",
        octave: 4,
      },
      {
        name: "A",
        octave: 4,
      },
      {
        name: "B",
        octave: 3,
      },
    ],
    range: {
      start: 6,
      end: 10,
    },
    userSelectedRoot: null,
    rawData: null,
    guitarData: [
      {
        string: 0,
        fret: 7,
      },
      {
        string: 1,
        fret: 8,
      },
      {
        string: 2,
        fret: 7,
      },
      {
        string: 3,
        fret: 7,
      },
    ],
    pianoUserSelectedRoot: null,
    id: "b07d4a1f-d106-45a5-b6ef-30a202c3c6ef",
    name: "Bm7b5",
  },
  {
    notes: [
      {
        name: "E",
        octave: 3,
      },
      {
        name: "G#",
        octave: 3,
      },
      {
        name: "B",
        octave: 3,
      },
      {
        name: "D",
        octave: 4,
      },
    ],
    range: {
      start: 6,
      end: 10,
    },
    userSelectedRoot: null,
    rawData: null,
    guitarData: [
      {
        string: 1,
        fret: 7,
      },
      {
        string: 2,
        fret: 9,
      },
      {
        string: 4,
        fret: 9,
      },
      {
        string: 3,
        fret: 7,
      },
      {
        string: 5,
        fret: 7,
      },
    ],
    pianoUserSelectedRoot: {
      name: "E",
      octave: 3,
    },
    id: "b083eb23-4d55-45d8-a29a-097966673b1d",
    name: "E7",
  },
  {
    notes: [
      {
        name: "A",
        octave: 3,
      },
      {
        name: "C",
        octave: 4,
      },
      {
        name: "E",
        octave: 4,
      },
      {
        name: "G",
        octave: 4,
      },
    ],
    range: {
      start: 4,
      end: 8,
    },
    userSelectedRoot: null,
    rawData: null,
    guitarData: [
      {
        string: 0,
        fret: 5,
      },
      {
        string: 1,
        fret: 7,
      },
      {
        string: 2,
        fret: 5,
      },
      {
        string: 4,
        fret: 5,
      },
      {
        string: 3,
        fret: 5,
      },
    ],
    pianoUserSelectedRoot: {
      name: "A",
      octave: 3,
    },
    id: "083df96d-3b15-481e-af10-180df63ae6ac",
    name: "Amin7",
  },
  {
    notes: [
      {
        name: "A",
        octave: 3,
      },
      {
        name: "C",
        octave: 4,
      },
      {
        name: "E",
        octave: 4,
      },
      {
        name: "G",
        octave: 4,
      },
    ],
    range: {
      start: 4,
      end: 8,
    },
    userSelectedRoot: null,
    rawData: null,
    guitarData: [
      {
        string: 0,
        fret: 5,
      },
      {
        string: 1,
        fret: 7,
      },
      {
        string: 3,
        fret: 6,
      },
      {
        string: 4,
        fret: 5,
      },
      {
        string: 2,
        fret: 5,
      },
    ],
    pianoUserSelectedRoot: {
      name: "A",
      octave: 3,
    },
    id: "2868fc31-651d-48fe-b820-84db758b6f14",
    name: "A7",
  },
  {
    notes: [
      {
        name: "D",
        octave: 4,
      },
      {
        name: "F",
        octave: 4,
      },
      {
        name: "A",
        octave: 4,
      },
      {
        name: "C",
        octave: 5,
      },
    ],
    range: {
      start: 4,
      end: 8,
    },
    userSelectedRoot: null,
    rawData: null,
    guitarData: [
      {
        string: 1,
        fret: 5,
      },
      {
        string: 2,
        fret: 7,
      },
      {
        string: 4,
        fret: 6,
      },
      {
        string: 5,
        fret: 5,
      },
      {
        string: 3,
        fret: 5,
      },
    ],
    pianoUserSelectedRoot: null,
    id: "fa12102d-d60e-4815-8339-a9dbca77aeb4",
    name: "Dmin7",
  },
  {
    notes: [
      {
        name: "G",
        octave: 3,
      },
      {
        name: "B",
        octave: 3,
      },
      {
        name: "D",
        octave: 4,
      },
      {
        name: "F",
        octave: 4,
      },
    ],
    range: {
      start: 2,
      end: 6,
    },
    userSelectedRoot: null,
    rawData: null,
    guitarData: [
      {
        string: 0,
        fret: 3,
      },
      {
        string: 1,
        fret: 5,
      },
      {
        string: 3,
        fret: 4,
      },
      {
        string: 2,
        fret: 3,
      },
      {
        string: 4,
        fret: 3,
      },
    ],
    pianoUserSelectedRoot: {
      name: "G",
      octave: 3,
    },
    id: "3fd3d970-c98b-4205-a030-0b1969579926",
    name: "G7",
  },
  {
    notes: [
      {
        name: "A",
        octave: 3,
      },
      {
        name: "E",
        octave: 4,
      },
      {
        name: "G",
        octave: 4,
      },
      {
        name: "C#",
        octave: 4,
      },
    ],
    range: {
      start: 4,
      end: 8,
    },
    userSelectedRoot: null,
    rawData: null,
    guitarData: [
      {
        string: 0,
        fret: 5,
      },
      {
        string: 1,
        fret: 7,
      },
      {
        string: 3,
        fret: 6,
      },
      {
        string: 2,
        fret: 5,
      },
      {
        string: 4,
        fret: 5,
      },
    ],
    pianoUserSelectedRoot: null,
    id: "16069ee8-8285-43ce-8055-60510794b95e",
    name: "A7",
  },
  {
    notes: [
      {
        name: "D",
        octave: 4,
      },
      {
        name: "F",
        octave: 4,
      },
      {
        name: "A",
        octave: 4,
      },
      {
        name: "C",
        octave: 5,
      },
    ],
    range: {
      start: 4,
      end: 8,
    },
    userSelectedRoot: null,
    rawData: null,
    guitarData: [
      {
        string: 1,
        fret: 5,
      },
      {
        string: 2,
        fret: 7,
      },
      {
        string: 4,
        fret: 6,
      },
      {
        string: 5,
        fret: 5,
      },
      {
        string: 3,
        fret: 5,
      },
    ],
    pianoUserSelectedRoot: null,
    id: "98b3d4a5-95fc-4763-9b80-9e94707019dc",
    name: "Dmin7",
  },
  {
    notes: [
      {
        name: "C",
        octave: 4,
      },
      {
        name: "E",
        octave: 4,
      },
      {
        name: "G",
        octave: 4,
      },
      {
        name: "B",
        octave: 4,
      },
    ],
    range: {
      start: 2,
      end: 6,
    },
    userSelectedRoot: null,
    rawData: null,
    guitarData: [
      {
        string: 1,
        fret: 3,
      },
      {
        string: 2,
        fret: 5,
      },
      {
        string: 4,
        fret: 5,
      },
      {
        string: 3,
        fret: 4,
      },
      {
        string: 5,
        fret: 3,
      },
    ],
    pianoUserSelectedRoot: null,
    id: "94e2a9ba-9330-449d-b55c-75865b2adb61",
    name: "Cmaj7",
  },
  {
    notes: [
      {
        name: "D",
        octave: 4,
      },
      {
        name: "F",
        octave: 4,
      },
      {
        name: "A",
        octave: 4,
      },
      {
        name: "B",
        octave: 3,
      },
    ],
    range: {
      start: 6,
      end: 10,
    },
    userSelectedRoot: null,
    rawData: null,
    guitarData: [
      {
        string: 0,
        fret: 7,
      },
      {
        string: 1,
        fret: 8,
      },
      {
        string: 2,
        fret: 7,
      },
      {
        string: 3,
        fret: 7,
      },
    ],
    pianoUserSelectedRoot: null,
    id: "7e09662f-5293-4485-a169-dd965e6af784",
    name: "Bm7b5",
  },
  {
    notes: [
      {
        name: "E",
        octave: 3,
      },
      {
        name: "G#",
        octave: 3,
      },
      {
        name: "B",
        octave: 3,
      },
      {
        name: "D",
        octave: 4,
      },
    ],
    range: {
      start: 6,
      end: 10,
    },
    userSelectedRoot: null,
    rawData: null,
    guitarData: [
      {
        string: 1,
        fret: 7,
      },
      {
        string: 2,
        fret: 9,
      },
      {
        string: 4,
        fret: 9,
      },
      {
        string: 3,
        fret: 7,
      },
      {
        string: 5,
        fret: 7,
      },
    ],
    pianoUserSelectedRoot: {
      name: "E",
      octave: 3,
    },
    id: "aba2ecd2-59a1-4f5c-93e6-b7e360750467",
    name: "E7",
  },
  {
    notes: [
      {
        name: "G",
        octave: 3,
      },
      {
        name: "B",
        octave: 3,
      },
      {
        name: "D",
        octave: 4,
      },
      {
        name: "F",
        octave: 4,
      },
    ],
    range: {
      start: 2,
      end: 6,
    },
    userSelectedRoot: null,
    rawData: null,
    guitarData: [
      {
        string: 0,
        fret: 3,
      },
      {
        string: 1,
        fret: 5,
      },
      {
        string: 3,
        fret: 4,
      },
      {
        string: 2,
        fret: 3,
      },
      {
        string: 4,
        fret: 3,
      },
    ],
    pianoUserSelectedRoot: {
      name: "G",
      octave: 3,
    },
    id: "f4a76770-c51a-4a30-986b-fbc622f4af35",
    name: "G7",
  },
  {
    notes: [
      {
        name: "C",
        octave: 4,
      },
      {
        name: "E",
        octave: 4,
      },
      {
        name: "G",
        octave: 4,
      },
      {
        name: "B",
        octave: 4,
      },
    ],
    range: {
      start: 2,
      end: 6,
    },
    userSelectedRoot: null,
    rawData: null,
    guitarData: [
      {
        string: 1,
        fret: 3,
      },
      {
        string: 2,
        fret: 5,
      },
      {
        string: 4,
        fret: 5,
      },
      {
        string: 3,
        fret: 4,
      },
      {
        string: 5,
        fret: 3,
      },
    ],
    pianoUserSelectedRoot: null,
    id: "8bed0cdb-4d3d-4bdc-851e-e3f77a5ea9b1",
    name: "Cmaj7",
  },
  {
    notes: [
      {
        name: "D",
        octave: 3,
      },
      {
        name: "F",
        octave: 3,
      },
      {
        name: "A",
        octave: 3,
      },
      {
        name: "C",
        octave: 4,
      },
    ],
    range: {
      start: 4,
      end: 8,
    },
    userSelectedRoot: null,
    rawData: null,
    guitarData: [
      {
        string: 1,
        fret: 5,
      },
      {
        string: 2,
        fret: 7,
      },
      {
        string: 4,
        fret: 6,
      },
      {
        string: 5,
        fret: 5,
      },
      {
        string: 3,
        fret: 5,
      },
    ],
    pianoUserSelectedRoot: {
      name: "D",
      octave: 3,
    },
    id: "842335c8-1b5f-4fb6-af74-ef23d7e11887",
    name: "Dmin7",
  },
];
