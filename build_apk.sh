#!/bin/bash

# 遇到错误立即退出
set -e

# 定义目标文件路径
TARGET_FILE="/Users/anhaohui/Documents/stocks/two-moons-release/moonbox-latest.apk"
TARGET_DIR=$(dirname "$TARGET_FILE")

echo "🚀 Starting automated build process..."

# 检查目标目录是否存在，不存在则创建
if [ ! -d "$TARGET_DIR" ]; then
    echo "📂 Creating target directory: $TARGET_DIR"
    mkdir -p "$TARGET_DIR"
fi

# 1. 执行 yarn export
echo "📦 Running yarn export..."
yarn export

# 2. 执行 yarn cap sync
echo "🔄 Running yarn cap sync..."
yarn cap sync

# 3. 打包 APK
echo "🏗️  Building APK..."
# 确保 gradlew 有执行权限
if [ -f "android/gradlew" ]; then
    chmod +x android/gradlew
fi

cd android
./gradlew assembleRelease
cd ..

# 4. 查找并替换 APK
# 检查 release 目录下的 apk 文件
APK_DIR="android/app/build/outputs/apk/release"

# 优先查找 app-release.apk (通常是签名的)，然后是 unsigned
if [ -f "$APK_DIR/app-release.apk" ]; then
    SOURCE_APK="$APK_DIR/app-release.apk"
elif [ -f "$APK_DIR/app-release-unsigned.apk" ]; then
    SOURCE_APK="$APK_DIR/app-release-unsigned.apk"
    echo "⚠️  Warning: Found unsigned APK. You may need to sign it manually."
else
    echo "❌ Error: Could not find generated APK in $APK_DIR"
    exit 1
fi

echo "📂 Found APK at: $SOURCE_APK"
echo "🚚 Moving to: $TARGET_FILE"

cp "$SOURCE_APK" "$TARGET_FILE"

echo "✅ Build and copy completed successfully!"
open "$TARGET_DIR"
