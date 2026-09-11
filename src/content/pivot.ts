export type PivotKind =
  | "username"
  | "platform"
  | "profile"
  | "post"
  | "link"
  | "target"
  | "dead";

export type PivotNode = {
  id: string;
  label: string;
  kind: PivotKind;
  blurb: string;
  exits?: string[];
};

export type PivotCase = {
  id: string;
  title: string;
  objective: string;
  start: string;
  target: string;
  nodes: PivotNode[];
};

const cases: PivotCase[] = [
  {
    id: "nightfox",
    title: "NightFox",
    objective: "Find NightFox's favorite game.",
    start: "nightfox",
    target: "elden",
    nodes: [
      { id: "nightfox", label: "@NIGHTFOX", kind: "username", blurb: "One handle. Three places it might live.", exits: ["reddit", "x", "twitch"] },
      { id: "reddit", label: "Reddit", kind: "platform", blurb: "u/nightfox posts in r/MealPrep.", exits: ["cook"] },
      { id: "cook", label: "Meal-prep post", kind: "dead", blurb: "Garlic, rice, no games. Dead end." },
      { id: "x", label: "X", kind: "platform", blurb: "Bio: “I stream sometimes.”", exits: ["xbio"] },
      { id: "xbio", label: "Pinned post", kind: "post", blurb: "“Catch me on Twitch after work.”", exits: ["twitch"] },
      { id: "twitch", label: "Twitch", kind: "platform", blurb: "nightfox_live. 142 followers.", exits: ["twitchbio"] },
      { id: "twitchbio", label: "Twitch bio", kind: "profile", blurb: "“Peak hours on Steam.”", exits: ["steam"] },
      { id: "steam", label: "Steam", kind: "link", blurb: "Most played is sitting on the shelf.", exits: ["elden"] },
      { id: "elden", label: "ELDEN RING", kind: "target", blurb: "Favorite game found." },
    ],
  },
  {
    id: "lumenbyte",
    title: "Lumenbyte",
    objective: "Find the city Lumenbyte actually lives in.",
    start: "lumen",
    target: "indy",
    nodes: [
      { id: "lumen", label: "@LUMENBYTE", kind: "username", blurb: "A handle with too many time zones.", exits: ["gh", "ig", "hn"] },
      { id: "gh", label: "GitHub", kind: "platform", blurb: "Commits stamped 03:00 UTC.", exits: ["tz"] },
      { id: "tz", label: "Commit graph", kind: "dead", blurb: "Night owl. Not a city." },
      { id: "ig", label: "Instagram", kind: "platform", blurb: "Stories tagged #IndyEats.", exits: ["food"] },
      { id: "food", label: "Photo geotag", kind: "link", blurb: "Mass Ave, last Tuesday.", exits: ["indy"] },
      { id: "hn", label: "Hacker News", kind: "platform", blurb: "Comments about “the Midwest.”", exits: ["hn2"] },
      { id: "hn2", label: "Old comment", kind: "post", blurb: "“Moving back to Indy next month.”", exits: ["indy"] },
      { id: "indy", label: "Indianapolis", kind: "target", blurb: "City confirmed." },
    ],
  },
  {
    id: "redoak",
    title: "RedOak",
    objective: "Find RedOak's employer.",
    start: "redoak",
    target: "harbor",
    nodes: [
      { id: "redoak", label: "@REDOAK", kind: "username", blurb: "Professional, but not on LinkedIn first.", exits: ["li", "conf", "blog"] },
      { id: "li", label: "LinkedIn ghost", kind: "dead", blurb: "Profile is locked. No pivot." },
      { id: "conf", label: "Conference site", kind: "platform", blurb: "Speaker page, last name only.", exits: ["slide"] },
      { id: "slide", label: "Slide footer", kind: "post", blurb: "logo: Harbor Analytics.", exits: ["harbor"] },
      { id: "blog", label: "Personal blog", kind: "link", blurb: "About page still says “independent.”", exits: ["old"] },
      { id: "old", label: "2019 post", kind: "dead", blurb: "Freelance era. Stale." },
      { id: "harbor", label: "Harbor Analytics", kind: "target", blurb: "Employer found." },
    ],
  },
  {
    id: "saltwire",
    title: "Saltwire",
    objective: "Find the podcast Saltwire hosts.",
    start: "salt",
    target: "static",
    nodes: [
      { id: "salt", label: "@SALTWIRE", kind: "username", blurb: "Voice-first. Look for audio.", exits: ["yt", "spot", "blog"] },
      { id: "yt", label: "YouTube", kind: "platform", blurb: "Clips titled “from the show.”", exits: ["desc"] },
      { id: "desc", label: "Video description", kind: "post", blurb: "Full episodes on the usual app.", exits: ["spot"] },
      { id: "spot", label: "Spotify", kind: "platform", blurb: "Host of one weekly show.", exits: ["static"] },
      { id: "blog", label: "Substack", kind: "dead", blurb: "Show notes only. No title." },
      { id: "static", label: "Night Static", kind: "target", blurb: "Podcast found." },
    ],
  },
  {
    id: "maplekey",
    title: "Maplekey",
    objective: "Find Maplekey's university.",
    start: "maple",
    target: "purdue",
    nodes: [
      { id: "maple", label: "@MAPLEKEY", kind: "username", blurb: "Alumni energy.", exits: ["strava", "forum", "email"] },
      { id: "strava", label: "Strava", kind: "platform", blurb: "Club: Boiler Running.", exits: ["club"] },
      { id: "club", label: "Club page", kind: "link", blurb: "West Lafayette listed.", exits: ["purdue"] },
      { id: "forum", label: "Old forum", kind: "dead", blurb: "Username reused, no school." },
      { id: "email", label: "Gravatar", kind: "profile", blurb: "Hash tied to a .edu later discarded.", exits: ["edu"] },
      { id: "edu", label: "Cached page", kind: "post", blurb: "maplekey@purdue.edu, 2016.", exits: ["purdue"] },
      { id: "purdue", label: "Purdue", kind: "target", blurb: "University found." },
    ],
  },
  {
    id: "voltage",
    title: "Voltage",
    objective: "Find the band Voltage plays in.",
    start: "volt",
    target: "redline",
    nodes: [
      { id: "volt", label: "@VOLTAGE", kind: "username", blurb: "A musician hiding in tech spaces.", exits: ["bc", "ig", "discord"] },
      { id: "bc", label: "Bandcamp", kind: "platform", blurb: "One credit: synth.", exits: ["album"] },
      { id: "album", label: "Album notes", kind: "post", blurb: "“Voltage of Redline Circuit.”", exits: ["redline"] },
      { id: "ig", label: "Instagram", kind: "dead", blurb: "Pedal photos, no name." },
      { id: "discord", label: "Discord tag", kind: "profile", blurb: "Status: gig Friday.", exits: ["event"] },
      { id: "event", label: "Venue listing", kind: "link", blurb: "Redline Circuit / 9pm.", exits: ["redline"] },
      { id: "redline", label: "Redline Circuit", kind: "target", blurb: "Band found." },
    ],
  },
  {
    id: "ironharbor",
    title: "Ironharbor",
    objective: "Find the charity Ironharbor supports.",
    start: "iron",
    target: "tide",
    nodes: [
      { id: "iron", label: "@IRONHARBOR", kind: "username", blurb: "Public good, private person.", exits: ["run", "li", "tw"] },
      { id: "run", label: "Race results", kind: "platform", blurb: "Charity bib, last fall.", exits: ["bib"] },
      { id: "bib", label: "Bib note", kind: "post", blurb: "Raising for Tide House.", exits: ["tide"] },
      { id: "li", label: "Volunteer blurb", kind: "dead", blurb: "“Local nonprofit.” Too vague." },
      { id: "tw", label: "Thank-you post", kind: "post", blurb: "Photo of a Tide House banner.", exits: ["tide"] },
      { id: "tide", label: "Tide House", kind: "target", blurb: "Charity found." },
    ],
  },
  {
    id: "dusktrail",
    title: "Dusktrail",
    objective: "Find Dusktrail's usual coffee shop.",
    start: "dusk",
    target: "copper",
    nodes: [
      { id: "dusk", label: "@DUSKTRAIL", kind: "username", blurb: "Always posting from a table.", exits: ["maps", "vsco", "yelp"] },
      { id: "maps", label: "Saved list", kind: "dead", blurb: "Private. No pivot." },
      { id: "vsco", label: "VSCO", kind: "platform", blurb: "Same wood counter, five times.", exits: ["cup"] },
      { id: "cup", label: "Cup stamp", kind: "post", blurb: "Copper Owl logo, inverted.", exits: ["copper"] },
      { id: "yelp", label: "Draft review", kind: "link", blurb: "“Copper Owl still has the window seat.”", exits: ["copper"] },
      { id: "copper", label: "Copper Owl", kind: "target", blurb: "Coffee shop found." },
    ],
  },
  {
    id: "skywire",
    title: "Skywire",
    objective: "Find Skywire's drone model.",
    start: "sky",
    target: "mini4",
    nodes: [
      { id: "sky", label: "@SKYWIRE", kind: "username", blurb: "Flies at dusk. Leaves metadata.", exits: ["flickr", "tik", "forum"] },
      { id: "flickr", label: "Flickr EXIF", kind: "platform", blurb: "Camera: DJI.", exits: ["exif"] },
      { id: "exif", label: "Full EXIF", kind: "post", blurb: "Model field still attached.", exits: ["mini4"] },
      { id: "tik", label: "Shorts", kind: "dead", blurb: "Filters stripped the EXIF." },
      { id: "forum", label: "Pilot forum", kind: "link", blurb: "Signature: Mini 4 spare props.", exits: ["mini4"] },
      { id: "mini4", label: "DJI Mini 4 Pro", kind: "target", blurb: "Drone found." },
    ],
  },
  {
    id: "northloop",
    title: "Northloop",
    objective: "Find Northloop's bike brand.",
    start: "north",
    target: "salsa",
    nodes: [
      { id: "north", label: "@NORTHLOOP", kind: "username", blurb: "Commuter with opinions.", exits: ["strava", "shop", "ig"] },
      { id: "strava", label: "Strava bike", kind: "platform", blurb: "Named “the steel one.”", exits: ["gear"] },
      { id: "gear", label: "Gear list", kind: "dead", blurb: "No brand listed." },
      { id: "shop", label: "Repair ticket", kind: "link", blurb: "Salsa Journeyer, headset creak.", exits: ["salsa"] },
      { id: "ig", label: "Story archive", kind: "post", blurb: "Frame decal, last spring.", exits: ["salsa"] },
      { id: "salsa", label: "Salsa Journeyer", kind: "target", blurb: "Bike found." },
    ],
  },
  {
    id: "pinefox",
    title: "Pinefox",
    objective: "Find Pinefox's dog's name.",
    start: "pine",
    target: "bramble",
    nodes: [
      { id: "pine", label: "@PINEFOX", kind: "username", blurb: "The dog is in every other photo.", exits: ["ig", "nextdoor", "vet"] },
      { id: "ig", label: "Instagram", kind: "platform", blurb: "Caption: “good boy hours.”", exits: ["caption"] },
      { id: "caption", label: "Alt text", kind: "post", blurb: "Bramble looking unamused.", exits: ["bramble"] },
      { id: "nextdoor", label: "Lost-dog scare", kind: "dead", blurb: "Resolved in an hour. Name cropped." },
      { id: "vet", label: "Review", kind: "link", blurb: "“Bramble survived his nails.”", exits: ["bramble"] },
      { id: "bramble", label: "Bramble", kind: "target", blurb: "Dog found." },
    ],
  },
  {
    id: "glassnote",
    title: "Glassnote",
    objective: "Find the conference Glassnote is speaking at.",
    start: "glass",
    target: "lattice",
    nodes: [
      { id: "glass", label: "@GLASSNOTE", kind: "username", blurb: "Always on a plane in May.", exits: ["cal", "slides", "hotel"] },
      { id: "cal", label: "Public calendar", kind: "dead", blurb: "Busy / free only." },
      { id: "slides", label: "Speaker deck", kind: "link", blurb: "Footer: Lattice Summit ’26.", exits: ["lattice"] },
      { id: "hotel", label: "Story geotag", kind: "post", blurb: "Same venue as Lattice.", exits: ["lattice"] },
      { id: "lattice", label: "Lattice Summit", kind: "target", blurb: "Conference found." },
    ],
  },
  {
    id: "emberlane",
    title: "Emberlane",
    objective: "Find Emberlane's old username.",
    start: "ember",
    target: "fox98",
    nodes: [
      { id: "ember", label: "@EMBERLANE", kind: "username", blurb: "This handle is new. The trail is not.", exits: ["steam", "reddit", "mail"] },
      { id: "steam", label: "Steam comments", kind: "platform", blurb: "Someone mentions “you were fox98.”", exits: ["fox98"] },
      { id: "reddit", label: "Reddit rename", kind: "dead", blurb: "Admin log hidden." },
      { id: "mail", label: "Gravatar", kind: "profile", blurb: "Older avatar still signed fox98.", exits: ["fox98"] },
      { id: "fox98", label: "@fox98", kind: "target", blurb: "Old username found." },
    ],
  },
  {
    id: "harborfox",
    title: "Harborfox",
    objective: "Find Harborfox's favorite food truck.",
    start: "hf",
    target: "dumpling",
    nodes: [
      { id: "hf", label: "@HARBORFOX", kind: "username", blurb: "Lunch photos, never a name.", exits: ["tik", "maps", "slack"] },
      { id: "tik", label: "Sound on a clip", kind: "dead", blurb: "Generator noise. Useless." },
      { id: "maps", label: "Photo sphere", kind: "platform", blurb: "Truck in the background.", exits: ["sign"] },
      { id: "sign", label: "Menu board", kind: "post", blurb: "Dumpling Weather.", exits: ["dumpling"] },
      { id: "slack", label: "Leaked screenshot", kind: "link", blurb: "“Usual: dumpling weather.”", exits: ["dumpling"] },
      { id: "dumpling", label: "Dumpling Weather", kind: "target", blurb: "Food truck found." },
    ],
  },
  {
    id: "nullreef",
    title: "Nullreef",
    objective: "Find Nullreef's public GitHub repo.",
    start: "null",
    target: "lantern",
    nodes: [
      { id: "null", label: "@NULLREEF", kind: "username", blurb: "The code is somewhere quieter.", exits: ["npm", "gist", "so"] },
      { id: "npm", label: "npm author", kind: "platform", blurb: "One package, repo link live.", exits: ["lantern"] },
      { id: "gist", label: "Gist", kind: "dead", blurb: "Snippet only. No repo." },
      { id: "so", label: "Stack Overflow", kind: "profile", blurb: "Profile mentions lantern-kit.", exits: ["lantern"] },
      { id: "lantern", label: "lantern-kit", kind: "target", blurb: "Repo found." },
    ],
  },
  {
    id: "kilometer",
    title: "Kilometer",
    objective: "Find the marathon Kilometer ran.",
    start: "kilo",
    target: "chicago",
    nodes: [
      { id: "kilo", label: "@KILOMETER", kind: "username", blurb: "A medal is a data point.", exits: ["strava", "ig", "news"] },
      { id: "strava", label: "Strava", kind: "platform", blurb: "26.2, October, pancake-flat.", exits: ["race"] },
      { id: "race", label: "Race title", kind: "post", blurb: "Bank of America Chicago.", exits: ["chicago"] },
      { id: "ig", label: "Medal selfie", kind: "dead", blurb: "Thumb covers the city." },
      { id: "news", label: "Local recap", kind: "link", blurb: "Finisher list includes the handle.", exits: ["chicago"] },
      { id: "chicago", label: "Chicago Marathon", kind: "target", blurb: "Race found." },
    ],
  },
  {
    id: "nightstatic",
    title: "Nightstatic",
    objective: "Find Nightstatic's radio show.",
    start: "ns",
    target: "afterhours",
    nodes: [
      { id: "ns", label: "@NIGHTSTATIC", kind: "username", blurb: "Broadcast, not podcast.", exits: ["fm", "mix", "twitch"] },
      { id: "fm", label: "College FM", kind: "platform", blurb: "Thursday 11pm slot.", exits: ["slot"] },
      { id: "slot", label: "Program guide", kind: "post", blurb: "After Hours with Nightstatic.", exits: ["afterhours"] },
      { id: "mix", label: "Mixcloud", kind: "dead", blurb: "Untitled live sets." },
      { id: "twitch", label: "Simulcast", kind: "link", blurb: "Title matches the FM guide.", exits: ["afterhours"] },
      { id: "afterhours", label: "After Hours", kind: "target", blurb: "Show found." },
    ],
  },
  {
    id: "paperkite",
    title: "Paperkite",
    objective: "Find Paperkite's sister site.",
    start: "paper",
    target: "twine",
    nodes: [
      { id: "paper", label: "@PAPERKITE", kind: "username", blurb: "A small press with a twin.", exits: ["web", "shop", "colophon"] },
      { id: "web", label: "Homepage", kind: "platform", blurb: "Footer: also see…", exits: ["foot"] },
      { id: "foot", label: "Footer", kind: "post", blurb: "twine.press.", exits: ["twine"] },
      { id: "shop", label: "Shop", kind: "dead", blurb: "Sold out. No link." },
      { id: "colophon", label: "Colophon", kind: "link", blurb: "Sister imprint: Twine.", exits: ["twine"] },
      { id: "twine", label: "twine.press", kind: "target", blurb: "Sister site found." },
    ],
  },
  {
    id: "grainfield",
    title: "Grainfield",
    objective: "Find Grainfield's camera.",
    start: "grain",
    target: "xe4",
    nodes: [
      { id: "grain", label: "@GRAINFIELD", kind: "username", blurb: "The grain is a signature.", exits: ["flickr", "store", "forum"] },
      { id: "flickr", label: "Flickr EXIF", kind: "platform", blurb: "Fujifilm X-E4.", exits: ["xe4"] },
      { id: "store", label: "Receipt leak", kind: "dead", blurb: "Redacted SKU." },
      { id: "forum", label: "Gear thread", kind: "post", blurb: "“Still on the X-E4.”", exits: ["xe4"] },
      { id: "xe4", label: "Fujifilm X-E4", kind: "target", blurb: "Camera found." },
    ],
  },
  {
    id: "lanternbyte",
    title: "Lanternbyte",
    objective: "Find the game server Lanternbyte admins.",
    start: "lantern",
    target: "ember",
    nodes: [
      { id: "lantern", label: "@LANTERNBYTE", kind: "username", blurb: "Always online at reset.", exits: ["disc", "steam", "status"] },
      { id: "disc", label: "Discord", kind: "platform", blurb: "Role: Ember Vale staff.", exits: ["ember"] },
      { id: "steam", label: "Steam group", kind: "dead", blurb: "Private." },
      { id: "status", label: "Status page", kind: "link", blurb: "ember-vale.gg/status.", exits: ["ember"] },
      { id: "ember", label: "Ember Vale", kind: "target", blurb: "Server found." },
    ],
  },
  {
    id: "quietmargin",
    title: "Quietmargin",
    objective: "Find Quietmargin's book.",
    start: "quiet",
    target: "ledger",
    nodes: [
      { id: "quiet", label: "@QUIETMARGIN", kind: "username", blurb: "A writer who hides the title.", exits: ["goodreads", "shop", "lib"] },
      { id: "goodreads", label: "Goodreads", kind: "platform", blurb: "Author page, one novel.", exits: ["ledger"] },
      { id: "shop", label: "Indie shop", kind: "dead", blurb: "Signed copies, title sticker peeled." },
      { id: "lib", label: "Library record", kind: "link", blurb: "The Night Ledger.", exits: ["ledger"] },
      { id: "ledger", label: "The Night Ledger", kind: "target", blurb: "Book found." },
    ],
  },
];

export function getPivotCase(dayIndex: number): PivotCase {
  const wrapped = ((dayIndex % cases.length) + cases.length) % cases.length;
  return cases[wrapped]!;
}

export function pivotMap(pack: PivotCase) {
  return new Map(pack.nodes.map((node) => [node.id, node]));
}
