from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import yt_dlp
import os
import tempfile

app = FastAPI()

# CORS middleware to allow requests from the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins. For production, restrict this.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "YT-TE Downloader Backend"}

@app.get("/info")
def get_info(url: str):
    """
    Extracts video information and a list of available formats.
    """
    ydl_opts = {'noplaylist': True}
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)
        
        formats = []
        for f in info.get('formats', []):
            # Add relevant formats to our list
            formats.append({
                "format_id": f.get("format_id"),
                "ext": f.get("ext"),
                "resolution": f.get("resolution"),
                "vcodec": f.get("vcodec"),
                "acodec": f.get("acodec"),
                "filesize": f.get("filesize"),
                "note": f.get("format_note"),
            })

        return {
            "title": info.get("title"),
            "thumbnail": info.get("thumbnail"),
            "formats": formats
        }

@app.get("/download")
def download_media(url: str, video_format_id: str = None, audio_format_id: str = None):
    """
    Downloads and merges video/audio streams or downloads a single stream.
    Requires ffmpeg for merging.
    """
    if not video_format_id and not audio_format_id:
        return {"error": "No format ID provided"}

    # Determine the format string for yt-dlp
    # If both are provided, merge them. The format is "video_id+audio_id".
    # yt-dlp needs ffmpeg to merge.
    if video_format_id and audio_format_id:
        format_specifier = f'{video_format_id}+{audio_format_id}'
        output_ext = 'mp4'
    else:
        # Otherwise, download the single format specified.
        format_specifier = video_format_id or audio_format_id
        output_ext = 'mp4' if video_format_id else 'm4a'

    # Create a temporary file with the correct extension for yt-dlp to use
    with tempfile.NamedTemporaryFile(suffix=f'.{output_ext}', delete=False) as temp_file:
        temp_filename = temp_file.name

    ydl_opts = {
        'format': format_specifier,
        'outtmpl': temp_filename,
        'noplaylist': True,
        'overwrites': True,
        # Request merging into mp4 format if applicable
        'merge_output_format': 'mp4' if (video_format_id and audio_format_id) else None,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            title = info.get('title', 'download')
            sanitized_title = "".join(c for c in title if c.isalnum() or c in (' ', '-', '_')).rstrip()
            user_filename = f"{sanitized_title}.{output_ext}"

        def file_iterator(file_path):
            with open(file_path, "rb") as f:
                yield from f
            os.remove(file_path)

        headers = {
            "Content-Disposition": f'attachment; filename="{user_filename}"'
        }

        return StreamingResponse(
            file_iterator(temp_filename),
            media_type="application/octet-stream",
            headers=headers
        )
    except Exception as e:
        # Clean up the temp file in case of an error
        if os.path.exists(temp_filename):
            os.remove(temp_filename)
        return {"error": str(e)}
