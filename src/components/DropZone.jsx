import { useState, useCallback } from 'react';
import { open } from '@tauri-apps/plugin-dialog';

function DropZone({ onFolderDrop, error }) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    async (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      // Get dropped files/folders
      const items = e.dataTransfer?.items;
      if (items && items.length > 0) {
        const item = items[0];
        if (item.kind === 'file') {
          const entry = item.webkitGetAsEntry?.();
          if (entry?.isDirectory) {
            // For directories, we need to use Tauri's dialog to get the actual path
            // since web APIs don't give us the full path for security reasons
            handleBrowse();
          } else {
            // If a file was dropped, prompt to select the parent folder
            handleBrowse();
          }
        }
      }
    },
    [onFolderDrop]
  );

  const handleBrowse = useCallback(async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select Trail Camera Folder',
      });

      if (selected) {
        onFolderDrop(selected);
      }
    } catch (err) {
      console.error('Browse error:', err);
    }
  }, [onFolderDrop]);

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div
        className={`
          w-full max-w-lg aspect-square
          glass-card glow-border
          flex flex-col items-center justify-center
          border-2 border-dashed
          cursor-pointer
          transition-all duration-300
          ${
            isDragOver
              ? 'border-moss-400 drop-zone-active scale-[1.02]'
              : 'border-forest-600/50 hover:border-forest-500'
          }
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleBrowse}
      >
        {/* Deer Silhouette Icon */}
        <div className="mb-6 relative">
          <svg
            className={`w-24 h-24 transition-colors duration-300 ${
              isDragOver ? 'text-moss-400' : 'text-forest-600'
            }`}
            viewBox="0 0 100 100"
            fill="currentColor"
          >
            {/* Stylized deer/buck silhouette */}
            <path d="M75 25c-2-3-5-5-8-5s-5 1-7 3l-2 3c-1-1-2-2-4-2-3 0-5 2-6 4l-5-2c-1 0-2 0-3 1l-3 5c-1 2-1 4 0 5l2 3-4 8c-2 4-3 8-3 12v15c0 3 2 5 5 5h5v-8c0-2 1-3 3-3s3 1 3 3v8h10v-8c0-2 1-3 3-3s3 1 3 3v8h5c3 0 5-2 5-5V57c0-4-1-8-3-12l-4-8 2-3c1-1 1-3 0-5l-3-5c-1-1-2-1-3-1l-5 2c-1-2-3-4-6-4-2 0-3 1-4 2l-2-3c-2-2-4-3-7-3z" />
            {/* Antlers */}
            <path d="M67 15c0-2 2-4 3-6 1-1 3-2 5-2s4 1 5 3c1 1 2 3 1 5-1 3-3 5-6 5-2 0-4-1-5-3-1-1-2-2-3-2z" />
            <path d="M80 12c1-2 3-4 5-4s4 1 5 2c1 2 1 4 0 6-1 3-4 5-7 4-2 0-4-2-4-4 0-2 0-3 1-4z" />
          </svg>
          {isDragOver && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 rounded-full border-2 border-moss-400 animate-ping opacity-30" />
            </div>
          )}
        </div>

        <h2
          className={`text-xl font-medium mb-2 transition-colors ${
            isDragOver ? 'text-moss-400' : 'text-bark-200'
          }`}
        >
          {isDragOver ? 'Drop to Scan' : 'Drop Folder Here'}
        </h2>

        <p className="text-bark-400 text-center mb-6 px-8">
          Drag your trail camera folder here, or click to browse
        </p>

        <button
          onClick={(e) => {
            e.stopPropagation();
            handleBrowse();
          }}
          className="btn-primary px-6 py-3 rounded-xl font-medium text-white"
        >
          Browse Folder
        </button>

        <p className="text-xs text-bark-500 mt-6">
          Supports JPG, JPEG, PNG images
        </p>
      </div>
    </div>
  );
}

export default DropZone;
