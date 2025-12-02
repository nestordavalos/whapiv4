import { Tooltip, makeStyles } from "@material-ui/core";
import SpeedIcon from "@material-ui/icons/Speed";

import React, { useRef, useEffect, useState } from "react";

const LS_NAME = 'audioMessageRate';

// Velocidades disponibles para el audio
const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

const useStyles = makeStyles((theme) => ({
    audioContainer: {
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
    },
    audioElement: {
        marginBottom: "4px",
    },
    speedControls: {
        display: "flex",
        alignItems: "center",
        gap: "4px",
        marginLeft: "8px",
    },
    speedButton: {
        minWidth: "auto",
        height: "22px",
        padding: "2px 8px",
        fontSize: "11px",
        fontWeight: "bold",
        borderRadius: "11px",
        backgroundColor: "#075e54",
        color: "#fff",
        border: "none",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.2s ease",
        "&:hover": {
            backgroundColor: "#128c7e",
            transform: "scale(1.05)",
        },
    },
    speedButtonActive: {
        backgroundColor: "#25D366",
        "&:hover": {
            backgroundColor: "#20ba5a",
        },
    },
    speedIcon: {
        fontSize: "12px",
        marginRight: "3px",
    },
    speedText: {
        fontSize: "10px",
        fontWeight: 600,
    },
    speedLabel: {
        fontSize: "10px",
        color: theme.palette.text.secondary,
        marginLeft: "4px",
    },
}));

export default function Audio({ url }) {
    const classes = useStyles();
    const audioRef = useRef(null);
    const [audioRate, setAudioRate] = useState(parseFloat(localStorage.getItem(LS_NAME) || "1"));
    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.playbackRate = audioRate;
            localStorage.setItem(LS_NAME, audioRate.toString());
        }
    }, [audioRate]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);
        const handleEnded = () => setIsPlaying(false);

        audio.addEventListener('playing', handlePlay);
        audio.addEventListener('pause', handlePause);
        audio.addEventListener('ended', handleEnded);

        return () => {
            audio.removeEventListener('playing', handlePlay);
            audio.removeEventListener('pause', handlePause);
            audio.removeEventListener('ended', handleEnded);
        };
    }, []);

    const cycleRate = () => {
        const currentIndex = PLAYBACK_RATES.indexOf(audioRate);
        const nextIndex = (currentIndex + 1) % PLAYBACK_RATES.length;
        setAudioRate(PLAYBACK_RATES[nextIndex]);
    };

    const getSpeedLabel = (rate) => {
        return `${rate}x`;
    };

    const getSpeedTooltip = () => {
        const currentIndex = PLAYBACK_RATES.indexOf(audioRate);
        const nextIndex = (currentIndex + 1) % PLAYBACK_RATES.length;
        const nextRate = PLAYBACK_RATES[nextIndex];
        return `Click para cambiar a ${getSpeedLabel(nextRate)}`;
    };

    return (
        <div className={classes.audioContainer}>
            <audio ref={audioRef} controls className={classes.audioElement}>
                <source src={url} type="audio/ogg"></source>
            </audio>
            <div className={classes.speedControls}>
                <Tooltip title={getSpeedTooltip()} arrow placement="bottom">
                    <button
                        className={`${classes.speedButton} ${isPlaying ? classes.speedButtonActive : ''}`}
                        onClick={cycleRate}
                    >
                        <SpeedIcon className={classes.speedIcon} />
                        <span className={classes.speedText}>{getSpeedLabel(audioRate)}</span>
                    </button>
                </Tooltip>
                <span className={classes.speedLabel}>velocidad</span>
            </div>
        </div>
    );
}