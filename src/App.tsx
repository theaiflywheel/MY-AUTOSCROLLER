import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FolderIcon, 
  Settings, 
  Play, 
  Pause, 
  SkipForward, 
  Volume2, 
  VolumeX, 
  MessageSquare, 
  Heart, 
  Info,
  Check, 
  Copy, 
  ArrowDown, 
  FileCode, 
  Download, 
  Share2, 
  ExternalLink,
  Laptop,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { EXTENSION_FILES } from './extensionCode';
import { ExtensionConfig, ExtensionFile } from './types';

// Standard Royalty-Free Sample Videos hosted on Google bucket
const MOCK_REELS = [
  {
    id: 1,
    title: "Epic Ocean & Cinematic Surf Escapes",
    creator: "@surf_oceania",
    description: "Catching the sunset barrel of the year in pristine crystal clear waters. #nature #surf #aesthetic",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    likes: "254K",
    commentsCount: "2,422",
    duration: 14 // standard sample duration
  },
  {
    id: 2,
    title: "Vibrant Fire Blazes & Fire Spinning Masterclass",
    creator: "@pyro_flow",
    description: "Mesmerizing dynamic patterns created by skilled fire spinner in slow motion! Do not try this at home. #art #fire #flow",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    likes: "189K",
    commentsCount: "1,840",
    duration: 15
  },
  {
    id: 3,
    title: "Rollercoaster Ride & Extreme Fun Parks",
    creator: "@adrenaline_junction",
    description: "POV Front Row seat on the steepest dynamic virtual coaster drop! Feel the force. #extreme #rides #fun",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    likes: "412K",
    commentsCount: "4,902",
    duration: 15
  },
  {
    id: 4,
    title: "Mountain Joyrides & Supercar Coastlines",
    creator: "@gearshift_tv",
    description: "Carving through mountain passes in a modern sportscar. Sound on for the beautiful exhaust note! #supercars #coastal #drive",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
    likes: "310K",
    commentsCount: "3,115",
    duration: 15
  }
];

export default function App() {
  // Stats tracker inspired by the theme's today counter
  const [scrollsCount, setScrollsCount] = useState(1284);
  // Extension config state - acts as our simulated "chrome.storage.local" state
  const [config, setConfig] = useState<ExtensionConfig>({
    enabled: true,
    ytShorts: true,
    igReels: true,
    xVideo: true,
    threshold: 98,
    playbackSpeed: 1,
    pauseOnHover: true,
    pauseOnComments: true
  });

  // Simulator tabs
  const [activePlatform, setActivePlatform] = useState<'youtube' | 'instagram' | 'twitter'>('youtube');
  const [currentReelIndex, setCurrentReelIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(15);
  const [hoveringVideo, setHoveringVideo] = useState(false);
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [isAutoScrollingHUD, setIsAutoScrollingHUD] = useState(true); // HUD level active button

  // Interface view tabs
  const [sidebarTab, setSidebarTab] = useState<'controls' | 'code' | 'how-to'>('controls');
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [copiedFileIndex, setCopiedFileIndex] = useState<number | null>(null);

  // Simulation logs
  const [logs, setLogs] = useState<Array<{ time: string; text: string; type: 'info' | 'success' | 'warn' | 'action' }>>([
    { time: "13:37:31", text: "FlowStream simulation initialized.", type: 'success' },
    { time: "13:37:32", text: "MutationObserver active. Ready to detect video elements.", type: 'info' }
  ]);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Helper to add logs
  const addLog = (text: string, type: 'info' | 'success' | 'warn' | 'action' = 'info') => {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    setLogs(prev => [{ time: timeStr, text, type }, ...prev.slice(0, 48)]);
  };

  // Sync simulated state and logs when platform or variables switch
  useEffect(() => {
    addLog(`Switched simulator active view to ${activePlatform.toUpperCase()}`, 'info');
    setCommentsVisible(false);
    setHoveringVideo(false);
    setCurrentReelIndex(0);
    setIsPlaying(true);
    setCurrentTime(0);
  }, [activePlatform]);

  // Sync settings updates with logs
  const handleConfigChange = (key: keyof ExtensionConfig, val: any) => {
    setConfig(prev => {
      const next = { ...prev, [key]: val };
      addLog(`Updated config [${key}]: ${val}`, 'action');
      return next;
    });
  };

  // Handle Video TimeUpdate in our simulator to check auto-scroll logic
  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const video = e.currentTarget;
    const cur = video.currentTime;
    const dur = video.duration || 15;
    setCurrentTime(cur);
    setVideoDuration(dur);

    // Is current platform active?
    const isPlatformActive = 
      (activePlatform === 'youtube' && config.ytShorts) ||
      (activePlatform === 'instagram' && config.igReels) ||
      (activePlatform === 'twitter' && config.xVideo);

    if (!config.enabled || !isPlatformActive || !isAutoScrollingHUD) {
      return;
    }

    // Smart Features Checking
    const isHoverPaused = config.pauseOnHover && hoveringVideo;
    const isCommentsPaused = config.pauseOnComments && commentsVisible;

    if (isHoverPaused || isCommentsPaused) {
      return;
    }

    const currentPercent = (cur / dur) * 100;
    if (currentPercent >= config.threshold) {
      addLog(`Completion threshold ${config.threshold}% reached at ${currentPercent.toFixed(1)}%! Triggering scroll-next...`, 'success');
      handleNextReel();
    }
  };

  const handleVideoEnded = () => {
    addLog("Active video element ended.", 'info');
    
    const isPlatformActive = 
      (activePlatform === 'youtube' && config.ytShorts) ||
      (activePlatform === 'instagram' && config.igReels) ||
      (activePlatform === 'twitter' && config.xVideo);

    if (config.enabled && isPlatformActive && isAutoScrollingHUD) {
      const isHoverPaused = config.pauseOnHover && hoveringVideo;
      const isCommentsPaused = config.pauseOnComments && commentsVisible;
      
      if (!isHoverPaused && !isCommentsPaused) {
        addLog("Auto-scrolling next due to video ended fallback.", 'success');
        handleNextReel();
      } else {
        addLog("Auto-scroll on video end paused: override criteria met.", 'warn');
      }
    }
  };

  const handleNextReel = () => {
    setScrollsCount(prev => prev + 1);
    if (currentReelIndex < MOCK_REELS.length - 1) {
      setCurrentReelIndex(prev => prev + 1);
      addLog(`Programmatically scrolled to Reel #${currentReelIndex + 2}`, 'success');
    } else {
      // Loop back to beginning for endless scrolling simulation!
      setCurrentReelIndex(0);
      addLog(`Infinite Feed Loop: Programmatically scrolled back to Reel #1`, 'success');
    }
    setCurrentTime(0);
    setIsPlaying(true);
  };

  // Sync playback speed
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = config.playbackSpeed;
    }
  }, [config.playbackSpeed, currentReelIndex, activePlatform]);

  // Handle file downloading triggers
  const downloadFile = (file: ExtensionFile) => {
    const blob = new Blob([file.content], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addLog(`Initiated direct download: ${file.name}`, 'success');
  };

  // Helper for clipboard copying
  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedFileIndex(index);
    addLog(`Copied file contents: ${EXTENSION_FILES[index].name} to clipboard.`, 'success');
    setTimeout(() => setCopiedFileIndex(null), 1800);
  };

  // Calculate percentage for rendering
  const progressPercent = videoDuration ? (currentTime / videoDuration) * 100 : 0;
  const currentReel = MOCK_REELS[currentReelIndex];

  // Colors based on current mock active platform
  const getThemeColor = () => {
    switch (activePlatform) {
      case 'youtube': return 'bg-red-600 border-red-500 text-red-500';
      case 'instagram': return 'bg-pink-600 border-pink-500 text-pink-500';
      case 'twitter': return 'bg-cyan-500 border-cyan-400 text-cyan-400';
    }
  };

  return (
    <div id="app" className="min-h-screen bg-[#0A0A0B] text-slate-100 antialiased flex flex-col font-sans relative overflow-hidden select-none">
      
      {/* Immersive Atmospheric Ambient Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-900/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-cyan-900/10 rounded-full blur-[150px] pointer-events-none" />

      {/* Top Navigation Bar */}
      <nav className="border-b border-white/5 bg-[#0A0A0B]/80 backdrop-blur-md sticky top-0 z-50 relative">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-zap"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46L12.1 9H20a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46L11.9 15z"/></svg>
            </div>
            <div>
              <span className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 flex items-center gap-1.5">
                FlowStream <span className="text-[9px] bg-cyan-950 text-cyan-400 border border-cyan-800/80 px-2 py-0.5 rounded-full font-mono font-medium uppercase tracking-wider">Builder</span>
              </span>
              <p className="text-[11px] text-slate-400 hidden sm:block">Chrome Extension Workspace & Vertical Feed Automator</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-[10px] font-semibold text-slate-400 uppercase tracking-widest hidden md:block select-none">
              Monitoring: {activePlatform === 'youtube' ? 'YouTube Shorts' : activePlatform === 'instagram' ? 'Instagram Reels' : 'X (Twitter) Video'}
            </div>
            <div className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 bg-white/5 border border-white/10 ${config.enabled ? 'text-cyan-400' : 'text-rose-400'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${config.enabled ? 'bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]' : 'bg-rose-500'}`}></span>
              <span>{config.enabled ? 'AUTO PILOT' : 'HELD'}</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Workspace Layout Block */}
      <main className="flex-1 w-full max-w-[1400px] mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: THE INTERACTIVE DEVICE EMULATOR (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col items-center">
          
          {/* Emulator Frame Container */}
          <div className="w-full max-w-[390px] bg-[#111113]/90 rounded-[48px] border-4 border-white/10 shadow-3xl p-3 relative shadow-black/80 overflow-hidden backdrop-blur-xl">
            
            {/* Phone Ear Speaker / Notch Indicator */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-full z-40 flex items-center justify-between px-4 border border-white/5">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-800"></div>
              <div className="w-12 h-1 bg-slate-900 rounded-full"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-slate-800"></div>
            </div>

            {/* Platform Selectors - Top of Viewport inside dynamic screen */}
            <div className="flex bg-white/5 rounded-2xl p-1 border border-white/10 mt-6 mb-3 relative z-30 justify-between backdrop-blur-md">
              <button 
                id="tabYTRedeem"
                onClick={() => setActivePlatform('youtube')}
                className={`flex-1 py-1.5 text-center text-xs font-bold rounded-xl transition-all ${activePlatform === 'youtube' ? 'bg-red-500/15 text-red-400 border border-red-500/20 shadow-md' : 'text-slate-400 hover:text-slate-205 border border-transparent'}`}
              >
                YT Shorts
              </button>
              <button 
                id="tabIGRedeem"
                onClick={() => setActivePlatform('instagram')}
                className={`flex-1 py-1.5 text-center text-xs font-bold rounded-xl transition-all ${activePlatform === 'instagram' ? 'bg-pink-500/15 text-pink-400 border border-pink-500/20 shadow-md' : 'text-slate-400 hover:text-slate-205 border border-transparent'}`}
              >
                IG Reels
              </button>
              <button 
                id="tabXRedeem"
                onClick={() => setActivePlatform('twitter')}
                className={`flex-1 py-1.5 text-center text-xs font-bold rounded-xl transition-all ${activePlatform === 'twitter' ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20 shadow-md' : 'text-slate-400 hover:text-slate-205 border border-transparent'}`}
              >
                X Video
              </button>
            </div>

            {/* Simulated Smartphone Screen Viewport */}
            <div 
              onMouseEnter={() => {
                setHoveringVideo(true);
                if (config.pauseOnHover) {
                  addLog("Mouse Hover: Video auto-scroll paused", "warn");
                }
              }}
              onMouseLeave={() => {
                setHoveringVideo(false);
                if (config.pauseOnHover) {
                  addLog("Mouse Left: Video auto-scroll resumed", "info");
                }
              }}
              className="w-full h-[540px] bg-black rounded-[36px] overflow-hidden relative border border-white/10 select-none shadow-inner"
            >
              
              {/* Dynamic Slideshow Transitions */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${activePlatform}_${currentReelIndex}`}
                  initial={{ y: 350, opacity: 0.1 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -350, opacity: 0.1 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 180 }}
                  className="absolute inset-0 w-full h-full"
                >
                  {/* Actual Video Element loaded */}
                  <video
                    id={`video_player_${currentReel.id}`}
                    ref={videoRef}
                    src={currentReel.url}
                    autoPlay={isPlaying}
                    muted={isMuted}
                    loop={false}
                    onTimeUpdate={handleTimeUpdate}
                    onEnded={handleVideoEnded}
                    playsInline
                    className="w-full h-full object-cover"
                  />

                  {/* Dark Vignette Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none" />

                  {/* On-video Reel Information Overlay */}
                  <div className="absolute bottom-4 left-3 right-16 text-white text-xs drop-shadow-md flex flex-col gap-1.5 pointer-events-none">
                    <span className="font-bold text-sm tracking-tight text-white flex items-center gap-1">
                      {currentReel.creator}
                      <span className="w-3.5 h-3.5 rounded-full bg-blue-500 flex items-center justify-center text-[8px] text-white">✓</span>
                    </span>
                    <p className="line-clamp-2 text-zinc-200 text-[11px] leading-relaxed">
                      {currentReel.title}. {currentReel.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="bg-white/10 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] text-zinc-100 uppercase tracking-wider font-mono">
                        {activePlatform} video
                      </span>
                      <span className="text-[10px] text-zinc-300 font-mono">
                        Speed: {config.playbackSpeed}x
                      </span>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Action Buttons sidebar inside Emulator */}
              <div className="absolute bottom-16 right-3 flex flex-col gap-4 items-center z-30">
                
                {/* Hearts Button */}
                <button className="flex flex-col items-center group cursor-pointer focus:outline-none">
                  <div className="w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md flex items-center justify-center border border-white/10 text-white transition group-hover:scale-110">
                    <Heart className="w-5 h-5 fill-rose-500 text-rose-500" />
                  </div>
                  <span className="text-[10px] text-zinc-300 font-medium mt-1">{currentReel.likes}</span>
                </button>

                {/* Comments Open Panel Switcher */}
                <button 
                  onClick={() => {
                    setCommentsVisible(!commentsVisible);
                    addLog(commentsVisible ? "Comments list panel closed" : "Comments list panel opened - auto-scroll suspended", commentsVisible ? "info" : "warn");
                  }}
                  className={`flex flex-col items-center group cursor-pointer focus:outline-none`}
                >
                  <div className={`w-10 h-10 rounded-full backdrop-blur-md flex items-center justify-center border transition group-hover:scale-110 ${commentsVisible ? 'bg-cyan-500 border-cyan-400 text-black' : 'bg-black/40 border-white/10 text-white'}`}>
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] text-zinc-300 font-medium mt-1">{currentReel.commentsCount}</span>
                </button>

                {/* Audio Sound Toggle */}
                <button 
                  onClick={() => setIsMuted(!isMuted)}
                  className="flex flex-col items-center group cursor-pointer focus:outline-none"
                >
                  <div className="w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md flex items-center justify-center border border-white/10 text-white transition group-hover:scale-110">
                    {isMuted ? <VolumeX className="w-5 h-5 text-zinc-400" /> : <Volume2 className="w-5 h-5 text-cyan-400" />}
                  </div>
                </button>

                {/* Play/Pause Simulator Clip */}
                <button 
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="flex flex-col items-center group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md flex items-center justify-center border border-white/10 text-white transition-all group-hover:scale-110">
                    {isPlaying ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-cyan-400" />}
                  </div>
                </button>
              </div>

              {/* Progress Slider on bottom */}
              <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/40 border-t border-white/5 z-30">
                <div 
                  className={`h-full transition-all duration-100 ease-linear ${activePlatform === 'youtube' ? 'bg-red-600' : activePlatform === 'instagram' ? 'bg-pink-600' : 'bg-cyan-500'}`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Eextension's Injected Floating On-Page UI Overlay! */}
              {config.enabled && (
                <div className="absolute right-14 top-1/4 -translate-y-1/2 z-40 transition-all pointer-events-auto">
                  
                  {/* Scoped HUD card style */}
                  <div 
                    className="bg-black/55 backdrop-blur-xl border border-white/15 rounded-2xl p-2.5 flex flex-col items-center gap-3.5 shadow-2xl ring-1 ring-cyan-500/30 hover:scale-105 hover:border-cyan-500/50 hover:shadow-cyan-500/20 hover:ring-cyan-500/40 transition-all pointer-events-auto w-[68px]"
                  >
                    
                    {/* SVG circular progress ring */}
                    <div className="relative w-11 h-11 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="22" cy="22" r="18" className="fill-none stroke-white/10 stroke-2" />
                        <circle 
                          cx="22" 
                          cy="22" 
                          r="18" 
                          className="fill-none stroke-cyan-400 stroke-2 transition-all duration-100 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" 
                          strokeDasharray={113}
                          strokeDashoffset={113 - (113 * (progressPercent / 100))}
                        />
                      </svg>
                      <span className="absolute text-[9px] font-bold text-zinc-100">{Math.floor(progressPercent)}%</span>
                    </div>

                    {/* Auto Scroll Toggle */}
                    <button 
                      onClick={() => {
                        setIsAutoScrollingHUD(!isAutoScrollingHUD);
                        addLog(isAutoScrollingHUD ? "Auto-scroll toggle turned off on HUD panel" : "Auto-scroll toggle restored on HUD panel", isAutoScrollingHUD ? "warn" : "success");
                      }}
                      className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all ${
                        isAutoScrollingHUD 
                          ? 'bg-cyan-500 text-black border-cyan-400 shadow-lg shadow-cyan-500/40 hover:scale-105' 
                          : 'bg-white/10 text-white border-white/10 hover:bg-white/20'
                      }`}
                    >
                      {isAutoScrollingHUD ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 text-current fill-current" />}
                    </button>

                    {/* Skip Force element */}
                    <button 
                      onClick={() => {
                        addLog("User clicked Skip button on visual HUD. Skipping reel...", "success");
                        handleNextReel();
                      }}
                      className="w-8 h-8 rounded-full bg-white/10 text-white border border-white/10 flex items-center justify-center hover:bg-white/20 transition-all hover:scale-105"
                    >
                      <SkipForward className="w-3.5 h-3.5 text-white" />
                    </button>

                    {/* Pulse indicators */}
                    <div className="flex items-center gap-1 text-[8px] text-zinc-400 font-bold uppercase tracking-wide">
                      <span className={`w-1.5 h-1.5 rounded-full ${(!isAutoScrollingHUD || (config.pauseOnHover && hoveringVideo) || (config.pauseOnComments && commentsVisible)) ? 'bg-rose-500' : 'bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.6)]'}`} />
                      <span>{(!isAutoScrollingHUD || (config.pauseOnHover && hoveringVideo) || (config.pauseOnComments && commentsVisible)) ? 'Hold' : 'Live'}</span>
                    </div>

                  </div>
                </div>
              )}

              {/* Dynamic Simulated Comments Section Slide-Drawer */}
              <AnimatePresence>
                {commentsVisible && (
                  <motion.div 
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ type: "tween", duration: 0.3 }}
                    className="absolute inset-x-0 bottom-0 top-[20%] bg-[#0e0e11]/95 backdrop-blur-md rounded-t-2xl border-t border-zinc-800 z-50 flex flex-col p-4"
                  >
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-3">
                      <span className="font-bold text-xs">Comments ({currentReel.commentsCount})</span>
                      <button 
                        onClick={() => {
                          setCommentsVisible(false);
                          addLog("Comments list panel closed", "info");
                        }} 
                        className="text-zinc-400 hover:text-zinc-100 text-xs px-2"
                      >
                        Close
                      </button>
                    </div>

                    {/* Comments Feed list view */}
                    <div className="flex-1 overflow-y-auto space-y-3 font-sans pr-1">
                      <div className="p-2 bg-white/5 rounded-lg border border-white/5 text-[11px]">
                        <span className="font-bold text-cyan-400 block mb-0.5">@dev_guru</span>
                        <p className="text-zinc-200">Wow, that is some absolute next level transition speed! How did you capture this camera angle?</p>
                      </div>
                      <div className="p-2 bg-white/5 rounded-lg border border-white/5 text-[11px]">
                        <span className="font-bold text-pink-400 block mb-0.5">@flow_stream_fan</span>
                        <p className="text-zinc-200">The circular transition progress overlay looking insanely premium. Installed this unpack extension immediately!</p>
                      </div>
                      <div className="p-2 bg-white/5 rounded-lg border border-white/5 text-[11px]">
                        <span className="font-bold text-zinc-400 block mb-0.5">@wanderlist</span>
                        <p className="text-zinc-200">This loop is highly therapeutic. Can watch this on constant loop for hours on end.</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>

            {/* Bottom Screen Bar */}
            <div className="absolute bottom-1 right-2 left-2 flex items-center justify-center p-1 font-mono text-[9px] text-slate-500 select-none">
              <span className="bg-black/60 text-slate-300 border border-white/15 px-3 py-1 rounded-full font-bold tracking-widest uppercase shadow-md backdrop-blur-md">
                {hoveringVideo ? '● FOCUS HOLD ACTIVE' : commentsVisible ? '💬 INTERACTION ACTIVE' : '◀ LIVE STREAMS ▶'}
              </span>
            </div>

          </div>

          {/* Stats & Tooltips Frame */}
          <div className="w-full max-w-[390px] mt-4 flex flex-col gap-3">
            {/* Dedicated Theme Stats block */}
            <div className="p-4 bg-cyan-500/5 rounded-2xl border border-cyan-500/20 text-center shadow-[0_0_15px_rgba(6,182,212,0.05)]">
              <div className="text-2xl font-extrabold text-white tracking-tight drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">
                {scrollsCount.toLocaleString()}
              </div>
              <div className="text-[10px] text-cyan-400 uppercase tracking-widest font-bold">Auto-Scrolls Today</div>
            </div>

            {/* Tooltip block */}
            <div className="p-4 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-md flex gap-2.5 text-xs text-slate-300 shadow-md">
              <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-white">Autopilot Tester Tooltips</p>
                <ul className="list-disc list-inside space-y-1.5 text-[11px] mt-1.5 text-slate-400">
                  <li>Hover over the phone screen to simulate <span className="text-slate-350">"Pause on Hover"</span>.</li>
                  <li>Tap <MessageSquare className="inline w-3 h-3 text-cyan-400 mx-0.5" /> on the device to simulate <span className="text-slate-350">"Pause on Comments"</span>.</li>
                  <li>Wait completion to <span className="font-bold text-cyan-400">{config.threshold}%</span> to observe the scroll transition.</li>
                </ul>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: DOUBLE TABS (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-5 relative z-10">
          
          {/* Header Controls Selector Tabs */}
          <div className="flex border-b border-white/15 overflow-x-auto scrollbar-none gap-2">
            
            <button
              onClick={() => setSidebarTab('controls')}
              className={`pb-3 px-4 text-sm font-bold relative transition ${sidebarTab === 'controls' ? 'text-cyan-400 font-extrabold' : 'text-slate-400 hover:text-slate-205'}`}
            >
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-cyan-400 drop-shadow-[0_0_4px_rgba(34,211,238,0.4)]" />
                <span className="whitespace-nowrap">Control Dashboard</span>
              </div>
              {sidebarTab === 'controls' && (
                <motion.div layoutId="nav_underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
              )}
            </button>

            <button
              onClick={() => setSidebarTab('code')}
              className={`pb-3 px-4 text-sm font-bold relative transition ${sidebarTab === 'code' ? 'text-cyan-400 font-extrabold' : 'text-slate-400 hover:text-slate-205'}`}
            >
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-cyan-400 drop-shadow-[0_0_4px_rgba(34,211,238,0.4)]" />
                <span className="whitespace-nowrap">Extension Codebase</span>
                <span className="text-[9px] bg-cyan-950 text-cyan-400 border border-cyan-800/80 px-1.5 py-0.5 rounded-md uppercase font-mono font-bold tracking-wide">6 Files</span>
              </div>
              {sidebarTab === 'code' && (
                <motion.div layoutId="nav_underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
              )}
            </button>

            <button
              onClick={() => setSidebarTab('how-to')}
              className={`pb-3 px-4 text-sm font-bold relative transition ${sidebarTab === 'how-to' ? 'text-cyan-400 font-extrabold' : 'text-slate-400 hover:text-slate-205'}`}
            >
              <div className="flex items-center gap-2">
                <Laptop className="w-4 h-4 text-cyan-400 drop-shadow-[0_0_4px_rgba(34,211,238,0.4)]" />
                <span className="whitespace-nowrap">Installation Guide</span>
              </div>
              {sidebarTab === 'how-to' && (
                <motion.div layoutId="nav_underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
              )}
            </button>

          </div>

          {/* ACTIVE TAB CONTENT */}
          <div className="flex-1 bg-slate-900/40 border border-white/10 backdrop-blur-xl rounded-3xl p-6 shadow-2xl relative">
            
            {/* TAB 1: INTERACTIVE CONTROL PANEL */}
            {sidebarTab === 'controls' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                
                {/* Simulator Settings */}
                <div className="flex flex-col gap-5">
                  <div>
                    <h3 className="font-bold text-sm text-[white] tracking-tight uppercase">Autopilot Config Modifier</h3>
                    <p className="text-[11px] text-slate-400 mt-1">Live synchronizes settings with the phone emulator below.</p>
                  </div>

                  <div className="space-y-4">
                    
                    {/* Master Switch */}
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-md">
                      <div>
                        <span className="font-bold text-xs text-white block">Auto-Scrolling Core</span>
                        <span className="text-[10px] text-slate-500">Master power for extension script</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={config.enabled}
                          onChange={(e) => handleConfigChange('enabled', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500/20 peer-checked:after:bg-cyan-400 border border-slate-700"></div>
                      </label>
                    </div>

                    {/* Site Toggle Grids */}
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-md space-y-3">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter block">Scope Application Filters</label>
                      
                      {/* YT Shorts */}
                      <div className="flex items-center justify-between p-3 bg-white/[0.02] rounded-xl border border-white/5">
                        <span className="text-xs text-slate-300">YouTube Shorts</span>
                        <div className="flex items-center gap-2.5">
                          {config.ytShorts && config.enabled ? <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.8)]"></div> : null}
                          <input 
                            type="checkbox" 
                            checked={config.ytShorts}
                            disabled={!config.enabled}
                            onChange={(e) => handleConfigChange('ytShorts', e.target.checked)}
                            className="accent-cyan-400 rounded h-4 w-4 bg-black border-white/10 cursor-pointer"
                          />
                        </div>
                      </div>

                      {/* Instagram Reels */}
                      <div className="flex items-center justify-between p-3 bg-white/[0.02] rounded-xl border border-white/5">
                        <span className="text-xs text-slate-300">Instagram Reels</span>
                        <div className="flex items-center gap-2.5">
                          {config.igReels && config.enabled ? <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.8)]"></div> : null}
                          <input 
                            type="checkbox" 
                            checked={config.igReels}
                            disabled={!config.enabled}
                            onChange={(e) => handleConfigChange('igReels', e.target.checked)}
                            className="accent-cyan-400 rounded h-4 w-4 bg-black border-white/10 cursor-pointer"
                          />
                        </div>
                      </div>

                      {/* Twitter X Video */}
                      <div className="flex items-center justify-between p-3 bg-white/[0.02] rounded-xl border border-white/5">
                        <span className="text-xs text-slate-300">Twitter (X) Vertical Modal Feed</span>
                        <div className="flex items-center gap-2.5">
                          {config.xVideo && config.enabled ? <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.8)]"></div> : null}
                          <input 
                            type="checkbox" 
                            checked={config.xVideo}
                            disabled={!config.enabled}
                            onChange={(e) => handleConfigChange('xVideo', e.target.checked)}
                            className="accent-cyan-400 rounded h-4 w-4 bg-black border-white/10 cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Completion Threshold Slider */}
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-md space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <div>
                          <span className="font-bold text-slate-200 block">Scroll-Next Threshold</span>
                          <span className="text-[10px] text-slate-500">Avoid end buffering lag</span>
                        </div>
                        <span className="text-sm font-bold text-cyan-400 drop-shadow-[0_0_4px_rgba(34,211,238,0.4)]">{config.threshold}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="80" 
                        max="100" 
                        value={config.threshold}
                        disabled={!config.enabled}
                        onChange={(e) => handleConfigChange('threshold', parseInt(e.target.value))}
                        style={{
                          background: `linear-gradient(to right, #3b82f6 0%, #22d3ee ${(config.threshold - 80) / 20 * 100}%, #1e293b ${(config.threshold - 80) / 20 * 100}%, #1e293b 100%)`
                        }}
                        className="w-full accent-cyan-400 h-1.5 rounded-lg cursor-pointer appearance-none outline-none"
                      />
                    </div>

                    {/* Speed Selecting Dropdown */}
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-md flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-300 block">Playback Velocity</span>
                        <span className="text-[10px] text-slate-500">Increase speeds to save time</span>
                      </div>
                      <select 
                        value={config.playbackSpeed}
                        disabled={!config.enabled}
                        onChange={(e) => handleConfigChange('playbackSpeed', parseFloat(e.target.value))}
                        className="bg-slate-900/90 border border-white/10 text-slate-200 px-3 py-1.5 rounded-xl focus:outline-none focus:border-cyan-400 cursor-pointer"
                      >
                        <option value="1">1.0x Normal</option>
                        <option value="1.25">1.25x Faster</option>
                        <option value="1.5">1.5x Rapid</option>
                        <option value="2">2.0x Double</option>
                      </select>
                    </div>

                    {/* Smart Safety Checks */}
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-md space-y-3">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter block">Smart Safety Controls</label>
                      
                      {/* Pause on Hover */}
                      <div className="flex items-center justify-between p-3 bg-white/[0.02] rounded-xl border border-white/5">
                        <div>
                          <span className="text-xs text-slate-300 block font-semibold">Pause on Hover</span>
                          <span className="text-[10px] text-slate-500">Hold scroll if cursor is inside player</span>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={config.pauseOnHover}
                          disabled={!config.enabled}
                          onChange={(e) => handleConfigChange('pauseOnHover', e.target.checked)}
                          className="accent-cyan-400 h-4 w-4 bg-black border-white/10 cursor-pointer"
                        />
                      </div>

                      {/* Pause on Comments */}
                      <div className="flex items-center justify-between p-3 bg-white/[0.02] rounded-xl border border-white/5">
                        <div>
                          <span className="text-xs text-slate-300 block font-semibold">Wait for Comments Section</span>
                          <span className="text-[10px] text-slate-500">Delay scroll when commenting or reading replies</span>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={config.pauseOnComments}
                          disabled={!config.enabled}
                          onChange={(e) => handleConfigChange('pauseOnComments', e.target.checked)}
                          className="accent-cyan-400 h-4 w-4 bg-black border-white/10 cursor-pointer"
                        />
                      </div>
                    </div>

                  </div>
                </div>

                {/* Automation Log */}
                <div className="flex flex-col h-full justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-sm text-white tracking-tight uppercase">Live Automation Logs</h3>
                    <p className="text-[11px] text-slate-400 mt-1">Real-time content script event tracing log inside device.</p>
                  </div>

                  <div className="flex-1 bg-[#0A0A0B]/80 backdrop-blur-md rounded-2xl border border-white/5 font-mono text-[11px] p-4 overflow-y-auto h-[260px] max-h-[380px] space-y-2">
                    {logs.map((log, index) => (
                      <div key={index} className="flex gap-2 leading-relaxed border-b border-white/[0.02] pb-1.5 last:border-0">
                        <span className="text-slate-500 text-[10px] select-none">{log.time}</span>
                        <div>
                          <span className={`font-semibold mr-1.5 ${
                            log.type === 'success' ? 'text-cyan-400 drop-shadow-[0_0_4px_rgba(34,211,238,0.4)]' :
                            log.type === 'warn' ? 'text-rose-400' :
                            log.type === 'action' ? 'text-blue-400' : 'text-slate-400'
                          }`}>
                            [{log.type.toUpperCase()}]
                          </span>
                          <span className="text-slate-300">{log.text}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Manual trigger controllers */}
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-md space-y-3">
                    <span className="font-bold text-[10px] uppercase tracking-wide text-slate-500 flex items-center justify-between">
                      <span>Quick Test Controls</span>
                      <span className="text-slate-600">Simulator override</span>
                    </span>
                    <div className="flex flex-wrap sm:flex-nowrap gap-2">
                      <button 
                        onClick={() => {
                          const isHover = !hoveringVideo;
                          setHoveringVideo(isHover);
                          addLog(isHover ? "Mouse simulation hovered" : "Mouse simulation un-hovered", isHover ? "warn" : "info");
                        }}
                        className={`flex-1 py-1.5 text-center text-xs font-semibold rounded-xl border transition ${hoveringVideo ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : 'bg-white/5 text-slate-300 border-white/5 hover:bg-white/10'}`}
                      >
                        {hoveringVideo ? 'Leave Mouse' : 'Hover Mouse'}
                      </button>

                      <button 
                        onClick={() => {
                          const openComments = !commentsVisible;
                          setCommentsVisible(openComments);
                          addLog(openComments ? "Comments section simulation opened" : "Comments simulation closed", openComments ? "warn" : "info");
                        }}
                        className={`flex-[#1.3] py-1.5 text-center text-xs font-semibold rounded-xl border transition ${commentsVisible ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30 shadow-[0_0_8px_rgba(34,211,238,0.2)]' : 'bg-white/5 text-slate-300 border-white/5 hover:bg-white/10'}`}
                      >
                        {commentsVisible ? 'Close Drawer' : 'Simulate Comments Open'}
                      </button>

                      <button 
                        onClick={() => {
                          addLog("Triggered force skip", "action");
                          handleNextReel();
                        }}
                        className="py-1.5 px-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-black font-semibold text-xs rounded-xl hover:opacity-90 active:scale-95 transition shadow-lg shadow-cyan-500/25"
                      >
                        Skip Target
                      </button>
                    </div>
                  </div>

                </div>

              </div>
            )}

            {/* TAB 2: ACTIVE CODEBASE */}
            {sidebarTab === 'code' && (
              <div className="flex flex-col gap-4">
                
                {/* Meta explanation */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#0c0c0e] p-3.5 rounded-xl border border-[#27272a]">
                  <div>
                    <h3 className="font-bold text-xs tracking-wide text-zinc-100 uppercase">Extension Source Viewer</h3>
                    <p className="text-[11px] text-zinc-400 mt-1">Chrome Extension files. These are populated directly in your project root <code className="bg-zinc-900 border border-zinc-800 px-1 py-0.5 rounded text-cyan-400">/extension/</code> folder!</p>
                  </div>
                  
                  {/* Download All files as single zip details button */}
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        // Trigger download of files individually
                        addLog("Downloading individual core codebase files...", "action");
                        EXTENSION_FILES.forEach(f => downloadFile(f));
                      }}
                      className="bg-cyan-500 text-black font-bold text-xs px-3 py-1.5 rounded-lg hover:bg-cyan-400 transition flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download All Files</span>
                    </button>
                  </div>
                </div>

                {/* Sub Tab selection of files */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                  
                  {/* Explorer list */}
                  <div className="md:col-span-3 flex flex-col gap-1.5">
                    {EXTENSION_FILES.map((file, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveFileIndex(idx)}
                        className={`text-left text-xs px-3 py-2 rounded-lg border transition flex items-center justify-between ${idx === activeFileIndex ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 font-semibold' : 'bg-transparent border-transparent hover:bg-[#0c0c0e]/80 text-zinc-400'}`}
                      >
                        <span className="truncate">{file.name}</span>
                        <span className={`text-[9px] uppercase font-mono px-1 rounded ${idx === activeFileIndex ? 'bg-cyan-950 text-cyan-400' : 'bg-zinc-800 text-zinc-500'}`}>
                          {file.language}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Active code description box and code view */}
                  <div className="md:col-span-9 flex flex-col border border-[#27272a] rounded-xl bg-[#09090b] overflow-hidden">
                    
                    {/* Code Meta panel */}
                    <div className="flex items-center justify-between px-4 py-2.5 bg-[#0c0c0e] border-b border-[#27272a] text-xs">
                      <div>
                        <span className="font-bold text-zinc-200">{EXTENSION_FILES[activeFileIndex].path}</span>
                        <p className="text-[10px] text-zinc-400 sm:block hidden">{EXTENSION_FILES[activeFileIndex].description}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Copy Code */}
                        <button
                          onClick={() => copyToClipboard(EXTENSION_FILES[activeFileIndex].content, activeFileIndex)}
                          className="p-1 px-2.5 rounded bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-805 text-zinc-250 flex items-center gap-1.5 transition text-[11px]"
                        >
                          {copiedFileIndex === activeFileIndex ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-green-400" />
                              <span className="text-green-400 font-semibold">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-cyan-400" />
                              <span>Copy Code</span>
                            </>
                          )}
                        </button>
                        
                        {/* Single Download */}
                        <button
                          onClick={() => downloadFile(EXTENSION_FILES[activeFileIndex])}
                          className="p-1 px-2 text-zinc-400 hover:text-cyan-400 hover:bg-zinc-850 bg-zinc-900 border border-[#27272a] rounded transition"
                          title="Download file"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Pre-formatted code blocks */}
                    <div className="p-4 overflow-auto font-mono text-[11px] leading-relaxed max-h-[380px] bg-black text-emerald-400 select-all scrollbar-thin">
                      <pre className="text-zinc-200">{`/* Local path: ./extension/${EXTENSION_FILES[activeFileIndex].path} */\n\n`}{EXTENSION_FILES[activeFileIndex].content}</pre>
                    </div>

                  </div>

                </div>

              </div>
            )}

            {/* TAB 3: HOW TO INSTALL AND RUN */}
            {sidebarTab === 'how-to' && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-bold text-sm text-zinc-100 tracking-tight uppercase">Installation & Production Rollout</h3>
                  <p className="text-xs text-zinc-400 mt-1">Deploying the local extension to your Chrome browser is extremely simple:</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Step 1 */}
                  <div className="bg-[#0c0c0e] p-4 rounded-xl border border-[#27272a] space-y-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800 flex items-center justify-center font-mono font-bold text-xs">
                        1
                      </div>
                      <span className="font-semibold text-xs">Export Codebase Sub-Folder</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      All files have been pre-written in the root folder <code className="bg-zinc-900 px-1 py-0.5 rounded text-cyan-400">/extension/</code>. Export this specific folder to your desktop or click the <span className="font-bold text-cyan-400">"Download All Files"</span> button in the Code tab above to save them.
                    </p>
                  </div>

                  {/* Step 2 */}
                  <div className="bg-[#0c0c0e] p-4 rounded-xl border border-[#27272a] space-y-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800 flex items-center justify-center font-mono font-bold text-xs">
                        2
                      </div>
                      <span className="font-semibold text-xs">Open Chrome Extensions Tab</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      In your Chrome search box, navigate to URL address <code className="bg-zinc-900 border border-zinc-800 px-1 py-0.5 rounded text-cyan-400">chrome://extensions/</code> or open the puzzle icon top-right and select "Manage extensions".
                    </p>
                  </div>

                  {/* Step 3 */}
                  <div className="bg-[#0c0c0e] p-4 rounded-xl border border-[#27272a] space-y-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800 flex items-center justify-center font-mono font-bold text-xs">
                        3
                      </div>
                      <span className="font-semibold text-xs">Enable Developer Mode</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      In the top-right corner of Chrome's Extensions directory page, switch on the toggle for <span className="font-bold text-cyan-400">"Developer mode"</span>. This unlocks loading unpacked local extensions.
                    </p>
                  </div>

                  {/* Step 4 */}
                  <div className="bg-[#0c0c0e] p-4 rounded-xl border border-[#27272a] space-y-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800 flex items-center justify-center font-mono font-bold text-xs">
                        4
                      </div>
                      <span className="font-semibold text-xs">Load Unpacked Extension Folder</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Tap the <span className="bg-[#18181b] border border-[#27272a] text-zinc-200 px-1.5 py-0.5 rounded font-bold text-[10px]">"Load unpacked"</span> button in top-left, and select the folder path containing manifest.json. You are done!
                    </p>
                  </div>

                </div>

                {/* Developer Safety Notice */}
                <div className="p-4 bg-cyan-950/20 border border-cyan-800/60 rounded-xl flex gap-3 text-xs leading-relaxed text-cyan-400">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <div>
                    <span className="font-bold text-zinc-100 block mb-0.5">Note on Dynamic Site Selectors</span>
                    <p className="text-zinc-300">
                      Social platform layouts change frequently. FlowStream mitigates this by targeting generic indicators (like <code className="bg-cyan-950 px-1 border border-cyan-900 rounded">video</code> elements and relative scrolling of article viewport siblings) rather than heavily-hashed CSS classes. If auto-scroll is stuck, adjust selectors in <code className="bg-cyan-950 font-bold px-1 rounded">content_script.js</code> using inspected classes!
                    </p>
                  </div>
                </div>

              </div>
            )}

          </div>

          {/* Quick Metrics display bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            
            <div className="p-4 bg-white/5 border border-white/5 backdrop-blur-sm rounded-2xl text-center shadow-lg">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest block">Extension API</span>
              <span className="text-sm font-bold text-white mt-1 block">Manifest V3</span>
            </div>

            <div className="p-4 bg-white/5 border border-white/5 backdrop-blur-sm rounded-2xl text-center shadow-lg">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest block">Script Weight</span>
              <span className="text-sm font-bold text-white mt-1 block font-mono">~9.4 KB</span>
            </div>

            <div className="p-4 bg-white/5 border border-white/5 backdrop-blur-sm rounded-2xl text-center shadow-lg">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest block">External Loads</span>
              <span className="text-sm font-bold text-cyan-400 mt-1 block uppercase tracking-wider">Zero</span>
            </div>

            <div className="p-4 bg-white/5 border border-white/5 backdrop-blur-sm rounded-2xl text-center shadow-lg">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest block">Active Triggers</span>
              <span className="text-sm font-bold text-white mt-1 block uppercase tracking-wider">Mutation</span>
            </div>

          </div>

        </div>

      </main>

      {/* Footer System Status details */}
      <footer className="border-t border-white/5 bg-[#0A0A0B]/90 backdrop-blur-md py-6 text-center text-xs text-slate-500 mt-auto select-none relative z-10">
        <div className="max-w-[1400px] mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-3">
          <span>FlowStream Auto-Scroll Extension &copy; 2026. Production Standard Edition.</span>
          <div className="flex gap-4">
            <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 block animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]"></span>
              <span>All Workspace Checks Passed</span>
            </span>
          </div>
        </div>
      </footer>

    </div>
  );
}
