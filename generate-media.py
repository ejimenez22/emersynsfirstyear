from pathlib import Path
import json

PROJECT_ROOT = Path(__file__).parent
IMAGES_ROOT = PROJECT_ROOT / "images"
VIDEOS_ROOT = PROJECT_ROOT / "videos"
OUTPUT_FILE = PROJECT_ROOT / "media.js"

PHOTO_CHAPTERS = [
    ("birth", "01-Birth"),
    ("comingHome", "02-Coming Home"),
    ("newbornDays", "03-New Born Days"),
    ("growingUp", "04-growing up"),
    ("ending", "05-End"),
]

VIDEO_CHAPTERS = [
    ("birth", "01-Birth"),
    ("comingHome", "02-Coming Home"),
    ("growingUp", "03-Growing up"),
]


def natural_key(path: Path):
    return [
        int(part) if part.isdigit() else part.lower()
        for part in path.stem.replace("-", " ").replace("_", " ").split()
    ]


def collect_files(root: Path, chapters, extensions):
    results = {}

    for chapter_key, folder_name in chapters:
        folder = root / folder_name

        if not folder.exists():
            print(f"Warning: folder not found: {folder}")
            results[chapter_key] = []
            continue

        files = [
            file
            for file in folder.iterdir()
            if file.is_file()
            and not file.name.startswith(".")
            and file.suffix.lower() in extensions
        ]

        files.sort(key=natural_key)

        results[chapter_key] = [
            file.relative_to(PROJECT_ROOT).as_posix()
            for file in files
        ]

    return results


photos = collect_files(
    IMAGES_ROOT,
    PHOTO_CHAPTERS,
    {".jpg", ".jpeg", ".png", ".webp"},
)

videos = collect_files(
    VIDEOS_ROOT,
    VIDEO_CHAPTERS,
    {".mp4", ".mov", ".m4v"},
)

media_data = {
    "photos": photos,
    "videos": videos,
}

OUTPUT_FILE.write_text(
    "const mediaLibrary = "
    + json.dumps(media_data, indent=4)
    + ";\n",
    encoding="utf-8",
)

photo_count = sum(len(files) for files in photos.values())
video_count = sum(len(files) for files in videos.values())

print(f"Created {OUTPUT_FILE.name}")
print(f"Photos found: {photo_count}")
print(f"Videos found: {video_count}")