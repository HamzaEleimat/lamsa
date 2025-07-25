#!/bin/bash

# Script to update Lamsa logo across all locations
# Usage: ./update_logo.sh <path_to_new_logo>

if [ $# -eq 0 ]; then
    echo "Usage: $0 <path_to_new_logo>"
    echo "Example: $0 ~/Downloads/new_logo.png"
    exit 1
fi

NEW_LOGO="$1"

if [ ! -f "$NEW_LOGO" ]; then
    echo "Error: File $NEW_LOGO not found!"
    exit 1
fi

echo "Updating Lamsa logo files..."

# Create backups
echo "Creating backups..."
mkdir -p backups/mobile
mkdir -p backups/web
cp lamsa-mobile/assets/images/logo.png backups/mobile/logo.png 2>/dev/null || true
cp lamsa-mobile/assets/images/logo.jpg backups/mobile/logo.jpg 2>/dev/null || true
cp lamsa-mobile/assets/icon.png backups/mobile/icon.png 2>/dev/null || true
cp lamsa-web/public/images/logo.jpg backups/web/logo.jpg 2>/dev/null || true

# Check if ImageMagick is installed
if command -v convert &> /dev/null; then
    echo "Using ImageMagick for image processing..."
    
    # Mobile app logos
    echo "Updating mobile app logos..."
    convert "$NEW_LOGO" -resize 512x512 lamsa-mobile/assets/images/logo.png
    convert "$NEW_LOGO" -resize 512x512 lamsa-mobile/assets/images/logo.jpg
    
    # Mobile app icons (1000x1000 with padding)
    echo "Updating mobile app icons..."
    convert "$NEW_LOGO" -background transparent -gravity center -resize 800x800 -extent 1000x1000 lamsa-mobile/assets/icon.png
    convert "$NEW_LOGO" -background transparent -gravity center -resize 800x800 -extent 1000x1000 lamsa-mobile/assets/adaptive-icon.png
    convert "$NEW_LOGO" -background transparent -gravity center -resize 800x800 -extent 1000x1000 lamsa-mobile/assets/splash-icon.png
    
    # Favicon
    echo "Creating favicon..."
    convert "$NEW_LOGO" -resize 32x32 lamsa-mobile/assets/favicon.png
    
    # Web app logo
    echo "Updating web app logo..."
    convert "$NEW_LOGO" -resize 512x512 lamsa-web/public/images/logo.jpg
    
    # Web favicon (multiple sizes)
    echo "Creating web favicon..."
    convert "$NEW_LOGO" -resize 16x16 lamsa-web/public/favicon-16.png
    convert "$NEW_LOGO" -resize 32x32 lamsa-web/public/favicon-32.png
    convert "$NEW_LOGO" -resize 48x48 lamsa-web/public/favicon-48.png
    convert "$NEW_LOGO" \
        \( -clone 0 -resize 16x16 \) \
        \( -clone 0 -resize 32x32 \) \
        \( -clone 0 -resize 48x48 \) \
        -delete 0 lamsa-web/public/favicon.ico
    
else
    echo "ImageMagick not installed. Copying files directly..."
    
    # Direct copy without resizing
    cp "$NEW_LOGO" lamsa-mobile/assets/images/logo.png
    cp "$NEW_LOGO" lamsa-mobile/assets/icon.png
    cp "$NEW_LOGO" lamsa-mobile/assets/adaptive-icon.png
    cp "$NEW_LOGO" lamsa-mobile/assets/splash-icon.png
    cp "$NEW_LOGO" lamsa-mobile/assets/favicon.png
    cp "$NEW_LOGO" lamsa-web/public/images/logo.jpg
    
    echo "Warning: Without ImageMagick, logos were copied without resizing."
    echo "Install ImageMagick for proper image processing: sudo apt-get install imagemagick"
fi

echo "Logo update complete!"
echo ""
echo "Updated files:"
echo "- lamsa-mobile/assets/images/logo.png"
echo "- lamsa-mobile/assets/images/logo.jpg"
echo "- lamsa-mobile/assets/icon.png"
echo "- lamsa-mobile/assets/adaptive-icon.png"
echo "- lamsa-mobile/assets/splash-icon.png"
echo "- lamsa-mobile/assets/favicon.png"
echo "- lamsa-web/public/images/logo.jpg"
echo "- lamsa-web/public/favicon.ico (if ImageMagick installed)"
echo ""
echo "Backups saved in ./backups/"