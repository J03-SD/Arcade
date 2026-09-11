export type SignalPost = {
  id: string;
  text: string;
  age: string;
  signal: boolean;
};

export type SignalPack = {
  id: string;
  mission: string;
  resolution: {
    place: string;
    time: string;
    what: string;
  };
  posts: SignalPost[];
};

export const SIGNAL_PACKS: SignalPack[] = [
  {
    id: "outage",
    mission: "Something happened downtown. Find the 4 posts about the same event.",
    resolution: { place: "Downtown", time: "2:14 PM", what: "Transformer failure" },
    posts: [
      { id: "s1", text: "Power outage downtown — lights just died on Market.", age: "2m", signal: true },
      { id: "s2", text: "Concert tonight! Who has extra tickets?", age: "4m", signal: false },
      { id: "s3", text: "Anyone hear that bang? Whole block went dark.", age: "1m", signal: true },
      { id: "s4", text: "Transformer on 4th is sparking. Stay back.", age: "3m", signal: true },
      { id: "s5", text: "New bakery sample day, free croissants.", age: "12m", signal: false },
      { id: "s6", text: "Traffic signals out from Pine to Harbor.", age: "2m", signal: true },
      { id: "s7", text: "My sourdough never rose. Help.", age: "40m", signal: false },
      { id: "s8", text: "Looking for a roommate, downtown loft.", age: "1h", signal: false },
      { id: "s9", text: "Dog found near the river, blue collar.", age: "8m", signal: false },
      { id: "s10", text: "Anyone else lose wifi when the lights dropped?", age: "5m", signal: false },
    ],
  },
  {
    id: "storm",
    mission: "A weather event is unfolding. Find the 4 posts that describe it.",
    resolution: { place: "North side", time: "6:40 PM", what: "Hail cell" },
    posts: [
      { id: "a1", text: "Hail just shredded the north gardens.", age: "1m", signal: true },
      { id: "a2", text: "Sky went green over the water tower.", age: "3m", signal: true },
      { id: "a3", text: "Need a plus-one for trivia.", age: "20m", signal: false },
      { id: "a4", text: "Cars pulling under the overpass on 19.", age: "2m", signal: true },
      { id: "a5", text: "Sirens, then marble-size ice.", age: "1m", signal: true },
      { id: "a6", text: "Best tacos on 12th, fight me.", age: "2h", signal: false },
      { id: "a7", text: "Lost a red umbrella at the park last week.", age: "3h", signal: false },
      { id: "a8", text: "Streaming the game if anyone wants a link.", age: "15m", signal: false },
      { id: "a9", text: "Why is the bus 40 minutes late again.", age: "9m", signal: false },
      { id: "a10", text: "Selling a gently used tent.", age: "1d", signal: false },
    ],
  },
  {
    id: "scam",
    mission: "A scam is moving through the city. Find the 4 related posts.",
    resolution: { place: "Citywide", time: "this afternoon", what: "Utility-impersonation texts" },
    posts: [
      { id: "b1", text: "Got a text: pay water bill now or shutoff. Weird link.", age: "6m", signal: true },
      { id: "b2", text: "Same shutoff text — they used my street.", age: "4m", signal: true },
      { id: "b3", text: "City says they never text for payments.", age: "2m", signal: true },
      { id: "b4", text: "Farmers market has strawberries already.", age: "30m", signal: false },
      { id: "b5", text: "Don't click. Number spoofed the utility.", age: "3m", signal: true },
      { id: "b6", text: "Anyone selling a used keyboard?", age: "1h", signal: false },
      { id: "b7", text: "The river path is finally dry.", age: "2h", signal: false },
      { id: "b8", text: "Closed the cafe 10 minutes early, sorry.", age: "50m", signal: false },
      { id: "b9", text: "Looking for a chess partner, Sundays.", age: "3h", signal: false },
      { id: "b10", text: "Fireworks on Saturday by the marina.", age: "5h", signal: false },
    ],
  },
  {
    id: "transit",
    mission: "Transit is failing somewhere. Find the 4 posts about the same disruption.",
    resolution: { place: "Line 3", time: "8:11 AM", what: "Signal failure" },
    posts: [
      { id: "c1", text: "Line 3 stopped between Harbor and Elm.", age: "2m", signal: true },
      { id: "c2", text: "Voices on the intercom: signal failure.", age: "1m", signal: true },
      { id: "c3", text: "Packed platform, no trains for 20.", age: "4m", signal: true },
      { id: "c4", text: "Free coffee if your name is June.", age: "12m", signal: false },
      { id: "c5", text: "Shuttle buses forming on Harbor.", age: "3m", signal: true },
      { id: "c6", text: "My succulent is thriving for once.", age: "2h", signal: false },
      { id: "c7", text: "Who has the homework from Tuesday?", age: "40m", signal: false },
      { id: "c8", text: "New mural on 8th is actually good.", age: "1h", signal: false },
      { id: "c9", text: "Selling two theater tickets, mezzanine.", age: "3h", signal: false },
      { id: "c10", text: "The bakery ran out of rye again.", age: "25m", signal: false },
    ],
  },
  {
    id: "sports",
    mission: "A game just ended strangely. Find the 4 posts about it.",
    resolution: { place: "Civic Arena", time: "9:58 PM", what: "Lights out, last minute" },
    posts: [
      { id: "d1", text: "Arena lights died with 40 seconds left.", age: "2m", signal: true },
      { id: "d2", text: "They are holding the last shot under phones.", age: "1m", signal: true },
      { id: "d3", text: "Need a ride to the airport at 5.", age: "1h", signal: false },
      { id: "d4", text: "Ref kept them on the floor in the dark.", age: "3m", signal: true },
      { id: "d5", text: "Whole lower bowl chanting “one more.”", age: "2m", signal: true },
      { id: "d6", text: "Does anyone have a HDMI cable?", age: "4h", signal: false },
      { id: "d7", text: "The river smells like spring finally.", age: "2h", signal: false },
      { id: "d8", text: "Closed captions on the tram are poetry.", age: "50m", signal: false },
      { id: "d9", text: "Lost a gray scarf on the 7 bus.", age: "6h", signal: false },
      { id: "d10", text: "Hiring a weekend barista, ask Maya.", age: "1d", signal: false },
    ],
  },
  {
    id: "cyber",
    mission: "A service is wobbling. Find the 4 posts about the same incident.",
    resolution: { place: "City portal", time: "11:03 AM", what: "Login loop after update" },
    posts: [
      { id: "e1", text: "City portal just loops after password.", age: "3m", signal: true },
      { id: "e2", text: "Can't pull permits. Same spinner.", age: "2m", signal: true },
      { id: "e3", text: "IT posted: rollback in progress.", age: "1m", signal: true },
      { id: "e4", text: "The park lilies are early this year.", age: "2h", signal: false },
      { id: "e5", text: "Parking tickets page 502s too.", age: "4m", signal: true },
      { id: "e6", text: "Selling a barely used tent.", age: "1d", signal: false },
      { id: "e7", text: "Anyone else naming their sourdough?", age: "3h", signal: false },
      { id: "e8", text: "The 2pm yoga is moved to the lawn.", age: "40m", signal: false },
      { id: "e9", text: "Looking for a cello teacher.", age: "5h", signal: false },
      { id: "e10", text: "Best bench in the city is still empty.", age: "20m", signal: false },
    ],
  },
];

const MORE = SIGNAL_PACKS.flatMap((pack, i) =>
  [1, 2, 3].map((n) => ({
    ...pack,
    id: `${pack.id}-${n}`,
    mission: pack.mission,
    posts: pack.posts.map((post, idx) => ({
      ...post,
      id: `${post.id}-${i}-${n}`,
      age: idx % 2 === 0 ? `${n + 1}m` : post.age,
    })),
  })),
);

const ALL = [...SIGNAL_PACKS, ...MORE];

export function getSignalPack(dayIndex: number): SignalPack {
  return ALL[((dayIndex % ALL.length) + ALL.length) % ALL.length]!;
}
