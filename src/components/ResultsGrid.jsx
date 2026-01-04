import { useState } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';

function ResultsGrid({ images, selectedPaths, onSelectionChange }) {
  const allSelected = selectedPaths.length === images.length && images.length > 0;
  const someSelected = selectedPaths.length > 0 && selectedPaths.length < images.length;

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(images.map(img => img.path));
    }
  };

  const handleToggle = (path) => {
    if (selectedPaths.includes(path)) {
      onSelectionChange(selectedPaths.filter(p => p !== path));
    } else {
      onSelectionChange([...selectedPaths, path]);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Selection controls */}
      <div className="flex items-center gap-4 mb-3 px-1">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={allSelected}
            ref={input => {
              if (input) input.indeterminate = someSelected;
            }}
            onChange={handleSelectAll}
            className="w-4 h-4 rounded border-forest-500 bg-forest-800 text-moss-500 focus:ring-moss-500 focus:ring-offset-0"
          />
          <span className="text-sm text-bark-300">
            {allSelected ? 'Deselect All' : 'Select All'}
          </span>
        </label>
        <span className="text-sm text-bark-500">
          {selectedPaths.length} of {images.length} selected
        </span>
      </div>

      {/* Image grid */}
      <div className="flex-1 overflow-y-auto rounded-xl">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-1">
          {images.map((image, index) => (
            <ImageCard
              key={image.path}
              image={image}
              index={index}
              isSelected={selectedPaths.includes(image.path)}
              onToggle={() => handleToggle(image.path)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ImageCard({ image, index, isSelected, onToggle }) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  const imageSrc = convertFileSrc(image.path);
  
  return (
    <div
      className={`thumbnail-card glass-card overflow-hidden animate-fade-in cursor-pointer transition-all ${
        isSelected 
          ? 'ring-2 ring-moss-400 ring-offset-2 ring-offset-forest-950' 
          : 'hover:ring-1 hover:ring-forest-500'
      }`}
      style={{ animationDelay: `${index * 50}ms` }}
      onClick={onToggle}
    >
      <div className="aspect-square relative bg-forest-900/50">
        {/* Selection checkbox */}
        <div 
          className="absolute top-2 left-2 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggle}
            className="w-5 h-5 rounded border-2 border-forest-400 bg-forest-900/80 text-moss-500 focus:ring-moss-500 focus:ring-offset-0 cursor-pointer"
          />
        </div>

        {!imageError ? (
          <img
            src={imageSrc}
            alt={`Buck ${index + 1}`}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            } ${isSelected ? '' : 'opacity-90'}`}
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-bark-500">
            <svg
              className="w-12 h-12"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
        
        {/* Loading placeholder */}
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-moss-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        
        {/* Confidence badge */}
        <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-forest-900/80 backdrop-blur-sm text-xs font-medium text-moss-400">
          {Math.round(image.confidence * 100)}%
        </div>
        
        {/* Buck indicator */}
        <div className="absolute bottom-2 left-2 px-2 py-1 rounded-full bg-moss-600/90 backdrop-blur-sm text-xs font-medium text-white flex items-center gap-1">
          <span>🦌</span>
          <span>Buck</span>
        </div>

        {/* Selected overlay */}
        {isSelected && (
          <div className="absolute inset-0 bg-moss-500/10 pointer-events-none" />
        )}
      </div>
      
      {/* Filename */}
      <div className="p-2 bg-forest-900/30">
        <p className="text-xs text-bark-400 truncate" title={image.path}>
          {image.path.split('/').pop()}
        </p>
      </div>
    </div>
  );
}

export default ResultsGrid;
