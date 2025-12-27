# 🌙 TwoMoons

[English](./README.md) | [中文](./README.zh-CN.md)

### Powerful and Interactive Music Learning Platform.

<p align="center">
 <img src="/public/banner.jpg" width="800px" style="">
</p>

## 📖 Introduction

Two Moons is a web-based interactive music learning application designed to help users learn and practice music theory more easily. The project supports web access and can be packaged as a mobile application using Capacitor.

## ✨ Features

*   **Global Piano**: A virtual piano keyboard available anytime, making it easy to capture inspiration on the go.
*   **Chord Editor**: A powerful chord editing and auditioning tool with guitar and piano views, helping users explore and build complex chord progressions.
*   **Moa Roll**: A visual MIDI piano roll editor that provides an intuitive melody creation and editing experience.
*   **Staff Notation**: Staff notation rendering and highlighting based on ABCJS, supporting score learning and sight-reading practice.
*   **Practice Tools**: Built-in music theory training modules, including interval recognition, chord progression analysis, rhythm practice, etc.
*   **AI Mooner**: Integrated AI assistance to provide intelligent support for music creation.
*   **Community Sharing**: A complete user system supporting registration, login, and sharing/exchanging music works.

## 🛠️ Tech Stack

*   **Framework**: [Next.js](https://nextjs.org/), React
*   **Language**: TypeScript
*   **UI Components**: Ant Design, Tailwind CSS
*   **State Management**: MobX, Valtio
*   **Music Engine**: Tone.js, abcjs, @spotify/basic-pitch
*   **Mobile Cross-Platform**: Capacitor (Android/iOS)
*   **Backend Services**: Supabase (Database), AliOSS (Storage)
*   **Log Service**: Node.js (Log Service)

## ⚙️ Environment Configuration (Env)

Before running the project, please ensure the environment variables are configured. You can copy the `.env.example` file to `.env.local` and fill in the corresponding values.

```bash
cp .env.example .env.local
```

Key environment variables to configure include:

*   `SUPABASE_URL`: Supabase Project URL (Server-side only)
*   `SUPABASE_ANON_KEY`: Supabase Anonymous Key (Server-side only)
*   `ACCESSKEY_ID`: Aliyun OSS Access Key ID (Server-side only)
*   `ACCESSKEY_SECRET`: Aliyun OSS Access Key Secret (Server-side only)
*   `AI_API_KEY`: ZHIPU GLM AI Service API Key (Server-side only)
*   `AUTH_SECRET`: ZHIPU Authentication Secret (Server-side only)

> Note: Variables marked as Server-side only should not be exposed in client-side code.

## 🚀 Quick Start

1.  **Install Dependencies**:

    ```bash
    npm install
    # or
    yarn install
    # or
    pnpm install
    ```

2.  **Start Development Server**:

    ```bash
    npm run dev
    ```

    Open your browser and visit [http://localhost:3000](http://localhost:3000) to see the application.

## 📱 Mobile Build

This project uses Capacitor for mobile development.

1.  **Build Next.js Application**:
    
    ```bash
    npm run build
    npm run export # If static export is needed
    ```

2.  **Sync Configuration to Native Project**:

    ```bash
    npx cap sync
    ```

3.  **Open Android/iOS Project**:

    ```bash
    npx cap open android
    # or
    npx cap open ios
    ```

### Other Commands

Push to pre environment:
`git push pre`

## 👥 Contributors

<div>
  <img src="/public/avators/suda.jpg" width="70px" alt="moayuisuda" />
  <img src="/public/avators/roshengy.jpg" width="60px" alt="roshengy" />
  <img src="/public/avators/Lusia.jpeg" width="60px" alt="Lusia" />
  <img src="/public/avators/Macchiatooo.png" width="60px" alt="Macchiatooo" />
  <img src="/public/avators/BX-Esther.jpg" width="60px" alt="BX-Esther" />
</div>

## 🤝 Contribution Guide

Contributions are welcome! To maintain project quality and direction, please follow this process:

*   **Bug Fixes**: Feel free to submit a Pull Request (PR) directly to fix bugs.
*   **New Features**: Please submit a **Feature Request Issue** first, describing the feature you want to add. Once we confirm the feature can be added, you can start implementing it and submit a PR.
<div>If you want to contribute but don't know where to start, you can contact me via <a href="mailto:874706277@qq.com">email</a>.</div>

## 📄 License

This project is licensed under the [GPL-3.0 License](LICENSE).

---

<br/>
<div align="center">
 <i>Let Love Echo.</i>
</div>
<br/>
<div align="center">
   <img src="/public/echo.jpg" width="500px">
   <br/>
   <a href="https://afdian.com/a/rinnko"><img width="200" src="https://pic1.afdiancdn.com/static/img/welcome/button-sponsorme.png" alt=""></a>
</div>
