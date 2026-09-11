export type AliasAccount = {
  id: string;
  handle: string;
  joined: string;
  avatar: string;
  bio: string;
  group: number;
  extra?: string;
};

export type AliasPack = {
  id: string;
  title: string;
  hint: string;
  difficulty: "easy" | "medium" | "hard";
  accounts: AliasAccount[];
};

export const ALIAS_PACKS: AliasPack[] = [
  {
    id: "fox-cluster",
    title: "Three foxes",
    hint: "Avatars and cities still match on Monday.",
    difficulty: "easy",
    accounts: [
      { id: "a1", handle: "@fox98", joined: "2018", avatar: "🦊", bio: "Indianapolis", group: 0 },
      { id: "a2", handle: "@nf98", joined: "2020", avatar: "🎮", bio: "Indy | FPS", group: 0 },
      { id: "a3", handle: "@nightfox", joined: "2019", avatar: "🦊", bio: "streams after work", group: 0 },
      { id: "a4", handle: "@dragonman", joined: "2016", avatar: "🐉", bio: "Hoover, AL", group: 1 },
      { id: "a5", handle: "@sd_ops", joined: "2017", avatar: "🐉", bio: "Alabama mornings", group: 1 },
      { id: "a6", handle: "@foxy", joined: "2021", avatar: "🎧", bio: "Berlin / vinyl", group: 2 },
      { id: "a7", handle: "@foxgames", joined: "2022", avatar: "🦊", bio: "not the Indy one", group: 2 },
      { id: "a8", handle: "@redfox", joined: "2015", avatar: "🎧", bio: "BER liners", group: 2 },
    ],
  },
  {
    id: "harbor",
    title: "Harbor week",
    hint: "Same water. Different jobs.",
    difficulty: "easy",
    accounts: [
      { id: "b1", handle: "@keel", joined: "2014", avatar: "⚓", bio: "Boston harbor", group: 0 },
      { id: "b2", handle: "@keel_photo", joined: "2018", avatar: "📷", bio: "BOS docks at 5am", group: 0 },
      { id: "b3", handle: "@marina_j", joined: "2019", avatar: "🌊", bio: "Seattle ferries", group: 1 },
      { id: "b4", handle: "@j_waves", joined: "2020", avatar: "🌊", bio: "SEA or nowhere", group: 1 },
      { id: "b5", handle: "@saltline", joined: "2017", avatar: "⚓", bio: "not Boston", group: 2 },
      { id: "b6", handle: "@saltline_eats", joined: "2021", avatar: "🍜", bio: "Charleston", group: 2 },
      { id: "b7", handle: "@chs_salt", joined: "2022", avatar: "🍜", bio: "Lowcountry", group: 2 },
      { id: "b8", handle: "@dockleft", joined: "2016", avatar: "📷", bio: "Boston again", group: 0 },
    ],
  },
  {
    id: "night-shift",
    title: "Night shift",
    hint: "Who keeps the same hours?",
    difficulty: "medium",
    accounts: [
      { id: "c1", handle: "@03am", joined: "2019", avatar: "🌙", bio: "on-call SRE", extra: "TZ: ET", group: 0 },
      { id: "c2", handle: "@pager_tea", joined: "2020", avatar: "🍵", bio: "alerts & oolong", extra: "TZ: ET", group: 0 },
      { id: "c3", handle: "@graveyard", joined: "2018", avatar: "🌙", bio: "ICU nights", extra: "TZ: MT", group: 1 },
      { id: "c4", handle: "@charge_rn", joined: "2017", avatar: "🩺", bio: "Denver nights", extra: "TZ: MT", group: 1 },
      { id: "c5", handle: "@latebus", joined: "2021", avatar: "🚌", bio: "owl routes", extra: "TZ: PT", group: 2 },
      { id: "c6", handle: "@owl_dispatch", joined: "2022", avatar: "🚌", bio: "LA nights", extra: "TZ: PT", group: 2 },
      { id: "c7", handle: "@tea_alerts", joined: "2023", avatar: "🍵", bio: "same kettle", extra: "TZ: ET", group: 0 },
      { id: "c8", handle: "@mt_night", joined: "2016", avatar: "🩺", bio: "scrub cap, mountains", extra: "TZ: MT", group: 1 },
    ],
  },
  {
    id: "writers",
    title: "Same pen",
    hint: "Watch the em-dashes and the cities.",
    difficulty: "hard",
    accounts: [
      { id: "d1", handle: "@margin", joined: "2015", avatar: "✒️", bio: "essays — slowly", extra: "uses — often", group: 0 },
      { id: "d2", handle: "@quietink", joined: "2018", avatar: "📓", bio: "notes — then books", extra: "uses — often", group: 0 },
      { id: "d3", handle: "@bangbang", joined: "2019", avatar: "💥", bio: "wow!! so much!!", extra: "!!", group: 1 },
      { id: "d4", handle: "@wowcity", joined: "2020", avatar: "🌆", bio: "nights!! lights!!", extra: "!!", group: 1 },
      { id: "d5", handle: "@ellipser", joined: "2016", avatar: "…", bio: "maybe later...", extra: "...", group: 2 },
      { id: "d6", handle: "@draft_later", joined: "2021", avatar: "📄", bio: "wip...", extra: "...", group: 2 },
      { id: "d7", handle: "@slowessay", joined: "2022", avatar: "✒️", bio: "still — revising", extra: "uses — often", group: 0 },
      { id: "d8", handle: "@citywow", joined: "2017", avatar: "💥", bio: "hello!!", extra: "!!", group: 1 },
    ],
  },
  {
    id: "runners",
    title: "Club kit",
    hint: "Clubs, not vibes.",
    difficulty: "easy",
    accounts: [
      { id: "e1", handle: "@split_6", joined: "2018", avatar: "👟", bio: "boiler running", group: 0 },
      { id: "e2", handle: "@wl_miles", joined: "2019", avatar: "🥇", bio: "West Lafayette loops", group: 0 },
      { id: "e3", handle: "@lake_loop", joined: "2016", avatar: "👟", bio: "Chicago lakefront", group: 1 },
      { id: "e4", handle: "@grid_miles", joined: "2020", avatar: "🏙️", bio: "CHI 18:1", group: 1 },
      { id: "e5", handle: "@trail_only", joined: "2017", avatar: "🌲", bio: "Asheville dirt", group: 2 },
      { id: "e6", handle: "@avl_dust", joined: "2021", avatar: "🌲", bio: "AVL weekends", group: 2 },
      { id: "e7", handle: "@boiler_am", joined: "2022", avatar: "🥇", bio: "campus 5k", group: 0 },
      { id: "e8", handle: "@chi_sunrise", joined: "2015", avatar: "🏙️", bio: "lakefront again", group: 1 },
    ],
  },
  {
    id: "radios",
    title: "Same frequency",
    hint: "Shows, not cities.",
    difficulty: "medium",
    accounts: [
      { id: "f1", handle: "@after_11", joined: "2014", avatar: "📻", bio: "college FM Thursdays", extra: "11pm", group: 0 },
      { id: "f2", handle: "@cart_left", joined: "2016", avatar: "🎛️", bio: "same booth, same night", extra: "11pm", group: 0 },
      { id: "f3", handle: "@am_drive", joined: "2018", avatar: "📻", bio: "traffic and weather", extra: "6am", group: 1 },
      { id: "f4", handle: "@commute_mic", joined: "2019", avatar: "🚗", bio: "drive time", extra: "6am", group: 1 },
      { id: "f5", handle: "@sunday_jazz", joined: "2013", avatar: "🎷", bio: "slow Sundays", extra: "10am", group: 2 },
      { id: "f6", handle: "@brushes", joined: "2020", avatar: "🎷", bio: "cymbal work", extra: "10am", group: 2 },
      { id: "f7", handle: "@night_cart", joined: "2021", avatar: "🎛️", bio: "still Thursday", extra: "11pm", group: 0 },
      { id: "f8", handle: "@wx_desk", joined: "2017", avatar: "🚗", bio: "radar first", extra: "6am", group: 1 },
    ],
  },
  {
    id: "cameras",
    title: "Same lens",
    hint: "Bodies travel. The glass stays.",
    difficulty: "medium",
    accounts: [
      { id: "g1", handle: "@grainfield", joined: "2016", avatar: "📷", bio: "X-E4 forever", extra: "Fuji", group: 0 },
      { id: "g2", handle: "@quiet_shutter", joined: "2018", avatar: "📷", bio: "still the X-E4", extra: "Fuji", group: 0 },
      { id: "g3", handle: "@leica_bus", joined: "2015", avatar: "🎞", bio: "M6 and rain", extra: "film", group: 1 },
      { id: "g4", handle: "@hp5_only", joined: "2019", avatar: "🎞", bio: "box of HP5", extra: "film", group: 1 },
      { id: "g5", handle: "@phone_only", joined: "2022", avatar: "📱", bio: "computational is fine", extra: "phone", group: 2 },
      { id: "g6", handle: "@pocket_jpeg", joined: "2023", avatar: "📱", bio: "no bag, no problem", extra: "phone", group: 2 },
      { id: "g7", handle: "@xe4_spare", joined: "2020", avatar: "📷", bio: "second body", extra: "Fuji", group: 0 },
      { id: "g8", handle: "@darkroom_j", joined: "2014", avatar: "🎞", bio: "enlarger nights", extra: "film", group: 1 },
    ],
  },
  {
    id: "kitchens",
    title: "Same ticket",
    hint: "Service language is a fingerprint.",
    difficulty: "hard",
    accounts: [
      { id: "h1", handle: "@on_the_line", joined: "2017", avatar: "🔥", bio: "behind, behind", extra: "expo calls", group: 0 },
      { id: "h2", handle: "@fire_three", joined: "2018", avatar: "🔥", bio: "all day", extra: "expo calls", group: 0 },
      { id: "h3", handle: "@pastry_am", joined: "2016", avatar: "🥐", bio: "lamination at 4", extra: "bake", group: 1 },
      { id: "h4", handle: "@proof_box", joined: "2019", avatar: "🥐", bio: "steam + butter", extra: "bake", group: 1 },
      { id: "h5", handle: "@floor_lead", joined: "2015", avatar: "🍷", bio: "we sat a walk-in", extra: "FOH", group: 2 },
      { id: "h6", handle: "@two_top", joined: "2020", avatar: "🍷", bio: "deuce by the window", extra: "FOH", group: 2 },
      { id: "h7", handle: "@six_pan", joined: "2021", avatar: "🔥", bio: "heard, chef", extra: "expo calls", group: 0 },
      { id: "h8", handle: "@host_stand", joined: "2018", avatar: "🍷", bio: "name and time", extra: "FOH", group: 2 },
    ],
  },
];

export function getAliasPack(dayIndex: number): AliasPack {
  const weekday = ((dayIndex % 7) + 7) % 7;
  const difficulty = weekday <= 1 ? "easy" : weekday <= 4 ? "medium" : "hard";
  const pool = ALIAS_PACKS.filter((pack) => pack.difficulty === difficulty);
  const source = pool.length ? pool : ALIAS_PACKS;
  return source[dayIndex % source.length]!;
}
