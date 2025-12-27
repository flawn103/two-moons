# Luv Club Music Learning Application

## Overview

Luv Club is a Next.js-based music learning application that provides interactive music theory learning and practice features. The application supports various music skill trainings, including interval recognition, chord identification, melody practice, and more.

## Project Structure

| File/Folder | Description | Main Function |
|-------------|-------------|---------------|
| `components/` | React Component Directory | Contains all UI components, such as Practice components, etc. |
| `pages/` | Next.js Page Directory | Application routing and page components |
| `services/` | Service Layer | Audio processing, data management, and other business logic |
| `stores/` | State Management | Global state management using Zustand |
| `hooks/` | Custom Hooks | Reusable logic encapsulation |
| `utils/` | Utility Functions | General utilities and helper functions |
| `styles/` | Style Files | Global styles and theme configuration |
| `theme/` | Theme Configuration | Application theme and design system |
| `public/` | Static Resources | Static files like images, fonts, etc. |
| `typings/` | TypeScript Types | Type definition files |
| `constants/` | Constant Definitions | Application constants and configurations |
| `scripts/` | Script Files | Build and development scripts |
| `docs/` | Documentation Directory | Project documentation |
| `test/` | Test Files | Unit tests and integration tests |
| `next.config.js` | Next.js Configuration | |
| `tailwind.config.ts` | Tailwind CSS Configuration | |
| `tsconfig.json` | TypeScript Configuration | |
| `package.json` | Project Dependencies and Scripts | |
| `next-i18next.config.js` | Internationalization Configuration | |
| `vitest.config.ts` | Test Configuration | |

## Core Features

- **Music Practice System**: Interval recognition, chord identification, melody practice, note recognition
- **Audio Playback**: Audio engine based on MoaTone
- **Visualization**: Guitar fretboard, staff notation display
- **Internationalization**: Multi-language support
- **Responsive Design**: Adapts to different device screens

## Tech Stack

- **Frontend Framework**: Next.js 13+ (App Router)
- **UI Framework**: React 18
- **Styling**: Tailwind CSS + SCSS
- **State Management**: Valtio
- **Audio**: MoaTone
- **Type Checking**: TypeScript
- **Testing**: Vitest
- **Package Management**: Yarn
