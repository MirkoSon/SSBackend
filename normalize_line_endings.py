#!/usr/bin/env python3
"""
Normalize line endings in script files to Unix-style (LF: \n)
Converts Windows (CRLF: \r\n) and old Mac (CR: \r) line endings to Unix (LF: \n)
"""

import os
import sys
from pathlib import Path

# File extensions to process
EXTENSIONS = {
    '.js', '.jsx', '.ts', '.tsx',  # JavaScript/TypeScript
    '.py', '.sh', '.bash',  # Python/Shell
    '.json', '.jsonc',  # JSON
    '.css', '.scss', '.sass', '.less',  # Stylesheets
    '.html', '.htm', '.xml', '.svg',  # Markup
    '.md', '.markdown', '.txt',  # Documentation
    '.yml', '.yaml',  # Config
    '.env', '.gitignore', '.gitattributes',  # Special files
    '.sql',  # Database
}

# Directories to exclude
EXCLUDED_DIRS = {
    'node_modules', '.git', 'dist', 'build', '__pycache__',
    '.next', 'out', 'coverage', '.cache', 'venv', 'env'
}


def should_process_file(file_path):
    """Check if file should be processed based on extension"""
    # Check extension
    if file_path.suffix.lower() not in EXTENSIONS:
        # Also check files without extension (like .env files)
        if file_path.suffix == '' and file_path.name.startswith('.'):
            return file_path.name in {'.env', '.gitignore', '.gitattributes'}
        return False
    return True


def normalize_line_endings(file_path):
    """Convert line endings in a file to Unix-style (LF)"""
    try:
        # Read file in binary mode to preserve exact content
        with open(file_path, 'rb') as f:
            content = f.read()

        # Decode as UTF-8 (most common), fallback to latin-1 if needed
        try:
            text = content.decode('utf-8')
        except UnicodeDecodeError:
            try:
                text = content.decode('latin-1')
            except UnicodeDecodeError:
                print(f"  ⚠️  Skipping (encoding issue): {file_path}")
                return False

        # Check if conversion is needed
        original_text = text

        # Convert CRLF (\r\n) and CR (\r) to LF (\n)
        text = text.replace('\r\n', '\n').replace('\r', '\n')

        # Only write if content changed
        if text != original_text:
            with open(file_path, 'wb') as f:
                f.write(text.encode('utf-8'))
            return True

        return False

    except Exception as e:
        print(f"  ❌ Error processing {file_path}: {e}")
        return False


def main():
    """Main function to walk directory tree and normalize line endings"""
    # Get starting directory (current directory or provided path)
    start_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.cwd()

    if not start_dir.exists():
        print(f"Error: Directory '{start_dir}' does not exist")
        sys.exit(1)

    print(f"🔍 Scanning for script files in: {start_dir}")
    print(f"📝 Extensions: {', '.join(sorted(EXTENSIONS))}")
    print(f"🚫 Excluding: {', '.join(sorted(EXCLUDED_DIRS))}\n")

    processed_count = 0
    changed_count = 0

    # Walk through directory tree
    for root, dirs, files in os.walk(start_dir):
        # Remove excluded directories from dirs list (modifies in-place to prevent walking into them)
        dirs[:] = [d for d in dirs if d not in EXCLUDED_DIRS]

        # Process each file
        for filename in files:
            file_path = Path(root) / filename

            if should_process_file(file_path):
                processed_count += 1
                relative_path = file_path.relative_to(start_dir)

                if normalize_line_endings(file_path):
                    changed_count += 1
                    print(f"  ✅ Normalized: {relative_path}")

    # Summary
    print(f"\n{'='*60}")
    print(f"📊 Summary:")
    print(f"   Files processed: {processed_count}")
    print(f"   Files changed:   {changed_count}")
    print(f"   Files unchanged: {processed_count - changed_count}")
    print(f"{'='*60}")


if __name__ == '__main__':
    main()
