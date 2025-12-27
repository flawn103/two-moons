# Components Directory

## Overview

The Components directory contains all React components of the application, covering functional modules such as UI interfaces, music practice, audio processing, and data display.

## Main Component Classification

### Core Page Components

| File Path | Description | Main Function |
|-----------|-------------|---------------|
| `Header.tsx` | Page Header Component | Navigation bar, user info, global settings |
| `Footer.tsx` | Page Footer Component | Footer info, links |
| `Layout/` | Layout Components | Page layout structure |
| `RouteGuard/` | Route Guard Components | Permission control and route protection |

### Music Practice Components

| File Path | Description | Main Function |
|-----------|-------------|---------------|
| `Practice/` | Practice Components Directory | Music practice functions like interval recognition, chord identification, melody practice |
| `GlobalPiano/` | Global Piano Component | Virtual piano keyboard |
| `StaffNotation/` | Staff Notation Component | Music symbol display |
| `StaffNotationPreview/` | Staff Notation Preview | Staff notation preview function |

### Audio and MIDI Components

| File Path | Description | Main Function |
|-----------|-------------|---------------|
| `MidiCard/` | MIDI Card Component | MIDI device management and control |
| `MidiEditor/` | MIDI Editor | MIDI note editing and processing |
| `Preset.tsx` | Preset Component | Audio preset management |

### Chord and Song Components

| File Path | Description | Main Function |
|-----------|-------------|---------------|
| `ChordCollection/` | Chord Collection | Chord management and display |
| `ChordEditor/` | Chord Editor | Chord creation and editing |
| `OneSong/` | Single Song Component | Song details and playback |
| `PhraseBlock/` | Phrase Block Component | Phrase editing and organization |

### Search and Filter Components

| File Path | Description | Main Function |
|-----------|-------------|---------------|
| `SearchBox/` | Search Box Component | Basic search function |
| `UniversalSearch/` | Universal Search Component | Global search function |
| `UniversalSearchFloat/` | Floating Search Component | Floating search interface |

### User Interface Components

| File Path | Description | Main Function |
|-----------|-------------|---------------|
| `AIMooner/` | AI Assistant Component | Intelligent assistant interface |
| `Avator/` | Avatar Component | User avatar display |
| `CustomTextInput/` | Custom Input Component | Customized text input |
| `LanguageSwitcher/` | Language Switcher Component | Multi-language switching |
| `LinkComp.tsx` | Link Component | Custom link styles |
| `TypewriterText.tsx` | Typewriter Text | Dynamic text display effect |

### Card and Collection Components

| File Path | Description | Main Function |
|-----------|-------------|---------------|
| `CollectionCard/` | Collection Card | Content display card |
| `LocalCollectionCard/` | Local Collection Card | Local content display |
| `ShareCollection/` | Share Collection | Content sharing function |

### Authentication and Social Components

| File Path | Description | Main Function |
|-----------|-------------|---------------|
| `LoginOrRegist.tsx` | Login/Register Component | User authentication |
| `RegistInvitation.tsx` | Registration Invitation | Invitation code registration |
| `GlobalShare/` | Global Share Component | Content sharing function |
| `Together.tsx` | Collaboration Component | Real-time collaboration function |

### Feedback and Tool Components

| File Path | Description | Main Function |
|-----------|-------------|---------------|
| `Feedback.tsx` | Feedback Component | User feedback interface |

## Core Function Modules

- **Music Practice System**: Various practice functions under the Practice component directory
- **Audio Processing**: MIDI-related components and audio control
- **Visualization**: Music visualization like staff notation, piano keyboard, etc.
- **User Interface**: Complete UI component library
- **Search Function**: Multi-level search and filtering components
- **Social Function**: Social features like sharing, collaboration, etc.

## Technical Characteristics

- Based on React 18 and TypeScript
- Uses Tailwind CSS for styling
- Supports internationalization and responsive layout
- Modular component design for easy reuse and maintenance
