#!/bin/bash
#
# Build script for Varbook Calibre Plugin
#
# Creates a ZIP file ready for installation in Calibre.
#

set -e

PLUGIN_NAME="varbook_plugin"
OUTPUT_FILE="${PLUGIN_NAME}.zip"

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "Building Varbook Calibre Plugin..."

# Remove old build
rm -f "$OUTPUT_FILE"

# Create ZIP with required files
zip -r "$OUTPUT_FILE" \
    __init__.py \
    driver.py \
    config.py \
    ui.py \
    plugin-import-name-varbook_plugin.txt \
    images/ \
    -x "*.pyc" \
    -x "__pycache__/*" \
    -x ".git/*" \
    -x "*.zip"

echo ""
echo "Build complete: $OUTPUT_FILE"
echo ""
echo "To install:"
echo "  calibre-customize -a $OUTPUT_FILE"
echo ""
echo "Or install from source for development:"
echo "  calibre-customize -b ."
