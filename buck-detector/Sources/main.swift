import Foundation
import CoreML
import Vision
import AppKit

// MARK: - Output Types

struct DetectionResult: Codable {
    let path: String
    let hasBuck: Bool
    let confidence: Float
    
    enum CodingKeys: String, CodingKey {
        case path
        case hasBuck = "has_buck"
        case confidence
    }
}

// MARK: - Buck Detector

class BuckDetector {
    private var model: VNCoreMLModel?
    private let confidenceThreshold: Float = 0.80
    private let buckClassId: Int = 0  // Class 0 is "buck"
    
    init() throws {
        // Find and load the model
        let modelURL = try findOrCompileModel()
        
        // Configure for Neural Engine
        let config = MLModelConfiguration()
        config.computeUnits = .all  // Prioritize Neural Engine on M-series
        
        // Load the model
        let mlModel = try MLModel(contentsOf: modelURL, configuration: config)
        self.model = try VNCoreMLModel(for: mlModel)
    }
    
    private func findOrCompileModel() throws -> URL {
        let fileManager = FileManager.default
        
        // Get the directory where the executable is located
        let executableURL = URL(fileURLWithPath: CommandLine.arguments[0])
        let executableDir = executableURL.deletingLastPathComponent()
        let cwd = URL(fileURLWithPath: fileManager.currentDirectoryPath)
        
        // First, look for pre-compiled model (.mlmodelc)
        let compiledSearchPaths: [URL] = [
            executableDir.appendingPathComponent("best.mlmodelc"),
            executableDir.appendingPathComponent("../Resources/best.mlmodelc"),
            executableDir.appendingPathComponent("../../best.mlmodelc"),
            executableDir.appendingPathComponent("../../../best.mlmodelc"),
            cwd.appendingPathComponent("best.mlmodelc"),
            cwd.appendingPathComponent("../best.mlmodelc"),
        ]
        
        for path in compiledSearchPaths {
            let standardizedPath = path.standardized
            if fileManager.fileExists(atPath: standardizedPath.path) {
                fputs("Found compiled model at: \(standardizedPath.path)\n", stderr)
                return standardizedPath
            }
        }
        
        // No compiled model found, look for .mlpackage and compile it
        let packageSearchPaths: [URL] = [
            executableDir.appendingPathComponent("best.mlpackage"),
            executableDir.appendingPathComponent("../Resources/best.mlpackage"),
            executableDir.appendingPathComponent("../../best.mlpackage"),
            executableDir.appendingPathComponent("../../../best.mlpackage"),
            cwd.appendingPathComponent("best.mlpackage"),
            cwd.appendingPathComponent("../best.mlpackage"),
        ]
        
        var packagePath: URL? = nil
        for path in packageSearchPaths {
            let standardizedPath = path.standardized
            if fileManager.fileExists(atPath: standardizedPath.path) {
                packagePath = standardizedPath
                break
            }
        }
        
        guard let sourcePackage = packagePath else {
            throw NSError(
                domain: "BuckDetector",
                code: 1,
                userInfo: [NSLocalizedDescriptionKey: "Could not find best.mlmodelc or best.mlpackage"]
            )
        }
        
        fputs("Found mlpackage at: \(sourcePackage.path), compiling...\n", stderr)
        
        // Compile the model at runtime
        let compiledURL = try MLModel.compileModel(at: sourcePackage)
        
        // Move compiled model to a persistent location (next to the package)
        let destinationURL = sourcePackage.deletingLastPathComponent().appendingPathComponent("best.mlmodelc")
        
        // Remove existing if present
        if fileManager.fileExists(atPath: destinationURL.path) {
            try? fileManager.removeItem(at: destinationURL)
        }
        
        // Move from temp location to persistent location
        try fileManager.moveItem(at: compiledURL, to: destinationURL)
        
        fputs("Compiled model saved to: \(destinationURL.path)\n", stderr)
        
        return destinationURL
    }
    
    func detectBuck(imagePath: String) -> DetectionResult {
        guard let model = self.model else {
            return DetectionResult(path: imagePath, hasBuck: false, confidence: 0)
        }
        
        // Load image
        guard let image = NSImage(contentsOfFile: imagePath),
              let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
            fputs("Warning: Could not load image: \(imagePath)\n", stderr)
            return DetectionResult(path: imagePath, hasBuck: false, confidence: 0)
        }
        
        var hasBuck = false
        var maxConfidence: Float = 0
        
        // Create Vision request
        let request = VNCoreMLRequest(model: model) { [self] request, error in
            if let error = error {
                fputs("Warning: Detection error for \(imagePath): \(error.localizedDescription)\n", stderr)
                return
            }
            
            guard let results = request.results as? [VNRecognizedObjectObservation] else {
                return
            }
            
            // Check each detection
            for observation in results {
                // Get the top classification
                guard let topLabel = observation.labels.first else { continue }
                
                let confidence = topLabel.confidence
                let identifier = topLabel.identifier
                
                // Check if this is a buck (class 0 or identifier "buck")
                // YOLOv11 exports may use either numeric identifiers or string labels
                let isBuck = identifier == "0" || 
                            identifier.lowercased() == "buck" ||
                            identifier.lowercased().contains("buck")
                
                if isBuck && confidence >= self.confidenceThreshold {
                    hasBuck = true
                    if confidence > maxConfidence {
                        maxConfidence = confidence
                    }
                }
            }
        }
        
        // Configure request for YOLO input size
        request.imageCropAndScaleOption = .scaleFill
        
        // Run the request
        let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
        do {
            try handler.perform([request])
        } catch {
            fputs("Warning: Vision request failed for \(imagePath): \(error.localizedDescription)\n", stderr)
        }
        
        return DetectionResult(path: imagePath, hasBuck: hasBuck, confidence: maxConfidence)
    }
}

// MARK: - Main

func main() {
    let args = Array(CommandLine.arguments.dropFirst())
    
    if args.isEmpty {
        fputs("Usage: buck-detector <image_path> [image_path ...]\n", stderr)
        fputs("Outputs JSON array of detection results.\n", stderr)
        exit(1)
    }
    
    // Initialize detector
    let detector: BuckDetector
    do {
        detector = try BuckDetector()
    } catch {
        fputs("Error initializing detector: \(error.localizedDescription)\n", stderr)
        exit(1)
    }
    
    // Process each image
    var results: [DetectionResult] = []
    
    for imagePath in args {
        let result = detector.detectBuck(imagePath: imagePath)
        results.append(result)
    }
    
    // Output JSON
    let encoder = JSONEncoder()
    encoder.outputFormatting = .prettyPrinted
    
    if let jsonData = try? encoder.encode(results),
       let jsonString = String(data: jsonData, encoding: .utf8) {
        print(jsonString)
    } else {
        fputs("Error encoding results to JSON\n", stderr)
        exit(1)
    }
}

main()
