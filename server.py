import json
import os
from urllib.parse import quote
from urllib.request import Request, urlopen

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from ytmusicapi import YTMusic
import yt_dlp

app = Flask(__name__, static_folder="dist", static_url_path="")
CORS(app)
music = YTMusic()


def map_song(song):
    video_id = song.get("videoId")
    if not video_id:
        return None
    album = song.get("album") or {}
    artists = ", ".join(
        artist.get("name", "")
        for artist in song.get("artists", [])
        if artist.get("name")
    )
    thumbnails = song.get("thumbnails", [])
    image = thumbnails[-1].get("url") if thumbnails else ""
    return {
        "id": f"ytmusic-{video_id}",
        "source": "ytmusicapi",
        "videoId": video_id,
        "title": song.get("title") or "Untitled",
        "artist": artists or "Unknown artist",
        "album": album.get("name") or "YouTube Music",
        "duration": song.get("duration", "—"),
        "image": image,
        "pageUrl": (
            f"https://music.youtube.com/watch?v={video_id}"
        ),
    }


@app.get("/api/search")
def search():
    query = request.args.get("q", "").strip()
    if len(query) < 2:
        return jsonify({"results": []})

    results = music.search(query, filter="songs", limit=24)
    return jsonify({"results": [mapped for song in results if (mapped := map_song(song))]})


@app.get("/api/latest")
def latest():
    charts = music.get_charts()
    songs = charts.get("videos", []) if isinstance(charts, dict) else []
    return jsonify({"results": [mapped for song in songs[:12] if (mapped := map_song(song))]})


@app.get("/api/lyrics")
def lyrics():
    title = request.args.get("title", "").strip()
    artist = request.args.get("artist", "").strip()
    album = request.args.get("album", "").strip()
    if not title or not artist:
        return jsonify({"error": "A song title and artist are required"}), 400

    query = (
        f"https://lrclib.net/api/get?artist_name={quote(artist)}"
        f"&track_name={quote(title)}&album_name={quote(album)}"
    )
    try:
        response = urlopen(Request(query, headers={"User-Agent": "Vinyl/1.0"}), timeout=10)
        data = json.load(response)
        return jsonify({
            "syncedLyrics": data.get("syncedLyrics") or "",
            "plainLyrics": data.get("plainLyrics") or "",
        })
    except Exception as error:
        app.logger.info("Lyrics unavailable for %s - %s: %s", artist, title, error)
        return jsonify({"error": "Lyrics unavailable"}), 404


@app.get("/api/stream/<video_id>")
def stream(video_id):
    if not video_id or len(video_id) > 20:
        return jsonify({"error": "Invalid video ID"}), 400

    url = f"https://www.youtube.com/watch?v={video_id}"
    options = {
        "format": "bestaudio[ext=m4a]/bestaudio/best",
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        "skip_download": True,
    }
    try:
        with yt_dlp.YoutubeDL(options) as downloader:
            info = downloader.extract_info(url, download=False)
        audio_url = info.get("url")
        if not audio_url:
            return jsonify({"error": "No playable audio stream found"}), 404
        return jsonify({"audioUrl": audio_url})
    except Exception as error:
        app.logger.warning("Could not resolve audio for %s: %s", video_id, error)
        return jsonify({"error": "Unable to resolve this track"}), 502


@app.get("/")
def frontend():
    return send_from_directory(app.static_folder, "index.html")


@app.get("/<path:path>")
def frontend_assets(path):
    file_path = os.path.join(app.static_folder, path)
    if os.path.isfile(file_path):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, "index.html")


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=int(os.environ.get("PORT", "8000")),
        debug=os.environ.get("FLASK_DEBUG") == "1",
    )
