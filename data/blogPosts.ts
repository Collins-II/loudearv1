// Single source of truth for the editorial section (index, article pages, home teaser).
// Replace with a CMS/database query later; the helpers below are the only access points the pages use.
// Body copy supports "## " lines as subheadings.

export const blogCategories = [
  "HIP HOP",
  "AFROBEATS",
  "NEW MUSIC",
  "CHARTS",
  "SPOTLIGHT",
  "FEATURES",
  "CULTURE",
  "EVENTS",
] as const;

export type BlogCategory = (typeof blogCategories)[number];

export interface BlogPost {
  id: number;
  title: string;
  excerpt: string;
  image: string;
  date: Date;
  author: string;
  category: BlogCategory;
  tags: string[];
  content: string[];
}

export const blogPosts: BlogPost[] = [
  {
    id: 1,
    title: "Cleo Ice Queen Drops New Single ‘Power’",
    excerpt:
      "The hip hop queen returns with a bold anthem set to dominate the charts this Friday.",
    image: "/assets/images/cleo-blog01.jpg",
    date: new Date("2026-10-15"),
    author: "LoudEar Editorial",
    category: "HIP HOP",
    tags: ["Cleo Ice Queen", "New Single", "Zambian Hip Hop"],
    content: [
      "Cleo Ice Queen is back with “Power”, a single that pairs sharp hip hop delivery with Afrobeat-leaning percussion and an unapologetic message of self-belief.",
      "The record lands as the latest chapter in a run that has kept her at the centre of the conversation around Zambian rap. It is built for both the club and the car: a heavy low end, a hook that sticks, and verses that leave room for the lyrics to breathe.",
      "## Why it matters",
      "Female voices in hip hop continue to push the genre’s sound forward across the continent. “Power” is a confident entry in that conversation and a reminder that the scene is deeper than any single release cycle.",
      "Stream “Power” on LoudEar and tell us where it lands on your playlist this week.",
    ],
  },
  {
    id: 2,
    title: "Top 10 Rising African Artists to Watch",
    excerpt:
      "From Afrobeat to Hip Hop, here are the hottest acts shaping the future of music.",
    image: "/assets/images/yomaps-03.jpg",
    date: new Date("2026-10-13"),
    author: "LoudEar Team",
    category: "SPOTLIGHT",
    tags: ["Rising Artists", "Africa", "Discovery"],
    content: [
      "African music keeps producing new stars faster than any playlist can keep up with. This list is a starting point for the names our editors keep seeing on the rise.",
      "## What we look for",
      "We weigh momentum, originality and the strength of a body of work over a single viral moment. Streams matter, but so do live shows, collaborations and the way an artist builds a community around their sound.",
      "Follow the artists you like on LoudEar and add their tracks to a playlist so you never miss the next release.",
    ],
  },
  {
    id: 3,
    title: "Inside the Studio: Rich Bizzy’s Creative Process",
    excerpt:
      "Go behind the scenes with one of Zambia’s most celebrated hitmakers.",
    image: "/assets/images/bizzy07.jpg",
    date: new Date("2026-10-11"),
    author: "LoudEar Features",
    category: "FEATURES",
    tags: ["Rich Bizzy", "Studio", "Behind the Scenes"],
    content: [
      "Every hit starts as an idea in a quiet room. This feature looks at how a record moves from a rough sketch to a finished song and the habits that keep a hitmaker consistent.",
      "## From idea to record",
      "Writing, recording and refining a song is rarely linear. Producers and artists alike describe a loop of drafting, stepping away and returning with fresh ears.",
      "Watch for more studio stories from across the scene in the coming weeks.",
    ],
  },
  {
    id: 4,
    title: "Global Chart Movers of the Week",
    excerpt:
      "Discover the tracks that climbed fastest across the world in this week’s charts.",
    image: "/assets/images/yomaps-02.jpg",
    date: new Date("2026-10-09"),
    author: "Charts Desk",
    category: "CHARTS",
    tags: ["Charts", "Weekly Movers", "Streaming"],
    content: [
      "Each week the charts reshuffle, and the biggest climbers often tell a better story than the number-one spot. Here is what moved the most.",
      "## How we track movement",
      "Our weekly ranking compares plays, likes and shares against the previous week, so a fast riser can overtake an established hit.",
      "Open the LoudEar charts to see the full ranking and filter by songs, albums or videos.",
    ],
  },
  {
    id: 5,
    title: "Friday’s Power Acts You Need to Hear",
    excerpt:
      "These artists are redefining the sound of the weekend with fresh drops.",
    image: "/assets/images/yomaps-01.jpg",
    date: new Date("2026-10-08"),
    author: "Editorial Picks",
    category: "NEW MUSIC",
    tags: ["New Music Friday", "Playlist", "Fresh Drops"],
    content: [
      "New music lands every Friday, and not all of it deserves your attention. Our editors cut through the noise with the releases worth pressing play on first.",
      "## This week’s approach",
      "We favour records with a clear identity: a distinctive voice, a memorable hook or a production choice you have not heard before.",
      "Save your favourites to a playlist and come back Monday to see what stuck.",
    ],
  },
  {
    id: 6,
    title: "Zambia’s Afrobeats Stars Shining Globally",
    excerpt:
      "The Afrobeats wave is putting Zambia on the world map with chart-ready bangers.",
    image: "/assets/images/cleo-03.jpg",
    date: new Date("2026-10-06"),
    author: "World Beats",
    category: "AFROBEATS",
    tags: ["Afrobeats", "Zambia", "Global Sound"],
    content: [
      "Afrobeats is no longer a regional story. Artists across Southern Africa are blending local language, rhythm and street culture into records that travel.",
      "## A sound with local roots",
      "What makes the new wave different is its refusal to copy a template. Zambian artists are layering their own languages and rhythms over familiar grooves.",
      "Explore the genre on LoudEar and discover the names behind the sound.",
    ],
  },
  {
    id: 7,
    title: "Street Style Report: What the Scene Is Wearing",
    excerpt:
      "Fashion and music have always moved together. Here is how artists are dressing the moment.",
    image: "/assets/images/cleo-07.jpg",
    date: new Date("2026-10-04"),
    author: "Culture Desk",
    category: "CULTURE",
    tags: ["Fashion", "Street Style", "Culture"],
    content: [
      "From stage fits to video wardrobes, style is part of how an artist tells their story. This report looks at the trends showing up across the scene.",
      "## Looks that define an era",
      "Bold colour, tailored streetwear and local fabrics keep reappearing, a sign that artists are as invested in their image as in their sound.",
      "Tag LoudEar with your own scene fits and we may feature them.",
    ],
  },
  {
    id: 8,
    title: "Live Nights: The Shows Worth Planning Around",
    excerpt:
      "From intimate sets to festival stages, the live calendar is heating up.",
    image: "/assets/images/stage-01.jpg",
    date: new Date("2026-10-02"),
    author: "Events Desk",
    category: "EVENTS",
    tags: ["Live Music", "Concerts", "Events"],
    content: [
      "Nothing replaces a live crowd. The live calendar keeps growing, and these are the nights our editors would plan a week around.",
      "## Getting the most from a show",
      "Arrive early for support acts, follow the artists on LoudEar for set announcements and check venue details ahead of time.",
      "Check back often as new dates are confirmed.",
    ],
  },
  {
    id: 9,
    title: "The Producer’s Seat: Beats Shaping the Sound",
    excerpt:
      "Behind every anthem is a producer. We look at the beat-makers setting the tone.",
    image: "/assets/images/bizzylive01.jpg",
    date: new Date("2026-09-29"),
    author: "LoudEar Features",
    category: "HIP HOP",
    tags: ["Producers", "Beats", "Hip Hop"],
    content: [
      "A great beat can carry a record before a single word is sung. Producers are the quiet architects of the sound, and their influence keeps growing.",
      "## Sound design as identity",
      "The producers getting the most attention are the ones with a recognisable signature, whether that is a drum pattern, a sample choice or a mixing style.",
      "Browse producers and their releases on LoudEar to find your next favourite sound.",
    ],
  },
];

export function getPostById(id: number): BlogPost | undefined {
  return blogPosts.find((post) => post.id === id);
}

export function getRelatedPosts(post: BlogPost, limit = 3): BlogPost[] {
  const score = (candidate: BlogPost) =>
    (candidate.category === post.category ? 2 : 0) +
    candidate.tags.filter((tag) => post.tags.includes(tag)).length;
  return blogPosts
    .filter((candidate) => candidate.id !== post.id)
    .sort((a, b) => score(b) - score(a) || b.date.getTime() - a.date.getTime())
    .slice(0, limit);
}

export function getAdjacentPosts(post: BlogPost) {
  const index = blogPosts.findIndex((candidate) => candidate.id === post.id);
  return {
    newer: index > 0 ? blogPosts[index - 1] : undefined,
    older: index < blogPosts.length - 1 ? blogPosts[index + 1] : undefined,
  };
}

export function getReadingTime(post: BlogPost): number {
  const words = post.content.join(" ").split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

export function formatPostDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
