<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# ScreenCapturing Pro

An AI-powered, high-performance screen recording and editing suite built for the web.

## Architecture & Engineering

This project uses a high-performance architecture centered around **Client-Side Rendering (CSR)** and **WebAssembly (WASM)**.

### 1. The Core Framework
*   **React (UI Logic)**: Used to manage complex states (Recording, Paused, Preparing) and the sidebar configuration.
*   **Tailwind CSS (Aesthetics)**: Provides the high-end "Studio" aesthetic (Glassmorphism, dark-mode 950/900 palette, and "Pro" animations).
*   **Lucide React (Icons)**: For sleek, consistent iconography used in the control panels.

### 2. The Rendering Engine (The "Compositor")
The biggest challenge was layering video over custom backgrounds. We didn't record the screen directly; we built a **Canvas Compositor**:
*   **HTML5 Canvas API**: Acts as the "Stage." It layers the background image/color first, then draws the screen-share video on top in real-time.
*   **requestAnimationFrame Loop**: A continuous high-frequency loop (30 FPS) that handles the layout, shadows, and "glow" effects of the video frame-by-frame.
*   **MediaStreams API**:
    *   `getDisplayMedia`: To capture your desktop/browser window.
    *   `getUserMedia`: To capture high-fidelity microphone audio.

### 3. The Audio Mixer (Web Audio API)
Standard recording tools often lose microphone or system audio. We built a virtual **Mixer**:
*   **AudioContext**: Creates a routing graph where we pull audio from the screen-share (System Audio) and the microphone.
*   **GainNodes**: Allow the "Pro" volume sliders to adjust levels before they are encoded.
*   **MediaStreamDestination**: Merges these disparate audio sources into a single master track for the recording.

### 4. The Heavy Lifting (WebAssembly & FFmpeg)
Browsers natively only record in `.webm` format. To provide professional exports:
*   **FFmpeg.wasm**: This is the industry-standard video engine compiled into WebAssembly. It runs a full command-line video processor inside your browser tab.
*   **Browser-side Transcoding**: When you click "Export GIF," the app uses your computer's CPU to transcode the raw recording using a high-quality palette generation process (`palettegen` + `paletteuse`).
*   **Why?**: This keeps server costs at $0 because the user's browser does 100% of the work.

### 5. Architectural Secrets for Reliability
*   **Canvas Heartbeat**: A continuous render loop prevents Chrome from "sleeping" the tab or optimizing the video into a static image during long pauses.
*   **Shared Array Buffers**: Enabled via specific Vite headers (`Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy`) to allow FFmpeg.wasm to use multi-threading for faster rendering.

## Setup & Run Locally

1. Install dependencies:
   `npm install`
2. Run the app:
   `npm run dev`

