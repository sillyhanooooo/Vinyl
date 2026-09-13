from flask import Flask, jsonify, request
from flask_cors import CORS
from ytmusicapi import YTMusic
import yt_dlp

app = Flask(__name__)
CORS(app)
music = YTMusic()


def map_song(song):
    artists = ", ".join(
        artist.get("name", "")
        for artist in song.get("artists", [])
        if artist.get("name")
    )
    thumbnails = song.get("thumbnails", [])
    image = thumbnails[-1].get("url") if thumbnails else ""
    return {
        "id": f"ytmusic-{song.get('videoId')}",
        "source": "ytmusicapi",
        "videoId": song.get("videoId"),
        "title": song.get("title") or "Untitled",
        "artist": artists or "Unknown artist",
        "album": song.get("album", {}).get("name", "YouTube Music"),
        "duration": song.get("duration", "—"),
        "image": image,
        "pageUrl": (
            f"https://music.youtube.com/watch?v={song.get('videoId')}"
            if song.get("videoId")
            else ""
        ),
    }


@app.get("/api/search")
def search():
    query = request.args.get("q", "").strip()
    if len(query) < 2:
        return jsonify({"results": []})

    results = music.search(query, filter="songs", limit=24)
    return jsonify({"results": [map_song(song) for song in results]})


@app.get("/api/latest")
def latest():
    charts = music.get_charts()
    songs = charts.get("videos", []) if isinstance(charts, dict) else []
    return jsonify({"results": [map_song(song) for song in songs[:12]]})


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


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8000, debug=True)
