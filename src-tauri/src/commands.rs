use serde::Serialize;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use tauri::State;
use walkdir::WalkDir;

use crate::detector::{detect_bucks, BuckDetection};

/// State shared across Tauri commands
#[derive(Default)]
pub struct ScanState {
    pub inner: Arc<Mutex<ScanStateInner>>,
}

#[derive(Default)]
pub struct ScanStateInner {
    pub total: usize,
    pub processed: usize,
    pub is_complete: bool,
    pub is_scanning: bool,
    pub buck_images: Vec<BuckDetection>,
    pub source_folder: Option<String>,
}

#[derive(Serialize)]
pub struct ScanStartResult {
    pub total_images: usize,
}

#[derive(Serialize)]
pub struct ScanProgress {
    pub total: usize,
    pub processed: usize,
    pub is_complete: bool,
    pub buck_images: Vec<BuckDetection>,
}

/// Supported image extensions
const IMAGE_EXTENSIONS: &[&str] = &["jpg", "jpeg", "png", "JPG", "JPEG", "PNG"];

/// Check if a path is a supported image
fn is_image(path: &PathBuf) -> bool {
    path.extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| IMAGE_EXTENSIONS.contains(&ext))
        .unwrap_or(false)
}

/// Scan a folder for images and detect bucks
#[tauri::command]
pub async fn scan_folder(
    folder_path: String,
    state: State<'_, ScanState>,
    app: tauri::AppHandle,
) -> Result<ScanStartResult, String> {
    // Collect all image files
    let mut image_paths: Vec<PathBuf> = Vec::new();
    
    for entry in WalkDir::new(&folder_path)
        .follow_links(true)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let path = entry.path().to_path_buf();
        if path.is_file() && is_image(&path) {
            image_paths.push(path);
        }
    }
    
    let total_images = image_paths.len();
    
    if total_images == 0 {
        return Err("No images found in the selected folder".to_string());
    }
    
    // Reset state
    {
        let mut inner = state.inner.lock().map_err(|e| e.to_string())?;
        inner.total = total_images;
        inner.processed = 0;
        inner.is_complete = false;
        inner.is_scanning = true;
        inner.buck_images.clear();
        inner.source_folder = Some(folder_path.clone());
    }
    
    // Clone state for background task
    let state_inner = Arc::clone(&state.inner);
    
    // Spawn background task for processing
    tokio::spawn(async move {
        let batch_size = 10; // Process 10 images at a time
        
        for chunk in image_paths.chunks(batch_size) {
            let paths: Vec<String> = chunk
                .iter()
                .map(|p| p.to_string_lossy().to_string())
                .collect();
            
            // Run detection on batch
            match detect_bucks(&paths, &app).await {
                Ok(detections) => {
                    if let Ok(mut inner) = state_inner.lock() {
                        inner.processed += paths.len();
                        
                        // Add buck detections to results
                        for detection in detections {
                            if detection.has_buck {
                                inner.buck_images.push(detection);
                            }
                        }
                    }
                }
                Err(e) => {
                    eprintln!("Detection error: {}", e);
                    // Continue processing even if some images fail
                    if let Ok(mut inner) = state_inner.lock() {
                        inner.processed += paths.len();
                    }
                }
            }
        }
        
        // Mark as complete
        if let Ok(mut inner) = state_inner.lock() {
            inner.is_complete = true;
            inner.is_scanning = false;
        }
    });
    
    Ok(ScanStartResult { total_images })
}

/// Get the current scan progress
#[tauri::command]
pub fn get_scan_progress(state: State<'_, ScanState>) -> Result<ScanProgress, String> {
    let inner = state.inner.lock().map_err(|e| e.to_string())?;
    
    Ok(ScanProgress {
        total: inner.total,
        processed: inner.processed,
        is_complete: inner.is_complete,
        buck_images: inner.buck_images.clone(),
    })
}

/// Save selected buck images to a user-selected folder
#[tauri::command]
pub async fn save_selected_bucks(
    output_folder: String,
    image_paths: Vec<String>,
) -> Result<String, String> {
    if image_paths.is_empty() {
        return Err("No images selected to save".to_string());
    }
    
    let output_path = PathBuf::from(&output_folder);
    
    std::fs::create_dir_all(&output_path)
        .map_err(|e| format!("Failed to create output folder: {}", e))?;
    
    // Copy each selected image
    let mut copied = 0;
    for image_path in &image_paths {
        let source = PathBuf::from(image_path);
        if let Some(filename) = source.file_name() {
            let dest = output_path.join(filename);
            if let Err(e) = std::fs::copy(&source, &dest) {
                eprintln!("Failed to copy {}: {}", image_path, e);
            } else {
                copied += 1;
            }
        }
    }
    
    Ok(format!(
        "Saved {} images to {}",
        copied,
        output_path.display()
    ))
}

