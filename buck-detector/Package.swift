// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "buck-detector",
    platforms: [
        .macOS(.v12)
    ],
    targets: [
        .executableTarget(
            name: "buck-detector",
            path: "Sources"
        )
    ]
)
