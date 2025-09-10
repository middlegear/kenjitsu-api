const Format = {
  TV: 'TV',
  MOVIE: 'MOVIE',
  SPECIAL: 'SPECIAL',
  OVA: 'OVA',
  ONA: 'ONA',
  MUSIC: 'MUSIC',
} as const;

export type Format = (typeof Format)[keyof typeof Format];
const IAnimeCategory = {
  TV: 'TV',
  MOVIE: 'MOVIE',
  SPECIAL: 'SPECIALS',
  OVA: 'OVA',
  ONA: 'ONA',
} as const;
type IAnimeCategory = (typeof IAnimeCategory)[keyof typeof IAnimeCategory];
export function toFormatAnilist(input: string): Format {
  if (!input) {
    input = Format.TV;
  }

  const upperCaseInput = input.toUpperCase().trim();

  if (Object.values(Format).includes(upperCaseInput as Format)) {
    return upperCaseInput as Format;
  }

  const validFormats = Object.values(Format).join(' or ');
  throw new Error(`Invalid input: ${input}. Required inputs are: ${validFormats}`);
}
export function toFormatHianime(input: string): IAnimeCategory {
  if (!input) {
    input = IAnimeCategory.TV;
  }

  const upperCaseInput = input.toUpperCase().trim();

  if (Object.values(IAnimeCategory).includes(upperCaseInput as IAnimeCategory)) {
    return upperCaseInput as IAnimeCategory;
  }

  const validFormats = Object.values(Format).join(' or ');
  throw new Error(`Invalid input: ${input}. Required inputs are: ${validFormats}`);
}
const Seasons = {
  WINTER: 'WINTER',
  SPRING: 'SPRING',
  SUMMER: 'SUMMER',
  FALL: 'FALL',
} as const;
export type Seasons = (typeof Seasons)[keyof typeof Seasons];

export function toAnilistSeasons(input: string): Seasons {
  const validSeason = Object.values(Seasons).join(' or ');
  if (!input) {
    throw new Error(`Missing paramater. Pick a required paramater: ${validSeason}`);
  }

  const upperCaseInput = input.toUpperCase().trim();

  if (Object.values(Seasons).includes(upperCaseInput as Seasons)) {
    return upperCaseInput as Seasons;
  }

  throw new Error(`Invalid input: ${input}. Required inputs are: ${validSeason}`);
}

const SubOrDub = {
  SUB: 'sub',
  DUB: 'dub',
  RAW: 'raw',
} as const;
type SubOrDub = (typeof SubOrDub)[keyof typeof SubOrDub];

export function toCategory(input: string): SubOrDub {
  const validInputs = Object.values(SubOrDub).join(' or ');
  if (!input) {
    input = SubOrDub.SUB;
  }
  const lowerCaseInput = input.toLowerCase().trim();
  if (Object.values(SubOrDub).includes(lowerCaseInput as SubOrDub)) {
    return lowerCaseInput as SubOrDub;
  }

  throw new Error(`Invalid input: ${input}. Required category inputs are: ${validInputs}`);
}

const ZoroServers = {
  HD1: 'hd-1',
  HD2: 'hd-2',
  HD3: 'hd-3',
} as const;
type ZoroServers = (typeof ZoroServers)[keyof typeof ZoroServers];

export function toZoroServers(input: string): ZoroServers {
  if (!input) {
    input = ZoroServers.HD2;
  }
  const lowerCaseInput = input.toLowerCase().trim();
  if (Object.values(ZoroServers).includes(lowerCaseInput as ZoroServers)) {
    return lowerCaseInput as ZoroServers;
  }
  const validInputs = Object.values(ZoroServers).join(' or ');
  throw new Error(`Invalid input: ${input}. Required server inputs are: ${validInputs}`);
}

//
const AnimeProviderApi = {
  HiAnime: 'hianime',
  // Animekai: 'animekai',
  AllAnime: 'allanime',
} as const;

export type AnimeProviderApi = (typeof AnimeProviderApi)[keyof typeof AnimeProviderApi]; // Extracts type

export function toProvider(input: string): AnimeProviderApi {
  if (!input) {
    return AnimeProviderApi.HiAnime;
  }

  const normalizedInput = input.toLowerCase().trim();

  if (Object.values(AnimeProviderApi).some(provider => provider === normalizedInput)) {
    return normalizedInput as AnimeProviderApi;
  }

  const validAnimeProvider = Object.values(AnimeProviderApi).join(' or ');
  throw new Error(`Invalid input: ${input}. Required provider inputs are: ${validAnimeProvider}`);
}

export const SearchType = {
  Movie: 'movie',
  TvShow: 'tv',
} as const;
export type SearchType = (typeof SearchType)[keyof typeof SearchType];
export function toSearchType(input: string): SearchType {
  const normalizedInput = input.toLowerCase().trim();

  if (Object.values(SearchType).some(provider => provider === normalizedInput)) {
    return normalizedInput as SearchType;
  }

  const validSearchType = Object.values(SearchType).join(' or ');
  throw new Error(`Invalid input: ${input}. Required input types are: ${validSearchType}`);
}
export const StreamingServers = {
  Upcloud: 'upcloud',
  VidCloud: 'vidcloud',
  Akcloud: 'akcloud',
} as const;
export type StreamingServers = (typeof StreamingServers)[keyof typeof StreamingServers];

export function toFlixServers(input: string): StreamingServers {
  if (!input) {
    return StreamingServers.VidCloud;
  }

  const normalizedInput = input.toLowerCase().trim();

  if (Object.values(StreamingServers).some(provider => provider === normalizedInput)) {
    return normalizedInput as StreamingServers;
  }

  const validServer = Object.values(StreamingServers).join(' or ');
  throw new Error(`Invalid input: ${input}. Required server inputs are: ${validServer}`);
}

export const timeWindow = {
  Week: 'week',
  Day: 'day',
} as const;
export type timeWindow = (typeof timeWindow)[keyof typeof timeWindow];
export function toTimeWindow(input: string): timeWindow {
  if (!input) {
    return timeWindow.Week;
  }

  const normalizedInput = input.toLowerCase().trim();

  if (Object.values(timeWindow).some(provider => provider === normalizedInput)) {
    return normalizedInput as timeWindow;
  }

  const validWindow = Object.values(timeWindow).join(' or ');
  throw new Error(`Invalid input: ${input}. Required timeWindow inputs are: ${validWindow}`);
}

// export const EmbedServers = {
//   CloudStream: 'cloudstream',
//   TwoEmbed: '2embed',
//   // SuperEmbed: 'superembed',
// } as const;
// export type EmbedServers = (typeof EmbedServers)[keyof typeof EmbedServers];
// export function toEmbedServers(input: string): EmbedServers {
//   if (!input) {
//     return EmbedServers.CloudStream;
//   }

//   const normalizedInput = input.toLowerCase().trim();

//   if (Object.values(EmbedServers).some(provider => provider === normalizedInput)) {
//     return normalizedInput as EmbedServers;
//   }

//   const validServer = Object.values(EmbedServers).join(' or ');
//   throw new Error(`Invalid input: ${input}. Required inputs are: ${validServer}`);
// }

export const HIGenres = [
  'action',
  'adventure',
  'cars',
  'comedy',
  'dementia',
  'demons',
  'drama',
  'ecchi',
  'fantasy',
  'game',
  'harem',
  'historical',
  'horror',
  'isekai',
  'josei',
  'kids',
  'magic',
  'martial-arts',
  'mecha',
  'military',
  'music',
  'mystery',
  'parody',
  'police',
  'psychological',
  'romance',
  'samurai',
  'school',
  'sci-fi',
  'seinen',
  'shoujo',
  'shoujo-ai',
  'shounen',
  'shounen-ai',
  'slice-of-life',
  'space',
  'sports',
  'super-power',
  'supernatural',
  'thriller',
  'vampire',
] as const;

export type HIGenres = (typeof HIGenres)[number];
export function toHIGenres(input: string): HIGenres {
  const normalizedInput = input.toLowerCase().trim();

  if (Object.values(HIGenres).some(provider => provider === normalizedInput)) {
    return normalizedInput as HIGenres;
  }

  const validInput = Object.values(HIGenres).join(' or ');
  throw new Error(`Invalid input: ${input}. Required genre inputs are: ${validInput}`);
}
