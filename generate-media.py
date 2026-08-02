from pathlib import Path
import json
import re


PROJECT_ROOT = Path(__file__).resolve().parent

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


IMAGE_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
}


VIDEO_EXTENSIONS = {
    ".mp4",
    ".m4v",
    ".mov",
}


def natural_sort_key(path: Path):
    """
    Sort names like:
    03-2.jpg
    03-10.jpg

    in true numeric order.
    """

    parts = re.split(
        r"(\d+)",
        path.name.lower()
    )

    return [
        int(part) if part.isdigit() else part
        for part in parts
    ]


def collect_chapter_files(
    root: Path,
    chapters,
    allowed_extensions,
):
    results = {}

    for chapter_key, folder_name in chapters:
        folder = root / folder_name

        if not folder.exists():
            print(
                f"Warning: folder not found: {folder}"
            )

            results[chapter_key] = []
            continue

        files = [
            file
            for file in folder.iterdir()
            if file.is_file()
            and not file.name.startswith(".")
            and file.suffix.lower()
            in allowed_extensions
        ]

        files.sort(
            key=natural_sort_key
        )

        results[chapter_key] = [
            file.relative_to(
                PROJECT_ROOT
            ).as_posix()
            for file in files
        ]

    return results


photos = collect_chapter_files(
    IMAGES_ROOT,
    PHOTO_CHAPTERS,
    IMAGE_EXTENSIONS,
)


videos = collect_chapter_files(
    VIDEOS_ROOT,
    VIDEO_CHAPTERS,
    VIDEO_EXTENSIONS,
)


media_data = {
    "photos": photos,
    "videos": videos,
}


javascript = (
    "const mediaLibrary = "
    + json.dumps(
        media_data,
        indent=4,
    )
    + ";\n"
)


OUTPUT_FILE.write_text(
    javascript,
    encoding="utf-8",
)


photo_count = sum(
    len(files)
    for files in photos.values()
)


video_count = sum(
    len(files)
    for files in videos.values()
)


print(f"Created: {OUTPUT_FILE.name}")
print(f"Photos found: {photo_count}")
print(f"Videos found: {video_count}")

print("\nPhoto chapters:")

for chapter, files in photos.items():
    print(
        f"  {chapter}: {len(files)}"
    )

print("\nVideo chapters:")

for chapter, files in videos.items():
    print(
        f"  {chapter}: {len(files)}"
    )