import { useEffect, useMemo, useState } from "react";
import { FiChevronDown, FiChevronUp, FiPause, FiPlay, FiPlus, FiSkipBack, FiSkipForward, FiTrash2 } from "react-icons/fi";
import ConfirmDialog from "../confirmDialog/index.jsx";
import styles from "./styles.module.css";

const mixes = [
    { id: "daylight", name: "Late daylight", detail: "A little lift for the drive home", tone: "citrus" },
    { id: "after-hours", name: "After hours", detail: "For the last train and the long way back", tone: "plum" },
    { id: "soft-focus", name: "Soft focus", detail: "A quiet room, no rush", tone: "sky" },
];
const seedTracks = [
    { id: 1, title: "Dreams", artist: "Fleetwood Mac", duration: 257, mix: "daylight" },
    { id: 2, title: "Garden Song", artist: "Phoebe Bridgers", duration: 218, mix: "daylight" },
    { id: 3, title: "Sweet Disposition", artist: "The Temper Trap", duration: 216, mix: "daylight" },
    { id: 4, title: "Pink + White", artist: "Frank Ocean", duration: 184, mix: "after-hours" },
    { id: 5, title: "My Love Mine All Mine", artist: "Mitski", duration: 137, mix: "soft-focus" },
];
const storageKey = "side-a-playlist-tracks";
const formatTime = (seconds) => Math.floor(seconds / 60) + ":" + String(seconds % 60).padStart(2, "0");

const MusicPlaylistCurator = () => {
    const [tracks, setTracks] = useState(() => { try { return JSON.parse(localStorage.getItem(storageKey)) ?? seedTracks; } catch { return seedTracks; } });
    const [mixId, setMixId] = useState("daylight");
    const [playingId, setPlayingId] = useState(null);
    const [elapsed, setElapsed] = useState(0);
    const [newTitle, setNewTitle] = useState("");
    const [newArtist, setNewArtist] = useState("");
    const [removing, setRemoving] = useState(null);
    useEffect(() => localStorage.setItem(storageKey, JSON.stringify(tracks)), [tracks]);
    const mix = mixes.find((item) => item.id === mixId);
    const currentTracks = useMemo(() => tracks.filter((track) => track.mix === mixId), [tracks, mixId]);
    const currentTrack = tracks.find((track) => track.id === playingId);
    useEffect(() => {
        if (!playingId) return undefined;
        const timer = window.setInterval(() => setElapsed((value) => {
            const duration = tracks.find((track) => track.id === playingId)?.duration ?? 1;
            if (value + 1 >= duration) { setPlayingId(null); return 0; }
            return value + 1;
        }), 1000);
        return () => window.clearInterval(timer);
    }, [playingId, tracks]);
    const chooseMix = (id) => { setMixId(id); setPlayingId(null); setElapsed(0); };
    const toggleTrack = (track) => { if (playingId === track.id) setPlayingId(null); else { setPlayingId(track.id); setElapsed(0); } };
    const addTrack = (event) => { event.preventDefault(); const title = newTitle.trim(); const artist = newArtist.trim(); if (!title || !artist) return; setTracks((current) => [...current, { id: Date.now(), title, artist, duration: 210, mix: mixId }]); setNewTitle(""); setNewArtist(""); };
    const reorder = (index, offset) => setTracks((current) => {
        const subset = current.filter((track) => track.mix === mixId);
        const next = index + offset;
        if (next < 0 || next >= subset.length) return current;
        const [moved] = subset.splice(index, 1);
        subset.splice(next, 0, moved);
        let itemIndex = -1;
        return current.map((track) => track.mix === mixId ? subset[++itemIndex] : track);
    });
    const removeTrack = () => { if (playingId === removing.id) setPlayingId(null); setTracks((current) => current.filter((track) => track.id !== removing.id)); setRemoving(null); };

    return <div className={styles.workspace} id="playlist">
        <header className={styles.pageHead}><div><p className={styles.overline}>Your listening room</p><h1>Make a good mix.</h1><p>A small playlist you can shape to fit the moment.</p></div><span className={styles.trackTotal}>{tracks.length} tracks saved</span></header>
        <div className={styles.playerShell}>
            <aside className={styles.library} id="library"><div className={styles.libraryTitle}><span>Your playlists</span><FiChevronDown aria-hidden="true" /></div>{mixes.map((item) => <button key={item.id} type="button" onClick={() => chooseMix(item.id)} className={mixId === item.id ? styles.activeMix : ""} aria-pressed={mixId === item.id}><span className={styles.mixDot + " " + styles[item.tone]} /><span><strong>{item.name}</strong><small>{tracks.filter((track) => track.mix === item.id).length} songs</small></span></button>)}</aside>
            <main className={styles.mainPanel}>
                <section className={styles.mixHero}>
                    <div className={styles.recordArt + " " + styles[mix.tone]} aria-hidden="true"><i /><b /></div>
                    <div className={styles.mixInfo}><span>PLAYLIST / {currentTracks.length} TRACKS</span><h2>{mix.name}</h2><p>{mix.detail}</p><div className={styles.mixTags}><span>Made by you</span><span>{Math.max(1, Math.round(currentTracks.reduce((sum, track) => sum + track.duration, 0) / 60))} min</span></div></div>
                    <button className={styles.playMix} type="button" onClick={() => currentTracks[0] && toggleTrack(currentTracks[0])} aria-label={playingId ? "Pause playlist" : "Play playlist"}>{playingId ? <FiPause aria-hidden="true" /> : <FiPlay aria-hidden="true" />}</button>
                </section>
                <section className={styles.trackSection}>
                    <div className={styles.trackHeading}><div><h2>Track list</h2><p>Shape the order and press play when you’re ready.</p></div><span>ORDER / TITLE</span></div>
                    <div className={styles.trackTable}>{currentTracks.map((track, index) => <article key={track.id} className={playingId === track.id ? styles.activeTrack : styles.trackRow}>
                        <button className={styles.trackPlay} type="button" onClick={() => toggleTrack(track)} aria-label={(playingId === track.id ? "Pause " : "Play ") + track.title}>{playingId === track.id ? <FiPause /> : <FiPlay />}</button>
                        <span className={styles.trackNumber}>{String(index + 1).padStart(2, "0")}</span>
                        <div className={styles.trackText}><strong>{track.title}</strong><span>{track.artist}</span></div>
                        <span className={styles.duration}>{formatTime(track.duration)}</span>
                        <div className={styles.orderButtons}><button type="button" aria-label={"Move " + track.title + " up"} onClick={() => reorder(index, -1)} disabled={index === 0}><FiChevronUp /></button><button type="button" aria-label={"Move " + track.title + " down"} onClick={() => reorder(index, 1)} disabled={index === currentTracks.length - 1}><FiChevronDown /></button></div>
                        <button className={styles.removeTrack} type="button" aria-label={"Remove " + track.title} onClick={() => setRemoving(track)}><FiTrash2 /></button>
                    </article>)}</div>
                    {!currentTracks.length && <p className={styles.noTracks}>This playlist is waiting for its first song.</p>}
                    <form className={styles.addTrack} onSubmit={addTrack}><label><span>Song title</span><input value={newTitle} onChange={(event) => setNewTitle(event.target.value)} placeholder="Add a song" /></label><label><span>Artist</span><input value={newArtist} onChange={(event) => setNewArtist(event.target.value)} placeholder="Artist name" /></label><button type="submit"><FiPlus /> Add track</button></form>
                </section>
                <footer className={styles.nowPlaying}><div className={styles.nowIcon}><span>{currentTrack ? currentTrack.title.slice(0, 1) : "A"}</span></div><div className={styles.nowText}><small>{playingId ? "NOW PLAYING" : "READY WHEN YOU ARE"}</small><strong>{currentTrack?.title ?? mix.name}</strong><span>{currentTrack?.artist ?? "Choose a track to begin"}</span></div><div className={styles.progress}><div><span style={{ width: currentTrack ? (elapsed / currentTrack.duration * 100) + "%" : "0%" }} /></div><small>{formatTime(elapsed)} / {formatTime(currentTrack?.duration ?? 0)}</small></div><div className={styles.transport}><button type="button" aria-label="Previous track" onClick={() => currentTracks[0] && toggleTrack(currentTracks[0])}><FiSkipBack /></button><button type="button" aria-label={playingId ? "Pause track" : "Play track"} onClick={() => currentTrack ? toggleTrack(currentTrack) : currentTracks[0] && toggleTrack(currentTracks[0])}>{playingId ? <FiPause /> : <FiPlay />}</button><button type="button" aria-label="Next track" onClick={() => { const position = currentTracks.findIndex((track) => track.id === playingId); if (currentTracks[position + 1]) toggleTrack(currentTracks[position + 1]); }}><FiSkipForward /></button></div></footer>
            </main>
        </div>
        {removing && <ConfirmDialog title="Remove this track?" description={removing.title + " will be removed from " + mix.name + "."} confirmLabel="Remove track" onCancel={() => setRemoving(null)} onConfirm={removeTrack} />}
    </div>;
};

export default MusicPlaylistCurator;
