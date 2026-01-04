use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::Command;
use tauri::Manager;

/// Result from the buck detector CLI
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BuckDetection {
    pub path: String,
    pub has_buck: bool,
    pub confidence: f32,
}

/// Run the buck-detector CLI on a batch of images
pub async fn detect_bucks(
    image_paths: &[String],
    app: &tauri::AppHandle,
) -> Result<Vec<BuckDetection>, String> {
    if image_paths.is_empty() {
        return Ok(vec![]);
    }
    
    // Find the buck-detector binary
    let detector_path = find_detector(app)?;
    
    // Find the model directory
    let model_path = find_model(app)?;
    
    run_detector(&detector_path, &model_path, image_paths)
}

fn find_detector(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    // Try multiple locations for the detector
    
    // 1. Check resource directory (production bundle)
    if let Ok(resource_dir) = app.path().resource_dir() {
        // In production, resources are in Contents/Resources/resources/
        let prod_path = resource_dir.join("resources").join("buck-detector");
        if prod_path.exists() {
            eprintln!("Found detector at: {:?}", prod_path);
            return Ok(prod_path);
        }
        
        // Also check directly in resource dir
        let direct_path = resource_dir.join("buck-detector");
        if direct_path.exists() {
            eprintln!("Found detector at: {:?}", direct_path);
            return Ok(direct_path);
        }
    }
    
    // 2. For development, check relative to executable
    if let Ok(exe_path) = std::env::current_exe() {
        let exe_dir = exe_path.parent().ok_or("No exe parent")?;
        
        // Development mode - exe is in src-tauri/target/debug/
        // buck-detector is in buck-detector/.build/release/
        let dev_path = exe_dir
            .join("../../../buck-detector/.build/release/buck-detector");
        if dev_path.exists() {
            let canonical = dev_path.canonicalize().map_err(|e| e.to_string())?;
            eprintln!("Found detector at: {:?}", canonical);
            return Ok(canonical);
        }
        
        // Also try debug build
        let debug_path = exe_dir
            .join("../../../buck-detector/.build/debug/buck-detector");
        if debug_path.exists() {
            let canonical = debug_path.canonicalize().map_err(|e| e.to_string())?;
            eprintln!("Found detector at: {:?}", canonical);
            return Ok(canonical);
        }
    }
    
    // 3. Check current working directory
    if let Ok(cwd) = std::env::current_dir() {
        let cwd_path = cwd.join("buck-detector/.build/release/buck-detector");
        if cwd_path.exists() {
            eprintln!("Found detector at: {:?}", cwd_path);
            return Ok(cwd_path);
        }
    }
    
    Err("Could not find buck-detector binary. Please rebuild with ./build.sh".to_string())
}

fn find_model(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    // Try multiple locations for the model
    
    // 1. Check resource directory (production bundle)
    if let Ok(resource_dir) = app.path().resource_dir() {
        // Try compiled model first
        let prod_compiled = resource_dir.join("resources").join("best.mlmodelc");
        if prod_compiled.exists() {
            eprintln!("Found model at: {:?}", prod_compiled);
            return Ok(prod_compiled);
        }
        
        // Then try package
        let prod_package = resource_dir.join("resources").join("best.mlpackage");
        if prod_package.exists() {
            eprintln!("Found model at: {:?}", prod_package);
            return Ok(prod_package);
        }
    }
    
    // 2. For development, check relative to executable
    if let Ok(exe_path) = std::env::current_exe() {
        let exe_dir = exe_path.parent().ok_or("No exe parent")?;
        
        // Development mode - check project root
        let dev_compiled = exe_dir.join("../../../best.mlmodelc");
        if dev_compiled.exists() {
            let canonical = dev_compiled.canonicalize().map_err(|e| e.to_string())?;
            eprintln!("Found model at: {:?}", canonical);
            return Ok(canonical);
        }
        
        let dev_package = exe_dir.join("../../../best.mlpackage");
        if dev_package.exists() {
            let canonical = dev_package.canonicalize().map_err(|e| e.to_string())?;
            eprintln!("Found model at: {:?}", canonical);
            return Ok(canonical);
        }
    }
    
    // 3. Check current working directory
    if let Ok(cwd) = std::env::current_dir() {
        let cwd_compiled = cwd.join("best.mlmodelc");
        if cwd_compiled.exists() {
            eprintln!("Found model at: {:?}", cwd_compiled);
            return Ok(cwd_compiled);
        }
        
        let cwd_package = cwd.join("best.mlpackage");
        if cwd_package.exists() {
            eprintln!("Found model at: {:?}", cwd_package);
            return Ok(cwd_package);
        }
    }
    
    Err("Could not find ML model. Please ensure best.mlmodelc is in resources.".to_string())
}

fn run_detector(
    detector_path: &PathBuf,
    model_path: &PathBuf,
    image_paths: &[String],
) -> Result<Vec<BuckDetection>, String> {
    // Set the working directory to where the model is located
    let model_dir = model_path.parent().ok_or("Model has no parent dir")?;
    
    // Run the detector CLI
    let output = Command::new(detector_path)
        .current_dir(model_dir)
        .args(image_paths)
        .output()
        .map_err(|e| format!("Failed to run detector: {}", e))?;
    
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Detector failed: {}", stderr));
    }
    
    // Parse JSON output
    let stdout = String::from_utf8_lossy(&output.stdout);
    let detections: Vec<BuckDetection> = serde_json::from_str(&stdout)
        .map_err(|e| format!("Failed to parse detector output: {}. Output was: {}", e, stdout))?;
    
    Ok(detections)
}
