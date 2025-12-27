const genNotes = () => {
  const ranges = [2, 3, 4, 5];
  const notes = ["C", "D", "E", "F", "G", "A", "B"];

  const re: string[] = [];
  ranges.forEach((range) => {
    notes.forEach((note) => {
      re.push(note + range);
    });
  });

  return re;
};

export const NOTES_STRS = genNotes();
