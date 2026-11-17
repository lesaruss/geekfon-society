const artist = {
  // Page
  pageTitle: "{name}, GeekFon Society",
  breadcrumb: "Breadcrumb",
  artists: "Artists",
  illustrationAlt: "{name}, illustration",
  sections: "{name} sections",
  tabMusic: "Music",
  tabChat: "Chat",
  tabPress: "Press",
  tabGallery: "Gallery",
  tabAbout: "About",

  // Toasts
  checkoutThanks: "Thank you. Unlocking now.",
  savedToast: "Artist saved on this device",
  removedToast: "Removed from saved artists",

  // Header actions
  playRadio: "Play {name} Radio",
  pauseRadio: "Pause {name} Radio",
  saved: "Saved",
  saveArtist: "Save artist",
  lifetimeUnlocked: "Lifetime: unlocked",
  unlocked: "Unlocked",
  unlockFor: "Unlock {name} · {price}",
  actionsNote: "{name} Radio is free and live: only {name}, on shuffle. Saving an artist stays on this device.",
  radioPlayingSr: "{name} Radio playing",
  radioPausedSr: "{name} Radio paused",

  // Possessive form of the artist name: "Roxanne’s", "Rustblood Prophets’".
  possessive: "{name}’s",
  possessiveS: "{name}’",

  // Music: radio card and chat teaser
  artistRadio: "Artist radio",
  radioName: "{name} Radio",
  onAirLive: "On air. Live and free.",
  onlyOnShuffle: "Only {name}, on shuffle. Live and free.",
  crewTalking: "The crew is talking today.",
  chatTeaserSub: "Read the group chat from {who} side",

  // Music: albums
  albums: "Albums",
  priceEach: "{price} each",
  everyAlbumFull: "Every {name} album in full, on demand.",
  and: "and",
  ownedAlbums_one: "{titles} is yours in full. Each album is its own {price}.",
  ownedAlbums_other: "{titles} are yours in full. Each album is its own {price}.",
  pickAlbum: "Pick an album. Every song plays a free 30-second preview, and the radio plays them all. Each album is its own {price}.",
  openAlbum: "Open {title}",
  owned: "Owned",
  new: "New",
  albumProgress: "New album · {n} of {target} so far",
  albumSongs: "Album · {songs}",
  allAlbums: "All albums",
  albumInProgress: "New album · in progress",
  album: "Album",
  youOwnAlbum: "You own this album. Every song in full, on demand.",
  getItEarlyDesc: "Get it early: every song on it so far, and each new one as it lands, with a Founding Fan badge.",
  albumFullDesc: "Every song in full, on demand, with its remixes.",
  getItEarly: "Get it early · {price}",

  // Music: songs
  songs: "Songs",
  previewsFree: "Previews free",
  supporterSongsNote: "Every song in full, on demand. Lyrics are free for every song.",
  freeSongsNote: "Free: a 30-second preview of every song, and every lyric. Unlock {name} to play every song in full, on demand.",
  noSongs: "No songs in the catalog yet. {name} Radio plays what is on the air today.",
  remixes: "Remixes",
  songCount_one: "{count} song",
  songCount_other: "{count} songs",
  remixCount_one: "{count} remix",
  remixCount_other: "{count} remixes",
  catalogFoot: "{songs} in the catalog.",
  catalogFootRemixes: "{songs} in the catalog, plus {remixes}.",

  // Song row
  playSong: "Play {title}",
  pauseSong: "Pause {title}",
  playPreview: "Play 30-second preview of {title}",
  pausePreview: "Pause 30-second preview of {title}",
  onDemand: "On demand",
  preview: "Preview",
  remix: "Remix",
  single: "Single",
  fullSong: "Full song",
  fullSongWithUnlock: "Full song with Unlock",
  unlockFullSongTitle: "Unlock {name} to play the full song, on demand",
  heartSong: "Heart {title}",
  removeHeart: "Remove heart from {title}",
  lyricsFor: "Lyrics for {title}, free",

  // Press
  read: "Read",
  noPress: "No press yet. Articles about {name} show up here as they are published.",

  // Gallery
  openPicture: "Open picture",
  lockedPictureLabel: "Picture for supporters only. Unlock {name}",
  supportersOnly: "Supporters only",
  noPictures: "No pictures yet. {name}'s Gallery fills in here.",
  lockedPictures_one: "{count} picture is for supporters. Unlock {name} to see every one.",
  lockedPictures_other: "{count} pictures are for supporters. Unlock {name} to see every one.",

  // About
  artistSpotlight: "Artist Spotlight",
  videoComingSoon: "Video coming soon",
  pulseSpotlight: "GeekFon Pulse · Artist Spotlight",
  placeholder: "Placeholder",
  spotNote: "Artist Spotlight video coming soon: {name}, in their own words.",
  bio: "Bio",
  noBio: "No bio yet.",
  genre: "Genre",
  from: "From",
  notListed: "Not listed yet",
  onTheRadio: "On the radio",
  catalog: "Catalog",
  noSongsYet: "No songs yet",
} as const;
export default artist;
