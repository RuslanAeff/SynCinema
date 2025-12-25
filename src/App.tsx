/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SynCinema - App Component
 *  @author Ruslan Aliyev
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { VideoPlayer } from './components/VideoPlayer';
import { WelcomeScreen } from './components/WelcomeScreen';
import { OnboardingTour } from './components/OnboardingTour';
import { HelpPanel } from './components/HelpPanel';
import { useVideoPlayer } from './hooks/useVideoPlayer';
import { useAudioTracks } from './hooks/useAudioTracks';
import { useTheme } from './hooks/useTheme';

function App() {
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
    deleteMarker
  } = useVideoPlayer();

  const {
    audioTracks,
    audioDevices,
    permissionsGranted,
    refreshDevices,
    addAudioTracks,
    updateAudioTrack,
    deleteAudioTrack,
    exportProject,
    importProject,
    masterVolume,
    setMasterVolume
  } = useAudioTracks();

  // Theme
  const { theme, toggleTheme } = useTheme();

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

  const handleWelcomeComplete = useCallback(() => {
    setShowWelcome(false);
    sessionStorage.setItem('syncinema_welcome_seen', 'true');
    // Check if user has completed the tour this session
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

  // Drag and Drop State
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

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

    // Load files
    if (videoFiles.length > 0) loadVideo(videoFiles[0]);
    if (audioFiles.length > 0) {
      const dt = new DataTransfer();
      audioFiles.forEach(f => dt.items.add(f));
      addAudioTracks(dt.files);
    }
    if (subtitleFiles.length > 0) loadSubtitles(subtitleFiles[0]);
  }, [loadVideo, addAudioTracks, loadSubtitles]);

  return (
    <div
      className={`flex h-screen bg-gray-950 text-gray-100 font-sans relative transition-all ${isDragging ? 'ring-4 ring-inset ring-indigo-500' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Welcome Screen */}
      {showWelcome && <WelcomeScreen onComplete={handleWelcomeComplete} />}

      {/* Onboarding Tour */}
      {showTour && <OnboardingTour onComplete={handleTourComplete} onSkip={handleTourSkip} />}

      {/* Drop Overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-indigo-900/50 backdrop-blur-sm z-50 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="text-6xl mb-4">📂</div>
            <h2 className="text-2xl font-bold text-white">Dosyaları Bırakın</h2>
            <p className="text-indigo-300 mt-2">Video, Ses veya Altyazı (.srt)</p>
          </div>
        </div>
      )}

      <Sidebar
        videoFile={videoFile}
        audioTracks={audioTracks}
        audioDevices={audioDevices}
        permissionsGranted={permissionsGranted}
        videoCurrentTime={currentTime}
        isVideoPlaying={isPlaying}
        onRefreshDevices={refreshDevices}
        onVideoUpload={loadVideo}
        onAudioUpload={addAudioTracks}
        onTrackUpdate={updateAudioTrack}
        onTrackDelete={deleteAudioTrack}
        onSaveProject={exportProject}
        onLoadProject={importProject}
        onSubtitleUpload={loadSubtitles}
        subtitleOffset={subtitleOffset}
        onSubtitleOffsetChange={setSubtitleOffset}
        hasSubtitles={subtitleCues.length > 0}
        masterVolume={masterVolume}
        onMasterVolumeChange={setMasterVolume}
        theme={theme}
        onThemeToggle={toggleTheme}
        videoVolume={videoVolume}
        videoMuted={videoMuted}
        onVideoVolumeChange={setVideoVolume}
        onVideoMutedChange={setVideoMuted}
        markers={markers}
        onAddMarker={addMarker}
        onDeleteMarker={deleteMarker}
        onSeekToMarker={handleSeek}
        videoDeviceId={videoDeviceId}
        onVideoDeviceChange={setVideoDeviceId}
        isHelpOpen={showHelp}
        onHelpOpen={() => setShowHelp(true)}
        onHelpClose={() => setShowHelp(false)}
      />

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
      />

      {/* Help Panel - at App level to overlay everything */}
      <HelpPanel isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
}

export default App;