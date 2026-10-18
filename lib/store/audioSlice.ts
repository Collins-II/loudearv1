// store/slices/audioSlice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface DownloadState {
  url: string | null;
  progress: number; // 0 - 100
  status: "idle" | "downloading" | "completed" | "failed";
}

export type RepeatMode = "off" | "all" | "one";

export interface QueueTrack {
  id: string;
  url: string;
  title: string;
  artist: string;
  coverUrl: string;
  model?: "Song" | "Video";
}

interface AudioState {
  currentTrack: string | null;
  isPlaying: boolean;
  volume: number;
  muted: boolean;
  playbackRate: number;
  shuffle: boolean;
  repeat: RepeatMode;
  queue: QueueTrack[];
  queueIndex: number;
  history: number[];
  download: DownloadState;
}

const initialState: AudioState = {
  currentTrack: null,
  isPlaying: false,
  volume: 1,
  muted: false,
  playbackRate: 1,
  shuffle: false,
  repeat: "off",
  queue: [],
  queueIndex: 0,
  history: [],
  download: {
    url: null,
    progress: 0,
    status: "idle",
  },
};

function goTo(state: AudioState, index: number, pushHistory = true) {
  if (pushHistory && state.queue[state.queueIndex]) {
    state.history = [...state.history.slice(-49), state.queueIndex];
  }
  state.queueIndex = index;
  state.currentTrack = state.queue[index]?.url ?? null;
}

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
      state.history = [];
      state.queueIndex = Math.min(Math.max(startIndex, 0), Math.max(tracks.length - 1, 0));
      state.currentTrack = tracks[state.queueIndex]?.url ?? null;
      state.isPlaying = tracks.length > 0;
    },
    // Restores a saved session without starting playback
    hydrate: (
      state,
      action: PayloadAction<
        Partial<Pick<AudioState, "queue" | "queueIndex" | "volume" | "muted" | "playbackRate" | "shuffle" | "repeat">>
      >
    ) => {
      const { queue, queueIndex, ...rest } = action.payload;
      Object.assign(state, rest);
      if (queue?.length) {
        state.queue = queue;
        state.queueIndex = Math.min(Math.max(queueIndex ?? 0, 0), queue.length - 1);
        state.currentTrack = queue[state.queueIndex].url;
      }
      state.isPlaying = false;
    },
    play: (state) => {
      state.isPlaying = state.currentTrack !== null;
    },
    pause: (state) => {
      state.isPlaying = false;
    },
    togglePlay: (state) => {
      state.isPlaying = state.currentTrack !== null && !state.isPlaying;
    },
    setVolume: (state, action: PayloadAction<number>) => {
      state.volume = Math.min(Math.max(action.payload, 0), 1);
      if (state.volume > 0) state.muted = false;
    },
    toggleMute: (state) => {
      state.muted = !state.muted;
    },
    setPlaybackRate: (state, action: PayloadAction<number>) => {
      state.playbackRate = action.payload;
    },
    toggleShuffle: (state) => {
      state.shuffle = !state.shuffle;
    },
    cycleRepeat: (state) => {
      state.repeat = state.repeat === "off" ? "all" : state.repeat === "all" ? "one" : "off";
    },
    next: (state, action: PayloadAction<{ auto?: boolean } | undefined>) => {
      const len = state.queue.length;
      if (!len) return;
      if (action.payload?.auto && state.repeat === "one") return;
      if (state.shuffle && len > 1) {
        let i = state.queueIndex;
        while (i === state.queueIndex) i = Math.floor(Math.random() * len);
        goTo(state, i);
        state.isPlaying = true;
        return;
      }
      if (state.queueIndex < len - 1) {
        goTo(state, state.queueIndex + 1);
        state.isPlaying = true;
      } else if (state.repeat === "all" || !action.payload?.auto) {
        goTo(state, 0);
        state.isPlaying = true;
      } else {
        state.isPlaying = false;
      }
    },
    previous: (state) => {
      if (!state.queue.length) return;
      const last = state.history[state.history.length - 1];
      if (state.shuffle && last !== undefined && state.queue[last]) {
        state.history = state.history.slice(0, -1);
        goTo(state, last, false);
      } else {
        goTo(state, state.queueIndex > 0 ? state.queueIndex - 1 : state.queue.length - 1, false);
      }
      state.isPlaying = true;
    },
    jumpTo: (state, action: PayloadAction<number>) => {
      if (!state.queue[action.payload]) return;
      goTo(state, action.payload);
      state.isPlaying = true;
    },
    addToQueue: (state, action: PayloadAction<QueueTrack | QueueTrack[]>) => {
      const incoming = Array.isArray(action.payload) ? action.payload : [action.payload];
      const wasEmpty = state.queue.length === 0;
      state.queue.push(...incoming);
      if (wasEmpty && incoming.length) {
        state.queueIndex = 0;
        state.currentTrack = incoming[0].url;
        state.isPlaying = true;
      }
    },
    playNext: (state, action: PayloadAction<QueueTrack>) => {
      if (!state.queue.length) {
        state.queue = [action.payload];
        state.queueIndex = 0;
        state.currentTrack = action.payload.url;
        state.isPlaying = true;
        return;
      }
      state.queue.splice(state.queueIndex + 1, 0, action.payload);
    },
    removeFromQueue: (state, action: PayloadAction<number>) => {
      const i = action.payload;
      if (!state.queue[i]) return;
      state.queue.splice(i, 1);
      state.history = [];
      if (!state.queue.length) {
        state.currentTrack = null;
        state.isPlaying = false;
        state.queueIndex = 0;
      } else if (i < state.queueIndex) {
        state.queueIndex -= 1;
      } else if (i === state.queueIndex) {
        state.queueIndex = Math.min(i, state.queue.length - 1);
        state.currentTrack = state.queue[state.queueIndex].url;
      }
    },
    moveInQueue: (state, action: PayloadAction<{ from: number; to: number }>) => {
      const { from, to } = action.payload;
      if (!state.queue[from] || to < 0 || to >= state.queue.length || from === to) return;
      const [item] = state.queue.splice(from, 1);
      state.queue.splice(to, 0, item);
      state.history = [];
      if (state.queueIndex === from) state.queueIndex = to;
      else if (from < state.queueIndex && to >= state.queueIndex) state.queueIndex -= 1;
      else if (from > state.queueIndex && to <= state.queueIndex) state.queueIndex += 1;
    },
    clearPlayer: (state) => {
      state.queue = [];
      state.queueIndex = 0;
      state.history = [];
      state.currentTrack = null;
      state.isPlaying = false;
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
  togglePlay,
  setVolume,
  toggleMute,
  setPlaybackRate,
  toggleShuffle,
  cycleRepeat,
  next,
  previous,
  jumpTo,
  addToQueue,
  playNext,
  removeFromQueue,
  moveInQueue,
  clearPlayer,
  hydrate,
  startDownload,
  updateProgress,
  completeDownload,
  failDownload,
  resetDownload,
} = audioSlice.actions;

export default audioSlice.reducer;
