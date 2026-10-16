// store/slices/audioSlice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface DownloadState {
  url: string | null;
  progress: number; // 0 - 100
  status: "idle" | "downloading" | "completed" | "failed";
}

interface QueueTrack {
  id: string;
  url: string;
  title: string;
  artist: string;
  coverUrl: string;
}

interface AudioState {
  currentTrack: string | null;
  isPlaying: boolean;
  volume: number;
  queue: QueueTrack[];
  queueIndex: number;
  download: DownloadState;
}

const initialState: AudioState = {
  currentTrack: null,
  isPlaying: false,
  volume: 1,
  queue: [],
  queueIndex: 0,
  download: {
    url: null,
    progress: 0,
    status: "idle",
  },
};

const audioSlice = createSlice({
  name: "audio",
  initialState,
  reducers: {
    setTrack: (state, action: PayloadAction<string>) => {
      state.currentTrack = action.payload;
      state.isPlaying = true;
    },
    playQueue: (
      state,
      action: PayloadAction<{ tracks: QueueTrack[]; startIndex?: number }>
    ) => {
      const { tracks, startIndex = 0 } = action.payload;
      state.queue = tracks;
      state.queueIndex = Math.min(Math.max(startIndex, 0), Math.max(tracks.length - 1, 0));
      state.currentTrack = tracks[state.queueIndex]?.url ?? null;
      state.isPlaying = tracks.length > 0;
    },
    play: (state) => {
      state.isPlaying = true;
    },
    pause: (state) => {
      state.isPlaying = false;
    },
    setVolume: (state, action: PayloadAction<number>) => {
      state.volume = action.payload;
    },

    // download actions
    startDownload: (state, action: PayloadAction<string>) => {
      state.download = {
        url: action.payload,
        progress: 0,
        status: "downloading",
      };
    },
    updateProgress: (state, action: PayloadAction<number>) => {
      state.download.progress = action.payload;
    },
    completeDownload: (state) => {
      state.download.status = "completed";
    },
    failDownload: (state) => {
      state.download.status = "failed";
    },
    resetDownload: (state) => {
      state.download = {
        url: null,
        progress: 0,
        status: "idle",
      };
    },
  },
});

export const {
  setTrack,
  playQueue,
  play,
  pause,
  setVolume,
  startDownload,
  updateProgress,
  completeDownload,
  failDownload,
  resetDownload,
} = audioSlice.actions;

export default audioSlice.reducer;
