#!/bin/bash
set -e

# This script should be run from the root of the project

LAMBDAS_DIR="lambdas"
SRC_DIR="$LAMBDAS_DIR/src"
DEST_DIR="$LAMBDAS_DIR/src_zip"

mkdir -p "$DEST_DIR"
rm -f "$DEST_DIR"/*.zip

# Package non-auth lambdas
for dir in $SRC_DIR/*; do
    if [ -d "$dir" ]; then
        lambda_name=$(basename "$dir")
        echo "Packaging $lambda_name..."
        if [ -n "$(find "$dir" -mindepth 1 -maxdepth 1 -type d)" ]; then
            echo "  -> Found subdirectories, packaging recursively."
            (cd "$dir" && zip -r "$OLDPWD/$DEST_DIR/$lambda_name.zip" .)
        else
            zip -j "$DEST_DIR/$lambda_name.zip" "$dir"/*
        fi
    fi
done

# Package layers
for dir in "$SRC_DIR"/layers/*; do
    if [ -d "$dir" ]; then
        layer_name=$(basename "$dir")
        echo "Packaging layer: $layer_name..."
        # Create a temporary directory for zipping
        TEMP_DIR=$(mktemp -d)
        # Copy the python directory to the temporary directory
        cp -r "$dir"/python "$TEMP_DIR/"
        # Change to the temporary directory and zip the python directory
        (cd "$TEMP_DIR" && zip -r "$layer_name.zip" python)
        # Move the created zip file to the destination directory
        mv "$TEMP_DIR/$layer_name.zip" "$DEST_DIR/"
        # Remove the temporary directory
        rm -rf "$TEMP_DIR"
    fi
done

echo "All packages created in $DEST_DIR."