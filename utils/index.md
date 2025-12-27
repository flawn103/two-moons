# Utils Directory

## Overview

The Utils directory contains various utility functions and tools for the application, covering audio processing, music theory, data conversion, storage management, and other functional modules.

## Core Feature Classification

### Audio and Music Processing

| File Path | Description | Main Function |
|-----------|-------------|---------------|
| `AudioResourceManager.ts` | Audio Resource Manager | Audio file loading, caching, and playback control |
| `MoaTone.ts` | MoaTone Audio Engine | Core audio playback and synthesis functions |
| `soundPresets.ts` | Audio Preset Management | Timbre presets and audio parameter configuration |
| `midiConverter.ts` | MIDI Converter | MIDI data parsing and conversion |
| `midiExporter.ts` | MIDI Exporter | MIDI data export functionality |

### Music Theory and Calculation

| File Path | Description | Main Function |
|-----------|-------------|---------------|
| `calc.ts` | Music Calculation Tools | Music theory calculations for intervals, chords, scales, etc. |
| `chord.ts` | Chord Tools | Chord recognition, construction, and analysis |
| `music.ts` | Music Tools | General music-related utility functions |
| `musicParser.ts` | Music Parser | Music symbol and format parsing |
| `note.ts` | Note Tools | Note processing and conversion |

### Data Storage and Management

| File Path | Description | Main Function |
|-----------|-------------|---------------|
| `indexedDB.ts` | IndexedDB Management | Local database operations and data persistence |
| `importUtils.ts` | Import Tools | Data import and format conversion |
| `abcConverter.ts` | ABC Notation Converter | ABC music format conversion |

### System and Tools

| File Path | Description | Main Function |
|-----------|-------------|---------------|
| `env.ts` | Environment Variable Tools | Environment configuration and management |
| `crypto.ts` | Encryption Tools | Data encryption and decryption |
| `dndkit.ts` | Drag and Drop Tools | Drag and drop interaction support |
| `number.ts` | Number Tools | Number formatting and processing |
| `routeMemory.ts` | Route Memory | Route state and history management |
| `tokenUtils.ts` | Token Tools | Authentication token handling |

## Core Function Modules

### Audio System

- **Audio Resource Management**: Unified audio file loading and caching mechanism
- **Audio Playback Engine**: Audio synthesis and playback based on Web Audio API
- **MIDI Support**: Complete MIDI data processing and export functionality
- **Timbre Presets**: Rich audio parameter configuration and preset management

### Music Theory Tools

- **Note Processing**: Note name, frequency, MIDI number conversion
- **Chord Calculation**: Chord construction, recognition, inversion calculation
- **Interval Analysis**: Interval recognition, consonance calculation
- **Music Format Parsing**: Support for formats like ABC, MIDI, etc.

### Data Management

- **Local Storage**: Data persistence based on IndexedDB
- **Data Import**: Support for importing data in multiple formats
- **Cache Management**: Intelligent resource caching and cleanup mechanism

### System Tools

- **Environment Configuration**: Flexible environment variable management
- **Security Tools**: Data encryption and token handling
- **Interaction Tools**: User interaction support like drag-and-drop, routing, etc.

## Technical Characteristics

- Type safety based on TypeScript
- Modular design with independent functions
- Support for asynchronous operations and Promises
- Comprehensive error handling mechanism
- Performance-optimized caching strategy

## Usage Pattern

All utility functions follow a unified pattern:
1. Input validation and type checking
2. Core logic processing
3. Result formatting and return
4. Error handling and logging
