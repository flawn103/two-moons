# StaffNotation Component Documentation

## Overview

The `StaffNotation` component is a staff notation rendering component based on the ABCJS library, supporting ABC notation display and note highlighting functionality.

## Component Props

```typescript
interface AbcStaffNotationProps {
  root?: string;           // Root note, default "C4"
  str: string;            // ABC notation string
  needConvert?: boolean;   // Whether conversion is needed (unused currently)
  concise?: boolean;      // Whether to use concise mode
  highlightNoteIndex?: number; // Highlight note index, -1 means no highlight
}
```

## Highlighting Functionality

### Highlight Logic

1. **Trigger Condition**: Triggered when the `highlightNoteIndex` prop changes.
2. **Clear Logic**: Clears all existing highlights (`.abcjs-highlight` class) before each update.
3. **Apply Highlight**: When `highlightNoteIndex >= 0`, highlights the note at the corresponding index.
4. **Clear Highlight**: When `highlightNoteIndex = -1`, only clears highlights without adding new ones.

### Highlight Scope

- **Notes**: All notes defined in ABC notation will be highlighted.
- **Rests**: Now supports highlighting rests. Rests are represented by 'z' in ABC notation.
- **Mechanism**: The highlight index corresponds directly to the element index in the `currentRhythm` array, including both notes and rests.

### Highlight Style

```css
.abcjs-highlight {
  fill: #ff6b6b !important;      /* Red fill */
  stroke: #ff6b6b !important;    /* Red stroke */
  opacity: 0.8;                  /* 80% opacity */
}
```

## Usage Example

### Basic Usage

```tsx
<AbcStaffNotation 
  str="L:1/4\nC C2 C/2 C/4" 
/>
```

### Usage with Highlighting

```tsx
<AbcStaffNotation 
  str="L:1/4\nC C2 C/2 C/4"
  highlightNoteIndex={currentNoteIndex}
/>
```

## Technical Implementation

### ABCJS Integration

- Uses `ABCJS.renderAbc()` to render the staff notation.
- Saves the render result to `visualObjRef` for highlight operations.
- Supports responsive layout and mobile adaptation.

### Highlight Implementation Principle

1. **DOM Lookup**: Locates note elements through the data structure of the ABCJS render result.
2. **Path Navigation**: `visualObj.lines[0].staff[0].voices[0][index]`.
3. **Element Manipulation**: Gets SVG elements via `abselem.elemset` and adds the CSS class.

### Error Handling

- Wraps highlight logic in try-catch.
- Outputs error information to the console for debugging.
- Highlight failure does not affect the normal display of the staff notation.

## Notes

1. **Index Correspondence**: The highlight index must match the order of notes and rests in the ABC notation.
2. **Performance Consideration**: Every highlight update re-looks up and manipulates DOM elements.
3. **Compatibility**: Depends on the internal data structure of the ABCJS library, which may be affected by version updates.
4. **Rest Support**: Fully supports rest highlighting, including:
   - `RhythmNote` interface includes a `type` field to distinguish between notes and rests.
   - `rhythmToAbc` function supports generating rests (z).
   - Highlight logic handles all types of rhythm elements.

## Related Files

- `components/StaffNotation/index.tsx` - Component implementation
- `stores/rhythmStore.ts` - Highlight state management
- `components/Practice/RandomRhythm.tsx` - Usage example
