import { useState, useCallback, useEffect } from 'react';
import DropZone from './components/DropZone';
import ProgressBar from './components/ProgressBar';
import ResultsGrid from './components/ResultsGrid';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';

function App() {
  const [status, setStatus] = useState('idle'); // idle, scanning, complete
  const [progress, setProgress] = useState(0);
  const [totalImages, setTotalImages] = useState(0);
  const [processedImages, setProcessedImages] = useState(0);
  const [buckImages, setBuckImages] = useState([]);
  const [selectedPaths, setSelectedPaths] = useState([]);
  const [error, setError] = useState(null);

  // Auto-select all images when scan completes
  useEffect(() => {
    if (status === 'complete' && buckImages.length > 0) {
      setSelectedPaths(buckImages.map(img => img.path));
    }
  }, [status, buckImages]);

  const handleFolderDrop = useCallback(async (folderPath) => {
    setStatus('scanning');
    setProgress(0);
    setBuckImages([]);
    setSelectedPaths([]);
    setError(null);

    try {
      const result = await invoke('scan_folder', { folderPath });
      setTotalImages(result.total_images);
      
      const pollProgress = async () => {
        try {
          const progressResult = await invoke('get_scan_progress');
          
          setProcessedImages(progressResult.processed);
          setProgress(
            progressResult.total > 0
              ? (progressResult.processed / progressResult.total) * 100
              : 0
          );
          setBuckImages(progressResult.buck_images);

          if (progressResult.is_complete) {
            setStatus('complete');
          } else {
            setTimeout(pollProgress, 200);
          }
        } catch (err) {
          console.error('Progress poll error:', err);
          setTimeout(pollProgress, 500);
        }
      };

      pollProgress();
    } catch (err) {
      console.error('Scan error:', err);
      setError(err.toString());
      setStatus('idle');
    }
  }, []);

  const handleSaveBucks = useCallback(async () => {
    if (selectedPaths.length === 0) {
      alert('Please select at least one image to save.');
      return;
    }

    try {
      const selectedFolder = await open({
        directory: true,
        multiple: false,
        title: 'Select folder to save buck images',
      });

      if (!selectedFolder) {
        return;
      }

      const savedPath = await invoke('save_selected_bucks', { 
        outputFolder: selectedFolder,
        imagePaths: selectedPaths 
      });
      alert(`${savedPath}`);
    } catch (err) {
      console.error('Save error:', err);
      setError(err.toString());
    }
  }, [selectedPaths]);

  const handleReset = useCallback(() => {
    setStatus('idle');
    setProgress(0);
    setTotalImages(0);
    setProcessedImages(0);
    setBuckImages([]);
    setSelectedPaths([]);
    setError(null);
  }, []);

  return (
    <div className="h-full w-full flex flex-col p-6">
      {/* Draggable Title Bar Region */}
      <div 
        data-tauri-drag-region 
        className="absolute top-0 left-0 right-0 h-8"
        style={{ WebkitAppRegion: 'drag' }}
      />

      {/* Header */}
      <header className="flex items-center justify-between mb-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-moss-400 to-forest-600 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-bark-100">BuckFinder</h1>
            <p className="text-sm text-bark-400">AI Trail Camera Filter</p>
          </div>
        </div>

        {status === 'complete' && (
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm text-bark-300 hover:text-bark-100 transition-colors"
          >
            ← New Scan
          </button>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0">
        {status === 'idle' && (
          <DropZone onFolderDrop={handleFolderDrop} error={error} />
        )}

        {status === 'scanning' && (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="glass-card glow-border p-8 w-full max-w-md text-center">
              <div className="mb-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-forest-800/50 flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-moss-400 animate-pulse"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <h2 className="text-lg font-medium text-bark-100 mb-1">
                  Scanning for Bucks...
                </h2>
                <p className="text-sm text-bark-400">
                  {processedImages} of {totalImages} images processed
                </p>
              </div>
              <ProgressBar progress={progress} />
              {buckImages.length > 0 && (
                <p className="mt-4 text-moss-400 font-medium animate-fade-in">
                  🦌 {buckImages.length} buck{buckImages.length !== 1 ? 's' : ''}{' '}
                  found so far!
                </p>
              )}
            </div>
          </div>
        )}

        {status === 'complete' && (
          <div className="flex-1 flex flex-col min-h-0 animate-fade-in">
            {/* Results Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-medium text-bark-100">
                  {buckImages.length > 0
                    ? `Found ${buckImages.length} Buck${buckImages.length !== 1 ? 's' : ''}!`
                    : 'No Bucks Found'}
                </h2>
                <p className="text-sm text-bark-400">
                  Scanned {totalImages} images
                </p>
              </div>
              {buckImages.length > 0 && (
                <button
                  onClick={handleSaveBucks}
                  disabled={selectedPaths.length === 0}
                  className="btn-primary px-6 py-3 rounded-xl font-medium text-white flex items-center gap-2"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                    />
                  </svg>
                  Save Selected ({selectedPaths.length})
                </button>
              )}
            </div>

            {/* Results Grid */}
            {buckImages.length > 0 ? (
              <ResultsGrid 
                images={buckImages} 
                selectedPaths={selectedPaths}
                onSelectionChange={setSelectedPaths}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-bark-400">
                  <svg
                    className="w-16 h-16 mx-auto mb-4 opacity-50"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p>No bucks were detected in the scanned images.</p>
                  <p className="text-sm mt-1">Try scanning a different folder.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Error Toast */}
      {error && status === 'idle' && (
        <div className="fixed bottom-6 left-6 right-6 max-w-md mx-auto glass-card p-4 border-red-500/30 animate-slide-up">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-red-300">Error</p>
              <p className="text-sm text-bark-400 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
