# 🌙 TwoMoons

[English](./README.md) | [中文](./README.zh-CN.md)

### Powerful and Interactive Music Learning Platform.

<p align="center">
 <img src="/public/banner.jpg" width="800px" style="">
 <img src="/public/tutorial.png" width="800px" style="">
</p>

## 📖 简介

Two Moons 是一个基于 Web 的互动式音乐学习应用，旨在帮助用户更轻松地学习、练习乐理。项目支持 Web 端访问，并可通过 Capacitor 打包为移动端应用。

## ✨ 功能模块

*   **Global Piano (全局钢琴)**: 随时可用的虚拟钢琴键盘，方便随时捕捉灵感。
*   **Chord Editor (和弦编辑器)**: 强大的和弦编辑与试听工具，支持吉他和钢琴视图，帮助用户探索和构建复杂的和弦进行。
*   **Moa Roll (卷帘钢琴)**: 可视化的 MIDI 卷帘编辑器，提供直观的旋律创作和编辑体验。
*   **Staff Notation (五线谱)**: 基于 ABCJS 的五线谱渲染与高亮显示，支持乐谱学习和视奏练习。
*   **Practice Tools (练习工具)**: 内置多种乐理训练模块，包括音程识别、和弦进行分析、节奏练习等。
*   **AI Mooner**: 集成 AI 辅助功能，为音乐创作提供智能化支持。
*   **社区分享**: 完整的用户系统，支持注册、登录，以及分享和交流自己的音乐作品。

## 🛠️ 技术栈

*   **前端框架**: [Next.js](https://nextjs.org/), React
*   **语言**: TypeScript
*   **UI 组件**: Ant Design, Tailwind CSS
*   **状态管理**: MobX, Valtio
*   **音乐引擎**: Tone.js, abcjs, @spotify/basic-pitch
*   **移动端跨平台**: Capacitor (Android/iOS)
*   **后端服务**: Supabase (Database), AliOSS (Storage)
*   **日志服务**: Node.js (Log Service)

## ⚙️ 环境配置 (Env)

在运行项目之前，请确保配置好环境变量。你可以复制 `.env.example` 文件为 `.env.local` 并填入相应的值。

```bash
cp .env.example .env.local
```

需要配置的主要环境变量包括：

*   `SUPABASE_URL`: Supabase 项目 URL (Server-side only)
*   `SUPABASE_ANON_KEY`: Supabase 匿名密钥 (Server-side only)
*   `ACCESSKEY_ID`: 阿里云 OSS Access Key ID (Server-side only)
*   `ACCESSKEY_SECRET`: 阿里云 OSS Access Key Secret (Server-side only)
*   `AI_API_KEY`: ZHIPU GLM AI 服务 API Key (Server-side only)
*   `AUTH_SECRET`: ZHIPU 用于身份验证的密钥 (Server-side only)

> 注意：标记为 Server-side only 的变量不应暴露在客户端代码中。

## 🚀 快速开始

1.  **安装依赖**:

    ```bash
    npm install
    # 或者
    yarn install
    # 或者
    pnpm install
    ```

2.  **启动开发服务器**:

    ```bash
    npm run dev
    ```

    打开浏览器访问 [http://localhost:3000](http://localhost:3000) 即可看到应用。

## 📱 移动端构建

本项目使用 Capacitor 进行移动端开发。

1.  **构建 Next.js 应用**:
    
    ```bash
    npm run build
    npm run export # 如果需要静态导出
    ```

2.  **同步配置到原生项目**:

    ```bash
    npx cap sync
    ```

3.  **打开 Android/iOS 项目**:

    ```bash
    npx cap open android
    # 或
    npx cap open ios
    ```

### 其他命令

Push to pre environment:
`git push pre`

## 👥 贡献者

<div>
  <img src="/public/avators/suda.jpg" width="70px" alt="moayuisuda" />
  <img src="/public/avators/roshengy.jpg" width="60px" alt="roshengy" />
  <img src="/public/avators/Lusia.jpeg" width="60px" alt="Lusia" />
  <img src="/public/avators/Macchiatooo.png" width="60px" alt="Macchiatooo" />
  <img src="/public/avators/BX-Esther.jpg" width="60px" alt="BX-Esther" />
</div>

## 🤝 贡献指南

欢迎你的贡献！为了保持项目的质量和方向，请遵循以下流程：

*   **Bug 修复**: 欢迎直接提交 Pull Request (PR) 修复 Bug。
*   **新功能开发**: 请先提交一个 **Feature Request Issue**，描述你想要添加的功能。在我们确认可以增加该功能后，你就可以着手实现并提交 PR。
<div>如果你想贡献不知如何开始，可以先联系我的 <a href="mailto:874706277@qq.com">邮箱</a></div>

## 📄 许可证

本项目采用 [GPL-3.0 许可证](LICENSE)。

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
