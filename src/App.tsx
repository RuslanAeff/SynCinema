/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SynCinema - App Component
 *  @author Ruslan Aliyev
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useCallback, useEffect, useRef, lazy, Suspense } from 'react';
import { Sidebar } from './components/Sidebar';
import { VideoPlayer } from './components/VideoPlayer';
import { YouTubePlayer } from './components/YouTubePlayer';
import { WelcomeScreen } from './components/WelcomeScreen';
import { HelpPanel } from './components/HelpPanel';
import { Snowfall } from './components/Snowfall'; // shared with WelcomeScreen — kept eager

// Lazy-loaded overlays — code-split so they're only fetched when first opened.
// This trims the initial bundle (AdminPanel pulls in Supabase, etc.).
const OnboardingTour = lazy(() => import('./components/OnboardingTour').then(m => ({ default: m.OnboardingTour })));
const UrlLoaderModal = lazy(() => import('./components/UrlLoaderModal').then(m => ({ default: m.UrlLoaderModal })));
const StatisticsPanel = lazy(() => import('./components/StatisticsPanel').then(m => ({ default: m.StatisticsPanel })));
const AdminPanel = lazy(() => import('./components/AdminPanel').then(m => ({ default: m.AdminPanel })));
import { useVideoPlayer } from './hooks/useVideoPlayer';
import { useAudioTracks } from './hooks/useAudioTracks';
import { useTheme } from './hooks/useTheme';
import { useAnalytics } from './hooks/useAnalytics';
import { useCloudSync } from './hooks/useCloudSync';
import { useToast } from './components/Toast';
import { Logo } from './components/Logo';
import { InfoButton } from './components/HelpPanel';
import { Sun, Moon, BarChart3, ShieldAlert } from 'lucide-react';
import { useI18n } from './context/I18nContext';
import { SubtitleStyle } from './types';


function App() {
  const { t } = useI18n();
  const {
    videoFile,
    videoObjectUrl,
    isPlaying,
    currentTime,
    duration,
    videoRef,
    loadVideo,
    togglePlay,
    handleSeek,
    setIsPlaying,
    setCurrentTime,
    setDuration,
    subtitleCues,
    subtitleOffset,
    loadSubtitles,
    setSubtitleOffset,
    videoVolume,
    videoMuted,
    setVideoVolume,
    setVideoMuted,
    videoDeviceId,
    setVideoDeviceId,
    markers,
    addMarker,
    deleteMarker,
    loadVideoFromUrl,
    videoFingerprint
  } = useVideoPlayer();

  const {
    audioTracks,
    audioDevices,
    permissionsGranted,
    refreshDevices,
    addAudioTracks,
    addAudioFromUrl,
    updateAudioTrack,
    deleteAudioTrack,
    exportProject,
    importProject,
    masterVolume,
    setMasterVolume
  } = useAudioTracks();

  // Theme
  const { theme, toggleTheme, accentTheme, toggleAccentTheme } = useTheme();

  // Analytics
  const { analytics, trackEvent, trackWatchTime, resetAnalytics, formatWatchTime } = useAnalytics();

  // Welcome Screen State (sessionStorage = shows once per browser session)
  const [showWelcome, setShowWelcome] = useState(() => {
    // Check sessionStorage to see if user has seen welcome screen this session
    const hasSeenWelcome = sessionStorage.getItem('syncinema_welcome_seen');
    return !hasSeenWelcome;
  });

  // Onboarding Tour State
  const [showTour, setShowTour] = useState(false);

  // Help Panel State
  const [showHelp, setShowHelp] = useState(false);

  // Admin Panel State
  const [showAdmin, setShowAdmin] = useState(false);

  // Subtitle Style State
  const [subtitleStyle, setSubtitleStyle] = useState<SubtitleStyle>({
    color: '#ffffff',
    backgroundColor: 'rgba(0, 0, 0, 0)',
    fontSize: 'medium',
    textShadow: true,
    position: 8,
    outline: false,
    fontFamily: 'system-ui, sans-serif',
  });

  // Secret admin access: Ctrl+Shift+A (desktop) or ?admin=true URL param (mobile)
  useEffect(() => {
    // Check URL parameter for mobile access
    const params = new URLSearchParams(window.location.search);
    if (params.get('admin') === 'true') {
      setShowAdmin(true);
      // Clean URL to hide the parameter
      const url = new URL(window.location.href);
      url.searchParams.delete('admin');
      window.history.replaceState({}, '', url.toString());
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        setShowAdmin(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // URL Loader Modal State
  const [showUrlLoader, setShowUrlLoader] = useState(false);

  // Statistics Panel State
  const [showStatistics, setShowStatistics] = useState(false);

  // YouTube Video State
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);

  const handleWelcomeComplete = useCallback(() => {
    setShowWelcome(false);
    sessionStorage.setItem('syncinema_welcome_seen', 'true');

    // Skip tour on mobile devices (width < 1024px = lg breakpoint)
    const isMobile = window.innerWidth < 1024;
    if (isMobile) {
      sessionStorage.setItem('syncinema_tour_completed', 'true');
      return; // Don't start tour on mobile
    }

    // Check if user has completed the tour this session (desktop only)
    const hasCompletedTour = sessionStorage.getItem('syncinema_tour_completed');
    if (!hasCompletedTour) {
      // Start tour after a short delay
      setTimeout(() => setShowTour(true), 500);
    }
  }, []);

  const handleTourComplete = useCallback(() => {
    setShowTour(false);
    sessionStorage.setItem('syncinema_tour_completed', 'true');
  }, []);

  const handleTourSkip = useCallback(() => {
    setShowTour(false);
    sessionStorage.setItem('syncinema_tour_completed', 'true');
  }, []);

  // Allow Enter key to dismiss welcome screen
  useEffect(() => {
    if (!showWelcome) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleWelcomeComplete();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showWelcome, handleWelcomeComplete]);

  // Bookmarklet: Auto-load video from ?video= query parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const videoParam = params.get('video');
    if (videoParam) {
      try {
        const decodedUrl = decodeURIComponent(videoParam);

        // Security: Only allow http/https URLs (block javascript:, data:, file:, etc.)
        if (!/^https?:\/\//i.test(decodedUrl)) {
          console.warn('[SynCinema Bookmarklet] Blocked non-http URL:', decodedUrl);
          return;
        }

        // Skip welcome screen
        setShowWelcome(false);
        sessionStorage.setItem('syncinema_welcome_seen', 'true');
        sessionStorage.setItem('syncinema_tour_completed', 'true');

        // Check if it's YouTube
        const ytMatch = decodedUrl.match(/(?:youtube\.com\/watch\?.*v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
        if (ytMatch) {
          setYoutubeVideoId(ytMatch[1]);
        } else {
          loadVideoFromUrl(decodedUrl, 'Bookmarklet Video');
        }

        // Clean URL bar (remove ?video= param)
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (e) {
        console.error('[SynCinema Bookmarklet] Failed to load video from URL param:', e);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Cloud Sync Logic
  const { findPreset, saveOrUpvotePreset } = useCloudSync();
  const { showToast } = useToast();

  // Track which presets we've already asked the user about to avoid spamming
  const [askedPresets, setAskedPresets] = useState<Set<string>>(new Set());

  useEffect(() => {
    const checkCloudSync = async () => {
      // We only check if we have a video and at least one audio track
      if (!videoFingerprint || audioTracks.length === 0) return;

      // For MVP, we'll just check the first audio track against the video
      const primaryAudio = audioTracks[0];
      if (!primaryAudio.audioFingerprint) return;

      const comboKeys = `${videoFingerprint}_${primaryAudio.audioFingerprint}`;
      if (askedPresets.has(comboKeys)) return;

      const preset = await findPreset(videoFingerprint, primaryAudio.audioFingerprint);

      if (preset) {
        const currentOffsetMs = primaryAudio.offset * 1000;
        const diff = Math.abs(preset.offset_ms - currentOffsetMs);
        const seconds = (preset.offset_ms / 1000).toFixed(3);

        // Anti-spam & Trust logic
        const isTrusted = preset.votes > 1;
        const trustWarning = isTrusted
          ? t.cloudSyncMessages.trustTrusted
          : t.cloudSyncMessages.trustWarning;

        if (diff > 100) {
          // We found a preset that's significantly different from the current offset
          showToast({
            title: t.cloudSyncMessages.foundTitle,
            message: t.cloudSyncMessages.foundMessage
              .replace('{seconds}', seconds)
              .replace('{votes}', preset.votes.toString())
              .replace('{trust}', trustWarning),
            type: isTrusted ? 'info' : 'warning',
            duration: 10000,
            action: {
              label: t.cloudSyncMessages.btnApply,
              onClick: () => {
                updateAudioTrack(primaryAudio.id, { offset: preset.offset_ms / 1000, isCloudSynced: true });
                trackEvent('syncOffsetAdjusted');
                showToast({
                  message: t.cloudSyncMessages.appliedSuccess,
                  type: 'success'
                });
              }
            }
          });
        } else {
          // The current local offset already matches the cloud preset (e.g. both are 0)
          updateAudioTrack(primaryAudio.id, { isCloudSynced: true });
          showToast({
            title: t.cloudSyncMessages.alreadySyncedTitle,
            message: t.cloudSyncMessages.alreadySyncedMessage
              .replace('{votes}', preset.votes.toString())
              .replace('{trust}', trustWarning),
            type: 'success',
            duration: 6000
          });
        }
      }

      setAskedPresets(prev => new Set(prev).add(comboKeys));
    };

    checkCloudSync();
  }, [videoFingerprint, audioTracks, findPreset, askedPresets, updateAudioTrack, showToast, t, trackEvent]);

  const handleShareSync = useCallback(async (trackId: string, offset: number) => {
    if (!videoFingerprint) {
      showToast({ message: t.cloudSyncMessages.errorNoVideoFingerprint, type: 'error' });
      return;
    }
    const track = audioTracks.find(t => t.id === trackId);
    if (!track || !track.audioFingerprint) {
      showToast({ message: t.cloudSyncMessages.errorNoAudioFingerprint, type: 'error' });
      return;
    }

    // Convert seconds to milliseconds
    const offsetMs = Math.round(offset * 1000);
    const result = await saveOrUpvotePreset(videoFingerprint, track.audioFingerprint, offsetMs);

    if (result === 'success') {
      showToast({ message: t.cloudSyncMessages.shareSuccess, type: 'success' });
      updateAudioTrack(trackId, { isCloudSynced: true });
    } else if (result === 'rate_limited') {
      showToast({ message: t.cloudSyncMessages.shareRateLimit, type: 'error' });
    } else {
      showToast({ message: t.cloudSyncMessages.shareError || 'Failed to share sync. Please try again.', type: 'error' });
    }
  }, [videoFingerprint, audioTracks, saveOrUpvotePreset, showToast, updateAudioTrack, t]);

  // Drag and Drop State
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    // Only show drop overlay if files are being dragged (not UI elements like sliders)
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes('Files')) {
      dragCounter.current++;
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    // Use counter to handle nested elements
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    dragCounter.current = 0; // Reset counter on drop

    const files = e.dataTransfer.files;
    if (!files.length) return;

    const videoFiles: File[] = [];
    const audioFiles: File[] = [];
    const subtitleFiles: File[] = [];

    Array.from(files).forEach((file: File) => {
      if (file.type.startsWith('video/') || file.name.endsWith('.mkv')) {
        videoFiles.push(file);
      } else if (file.type.startsWith('audio/')) {
        audioFiles.push(file);
      } else if (file.name.endsWith('.srt')) {
        subtitleFiles.push(file);
      }
    });

    // Load files with tracking
    if (videoFiles.length > 0) {
      loadVideo(videoFiles[0]);
      trackEvent('videosLoaded');
    }
    if (audioFiles.length > 0) {
      const dt = new DataTransfer();
      audioFiles.forEach(f => dt.items.add(f));
      addAudioTracks(dt.files);
      trackEvent('audioTracksAdded');
    }
    if (subtitleFiles.length > 0) {
      loadSubtitles(subtitleFiles[0]);
      trackEvent('subtitlesLoaded');
    }
  }, [loadVideo, addAudioTracks, loadSubtitles, trackEvent]);

  // Tracked wrapper functions for analytics
  const handleVideoUpload = useCallback((file: File) => {
    loadVideo(file);
    trackEvent('videosLoaded');
  }, [loadVideo, trackEvent]);

  const handleAudioUpload = useCallback((files: FileList | null) => {
    if (!files) return;
    addAudioTracks(files);
    // Track each audio file added
    for (let i = 0; i < files.length; i++) {
      trackEvent('audioTracksAdded');
    }
  }, [addAudioTracks, trackEvent]);

  const handleSubtitleUpload = useCallback((file: File) => {
    loadSubtitles(file);
    trackEvent('subtitlesLoaded');
  }, [loadSubtitles, trackEvent]);

  const handleSaveProject = useCallback(() => {
    exportProject();
    trackEvent('projectsSaved');
  }, [exportProject, trackEvent]);

  const handleLoadProject = useCallback((file: File) => {
    importProject(file);
    trackEvent('projectsLoaded');
  }, [importProject, trackEvent]);

  const handleAddMarker = useCallback(() => {
    addMarker();
    trackEvent('markersAdded');
  }, [addMarker, trackEvent]);

  const handleAudioFromUrl = useCallback((url: string, filename: string) => {
    addAudioFromUrl(url, filename);
    trackEvent('audioTracksAdded');
  }, [addAudioFromUrl, trackEvent]);

  // Panel open/close handlers — stable references so the memoized sidebar sections
  // aren't invalidated on every playback tick.
  const openHelp = useCallback(() => setShowHelp(true), []);
  const closeHelp = useCallback(() => setShowHelp(false), []);
  const openUrlLoader = useCallback(() => setShowUrlLoader(true), []);
  const closeUrlLoader = useCallback(() => setShowUrlLoader(false), []);
  const openStatistics = useCallback(() => setShowStatistics(true), []);
  const closeStatistics = useCallback(() => setShowStatistics(false), []);

  return (
    <div
      className={`flex flex-col lg:flex-row-reverse h-dvh lg:h-screen bg-gray-950 text-gray-100 font-sans relative transition-all lg:overflow-hidden overflow-y-auto overflow-x-hidden ${isDragging ? 'ring-4 ring-inset ring-primary-500' : ''}`}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <Suspense fallback={null}>
        {/* 🎄 New Year Snowfall - Festive Season Only (Dec 20 - Jan 10) */}
        {(() => { const now = new Date(); const m = now.getMonth(); const d = now.getDate(); return (m === 11 && d >= 20) || (m === 0 && d <= 10); })() && <Snowfall intensity="medium" />}

        {/* Welcome Screen */}
        {showWelcome && <WelcomeScreen onComplete={handleWelcomeComplete} />}

        {/* Onboarding Tour */}
        {showTour && <OnboardingTour onComplete={handleTourComplete} onSkip={handleTourSkip} />}
      </Suspense>

      {/* Drop Overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-primary-900/50 backdrop-blur-sm z-50 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="text-6xl mb-4">📂</div>
            <h2 className="text-2xl font-bold text-white">{t.dragDrop.title}</h2>
            <p className="text-primary-300 mt-2">{t.dragDrop.subtitle}</p>
          </div>
        </div>
      )}

      {/* Mobile Header - Visible only on mobile */}
      <div className="lg:hidden p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo size={32} className="drop-shadow-[0_0_10px_rgba(var(--color-primary-500),0.5)]" />
          <h1 className="text-xl font-extrabold tracking-tight text-gray-900 dark:text-white">SynCinema</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openStatistics}
            className="p-2 rounded-lg bg-gradient-to-br from-primary-500/20 to-secondary-500/20 border border-primary-500/30 text-primary-400 hover:text-primary-300 transition-colors"
            title="Statistics"
          >
            <BarChart3 size={18} />
          </button>
          <InfoButton onClick={openHelp} />
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            {theme === 'dark' ? <Sun size={18} className="text-yellow-400" /> : <Moon size={18} className="text-primary-600" />}
          </button>
        </div>
      </div>

      {/* Video Player - Show YouTube or regular player based on source */}
      {youtubeVideoId ? (
        <YouTubePlayer
          videoId={youtubeVideoId}
          isPlaying={isPlaying}
          onPlayingChange={setIsPlaying}
          onTimeUpdate={setCurrentTime}
          onDurationChange={setDuration}
          currentTime={currentTime}
        />
      ) : (
        <VideoPlayer
          videoFile={videoFile}
          videoObjectUrl={videoObjectUrl}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          videoRef={videoRef}
          togglePlay={togglePlay}
          handleSeek={handleSeek}
          setIsPlaying={setIsPlaying}
          setCurrentTime={setCurrentTime}
          setDuration={setDuration}
          subtitleCues={subtitleCues}
          subtitleOffset={subtitleOffset}
          subtitleStyle={subtitleStyle}
          videoVolume={videoVolume}
          videoMuted={videoMuted}
          onVideoVolumeChange={setVideoVolume}
          onVideoMutedChange={setVideoMuted}
          onTrackEvent={trackEvent as (event: string) => void}
          onTrackWatchTime={trackWatchTime}
        />
      )}

      {/* Sidebar - Controls */}
      <Sidebar
        videoFile={videoFile}
        audioTracks={audioTracks}
        audioDevices={audioDevices}
        permissionsGranted={permissionsGranted}
        videoCurrentTime={currentTime}
        isVideoPlaying={isPlaying}
        onRefreshDevices={refreshDevices}
        onVideoUpload={handleVideoUpload}
        onAudioUpload={handleAudioUpload}
        onTrackUpdate={updateAudioTrack}
        onTrackDelete={deleteAudioTrack}
        onSaveProject={handleSaveProject}
        onLoadProject={handleLoadProject}
        onSubtitleUpload={handleSubtitleUpload}
        subtitleOffset={subtitleOffset}
        onSubtitleOffsetChange={setSubtitleOffset}
        subtitleStyle={subtitleStyle}
        onSubtitleStyleChange={setSubtitleStyle}
        hasSubtitles={subtitleCues.length > 0}
        masterVolume={masterVolume}
        onMasterVolumeChange={setMasterVolume}
        theme={theme}
        accentTheme={accentTheme}
        onThemeToggle={toggleTheme}
        onAccentThemeToggle={toggleAccentTheme}
        videoVolume={videoVolume}
        videoMuted={videoMuted}
        onVideoVolumeChange={setVideoVolume}
        onVideoMutedChange={setVideoMuted}
        markers={markers}
        onAddMarker={handleAddMarker}
        onDeleteMarker={deleteMarker}
        onSeekToMarker={handleSeek}
        videoDeviceId={videoDeviceId}
        onVideoDeviceChange={setVideoDeviceId}
        isHelpOpen={showHelp}
        onHelpOpen={openHelp}
        onHelpClose={closeHelp}
        onUrlLoaderOpen={openUrlLoader}
        onAudioUrlLoad={handleAudioFromUrl}
        onStatisticsOpen={openStatistics}

        onTrackEvent={trackEvent as (event: string) => void}
        onShareSync={handleShareSync}
      />

      {/* Help Panel - at App level to overlay everything */}
      <HelpPanel
        isOpen={showHelp}
        onClose={closeHelp}
        accentTheme={accentTheme}
        onAccentThemeToggle={toggleAccentTheme}
      />

      <Suspense fallback={null}>
        {/* Admin Panel */}
        {showAdmin && <AdminPanel isOpen={showAdmin} onClose={() => setShowAdmin(false)} />}

        {/* URL Loader Modal - at App level to overlay everything */}
        {showUrlLoader && (
          <UrlLoaderModal
            isOpen={showUrlLoader}
            onClose={closeUrlLoader}
            onVideoUrlLoad={(url, filename) => {
              // Check if it's a YouTube URL (starts with youtube:)
              if (url.startsWith('youtube:')) {
                const videoId = url.replace('youtube:', '');
                setYoutubeVideoId(videoId);
                // Clear regular video if any
                if (videoFile) {
                  loadVideoFromUrl('', '');
                }
              } else {
                // Regular video URL
                setYoutubeVideoId(null);
                loadVideoFromUrl(url, filename);
              }
              trackEvent('videosLoaded');
              setShowUrlLoader(false);
            }}
            onAudioUrlLoad={handleAudioFromUrl}
          />
        )}

        {/* Statistics Panel */}
        {showStatistics && (
          <StatisticsPanel
            isOpen={showStatistics}
            onClose={closeStatistics}
            analytics={analytics}
            formatWatchTime={formatWatchTime}
            onReset={resetAnalytics}
          />
        )}
      </Suspense>
    </div>
  );
}

export default App;