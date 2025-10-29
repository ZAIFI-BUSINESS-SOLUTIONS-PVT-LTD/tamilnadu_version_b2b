import os

# Define directories and files to ignore
IGNORE_DIRS = {
    "__pycache__", "node_modules", "venv", "env", "migrations", ".git", ".idea", ".vscode",
    "dist", "build", ".pytest_cache", ".mypy_cache", ".cache", "__init__.py"
}
IGNORE_FILES = {".DS_Store", "Thumbs.db"}

# Path to save the file structure
OUTPUT_FILE = "file_struct.txt"

def generate_structure(start_path=".", indent=""):
    """Recursively generates folder structure, ignoring unnecessary files and directories."""
    structure = []
    try:
        items = sorted(os.listdir(start_path))
        for item in items:
            full_path = os.path.join(start_path, item)
            
            # Skip ignored directories and files
            if item in IGNORE_DIRS or item in IGNORE_FILES:
                continue
            if os.path.isdir(full_path) and any(ignored in full_path for ignored in IGNORE_DIRS):
                continue
            
            # Add folder or file to the structure
            if os.path.isdir(full_path):
                structure.append(f"{indent}📁 {item}/")
                structure.extend(generate_structure(full_path, indent + "    "))
            elif os.path.isfile(full_path):
                structure.append(f"{indent}📄 {item}")
    except PermissionError:
        pass  # Skip directories where permission is denied

    return structure

if __name__ == "__main__":
    folder_structure = generate_structure(".")
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write("\n".join(folder_structure))

    print(f"✅ Folder structure saved to {OUTPUT_FILE}")
