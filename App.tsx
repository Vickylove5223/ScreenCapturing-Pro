/** Fix: Added DOM library reference to resolve missing browser global types like window, alert, and KeyboardEvent */
/// <reference lib="dom" />

import React, { useRef, useEffect, useState } from 'react';
import { useScreenRecorder } from './hooks/useScreenRecorder';
import { Button } from './components/Button';
import { VideoPreview } from './components/VideoPreview';
import { StatusBadge } from './components/StatusBadge';
import { RecordingLibrary } from './components/RecordingLibrary';
import { Editor } from './components/Editor';
import { Header } from './components/Header';
import { CaptureModal, CaptureOptions } from './components/CaptureModal';
import { ReviewModal } from './components/ReviewModal';
import { SettingsPage } from './components/SettingsPage';
import {
  Download, Monitor, Square, RefreshCcw, Save, Loader2, Sparkles, PlusCircle,
  Zap, Shield, Wand2, Share2, Play, Code2, GraduationCap, Users, Check,
  ArrowRight, Star, Globe, MessageSquare, ChevronDown, Scissors, Music, Cloud, CheckCircle
} from 'lucide-react';
import {
  saveRecordingToStorage,
  getRecordingList,
  getRecordingBlob,
  deleteRecording,
  RecordingMeta
} from './utils/videoStorage';
import { preloadFFmpeg } from './utils/videoProcessor';

type Page = 'home' | 'library' | 'settings' | 'editor';

export default function App() {
  const {
    status,
    mediaStream,
    mediaBlobUrl,
    currentBlob,
    startRecording,
    stopRecording,
    resetRecording,
    loadRecording,
    error,
  } = useScreenRecorder();

  const [recordings, setRecordings] = useState<RecordingMeta[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [editingBlob, setEditingBlob] = useState<Blob | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [countdownValue, setCountdownValue] = useState<number | null>(null);
  const timeLimitRef = useRef<number | null>(null);

  useEffect(() => {
    refreshLibrary();
    // Preload FFmpeg at app startup to avoid timeout during export
    preloadFFmpeg();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.shiftKey && e.code === 'KeyS') {
        if (status === 'recording') {
          stopRecording();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status, stopRecording]);

  useEffect(() => {
    if (status !== 'recording' && timeLimitRef.current) {
      clearTimeout(timeLimitRef.current);
      timeLimitRef.current = null;
    }
  }, [status]);

  const refreshLibrary = () => {
    setRecordings(getRecordingList());
  };

  const handleSaveToLibrary = async (silent = false) => {
    if (currentBlob && !isSaving) {
      setIsSaving(true);
      try {
        await saveRecordingToStorage(currentBlob);
        refreshLibrary();
        if (!silent) alert("Recording saved to Library!");
      } catch (e) {
        console.error("Failed to save", e);
        if (!silent) alert("Failed to save recording. Storage might be full.");
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleSaveAndEdit = async () => {
    if (currentBlob) {
      await handleSaveToLibrary(true);
      setEditingBlob(currentBlob);
      setCurrentPage('editor');
      resetRecording();
    }
  };

  const handleCloseReview = async () => {
    if (currentBlob) {
      await handleSaveToLibrary(true);
      resetRecording();
      setCurrentPage('library');
    } else {
      resetRecording();
    }
  };

  const handlePlayFromLibrary = async (id: string) => {
    try {
      const blob = await getRecordingBlob(id);
      loadRecording(blob);
      setCurrentPage('home');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      console.error("Failed to load recording", e);
      alert("Could not load recording.");
    }
  };

  const handleEditFromLibrary = (id: string, blob: Blob) => {
    setEditingBlob(blob);
    setCurrentPage('editor');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteRecording = async (id: string) => {
    if (confirm("Are you sure you want to delete this recording?")) {
      try {
        await deleteRecording(id);
        refreshLibrary();
      } catch (e) {
        console.error("Failed to delete", e);
      }
    }
  };

  const handleEditorBack = () => {
    setEditingBlob(null);
    setCurrentPage('library');
    refreshLibrary();
  };

  const handleStartCapture = async (options: CaptureOptions) => {
    setIsModalOpen(false);
    setCurrentPage('home');

    const startFn = () => {
      startRecording({
        audio: options.audio,
        camera: options.source === 'camera',
        pip: options.pip,
        audioMixing: options.audioMixing,
        backgroundColor: options.backgroundColor,
        backgroundImageUrl: options.backgroundImageUrl,
      });

      if (options.timeLimit) {
        timeLimitRef.current = window.setTimeout(() => {
          stopRecording();
          alert("Time limit reached. Recording stopped.");
        }, options.timeLimit * 1000);
      }
    };

    if (options.countdown) {
      setCountdownValue(3);
      const timer = setInterval(() => {
        setCountdownValue(prev => {
          if (prev === 1) {
            clearInterval(timer);
            startFn();
            return null;
          }
          return (prev || 0) - 1;
        });
      }, 1000);
    } else {
      startFn();
    }
  };

  return (
    <div className="min-h-screen flex flex-col custom-scrollbar">
      {currentPage !== 'editor' && (
        <Header
          activePage={currentPage === 'editor' ? 'library' : currentPage}
          onNavigate={setCurrentPage}
          onRecordClick={() => setIsModalOpen(true)}
          isRecording={status === 'recording'}
        />
      )}

      <main className="flex-1 flex flex-col">
        {currentPage === 'home' && (
          <div className="w-full flex-1 flex flex-col items-center justify-center animate-in fade-in duration-1000">
            {/* ERROR MESSAGE */}
            {error && (
              <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] bg-rose-500/10 border border-rose-500/20 text-rose-500 px-8 py-4 rounded-[2rem] text-center backdrop-blur-sm shadow-sm">
                <p className="font-bold mb-1 text-sm uppercase tracking-widest">Capture Error</p>
                <p className="text-xs font-medium opacity-80">{error}</p>
              </div>
            )}

            {/* ACTIVE RECORDING STATE */}
            {(status === 'recording' || countdownValue) ? (
              <div className="w-full h-[80vh] flex items-center justify-center px-4">
                <div className="w-full max-w-5xl bg-[#3A5A40] border border-[#588157] p-8 md:p-12 rounded-[3.5rem] card-shadow relative">
                  <div className="flex justify-between items-center mb-8 px-4">
                    <StatusBadge status={status} />
                    <div className="flex items-center gap-2 text-[10px] font-black tracking-widest text-[#A3B18A] uppercase">
                      <div className="w-2 h-2 rounded-full bg-[#DAD7CD] animate-pulse" />
                      Live Transmission
                    </div>
                  </div>

                  <div className="relative aspect-video bg-[#344E41] rounded-[2.5rem] overflow-hidden border border-[#588157] flex items-center justify-center group shadow-2xl">
                    {countdownValue && (
                      <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#344E41]/80 backdrop-blur-md">
                        <div className="text-[#DAD7CD] text-[14rem] font-[900] leading-none tracking-tighter animate-in zoom-in-50 duration-500">
                          {countdownValue}
                        </div>
                      </div>
                    )}
                    {status === 'recording' && mediaStream && (
                      <VideoPreview stream={mediaStream} muted={true} />
                    )}
                    {status === 'recording' && !mediaStream && (
                      <div className="flex flex-col items-center gap-4">
                        <Loader2 className="animate-spin text-[#DAD7CD]" size={48} />
                        <p className="text-[#A3B18A] font-black text-xs uppercase tracking-widest">Initializing...</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                    {status === 'recording' && (
                      <Button
                        onClick={stopRecording}
                        variant="primary"
                        className="!bg-[#DAD7CD] !text-[#344E41] hover:!bg-[#A3B18A] !rounded-full !px-16 !py-6"
                      >
                        Stop & Finalize Session
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* LANDING PAGE CONTENT */
              <div className="w-full flex flex-col items-center">

                {/* 1. HERO SECTION */}
                <section className="w-full max-w-7xl mx-auto px-6 pt-12 pb-20 lg:pt-24 lg:pb-32 flex flex-col items-center text-center relative z-10">

                  {/* Badge */}
                  <div className="mb-8 animate-in slide-in-from-bottom-4 duration-700">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#344E41]/5 border border-[#344E41]/10 text-[#344E41] text-[11px] font-bold uppercase tracking-widest shadow-sm hover:scale-105 transition-transform cursor-default">
                      <Star size={12} className="text-amber-500 fill-amber-500" />
                      <span>Voted #1 Open Source Tool of 2024</span>
                    </div>
                  </div>

                  {/* Headline */}
                  <h1 className="text-5xl md:text-7xl lg:text-8xl font-[900] text-[#344E41] leading-[0.95] tracking-tighter drop-shadow-sm mb-8 max-w-5xl mx-auto animate-in slide-in-from-bottom-6 duration-1000 delay-100">
                    Screen recording <br />
                    <span className="text-[#588157]">without the clutter.</span>
                  </h1>

                  {/* Subheadline */}
                  <p className="text-[#3A5A40] text-lg md:text-2xl font-medium leading-relaxed max-w-2xl mx-auto mb-12 animate-in slide-in-from-bottom-8 duration-1000 delay-200">
                    Capture high-quality video, edit locally, and sync to the cloud instantly.
                    No watermark. No time limits. No sign-up required.
                  </p>

                  {/* CTA Buttons */}
                  <div className="flex flex-col sm:flex-row items-center gap-4 animate-in zoom-in-95 duration-700 delay-300">
                    <Button
                      onClick={() => setIsModalOpen(true)}
                      className="!rounded-full !px-12 !py-6 !text-lg !font-black shadow-2xl shadow-[#344E41]/20 hover:shadow-[#344E41]/40 hover:-translate-y-1"
                      icon={<Zap size={20} />}
                    >
                      Start Recording for Free
                    </Button>
                    <button className="px-10 py-6 rounded-full text-[#344E41] font-bold text-lg hover:bg-[#344E41]/5 transition-all border border-transparent hover:border-[#344E41]/10 flex items-center gap-2 group">
                      <Play size={18} className="group-hover:translate-x-1 transition-transform" />
                      See how it works
                    </button>
                  </div>

                  {/* Tech Stack / Trust */}
                  <div className="mt-16 pt-8 border-t border-[#344E41]/10 flex flex-col items-center gap-4 animate-in fade-in duration-1000 delay-500">
                    <span className="text-xs font-bold text-[#344E41]/60 uppercase tracking-widest">Powered by Next-Gen Web Tech</span>
                    <div className="flex items-center gap-8 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
                      {/* Tech Badges */}
                      <div className="flex items-center gap-2 text-[#344E41] font-bold"><Globe size={16} /> WebAssembly</div>
                      <div className="w-1 h-1 bg-[#344E41] rounded-full"></div>
                      <div className="flex items-center gap-2 text-[#344E41] font-bold"><Zap size={16} /> FFmpeg</div>
                      <div className="w-1 h-1 bg-[#344E41] rounded-full"></div>
                      <div className="flex items-center gap-2 text-[#344E41] font-bold"><Shield size={16} /> Local Privacy</div>
                    </div>
                  </div>
                </section>

                {/* 2. DEMO / UI SHOWCASE */}
                <section className="w-full max-w-7xl mx-auto px-4 mb-32 relative">
                  <div className="absolute -inset-4 bg-gradient-to-r from-[#588157]/20 to-[#A3B18A]/20 rounded-[3.5rem] blur-3xl opacity-60"></div>
                  <div className="relative bg-[#344E41] rounded-[3rem] p-2 md:p-4 shadow-2xl border border-[#588157]">
                    <div className="bg-[#3A5A40] rounded-[2.5rem] overflow-hidden border border-[#588157] relative">
                      {/* Fake Browser UI */}
                      <div className="h-12 bg-[#344E41] border-b border-[#588157] flex items-center px-6 gap-4">
                        <div className="flex gap-2">
                          <div className="w-3 h-3 rounded-full bg-[#FF5F57]"></div>
                          <div className="w-3 h-3 rounded-full bg-[#FEBC2E]"></div>
                          <div className="w-3 h-3 rounded-full bg-[#28C840]"></div>
                        </div>
                        <div className="flex-1 flex justify-center">
                          <div className="bg-[#3A5A40] text-[#A3B18A] text-[10px] font-mono px-4 py-1 rounded-full flex items-center gap-2">
                            <Shield size={10} /> vibecoder.dev/editor
                          </div>
                        </div>
                      </div>
                      {/* Preview Content */}
                      <div className="aspect-[16/9] relative bg-black flex items-center justify-center overflow-hidden group">
                        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')] bg-cover bg-center opacity-80"></div>

                        {/* Floating Editor Tools */}
                        <div className="absolute bottom-8 left-8 right-8 flex justify-between items-end">
                          <div className="bg-[#3A5A40]/90 backdrop-blur-md p-4 rounded-2xl border border-[#588157] flex gap-4 shadow-xl translate-y-20 group-hover:translate-y-0 transition-transform duration-500">
                            <div className="flex flex-col items-center gap-1 text-[#DAD7CD]"><Scissors size={18} /> <span className="text-[9px] uppercase font-bold">Trim</span></div>
                            <div className="w-px bg-[#588157]"></div>
                            <div className="flex flex-col items-center gap-1 text-[#DAD7CD]"><Monitor size={18} /> <span className="text-[9px] uppercase font-bold">Crop</span></div>
                            <div className="w-px bg-[#588157]"></div>
                            <div className="flex flex-col items-center gap-1 text-[#DAD7CD]"><Music size={18} /> <span className="text-[9px] uppercase font-bold">Audio</span></div>
                          </div>

                          <div className="bg-[#DAD7CD] text-[#344E41] px-6 py-3 rounded-xl font-bold shadow-xl translate-y-20 group-hover:translate-y-0 transition-transform duration-500 delay-100 flex items-center gap-2">
                            Export 4K <CheckCircle size={16} />
                          </div>
                        </div>

                        <div className="w-20 h-20 bg-[#DAD7CD]/10 backdrop-blur-sm rounded-full flex items-center justify-center cursor-pointer hover:scale-110 transition-transform">
                          <Play size={32} className="text-[#DAD7CD] ml-1" fill="currentColor" />
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* 3. FEATURES GRID (Refined) */}
                <section className="w-full bg-[#344E41] text-[#DAD7CD] py-24 rounded-[3rem] my-8 mx-4 max-w-[98vw]">
                  <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-20">
                      <h2 className="text-4xl md:text-5xl font-[900] tracking-tighter mb-6">Everything you need.<br />Nothing you don't.</h2>
                      <p className="text-[#A3B18A] text-xl max-w-2xl mx-auto">We stripped away the bloat. No watermarks, no signups, no "Pro" plans needed to remove limits.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                      {[
                        { icon: <Monitor size={32} />, title: "4K Screen Recording", desc: "Capture crystal clear video from any screen, window, or tab." },
                        { icon: <Wand2 size={32} />, title: "Built-in Editor", desc: "Trim, crop, zoom, and pan directly in your browser." },
                        { icon: <Music size={32} />, title: "Audio Mixing", desc: "Combine system audio with your microphone perfectly." },
                        { icon: <Cloud size={32} />, title: "Cloud Sync", desc: "One-click upload to Google Drive or YouTube." },
                        { icon: <Shield size={32} />, title: "100% Private", desc: "Files render locally. We never see your recordings." },
                        { icon: <Zap size={32} />, title: "No Watermark", desc: "Your content is yours. Clean exports, every time." },
                      ].map((feature, i) => (
                        <div key={i} className="p-8 bg-[#3A5A40] rounded-[2rem] border border-[#588157] hover:border-[#A3B18A] transition-all group">
                          <div className="w-16 h-16 bg-[#344E41] rounded-2xl flex items-center justify-center mb-6 text-[#A3B18A] group-hover:text-[#DAD7CD] group-hover:scale-110 transition-all shadow-lg shadow-[#344E41]/20">
                            {feature.icon}
                          </div>
                          <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                          <p className="text-[#A3B18A] leading-relaxed">{feature.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                {/* 4. USE CASES (Who is this for?) */}
                <section className="w-full max-w-7xl mx-auto px-6 py-24">
                  <div className="flex flex-col md:flex-row items-center justify-between mb-12">
                    <h2 className="text-4xl font-[900] text-[#344E41] tracking-tighter">Made for <span className="text-[#588157]">Storytellers.</span></h2>
                    <div className="hidden md:block h-px flex-1 bg-[#344E41]/10 mx-8"></div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="group relative overflow-hidden rounded-[2.5rem] aspect-[4/5] bg-[#3A5A40]">
                      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1587620962725-abab7fe55159?q=80&w=1000&auto=format&fit=crop')] bg-cover bg-center opacity-40 group-hover:scale-105 transition-transform duration-700"></div>
                      <div className="absolute inset-0 bg-gradient-to-t from-[#344E41] via-transparent to-transparent"></div>
                      <div className="absolute bottom-0 left-0 p-8">
                        <div className="bg-[#DAD7CD] w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-[#344E41]">
                          <Code2 size={24} />
                        </div>
                        <h3 className="text-2xl font-bold text-[#DAD7CD] mb-2">Developers</h3>
                        <p className="text-[#A3B18A] text-sm">Record bug reports, code walkthroughs, and demos in 4K.</p>
                      </div>
                    </div>

                    <div className="group relative overflow-hidden rounded-[2.5rem] aspect-[4/5] bg-[#3A5A40] mt-12 md:mt-0">
                      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=1000&auto=format&fit=crop')] bg-cover bg-center opacity-40 group-hover:scale-105 transition-transform duration-700"></div>
                      <div className="absolute inset-0 bg-gradient-to-t from-[#344E41] via-transparent to-transparent"></div>
                      <div className="absolute bottom-0 left-0 p-8">
                        <div className="bg-[#DAD7CD] w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-[#344E41]">
                          <GraduationCap size={24} />
                        </div>
                        <h3 className="text-2xl font-bold text-[#DAD7CD] mb-2">Educators</h3>
                        <p className="text-[#A3B18A] text-sm">Create step-by-step tutorials with zoom and highlight features.</p>
                      </div>
                    </div>

                    <div className="group relative overflow-hidden rounded-[2.5rem] aspect-[4/5] bg-[#3A5A40]">
                      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=1000&auto=format&fit=crop')] bg-cover bg-center opacity-40 group-hover:scale-105 transition-transform duration-700"></div>
                      <div className="absolute inset-0 bg-gradient-to-t from-[#344E41] via-transparent to-transparent"></div>
                      <div className="absolute bottom-0 left-0 p-8">
                        <div className="bg-[#DAD7CD] w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-[#344E41]">
                          <Share2 size={24} />
                        </div>
                        <h3 className="text-2xl font-bold text-[#DAD7CD] mb-2">Creators</h3>
                        <p className="text-[#A3B18A] text-sm">Produce social-ready content. Crop to 9:16 for TikTok/Reels instantly.</p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* 5. TESTIMONIALS (Social Proof) */}
                <section className="w-full bg-[#344E41]/5 border-y border-[#344E41]/10 py-24">
                  <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                      <h2 className="text-4xl font-[900] text-[#344E41] tracking-tighter">Loved by the <span className="text-[#588157]">Community.</span></h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                      {[
                        { name: "Alex R.", role: "Senior Dev", text: "Finally, a screen recorder that doesn't require a subscription for basic features. The local export is a game changer." },
                        { name: "Sarah K.", role: "Product Manager", text: "I use this daily for Loom-style updates. The ability to zoom in post-production makes my demos look so professional." },
                        { name: "Mike T.", role: "YouTuber", text: "The audio mixing logic is surprisingly robust. Being able to mix my mic with system audio perfectly is huge." }
                      ].map((review, i) => (
                        <div key={i} className="bg-[#DAD7CD] p-8 rounded-[2rem] border border-[#344E41]/10 shadow-sm relative">
                          <div className="flex gap-1 mb-4">
                            {[1, 2, 3, 4, 5].map(s => <Star key={s} size={14} className="fill-[#344E41] text-[#344E41]" />)}
                          </div>
                          <p className="text-[#344E41] font-medium mb-6 leading-relaxed">"{review.text}"</p>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#344E41] rounded-full flex items-center justify-center text-[#DAD7CD] font-bold text-sm">
                              {review.name[0]}
                            </div>
                            <div>
                              <div className="text-sm font-bold text-[#344E41]">{review.name}</div>
                              <div className="text-xs text-[#588157] font-bold uppercase tracking-wider">{review.role}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                {/* 6. FAQ Section */}
                <section className="w-full max-w-4xl mx-auto px-6 py-24">
                  <h2 className="text-3xl font-[900] text-[#344E41] tracking-tighter mb-12 text-center">Frequently Asked Questions</h2>
                  <div className="space-y-4">
                    {[
                      { q: "Is this really free?", a: "Yes. ScreenCapturing Pro is open-source and free to use. We don't charge for 4K, audio, or no-watermark exports." },
                      { q: "Do you see my recordings?", a: "No. All processing happens locally in your browser using WebAssembly. Your video data never leaves your computer unless you explicitly choose to upload it to Drive/YouTube." },
                      { q: "Can I record system audio?", a: "Yes! When selecting the screen to share, check the 'Share system audio' box. You can also mix in your microphone." },
                      { q: "Does it work on Mac/Windows/Linux?", a: "It works on any modern desktop browser (Chrome, Edge, Firefox, Brave) regardless of the operating system." },
                    ].map((item, i) => (
                      <div key={i} className="bg-white/50 border border-[#344E41]/10 rounded-2xl p-6 hover:bg-white transition-colors">
                        <h3 className="text-lg font-bold text-[#344E41] mb-2 flex items-center gap-2"><MessageSquare size={16} className="text-[#588157]" /> {item.q}</h3>
                        <p className="text-[#3A5A40] leading-relaxed ml-6">{item.a}</p>
                      </div>
                    ))}
                  </div>
                </section>

                {/* 7. FINAL CTA */}
                <section className="w-full bg-[#3A5A40] border-t border-[#588157] py-32 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#A3B18A]/10 to-transparent pointer-events-none"></div>
                  <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
                    <h2 className="text-5xl md:text-8xl font-[900] text-[#DAD7CD] tracking-tighter mb-8 leading-none">Ready to go viral?</h2>
                    <p className="text-[#A3B18A] text-xl mb-12 max-w-xl mx-auto">Join thousands of creators using the vibe.</p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                      <Button
                        onClick={() => setIsModalOpen(true)}
                        className="!rounded-full !px-16 !py-8 !text-2xl !font-black shadow-2xl shadow-[#A3B18A]/20 hover:shadow-[#A3B18A]/40 hover:-translate-y-1"
                      >
                        Start Recording Now
                      </Button>
                    </div>
                    <div className="mt-12 flex items-center justify-center gap-8 opacity-50">
                      <div className="flex items-center gap-2 text-[#DAD7CD] text-xs font-bold uppercase tracking-widest"><Check size={14} /> No Credit Card</div>
                      <div className="flex items-center gap-2 text-[#DAD7CD] text-xs font-bold uppercase tracking-widest"><Check size={14} /> No Watermark</div>
                    </div>
                  </div>
                </section>

                {/* FOOTER */}
                <footer className="w-full max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center justify-between text-[#3A5A40] text-sm border-t border-[#344E41]/10">
                  <div className="font-bold flex items-center gap-2">
                    <div className="w-6 h-6 bg-[#344E41] rounded-lg"></div>
                    © 2024 ScreenCapturing Pro
                  </div>
                  <div className="flex items-center gap-8 mt-4 md:mt-0 font-medium">
                    <a href="#" className="hover:text-[#344E41] transition-colors">Github</a>
                    <a href="#" className="hover:text-[#344E41] transition-colors">Twitter</a>
                    <a href="#" className="hover:text-[#344E41] transition-colors">Privacy Policy</a>
                  </div>
                </footer>

              </div>
            )}
          </div>
        )}

        {currentPage === 'library' && (
          <RecordingLibrary
            recordings={recordings}
            onPlay={handlePlayFromLibrary}
            onEdit={handleEditFromLibrary}
            onDelete={handleDeleteRecording}
            onRefresh={refreshLibrary}
          />
        )}

        {currentPage === 'settings' && (
          <SettingsPage />
        )}

        {currentPage === 'editor' && editingBlob && (
          <Editor
            blob={editingBlob}
            onBack={handleEditorBack}
            onSave={refreshLibrary}
          />
        )}
      </main>

      {/* Modals */}
      <CaptureModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onStart={handleStartCapture}
      />

      {status === 'recorded' && mediaBlobUrl && currentBlob && (
        <ReviewModal
          mediaBlobUrl={mediaBlobUrl}
          currentBlob={currentBlob}
          onClose={handleCloseReview}
          onSave={handleSaveToLibrary}
          onSaveAndEdit={handleSaveAndEdit}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}