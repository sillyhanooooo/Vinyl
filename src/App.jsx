import { useEffect, useMemo, useRef, useState } from 'react'
import vinylLogo from './assets/vinyl-logo.svg'
import './App.css'

const songs = [
  {
    id: 1,
    title: 'Midnight City',
    artist: 'M83',
    album: 'Hurry Up, We’re Dreaming',
    duration: '4:03',
    image:
      'https://images.unsplash.com/photo-1534791547706-6c8f9f6b5f3d?auto=format&fit=crop&w=800&q=85',
  },
  {
    id: 2,
    title: 'Borderline',
    artist: 'Tame Impala',
    album: 'The Slow Rush',
    duration: '3:58',
    image:
      'https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=800&q=85',
  },
  {
    id: 3,
    title: 'Sunset Lover',
    artist: 'Petit Biscuit',
    album: 'Presence',
    duration: '3:58',
    image:
      'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=800&q=85',
  },
  {
    id: 4,
    title: 'A Moment Apart',
    artist: 'ODESZA',
    album: 'A Moment Apart',
    duration: '3:54',
    image:
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=85',
  },
  {
    id: 5,
    title: 'The Less I Know The Better',
    artist: 'Tame Impala',
    album: 'Currents',
    duration: '3:36',
    image:
      'https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=800&q=85',
  },
]

const mixes = [
  { label: 'Daily mix 01', subtitle: 'Dreamy electronic', image: songs[0].image },
  { label: 'Indie essentials', subtitle: 'For your next adventure', image: songs[1].image },
  { label: 'Late night drive', subtitle: 'Atmospheric & mellow', image: songs[3].image },
]

const MUSIC_API = import.meta.env.VITE_MUSIC_API_URL || 'http://127.0.0.1:8000'
const AUDIO_URLS = [
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
]

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
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}
// expanded music player

function App() {
  const [tab, setTab] = useState('Home')
  const [current, setCurrent] = useState({ ...songs[0], audioUrl: AUDIO_URLS[0] })
  const [playing, setPlaying] = useState(true)
  const [liked, setLiked] = useState(false)
  const [shuffle, setShuffle] = useState(false)
  const [search, setSearch] = useState('')
  const [apiSongs, setApiSongs] = useState([])
  const [latestSongs, setLatestSongs] = useState(songs)
  const [suggestions, setSuggestions] = useState([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [playerError, setPlayerError] = useState('')
  const [playerExpanded, setPlayerExpanded] = useState(false)
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
  useEffect(() => {
    savedProgressRef.current = savedProgress
  }, [savedProgress])
  const [progress, setProgress] = useState(38)
  const [lastPlayed, setLastPlayed] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('vinyl-last-played')) || []
    } catch {
      return []
    }
  })
  const audioRef = useRef(null)
  const [librarySongs, setLibrarySongs] = useState(() => {
    try {
      const stored = localStorage.getItem('vinyl-library')
      return stored ? JSON.parse(stored) : songs
    } catch {
      return songs
    }
  })

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
          const localMatches = songs.filter((song) => `${song.title} ${song.artist}`.toLowerCase().includes(query.toLowerCase()))
          setApiSongs(localMatches.length ? localMatches : songs)
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
    const audio = audioRef.current
    if (!audio || !current.audioUrl) return
    let cleanup
    if (audio.dataset.source !== current.audioUrl) {
      audio.src = current.audioUrl
      audio.dataset.source = current.audioUrl
      const resumeAt = Number(savedProgressRef.current[current.id]) || 0
      const restorePosition = () => {
        if (Number.isFinite(audio.duration) && resumeAt > 0 && resumeAt < audio.duration - 3) {
          audio.currentTime = resumeAt
          setElapsedSeconds(resumeAt)
          setProgress((resumeAt / audio.duration) * 100)
        }
      }
      audio.addEventListener('loadedmetadata', restorePosition, { once: true })
      cleanup = () => audio.removeEventListener('loadedmetadata', restorePosition)
    }
    if (playing) {
      audio.play().catch(() => setPlaying(false))
    } else {
      audio.pause()
    }
    return cleanup
  }, [current, playing])

  const filteredSongs = useMemo(() => {
    if (search.trim().length >= 2) return apiSongs
    return songs
  }, [apiSongs, search])
  const displayedSuggestions = lastPlayed.length ? suggestions : latestSongs.slice(0, 4)

  const selectSong = async (song) => {
    const isRemoteSong = Boolean(song.videoId)
    const playableSong = isRemoteSong
      ? { ...song, audioUrl: '' }
      : song.audioUrl
        ? song
        : { ...song, audioUrl: AUDIO_URLS[Math.abs(Number(song.id) || 0) % AUDIO_URLS.length] }
    setCurrent(playableSong)
    setPlaying(Boolean(playableSong.audioUrl))
    setProgress(0)
    setPlayerError('')
    setLastPlayed((played) => [playableSong, ...played.filter((item) => item.id !== playableSong.id)].slice(0, 8))
    setLibrarySongs((saved) => saved.some((item) => item.id === playableSong.id) ? saved.map((item) => item.id === playableSong.id ? playableSong : item) : [playableSong, ...saved])

    if (isRemoteSong) {
      try {
        const response = await fetch(`${MUSIC_API}/api/stream/${encodeURIComponent(song.videoId)}`)
        const data = await response.json()
        if (!response.ok || !data.audioUrl) throw new Error(data.error || 'Track unavailable')
        const resolvedSong = { ...song, audioUrl: data.audioUrl }
        setCurrent(resolvedSong)
        setPlaying(true)
        setLastPlayed((played) => [resolvedSong, ...played.filter((item) => item.id !== resolvedSong.id)].slice(0, 8))
        setLibrarySongs((saved) => saved.map((item) => item.id === resolvedSong.id ? resolvedSong : item))
      } catch {
        setPlayerError('This track could not be played. Try another song.')
        setPlaying(false)
      }
    }
  }

  const nextSong = () => {
    const collection = filteredSongs.length ? filteredSongs : songs
    const index = collection.findIndex((song) => song.id === current.id)
    selectSong(collection[(index + 1) % collection.length])
  }

  const previousSong = () => {
    const collection = filteredSongs.length ? filteredSongs : songs
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

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand"><img className="brand-logo" src={vinylLogo} alt="" /><span>vinyl</span></div>
        <button className="profile" aria-label="Profile">JM</button>
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
                <button className="light-button" onClick={() => setPlaying(!playing)}>
                  <Icon name={playing ? 'pause' : 'play'} size={15} /> {playing ? 'Pause mix' : 'Play mix'}
                </button>
              </div>
            </section>

            <section className="section-block">
              <div className="section-heading"><h2>Latest viral</h2><span className="section-note">Trending now</span></div>
              <div className="horizontal-scroll">
                {mixes.map((mix) => (
                  <button className="mix-card" key={mix.label} onClick={() => selectSong(songs.find((song) => song.image === mix.image) || songs[0])}>
                    <img src={mix.image} alt="" />
                    <strong>{mix.label}</strong>
                    <span>{mix.subtitle}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="section-block">
              <div className="section-heading"><h2>Continue listening</h2><span className="section-note">{lastPlayed.length ? 'Recently played' : 'Start your first track'}</span></div>
              <div className="recent-list">
                {(lastPlayed.length ? lastPlayed.slice(0, 4) : songs.slice(0, 3)).map((song) => (
                  <SongRow key={song.id} song={song} current={current} playing={playing} onSelect={selectSong} />
                ))}
              </div>
            </section>

            <section className="section-block quick-picks">
              <div className="section-heading"><h2>Latest music</h2><span className="section-note">YouTube Music charts</span></div>
              {latestSongs.slice(0, 4).map((song) => (
                <SongRow key={song.id} song={song} current={current} playing={playing} onSelect={selectSong} />
              ))}
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
                <div className="section-heading"><div><h2>Made for you</h2><span className="section-note">Based on your recent plays</span></div>{suggestionsLoading && <span className="search-status">Finding matches…</span>}</div>
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
            <div className="library-title"><div><p className="eyebrow">YOUR COLLECTION</p><h1>Library</h1><p className="muted">{librarySongs.length} songs saved on this device</p></div><button className="icon-button" onClick={() => setTab('Search')} aria-label="Add music"><Icon name="plus" /></button></div>
            <div className="library-tabs"><button className="active">Playlists</button><button>Songs</button><button>Albums</button><button>Artists</button></div>
            <div className="playlist-row"><div className="playlist-cover gradient-cover"><Icon name="heart" size={27} /></div><div><strong>Liked songs</strong><span>{liked ? '1 song' : '0 songs'}</span></div><Icon name="chevron" size={18} /></div>
            <div className="library-list-heading"><h2>All music</h2><span>Saved automatically</span></div>
            <div className="library-song-list">{librarySongs.map((song) => <SongRow key={song.id} song={song} current={current} playing={playing} onSelect={selectSong} />)}</div>
            {!librarySongs.length && <p className="empty">Your library is empty. Search for a song to add it.</p>}
          </section>
        )}
      </main>

      <div className="player">
        <div className="player-track"><span style={{ width: `${progress}%` }} /></div>
        <div className="player-inner" role="button" tabIndex="0" onClick={() => setPlayerExpanded(true)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setPlayerExpanded(true) }}>
          <img className="now-art" src={current.image} alt="" />
          <div className="now-copy"><strong>{current.title}</strong><span>{current.artist}</span></div>
          <button className={`player-like ${liked ? 'liked' : ''}`} onClick={(event) => { event.stopPropagation(); setLiked(!liked) }} aria-label="Like song"><Icon name="heart" size={19} /></button>
          <button className="play-button" onClick={(event) => { event.stopPropagation(); setPlaying(!playing) }} aria-label={playing ? 'Pause' : 'Play'}><Icon name={playing ? 'pause' : 'play'} size={19} /></button>
        </div>
        {playerError && <p className="player-error">{playerError}</p>}
        <div className="player-expanded">
          <span>{formatTime(elapsedSeconds)}</span><input className="seek-range" type="range" min="0" max="100" step="0.1" value={progress} onChange={(event) => seekTo(event.target.value)} aria-label="Seek through song" /><span>{current.duration}</span>
          <div className="player-actions"><button className={shuffle ? 'active' : ''} onClick={() => setShuffle(!shuffle)}><Icon name="shuffle" size={19} /></button><button onClick={nextSong}><Icon name="chevron" size={22} /></button><button><Icon name="volume" size={19} /></button></div>
        </div>
      </div>

      {playerExpanded && (
        <section className="player-fullscreen" aria-label="Now playing">
          <button className="player-backdrop" onClick={() => setPlayerExpanded(false)} aria-label="Close player" />
          <div className="player-sheet">
            <button className="player-close" onClick={() => setPlayerExpanded(false)} aria-label="Minimize player"><Icon name="down" size={24} /></button>
            <p className="eyebrow">NOW PLAYING</p>
            <img className="expanded-art" src={current.image} alt="" />
            <div className="expanded-copy"><strong>{current.title}</strong><span>{current.artist}</span></div>
            <div className="expanded-progress"><input className="seek-range" type="range" min="0" max="100" step="0.1" value={progress} onChange={(event) => seekTo(event.target.value)} aria-label="Seek through song" /><div><span>{formatTime(elapsedSeconds)}</span><span>{current.duration}</span></div></div>
            <div className="expanded-controls">
              <button className={shuffle ? 'active' : ''} onClick={() => setShuffle(!shuffle)} aria-label="Shuffle"><Icon name="shuffle" size={21} /></button>
              <button onClick={previousSong} aria-label="Previous song"><Icon name="chevron" size={28} /></button>
              <button className="expanded-play" onClick={() => setPlaying(!playing)} aria-label={playing ? 'Pause' : 'Play'}><Icon name={playing ? 'pause' : 'play'} size={24} /></button>
              <button onClick={nextSong} aria-label="Next song"><Icon name="chevron" size={28} /></button>
              <button className={liked ? 'active' : ''} onClick={() => setLiked(!liked)} aria-label="Like"><Icon name="heart" size={21} /></button>
            </div>
          </div>
        </section>
      )}

      <nav className="bottom-nav navigation-dock">
        {['Home', 'Search', 'Library'].map((item) => <button key={item} className={tab === item ? 'active' : ''} onClick={() => setTab(item)}><Icon name={item.toLowerCase()} size={21} /><span>{item}</span></button>)}
      </nav>
      <audio ref={audioRef} onEnded={handleEnded} onTimeUpdate={handleTimeUpdate} />
    </div>
  )
}

function SongRow({ song, current, playing, onSelect }) {
  const isCurrent = current.id === song.id
  return <button className={`song-row ${isCurrent ? 'current' : ''}`} onClick={() => onSelect(song)}><img src={song.image} alt="" /><span className="song-info"><strong>{song.title}</strong><span>{song.artist} · {song.album}</span></span>{isCurrent && playing ? <span className="equalizer"><i /><i /><i /></span> : <span className="song-duration">{song.duration}</span>}<Icon name="more" size={18} /></button>
}

export default App
