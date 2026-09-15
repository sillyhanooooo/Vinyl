import { useEffect, useMemo, useRef, useState } from 'react'
import vinylLogo from './assets/vinyl-logo.svg'
import './App.css'

const songs = []
const emptySong = {
  id: 'empty',
  title: 'No song selected',
  artist: 'Search for music to start listening',
  album: '',
  duration: '0:00',
  image: vinylLogo,
  audioUrl: '',
}

function readStoredApiSongs(key) {
  try {
    const stored = JSON.parse(localStorage.getItem(key))
    return Array.isArray(stored) ? stored.filter((song) => song?.videoId) : []
  } catch {
    return []
  }
}

const MUSIC_API = import.meta.env.VITE_MUSIC_API_URL
  || (typeof window !== 'undefined'
    ? import.meta.env.DEV
      ? `${window.location.protocol}//${window.location.hostname}:8000`
      : window.location.origin
    : 'http://127.0.0.1:8000')
// suggestions area on the search tab

const words = (value) => String(value || '').toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 2)

function rankSuggestions(candidates, history) {
  const recent = history.slice(0, 6)
  const profile = new Map()
  recent.forEach((song, index) => {
    const weight = recent.length - index
    words(`${song.artist} ${song.title} ${song.album}`).forEach((word) => {
      profile.set(word, (profile.get(word) || 0) + weight)
    })
  })
  const playedIds = new Set(recent.map((song) => song.id))
  return candidates
    .filter((song) => !playedIds.has(song.id))
    .map((song) => {
      const tokens = words(`${song.artist} ${song.title} ${song.album}`)
      const score = tokens.reduce((total, token) => total + (profile.get(token) || 0), 0)
        + (recent.some((item) => item.artist && song.artist?.includes(item.artist)) ? 8 : 0)
      return { song, score }
    })
    .sort((a, b) => b.score - a.score)
    .map(({ song }) => song)
}

// every icon used in the vinyl app

function Icon({ name, size = 20, stroke = 1.8 }) {
  const paths = {
    home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1Z" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    library: <><path d="M5 4v16M9 4v16M15 5.5v13M19 5.5v13" /><path d="M2 4h3M2 20h3" /></>,
    heart: <path d="M20.8 8.9c0 5.4-8.8 10.1-8.8 10.1S3.2 14.3 3.2 8.9A4.7 4.7 0 0 1 12 6.5a4.7 4.7 0 0 1 8.8 2.4Z" />,
    play: <path d="m8 5 11 7-11 7Z" fill="currentColor" stroke="none" />,
    pause: <><path d="M7 5v14M17 5v14" /></>,
    shuffle: <><path d="M3 7h2c4.5 0 5.5 10 10 10h6" /><path d="m18 14 3 3-3 3M3 17h2c1.5 0 2.6-1 3.4-2.2M14.5 9.2C15.2 8 16.1 7 18 7h3" /><path d="m18 4 3 3-3 3" /></>,
    repeat: <><path d="m17 2 3 3-3 3" /><path d="M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3" /><path d="M20 13v2a4 4 0 0 1-4 4H4" /></>,
    down: <path d="m6 9 6 6 6-6" />,
    more: <><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" /></>,
    chevron: <path d="m9 18 6-6-6-6" />,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    volume: <><path d="M4 10v4h4l5 4V6l-5 4Z" /><path d="M17 9a5 5 0 0 1 0 6M19.5 6.5a9 9 0 0 1 0 11" /></>,
    queue: <><path d="M4 6h11M4 12h11M4 18h7" /><path d="m17 15 3 3-3 3" /><path d="M20 18h-6" /></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

function rankRelatedSongs(current, candidates, history = []) {
  const currentTitleWords = new Set(words(current.title))
  const currentArtistWords = new Set(words(current.artist))
  const currentAlbumWords = new Set(words(current.album))
  const currentArtist = String(current.artist || '').trim().toLowerCase()
  const currentAlbum = String(current.album || '').trim().toLowerCase()
  const currentDuration = Number(current.duration_seconds) || durationToSeconds(current.duration)
  const recentPositions = new Map(history.map((song, index) => [song.id, index]))
  const seen = new Set([current.id])

  return candidates
    .filter((song) => song && song.id !== undefined && !seen.has(song.id))
    .filter((song) => {
      if (seen.has(song.id)) return false
      seen.add(song.id)
      return true
    })
    .map((song) => {
      const titleWords = words(song.title)
      const artistWords = words(song.artist)
      const albumWords = words(song.album)
      const sharedTitleWords = titleWords.filter((word) => currentTitleWords.has(word)).length
      const sharedArtistWords = artistWords.filter((word) => currentArtistWords.has(word)).length
      const sharedAlbumWords = albumWords.filter((word) => currentAlbumWords.has(word)).length
      const candidateArtist = String(song.artist || '').trim().toLowerCase()
      const candidateAlbum = String(song.album || '').trim().toLowerCase()
      const candidateDuration = Number(song.duration_seconds) || durationToSeconds(song.duration)
      const durationDifference = currentDuration && candidateDuration
        ? Math.abs(currentDuration - candidateDuration)
        : Infinity
      const recentIndex = recentPositions.get(song.id)
      let score = 0

      score += sharedTitleWords * 8
      score += sharedArtistWords * 5
      score += sharedAlbumWords * 3
      if (candidateArtist === currentArtist && currentArtist) score += 28
      if (candidateAlbum === currentAlbum && currentAlbum) score += 18
      if (durationDifference <= 20) score += 5
      else if (durationDifference <= 60) score += 2
      if (recentIndex !== undefined) score -= Math.max(8, 22 - recentIndex * 2)

      return { song, score }
    })
    .sort((a, b) => b.score - a.score || String(a.song.title).localeCompare(String(b.song.title)))
    .slice(0, 30)
    .map(({ song }) => song)
}

async function fetchQueueCandidates(song, signal) {
  const artist = String(song.artist || '').trim()
  const album = String(song.album || '').trim()
  const title = String(song.title || '').trim()
  const queries = [...new Set([
    artist,
    album && album !== 'YouTube Music' ? `${artist} ${album}` : '',
    title,
  ].filter((query) => query.length >= 2))]

  const responses = await Promise.all(queries.map(async (query) => {
    try {
      const response = await fetch(`${MUSIC_API}/api/search?q=${encodeURIComponent(query)}&filter=songs`, { signal })
      if (!response.ok) return []
      const data = await response.json()
      return data.results || []
    } catch (error) {
      if (error.name === 'AbortError') throw error
      return []
    }
  }))

  const unique = new Map()
  responses.flat().forEach((candidate) => {
    if (candidate?.id) unique.set(candidate.id, candidate)
  })
  return [...unique.values()]
}

function parseLyrics(data, duration) {
  if (data.syncedLyrics) {
    return data.syncedLyrics.split(/\r?\n/).flatMap((line) => {
      const match = line.match(/^\[(\d+):(\d+(?:\.\d+)?)\]\s*(.*)$/)
      if (!match || !match[3].trim()) return []
      return [{ time: Number(match[1]) * 60 + Number(match[2]), text: match[3].trim() }]
    })
  }

  const lines = String(data.plainLyrics || '').split(/\r?\n/).map((text) => text.trim()).filter(Boolean)
  const totalSeconds = Number.isFinite(duration) && duration > 0 ? duration : 1
  return lines.map((text, index) => ({ time: (index / Math.max(lines.length, 1)) * totalSeconds, text }))
}

function durationToSeconds(duration) {
  const parts = String(duration || '').split(':').map(Number)
  if (parts.some((part) => !Number.isFinite(part))) return 0
  return parts.length === 2 ? parts[0] * 60 + parts[1] : parts[0] || 0
}

// expanded music player

function App() {
  const [tab, setTab] = useState('Home')
  const [current, setCurrent] = useState(emptySong)
  const [playing, setPlaying] = useState(false)
  const [likedSongs, setLikedSongs] = useState(() => {
    return readStoredApiSongs('vinyl-liked-songs')
  })
  const [libraryView, setLibraryView] = useState('all')
  const [libraryFilter, setLibraryFilter] = useState('playlists')
  const [profileOpen, setProfileOpen] = useState(false)
  const [muted, setMuted] = useState(false)
  const [shuffle, setShuffle] = useState(false)
  const shuffleCursorRef = useRef(0)
  const queueRequestRef = useRef(null)
  const [search, setSearch] = useState('')
  const [apiSongs, setApiSongs] = useState([])
  const [latestSongs, setLatestSongs] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [playerError, setPlayerError] = useState('')
  const [playerExpanded, setPlayerExpanded] = useState(false)
  const [queueOpen, setQueueOpen] = useState(false)
  const [queue, setQueue] = useState([])
  const [lyricsData, setLyricsData] = useState({
    trackId: emptySong.id,
    lines: [],
    loading: true,
    error: '',
  })
  const lyricsListRef = useRef(null)
  const lyricsVisibleRef = useRef(false)
  const lyricsEngagedRef = useRef(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [savedProgress, setSavedProgress] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('vinyl-progress')) || {}
    } catch {
      return {}
    }
  })

  // saved progress on played music

  const savedProgressRef = useRef(savedProgress)
  const resetPlaybackRef = useRef(false)
  useEffect(() => {
    savedProgressRef.current = savedProgress
  }, [savedProgress])
  const [progress, setProgress] = useState(38)
  const [lastPlayed, setLastPlayed] = useState(() => {
    return readStoredApiSongs('vinyl-last-played')
  })
  const audioRef = useRef(null)
  const [librarySongs, setLibrarySongs] = useState(() => {
    return readStoredApiSongs('vinyl-library')
  })
  const liked = likedSongs.some((song) => song.id === current.id)
  const filteredLibrarySongs = libraryFilter === 'artists'
    ? librarySongs.filter((song, index, collection) => collection.findIndex((item) => item.artist === song.artist) === index)
    : libraryFilter === 'albums'
      ? librarySongs.filter((song, index, collection) => collection.findIndex((item) => item.album === song.album) === index)
      : librarySongs

  useEffect(() => {
    const controller = new AbortController()
    fetch(`${MUSIC_API}/api/latest`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('Latest music unavailable')))
      .then((data) => {
        if (data.results?.length) setLatestSongs(data.results)
      })
      .catch(() => {})
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const query = search.trim()
    if (query.length < 2) {
      return undefined
    }

    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setIsSearching(true)
      setSearchError('')
      try {
        const response = await fetch(`${MUSIC_API}/api/search?q=${encodeURIComponent(query)}&filter=songs`, { signal: controller.signal })
        if (!response.ok) throw new Error('Music search unavailable')
        const data = await response.json()
        setApiSongs(data.results || [])
      } catch (error) {
        if (error.name !== 'AbortError') {
          setApiSongs([])
          setSearchError('')
        }
      } finally {
        setIsSearching(false)
      }
    }, 350)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [search])

  useEffect(() => {
    localStorage.setItem('vinyl-library', JSON.stringify(librarySongs))
  }, [librarySongs])

  useEffect(() => {
    localStorage.setItem('vinyl-liked-songs', JSON.stringify(likedSongs))
  }, [likedSongs])

  useEffect(() => {
    localStorage.setItem('vinyl-last-played', JSON.stringify(lastPlayed))
  }, [lastPlayed])

  useEffect(() => {
    const controller = new AbortController()
    const history = lastPlayed.slice(0, 6)
    if (!history.length) {
      return () => controller.abort()
    }

    const artists = [...new Set(history.flatMap((song) => String(song.artist || '').split(',').map((artist) => artist.trim()).filter(Boolean)))]
      .slice(0, 3)
    const request = Promise.all(artists.map((artist) => fetch(`${MUSIC_API}/api/search?q=${encodeURIComponent(artist)}&filter=songs`, { signal: controller.signal }).then((response) => response.ok ? response.json() : { results: [] })))
    Promise.resolve().then(() => {
      if (!controller.signal.aborted) setSuggestionsLoading(true)
    })
    request
      .then((responses) => {
        const unique = new Map()
        responses.flatMap((response) => response.results || []).forEach((song) => unique.set(song.id, song))
        setSuggestions(rankSuggestions([...unique.values()], history).slice(0, 6))
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setSuggestions([])
      })
      .finally(() => setSuggestionsLoading(false))
    return () => controller.abort()
  }, [lastPlayed, latestSongs])

  useEffect(() => {
    localStorage.setItem('vinyl-progress', JSON.stringify(savedProgress))
  }, [savedProgress])

  useEffect(() => {
    const controller = new AbortController()
    const params = new URLSearchParams({
      title: current.title || '',
      artist: current.artist || '',
      album: current.album || '',
    })
    fetch(`${MUSIC_API}/api/lyrics?${params}`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('Lyrics unavailable')))
      .then((data) => setLyricsData({
        trackId: current.id,
        lines: parseLyrics(data, Number(current.duration_seconds) || durationToSeconds(current.duration)),
        loading: false,
        error: '',
      }))
      .catch((error) => {
        if (error.name !== 'AbortError') {
          setLyricsData({ trackId: current.id, lines: [], loading: false, error: 'Lyrics unavailable for this song.' })
        }
      })
    return () => controller.abort()
  }, [current])

  const lyricsLoading = lyricsData.trackId !== current.id || lyricsData.loading
  const lyricsError = lyricsData.trackId === current.id ? lyricsData.error : ''
  const lyrics = lyricsData.trackId === current.id ? lyricsData.lines : []
  const activeLyricIndex = lyrics.reduce((active, lyric, index) => (
    elapsedSeconds >= lyric.time ? index : active
  ), -1)

  useEffect(() => {
    const panel = lyricsListRef.current
    const scrollContainer = panel?.closest('.player-sheet')
    if (!panel || !scrollContainer || typeof IntersectionObserver === 'undefined') return undefined

    const observer = new IntersectionObserver(([entry]) => {
      lyricsVisibleRef.current = entry.isIntersecting && entry.intersectionRatio >= 0.45
      if (!lyricsVisibleRef.current) lyricsEngagedRef.current = false
    }, { root: scrollContainer, threshold: [0, 0.45, 1] })
    observer.observe(panel)
    return () => {
      observer.disconnect()
      lyricsVisibleRef.current = false
      lyricsEngagedRef.current = false
    }
  }, [playerExpanded])

  useEffect(() => {
    const panel = lyricsListRef.current
    const list = panel?.querySelector('.lyrics-list')
    const activeLine = list?.querySelector('.active')
    if (!list || !activeLine || !lyricsVisibleRef.current || !lyricsEngagedRef.current) return

    const targetTop = activeLine.offsetTop - (list.clientHeight / 2) + (activeLine.offsetHeight / 2)
    list.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' })
  }, [activeLyricIndex])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    let cleanup
    if (!current.audioUrl) {
      audio.pause()
      audio.removeAttribute('src')
      delete audio.dataset.source
      return undefined
    }
    if (audio.dataset.source !== current.audioUrl) {
      audio.src = current.audioUrl
      audio.dataset.source = current.audioUrl
      const resumeAt = resetPlaybackRef.current ? 0 : Number(savedProgressRef.current[current.id]) || 0
      resetPlaybackRef.current = false
      const restorePosition = () => {
        if (Number.isFinite(audio.duration) && resumeAt > 0 && resumeAt < audio.duration - 3) {
          audio.currentTime = resumeAt
          setElapsedSeconds(resumeAt)
          setProgress((resumeAt / audio.duration) * 100)
        }
      }
      audio.addEventListener('loadedmetadata', restorePosition, { once: true })
      cleanup = () => audio.removeEventListener('loadedmetadata', restorePosition)
      audio.load()
    }
    if (playing) {
      if (audio.ended) {
        audio.currentTime = 0
      }
      audio.play()
        .then(() => setPlayerError(''))
        .catch(() => {
          setPlaying(false)
          setPlayerError('Playback was blocked or the audio stream is unavailable.')
        })
    } else {
      audio.pause()
    }
    return cleanup
  }, [current, playing])

  const filteredSongs = useMemo(() => {
    const q = search.trim().toLowerCase()
    // If the user is searching (2+ chars) prefer API results when present.
    // If the API returned no results (or is unreachable), fall back to a local
    // filter so users still see matching songs immediately.
    if (q.length >= 2) {
      if (apiSongs && apiSongs.length) return apiSongs
      return []
    }
    return songs
  }, [apiSongs, search])
  const displayedSuggestions = lastPlayed.length ? suggestions : latestSongs.slice(0, 4)
  const recommendationSongs = suggestions.length ? suggestions : latestSongs.slice(0, 4)

  const playAudioUrl = (audioUrl) => {
    const audio = audioRef.current
    if (!audio || !audioUrl) return
    if (audio.dataset.source !== audioUrl) {
      audio.src = audioUrl
      audio.dataset.source = audioUrl
      audio.currentTime = 0
      audio.load()
    }

    audio.play()
      .then(() => {
        resetPlaybackRef.current = false
        setPlaying(true)
        setPlayerError('')
      })
      .catch(() => {
        setPlaying(false)
        setPlayerError('Playback was blocked or the audio stream is unavailable.')
      })
  }

  const toggleLike = () => {
    setLikedSongs((saved) => (
      saved.some((song) => song.id === current.id)
        ? saved.filter((song) => song.id !== current.id)
        : [current, ...saved]
    ))
  }

  const selectSong = async (song, { preserveQueue = false } = {}) => {
    const isRemoteSong = Boolean(song.videoId)
    const playableSong = isRemoteSong
      ? { ...song, audioUrl: '' }
      : song.audioUrl
        ? song
        : song
    queueRequestRef.current?.abort()
    queueRequestRef.current = null
    setCurrent(playableSong)
    setPlaying(false)
    setProgress(0)
    setElapsedSeconds(0)
    resetPlaybackRef.current = true
    setSavedProgress((positions) => {
      const nextPositions = { ...positions }
      delete nextPositions[playableSong.id]
      return nextPositions
    })
    setPlayerError('')
    if (!preserveQueue) {
      const queueController = new AbortController()
      queueRequestRef.current = queueController
      const cachedCandidates = [...apiSongs, ...latestSongs, ...suggestions, ...librarySongs, ...songs]
      setQueue(rankRelatedSongs(playableSong, cachedCandidates, lastPlayed))
      fetchQueueCandidates(playableSong, queueController.signal)
        .then((remoteCandidates) => {
          if (queueController.signal.aborted) return
          setQueue((existingQueue) => rankRelatedSongs(
            playableSong,
            [...existingQueue, ...remoteCandidates],
            lastPlayed,
          ))
        })
        .catch((error) => {
          if (error.name !== 'AbortError') return
        })
    }
    setLastPlayed((played) => [playableSong, ...played.filter((item) => item.id !== playableSong.id)].slice(0, 8))
    setLibrarySongs((saved) => saved.some((item) => item.id === playableSong.id) ? saved.map((item) => item.id === playableSong.id ? playableSong : item) : [playableSong, ...saved])

    if (isRemoteSong) {
      let timeout
      try {
        const controller = new AbortController()
        timeout = setTimeout(() => controller.abort(), 15000)
        const response = await fetch(`${MUSIC_API}/api/stream/${encodeURIComponent(song.videoId)}`, {
          signal: controller.signal,
        })
        const data = await response.json()
        if (!response.ok || !data.audioUrl) throw new Error(data.error || 'Track unavailable')
        const resolvedSong = { ...song, audioUrl: data.audioUrl }
        setCurrent(resolvedSong)
        setPlaying(true)
        setPlayerError('')
        setLastPlayed((played) => [resolvedSong, ...played.filter((item) => item.id !== resolvedSong.id)].slice(0, 8))
        setLibrarySongs((saved) => saved.map((item) => item.id === resolvedSong.id ? resolvedSong : item))
      } catch (error) {
        setPlayerError(error.name === 'AbortError'
          ? 'The music service took too long to respond. Start server.py and try again.'
          : `This track could not be loaded. Start server.py and try again.`)
        setPlaying(false)
      } finally {
        clearTimeout(timeout)
      }
    } else {
      playAudioUrl(playableSong.audioUrl)
    }
  }

  const nextSong = () => {
    if (queue.length) {
      const nextIndex = shuffle ? shuffleCursorRef.current % queue.length : 0
      if (shuffle) shuffleCursorRef.current += 1
      const next = queue[nextIndex]
      setQueue((items) => items.filter((_, index) => index !== nextIndex))
      selectSong(next, { preserveQueue: true })
      return
    }

    const candidates = [...apiSongs, ...latestSongs, ...suggestions, ...songs]
    const related = rankRelatedSongs(current, candidates, lastPlayed)
    if (related.length) {
      selectSong(related[0])
      return
    }

    const collection = filteredSongs.length ? filteredSongs : latestSongs
    if (!collection.length) return
    const index = collection.findIndex((song) => song.id === current.id)
    selectSong(collection[(index + 1) % collection.length])
  }

  const previousSong = () => {
    const collection = filteredSongs.length ? filteredSongs : latestSongs
    if (!collection.length) return
    const index = collection.findIndex((song) => song.id === current.id)
    selectSong(collection[(index - 1 + collection.length) % collection.length])
  }

  const handleTimeUpdate = (event) => {
    const audio = event.currentTarget
    if (!audio.duration) return
    const nextProgress = (audio.currentTime / audio.duration) * 100
    setElapsedSeconds(audio.currentTime)
    setProgress(nextProgress)
    setSavedProgress((positions) => ({ ...positions, [current.id]: audio.currentTime }))
  }

  const handleEnded = () => {
    setSavedProgress((positions) => {
      const nextPositions = { ...positions }
      delete nextPositions[current.id]
      return nextPositions
    })
    nextSong()
  }

  const formatTime = (seconds) => {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
    const minutes = Math.floor(seconds / 60)
    const remainder = Math.floor(seconds % 60).toString().padStart(2, '0')
    return `${minutes}:${remainder}`
  }

  const seekTo = (value) => {
    const audio = audioRef.current
    const percentage = Number(value)
    if (!audio || !Number.isFinite(audio.duration)) return
    const nextTime = (percentage / 100) * audio.duration
    audio.currentTime = nextTime
    setElapsedSeconds(nextTime)
    setProgress(percentage)
    setSavedProgress((positions) => ({ ...positions, [current.id]: nextTime }))
  }

  const togglePlayback = () => {
    const audio = audioRef.current
    if (!audio || !current.audioUrl) return
    if (playing) {
      audio.pause()
      setPlaying(false)
      return
    }

    if (audio.ended) audio.currentTime = 0
    audio.play()
      .then(() => {
        setPlayerError('')
        setPlaying(true)
      })
      .catch(() => {
        setPlaying(false)
        setPlayerError('Playback was blocked or the audio stream is unavailable.')
      })
  }

  const toggleMute = () => {
    const audio = audioRef.current
    const nextMuted = !muted
    if (audio) audio.muted = nextMuted
    setMuted(nextMuted)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand"><img className="brand-logo" src={vinylLogo} alt="" /><span>vinyl</span></div>
        <div className="profile-wrap">
          <button className="profile" onClick={() => setProfileOpen(!profileOpen)} aria-label="Profile" aria-expanded={profileOpen}>JM</button>
          {profileOpen && <div className="profile-menu"><strong>Janno</strong><span>Local profile</span><button onClick={() => { setProfileOpen(false); setTab('Library') }}>Open library</button></div>}
        </div>
      </header>

      <main className="content">
        {tab === 'Home' && (
          <>
            <section className="greeting">
              <p className="eyebrow">SUNDAY, SEPTEMBER 13</p>
              <h1>Good evening, Janno</h1>
              <p className="muted">Pick up where you left off.</p>
            </section>

            <section className="featured-card" style={{ backgroundImage: `url(${current.image})` }}>
              <div className="featured-overlay" />
              <div className="featured-content">
                <span className="pill">YOUR DAILY MIX</span>
                <h2>Deep focus,<br />soft edges.</h2>
                <p>ODESZA, Bonobo, Tycho and more</p>
                <button className="light-button" onClick={togglePlayback}>
                  <Icon name={playing ? 'pause' : 'play'} size={15} /> {playing ? 'Pause mix' : 'Play mix'}
                </button>
              </div>
            </section>

            <section className="section-block">
              <div className="section-heading"><h2>Latest viral</h2><span className="section-note">Trending now</span></div>
              <div className="horizontal-scroll">
                {latestSongs.slice(0, 5).map((song) => (
                  <button className="mix-card" key={song.id} onClick={() => selectSong(song)}>
                    <img src={song.image} alt="" />
                    <strong>{song.title}</strong>
                    <span>{song.artist}</span>
                  </button>
                ))}
                {!latestSongs.length && <p className="empty">Start the music service to load trending songs.</p>}
              </div>
            </section>

            <section className="section-block">
              <div className="section-heading"><h2>Continue listening</h2><span className="section-note">{lastPlayed.length ? 'Recently played' : 'Start your first track'}</span></div>
              <div className="recent-list">
                {(lastPlayed.length ? lastPlayed.slice(0, 4) : latestSongs.slice(0, 3)).map((song) => (
                  <SongRow key={song.id} song={song} current={current} playing={playing} onSelect={selectSong} />
                ))}
                {!lastPlayed.length && !latestSongs.length && <p className="empty">Search for a song to start listening.</p>}
              </div>
            </section>

            <section className="section-block quick-picks">
              <div className="section-heading"><h2>Latest music</h2><span className="section-note">YouTube Music charts</span></div>
              {latestSongs.slice(0, 4).map((song) => (
                <SongRow key={song.id} song={song} current={current} playing={playing} onSelect={selectSong} />
              ))}
            </section>

            <section className="section-block recommendations-block">
              <div className="section-heading"><div><h2>Recommended for you</h2><span className="section-note">{lastPlayed.length ? 'Based on your recent plays' : 'Fresh picks to get you started'}</span></div></div>
              {recommendationSongs.length > 0 ? (
                <div className="result-grid">{recommendationSongs.slice(0, 4).map((song) => <button key={song.id} className="result-card" onClick={() => selectSong(song)}><img src={song.image} alt="" /><strong>{song.title}</strong><span>{song.artist}</span></button>)}</div>
              ) : (
                <p className="empty">Play a few songs and your recommendations will appear here.</p>
              )}
            </section>
          </>
        )}

        {tab === 'Search' && (
          <section className="page-section">
            <h1>Search</h1>
            <div className="search-box"><Icon name="search" size={20} /><input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search songs, artists, or albums" /><kbd>⌘ K</kbd></div>
            <div className="search-tags"><span>Chill</span><span>Focus</span><span>New releases</span><span>Workout</span></div>
            {search.trim().length < 2 && (
              <section className="suggestions-block">
                <div className="section-heading"><div><h2>Recommended for you</h2><span className="section-note">Based on your recent plays</span></div>{suggestionsLoading && <span className="search-status">Finding matches…</span>}</div>
                {!suggestionsLoading && displayedSuggestions.length > 0 && <div className="result-grid">{displayedSuggestions.map((song) => <button key={song.id} className="result-card" onClick={() => selectSong(song)}><img src={song.image} alt="" /><strong>{song.title}</strong><span>{song.artist}</span></button>)}</div>}
                {!suggestionsLoading && !displayedSuggestions.length && <p className="empty">Play a few songs and your recommendations will appear here.</p>}
              </section>
            )}
            <div className="section-heading"><h2>{search ? 'Results from YouTube Music' : 'Browse all'}</h2>{isSearching && <span className="search-status">Searching YouTube Music…</span>}</div>
            {search.trim().length >= 2 && searchError && <p className="empty error">{searchError}</p>}
            {!isSearching && <div className="result-grid">{filteredSongs.map((song) => <button key={song.id} className="result-card" onClick={() => selectSong(song)}><img src={song.image} alt="" /><strong>{song.title}</strong><span>{song.artist}</span></button>)}</div>}
            {!isSearching && search.trim().length >= 2 && !filteredSongs.length && !searchError && <p className="empty">No songs found. Try another search.</p>}
          </section>
        )}

        {tab === 'Library' && (
          <section className="page-section">
            {libraryView === 'all' ? (
              <>
                <div className="library-title"><div><p className="eyebrow">YOUR COLLECTION</p><h1>Library</h1><p className="muted">{librarySongs.length} songs saved on this device</p></div><button className="icon-button" onClick={() => setTab('Search')} aria-label="Add music"><Icon name="plus" /></button></div>
                <div className="library-tabs">
                  {['playlists', 'songs', 'albums', 'artists'].map((filter) => <button key={filter} className={libraryFilter === filter ? 'active' : ''} onClick={() => setLibraryFilter(filter)}>{filter[0].toUpperCase() + filter.slice(1)}</button>)}
                </div>
                <button className="playlist-row" onClick={() => setLibraryView('liked')}>
                  <div className="playlist-cover gradient-cover"><Icon name="heart" size={27} /></div>
                  <div><strong>Liked songs</strong><span>{likedSongs.length} {likedSongs.length === 1 ? 'song' : 'songs'}</span></div>
                  <Icon name="chevron" size={18} />
                </button>
                <div className="library-list-heading"><h2>{libraryFilter === 'playlists' ? 'All music' : libraryFilter}</h2><span>Saved automatically</span></div>
                <div className="library-song-list">{filteredLibrarySongs.map((song) => <SongRow key={song.id} song={song} current={current} playing={playing} onSelect={selectSong} />)}</div>
                {!librarySongs.length && <p className="empty">Your library is empty. Search for a song to add it.</p>}
              </>
            ) : (
              <>
                <div className="library-title liked-library-title"><div><button className="library-back" onClick={() => setLibraryView('all')}>Back to Library</button><p className="eyebrow">YOUR COLLECTION</p><h1>Liked songs</h1><p className="muted">{likedSongs.length} {likedSongs.length === 1 ? 'song' : 'songs'} you love</p></div></div>
                <div className="liked-header"><div className="playlist-cover gradient-cover"><Icon name="heart" size={32} /></div><div><strong>Favorites</strong><span>Saved on this device</span></div></div>
                <div className="library-song-list liked-song-list">{likedSongs.map((song) => <SongRow key={song.id} song={song} current={current} playing={playing} onSelect={selectSong} />)}</div>
                {!likedSongs.length && <p className="empty">Songs you like will appear here.</p>}
              </>
            )}
          </section>
        )}
      </main>

      <div className="player">
        <div className="player-track"><span style={{ width: `${progress}%` }} /></div>
        <div className="player-inner" role="button" tabIndex="0" onClick={() => setPlayerExpanded(true)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setPlayerExpanded(true) }}>
          <img className="now-art" src={current.image} alt={`${current.title} album cover`} onClick={(event) => { event.stopPropagation(); togglePlayback() }} role="button" tabIndex="0" onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); togglePlayback() } }} />
          <div className="now-copy"><strong>{current.title}</strong><span>{current.artist}</span></div>
          <button className={`player-like ${liked ? 'liked' : ''}`} onClick={(event) => { event.stopPropagation(); toggleLike() }} aria-label={liked ? 'Unlike song' : 'Like song'}><Icon name="heart" size={19} /></button>
          <button className="play-button" onClick={(event) => { event.stopPropagation(); togglePlayback() }} aria-label={playing ? 'Pause' : 'Play'}><Icon name={playing ? 'pause' : 'play'} size={19} /></button>
        </div>
        {playerError && <p className="player-error">{playerError}</p>}
        <div className="player-expanded">
          <span>{formatTime(elapsedSeconds)}</span><input className="seek-range" type="range" min="0" max="100" step="0.1" value={progress} onChange={(event) => seekTo(event.target.value)} aria-label="Seek through song" /><span>{current.duration}</span>
          <div className="player-actions"><button className={shuffle ? 'active' : ''} onClick={() => setShuffle(!shuffle)} aria-label="Toggle shuffle"><Icon name="shuffle" size={19} /></button><button onClick={nextSong} aria-label="Next song"><Icon name="chevron" size={22} /></button><button className={muted ? 'active' : ''} onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'}><Icon name="volume" size={19} /></button></div>
        </div>
      </div>

      {playerExpanded && (
        <section className="player-fullscreen" aria-label="Now playing">
          <button className="player-backdrop" onClick={() => setPlayerExpanded(false)} aria-label="Close player" />
          <div className="player-sheet">
            <button className="player-close" onClick={() => setPlayerExpanded(false)} aria-label="Minimize player"><Icon name="down" size={24} /></button>
            <p className="eyebrow">NOW PLAYING</p>
            <img className="expanded-art" src={current.image} alt={`${current.title} album cover`} onClick={togglePlayback} role="button" tabIndex="0" onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); togglePlayback() } }} />
            <div className="expanded-copy"><strong>{current.title}</strong><span>{current.artist}</span></div>
            <div className="expanded-progress"><input className="seek-range" type="range" min="0" max="100" step="0.1" value={progress} onChange={(event) => seekTo(event.target.value)} aria-label="Seek through song" /><div><span>{formatTime(elapsedSeconds)}</span><span>{current.duration}</span></div></div>
            <div className="expanded-controls">
              <button className={shuffle ? 'active' : ''} onClick={() => setShuffle(!shuffle)} aria-label="Shuffle"><Icon name="shuffle" size={21} /></button>
              <button onClick={previousSong} aria-label="Previous song"><Icon name="chevron" size={28} /></button>
              <button className="expanded-play" onClick={togglePlayback} aria-label={playing ? 'Pause' : 'Play'}><Icon name={playing ? 'pause' : 'play'} size={24} /></button>
              <button onClick={nextSong} aria-label="Next song"><Icon name="chevron" size={28} /></button>
              <button className={queueOpen ? 'active' : ''} onClick={() => setQueueOpen(!queueOpen)} aria-label="Open queue"><Icon name="queue" size={21} /></button>
              <button className={liked ? 'active' : ''} onClick={toggleLike} aria-label={liked ? 'Unlike' : 'Like'}><Icon name="heart" size={21} /></button>
            </div>
            {queueOpen && (
              <QueuePanel current={current} queue={queue} playing={playing} onClear={() => setQueue([])} onSelect={(song) => {
                setQueue((items) => items.slice(items.findIndex((item) => item.id === song.id) + 1))
                selectSong(song, { preserveQueue: true })
              }} className="mobile-queue" />
            )}
            <div
              className="lyrics-panel"
              ref={lyricsListRef}
              aria-label="Lyrics"
              onPointerEnter={() => { lyricsEngagedRef.current = true }}
              onPointerLeave={() => { lyricsEngagedRef.current = false }}
              onTouchStart={() => { lyricsEngagedRef.current = true }}
              onFocusCapture={() => { lyricsEngagedRef.current = true }}
            >
              <div className="lyrics-heading"><strong>Lyrics</strong>{lyricsLoading && <span>Loading…</span>}</div>
              {lyricsError && <p className="empty">{lyricsError}</p>}
              {!lyricsLoading && !lyricsError && !lyrics.length && <p className="empty">No lyrics found for this song.</p>}
              {lyrics.length > 0 && <div className="lyrics-list">{lyrics.map((lyric, index) => <p className={index === activeLyricIndex ? 'active' : ''} key={`${lyric.time}-${index}`}>{lyric.text}</p>)}</div>}
            </div>
          </div>
          {queueOpen && (
            <QueuePanel current={current} queue={queue} playing={playing} onClear={() => setQueue([])} onSelect={(song) => {
              setQueue((items) => items.slice(items.findIndex((item) => item.id === song.id) + 1))
              selectSong(song, { preserveQueue: true })
            }} className="desktop-queue" />
          )}
        </section>
      )}

      <nav className="bottom-nav navigation-dock">
        {['Home', 'Search', 'Library'].map((item) => <button key={item} className={tab === item ? 'active' : ''} onClick={() => setTab(item)}><Icon name={item.toLowerCase()} size={21} /><span>{item}</span></button>)}
      </nav>
      <audio
        ref={audioRef}
        onEnded={handleEnded}
        onTimeUpdate={handleTimeUpdate}
        onError={() => {
          setPlaying(false)
          setPlayerError('The audio stream could not be loaded.')
        }}
      />
    </div>
  )
}

function SongRow({ song, current, playing, onSelect }) {
  const isCurrent = current.id === song.id
  return <button className={`song-row ${isCurrent ? 'current' : ''}`} onClick={() => onSelect(song)}><img src={song.image} alt="" /><span className="song-info"><strong>{song.title}</strong><span>{song.artist} · {song.album}</span></span>{isCurrent && playing ? <span className="equalizer"><i /><i /><i /></span> : <span className="song-duration">{song.duration}</span>}<Icon name="more" size={18} /></button>
}

function QueuePanel({ current, queue, playing, onClear, onSelect, className = '' }) {
  return (
    <aside className={`queue-panel ${className}`}>
      <div className="queue-heading">
        <div><span className="queue-kicker">PLAYBACK QUEUE</span><strong>Up next</strong></div>
        <button onClick={onClear} disabled={!queue.length}>Clear</button>
      </div>
      <div className="queue-current">
        <img src={current.image} alt="" />
        <span><small>NOW PLAYING</small><strong>{current.title}</strong><em>{current.artist}</em></span>
        {playing && <span className="queue-playing"><i /><i /><i /></span>}
      </div>
      <div className="queue-next-label"><span>Next tracks</span><b>{queue.length}</b></div>
      {queue.length ? queue.map((song, index) => (
        <button className="queue-item" key={song.id} onClick={() => onSelect(song, index)}>
          <span className="queue-number">{String(index + 1).padStart(2, '0')}</span>
          <img src={song.image} alt="" />
          <span><strong>{song.title}</strong><small>{song.artist}</small></span>
          <time>{song.duration}</time>
        </button>
      )) : <p className="empty">Your queue is empty.</p>}
    </aside>
  )
}

export default App
