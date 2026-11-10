import { useEffect, useMemo, useState } from "react";
import { FiChevronDown, FiChevronUp, FiPause, FiPlay, FiPlus, FiSkipBack, FiSkipForward, FiTrash2 } from "react-icons/fi";
import ConfirmDialog from "../confirmDialog/index.jsx";
import styles from "./styles.module.css";

const mixes = [
    { id: "daylight", name: "Late daylight", detail: "A little lift for the drive home", tone: "citrus" },
    { id: "after-hours", name: "After hours", detail: "For the last train and the long way back", tone: "plum" },
    { id: "soft-focus", name: "Soft focus", detail: "A quiet room, no rush", tone: "sky" },
];
const mixIds = new Set(mixes.map((mix) => mix.id));
const seedTracks = [
    { id: 1, title: "Dreams", artist: "Fleetwood Mac", duration: 257, mix: "daylight" },
    { id: 2, title: "Garden Song", artist: "Phoebe Bridgers", duration: 218, mix: "daylight" },
    { id: 3, title: "Sweet Disposition", artist: "The Temper Trap", duration: 216, mix: "daylight" },
    { id: 4, title: "Pink + White", artist: "Frank Ocean", duration: 184, mix: "after-hours" },
    { id: 5, title: "My Love Mine All Mine", artist: "Mitski", duration: 137, mix: "soft-focus" },
];
const storageKey = "side-a-playlist-tracks";

const isValidTrack = (track) => {
    const validId = typeof track?.id === "string"
        ? track.id.trim().length > 0
        : Number.isSafeInteger(track?.id) && track.id > 0;
    return validId
        && typeof track.title === "string" && track.title.trim().length > 0 && track.title.length <= 100
        && typeof track.artist === "string" && track.artist.trim().length > 0 && track.artist.length <= 80
        && Number.isInteger(track.duration) && track.duration > 0 && track.duration <= 86400
        && mixIds.has(track.mix);
};

function readSavedTracks() {
    try {
        const saved = window.localStorage.getItem(storageKey);
        if (saved === null) return { tracks: seedTracks, shouldPersist: true, message: "" };

        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)
            && parsed.every(isValidTrack)
            && new Set(parsed.map((track) => track.id)).size === parsed.length) {
            return { tracks: parsed, shouldPersist: true, message: "" };
        }

        return {
            tracks: seedTracks,
            shouldPersist: false,
            message: "Saved playlist data was invalid, so the sample tracks are shown. The saved data will be replaced when you change the list.",
        };
    } catch {
        return {
            tracks: seedTracks,
            shouldPersist: false,
            message: "Browser storage could not be read. The sample tracks are shown.",
        };
    }
}

const formatTime = (seconds) => Math.floor(seconds / 60) + ":" + String(seconds % 60).padStart(2, "0");

const MusicPlaylistCurator = () => {
    const [initialData] = useState(readSavedTracks);
    const [tracks, setTracks] = useState(() => initialData.tracks);
    const [storageMessage, setStorageMessage] = useState(initialData.message);
    const [mixId, setMixId] = useState("daylight");
    const [activeTrackId, setActiveTrackId] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const [newTitle, setNewTitle] = useState("");
    const [newArtist, setNewArtist] = useState("");
    const [removing, setRemoving] = useState(null);

    useEffect(() => {
        if (!initialData.shouldPersist && tracks === initialData.tracks) return;
        try {
            window.localStorage.setItem(storageKey, JSON.stringify(tracks));
            setStorageMessage("");
        } catch {
            setStorageMessage("Playlist changes could not be saved in this browser.");
        }
    }, [initialData, tracks]);

    const mix = mixes.find((item) => item.id === mixId);
    const currentTracks = useMemo(() => tracks.filter((track) => track.mix === mixId), [tracks, mixId]);
    const currentTrack = tracks.find((track) => track.id === activeTrackId) ?? null;
    const activeTrackInMix = currentTracks.some((track) => track.id === activeTrackId);
    const progressPercent = currentTrack ? Math.min(100, Math.round((elapsed / currentTrack.duration) * 100)) : 0;

    useEffect(() => {
        if (!isPlaying || activeTrackId === null) return undefined;
        const activeTrack = tracks.find((track) => track.id === activeTrackId);
        if (!activeTrack) return undefined;

        const startedAt = Date.now() - elapsed * 1000;
        const timer = window.setInterval(() => {
            const nextElapsed = Math.floor((Date.now() - startedAt) / 1000);
            if (nextElapsed >= activeTrack.duration) {
                setElapsed(0);
                setIsPlaying(false);
                setActiveTrackId(null);
                return;
            }
            setElapsed(nextElapsed);
        }, 1000);

        return () => window.clearInterval(timer);
    }, [activeTrackId, elapsed, isPlaying, tracks]);

    const chooseMix = (id) => {
        setMixId(id);
        setActiveTrackId(null);
        setIsPlaying(false);
        setElapsed(0);
    };

    const toggleTrack = (track) => {
        if (activeTrackId === track.id) {
            setIsPlaying((playing) => !playing);
            return;
        }
        setActiveTrackId(track.id);
        setElapsed(0);
        setIsPlaying(true);
    };

    const playMix = () => {
        if (activeTrackInMix) {
            setIsPlaying((playing) => !playing);
            return;
        }
        const firstTrack = currentTracks[0];
        if (!firstTrack) return;
        setActiveTrackId(firstTrack.id);
        setElapsed(0);
        setIsPlaying(true);
    };

    const addTrack = (event) => {
        event.preventDefault();
        const title = newTitle.trim();
        const artist = newArtist.trim();
        if (!title || !artist) return;

        const id = typeof window.crypto?.randomUUID === "function"
            ? window.crypto.randomUUID()
            : String(Date.now()) + "-" + Math.random().toString(36).slice(2);
        setTracks((current) => [...current, { id, title, artist, duration: 210, mix: mixId }]);
        setNewTitle("");
        setNewArtist("");
    };

    const reorder = (index, offset) => setTracks((current) => {
        const subset = current.filter((track) => track.mix === mixId);
        const next = index + offset;
        if (next < 0 || next >= subset.length) return current;
        const [moved] = subset.splice(index, 1);
        subset.splice(next, 0, moved);
        let itemIndex = -1;
        return current.map((track) => track.mix === mixId ? subset[++itemIndex] : track);
    });

    const removeTrack = () => {
        if (!removing) return;
        if (activeTrackId === removing.id) {
            setActiveTrackId(null);
            setIsPlaying(false);
            setElapsed(0);
        }
        setTracks((current) => current.filter((track) => track.id !== removing.id));
        setRemoving(null);
    };

    const playPrevious = () => {
        if (currentTrack && activeTrackInMix && elapsed > 3) {
            setElapsed(0);
            setIsPlaying(true);
            return;
        }
        const position = currentTracks.findIndex((track) => track.id === activeTrackId);
        const previousTrack = currentTracks[Math.max(0, position - 1)] ?? currentTracks[0];
        if (!previousTrack) return;
        setActiveTrackId(previousTrack.id);
        setElapsed(0);
        setIsPlaying(true);
    };

    const playNext = () => {
        const position = currentTracks.findIndex((track) => track.id === activeTrackId);
        const nextTrack = currentTracks[position + 1] ?? (position < 0 ? currentTracks[0] : null);
        if (!nextTrack) return;
        setActiveTrackId(nextTrack.id);
        setElapsed(0);
        setIsPlaying(true);
    };

    return <div className={styles.workspace} id="playlist">
        <header className={styles.pageHead}>
            <div>
                <p className={styles.overline}>Your listening room</p>
                <h1>Make a good mix.</h1>
                <p>A small playlist you can shape to fit the moment.</p>
            </div>
            <span className={styles.trackTotal}>{tracks.length} tracks saved</span>
        </header>
        <div className={styles.playerShell}>
            <aside className={styles.library} id="library" aria-label="Your playlists">
                <div className={styles.libraryTitle}><span>Your playlists</span></div>
                {mixes.map((item) => <button key={item.id} type="button" onClick={() => chooseMix(item.id)} className={mixId === item.id ? styles.activeMix : ""} aria-pressed={mixId === item.id}>
                    <span className={styles.mixDot + " " + styles[item.tone]} aria-hidden="true" />
                    <span><strong>{item.name}</strong><small>{tracks.filter((track) => track.mix === item.id).length} songs</small></span>
                </button>)}
            </aside>
            <div className={styles.mainPanel}>
                <section className={styles.mixHero} aria-labelledby="mix-title">
                    <div className={styles.recordArt + " " + styles[mix.tone]} aria-hidden="true"><i /><b /></div>
                    <div className={styles.mixInfo}>
                        <span>PLAYLIST / {currentTracks.length} TRACKS</span>
                        <h2 id="mix-title">{mix.name}</h2>
                        <p>{mix.detail}</p>
                        <div className={styles.mixTags}><span>Made by you</span><span>{Math.max(1, Math.round(currentTracks.reduce((sum, track) => sum + track.duration, 0) / 60))} min</span></div>
                    </div>
                    <button className={styles.playMix} type="button" onClick={playMix} aria-label={isPlaying && activeTrackInMix ? "Pause playlist" : "Play playlist"}>
                        {isPlaying && activeTrackInMix ? <FiPause aria-hidden="true" /> : <FiPlay aria-hidden="true" />}
                    </button>
                </section>
                <section className={styles.trackSection} aria-labelledby="track-list-heading">
                    <div className={styles.trackHeading}>
                        <div><h2 id="track-list-heading" tabIndex="-1">Track list</h2><p>Shape the order and press play when you’re ready.</p></div>
                        <span>ORDER / TITLE</span>
                    </div>
                    <div className={styles.trackTable}>
                        {currentTracks.map((track, index) => <article key={track.id} className={activeTrackId === track.id ? styles.activeTrack : styles.trackRow}>
                            <button className={styles.trackPlay} type="button" onClick={() => toggleTrack(track)} aria-label={(isPlaying && activeTrackId === track.id ? "Pause " : "Play ") + track.title}>
                                {isPlaying && activeTrackId === track.id ? <FiPause aria-hidden="true" /> : <FiPlay aria-hidden="true" />}
                            </button>
                            <span className={styles.trackNumber} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                            <div className={styles.trackText}><strong>{track.title}</strong><span>{track.artist}</span></div>
                            <span className={styles.duration}>{formatTime(track.duration)}</span>
                            <div className={styles.orderButtons}>
                                <button type="button" aria-label={"Move " + track.title + " up"} onClick={() => reorder(index, -1)} disabled={index === 0}><FiChevronUp aria-hidden="true" /></button>
                                <button type="button" aria-label={"Move " + track.title + " down"} onClick={() => reorder(index, 1)} disabled={index === currentTracks.length - 1}><FiChevronDown aria-hidden="true" /></button>
                            </div>
                            <button className={styles.removeTrack} type="button" aria-label={"Remove " + track.title} onClick={() => setRemoving(track)}><FiTrash2 aria-hidden="true" /></button>
                        </article>)}
                    </div>
                    {!currentTracks.length && <p className={styles.noTracks}>This playlist is waiting for its first song.</p>}
                    <form className={styles.addTrack} onSubmit={addTrack}>
                        <label htmlFor="track-title"><span>Song title</span><input id="track-title" name="title" value={newTitle} onChange={(event) => setNewTitle(event.target.value)} placeholder="Add a song" maxLength={100} required /></label>
                        <label htmlFor="track-artist"><span>Artist</span><input id="track-artist" name="artist" value={newArtist} onChange={(event) => setNewArtist(event.target.value)} placeholder="Artist name" maxLength={80} required /></label>
                        <button type="submit"><FiPlus aria-hidden="true" /> Add track</button>
                    </form>
                    {storageMessage && <p className={styles.storageMessage} role="status">{storageMessage}</p>}
                </section>
                <footer className={styles.nowPlaying} aria-label="Playback controls">
                    <div className={styles.nowIcon} aria-hidden="true"><span>{currentTrack ? currentTrack.title.slice(0, 1) : "A"}</span></div>
                    <div className={styles.nowText}>
                        <small>{isPlaying ? "NOW PLAYING" : currentTrack ? "PAUSED" : "READY WHEN YOU ARE"}</small>
                        <strong>{currentTrack?.title ?? mix.name}</strong>
                        <span>{currentTrack?.artist ?? "Choose a track to begin"}</span>
                    </div>
                    <div className={styles.progress}>
                        <div role="progressbar" aria-label="Playback progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPercent} aria-valuetext={currentTrack ? formatTime(elapsed) + " of " + formatTime(currentTrack.duration) : "No track selected"}>
                            <span style={{ width: progressPercent + "%" }} />
                        </div>
                        <small>{formatTime(elapsed)} / {formatTime(currentTrack?.duration ?? 0)}</small>
                    </div>
                    <div className={styles.transport}>
                        <button type="button" aria-label="Previous track" onClick={playPrevious}><FiSkipBack aria-hidden="true" /></button>
                        <button type="button" aria-label={isPlaying ? "Pause track" : "Play track"} onClick={() => currentTrack ? toggleTrack(currentTrack) : playNext()}>
                            {isPlaying ? <FiPause aria-hidden="true" /> : <FiPlay aria-hidden="true" />}
                        </button>
                        <button type="button" aria-label="Next track" onClick={playNext}><FiSkipForward aria-hidden="true" /></button>
                    </div>
                </footer>
            </div>
        </div>
        {removing && <ConfirmDialog title="Remove this track?" description={removing.title + " will be removed from " + mix.name + "."} confirmLabel="Remove track" onCancel={() => setRemoving(null)} onConfirm={removeTrack} />}
    </div>;
};

export default MusicPlaylistCurator;
