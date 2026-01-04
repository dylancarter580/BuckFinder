#!/bin/bash
# Build script for BuckFinder

set -e

echo "🦌 Building BuckFinder..."

# 1. Build the Swift CLI tool
echo "📦 Building buck-detector CLI..."
cd buck-detector
swift build -c release
cd ..

# 2. Compile the Core ML model (if not already compiled)
if [ ! -d "best.mlmodelc" ]; then
    echo "🧠 Compiling Core ML model..."
    # The model will be compiled at runtime by the Swift CLI
    echo "   Note: Model will be compiled on first run"
fi

# 3. Create resources directory and copy files
echo "📂 Preparing resources..."
mkdir -p src-tauri/resources

# Copy the Swift CLI
cp -f buck-detector/.build/release/buck-detector src-tauri/resources/

# Copy the model (prefer compiled, fallback to package)
if [ -d "best.mlmodelc" ]; then
    echo "   Copying compiled model (best.mlmodelc)..."
    rm -rf src-tauri/resources/best.mlmodelc
    cp -rf best.mlmodelc src-tauri/resources/
else
    echo "   Copying model package (best.mlpackage)..."
    rm -rf src-tauri/resources/best.mlpackage
    cp -rf best.mlpackage src-tauri/resources/
fi

# 4. Install npm dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📥 Installing npm dependencies..."
    npm install
fi

# 5. Build the Tauri app
echo "🔨 Building Tauri app..."
npm run tauri build

echo ""
echo "✅ Build complete!"
echo "📍 DMG location: src-tauri/target/release/bundle/dmg/"
echo ""
echo "⚠️  Note: Since the app is not notarized, users will need to:"
echo "    Right-click the app → Open → Open (to bypass Gatekeeper)"
