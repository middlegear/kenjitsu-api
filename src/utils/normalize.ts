const Format = {
  TV: 'TV',
  MOVIE: 'MOVIE',
  SPECIAL: 'SPECIAL',
  OVA: 'OVA',
  ONA: 'ONA',
  MUSIC: 'MUSIC',
} as const;

type Format = (typeof Format)[keyof typeof Format];

// Function to normalize and validate the input
export function toFormatAnilist(input: string): Format {
  if (!input) {
    input = Format.TV;
  }

  const upperCaseInput = input.toUpperCase().trim();

  // Check if the normalized input is a valid Format
  if (Object.values(Format).includes(upperCaseInput as Format)) {
    return upperCaseInput as Format;
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
type Seasons = (typeof Seasons)[keyof typeof Seasons];

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

  throw new Error(`Invalid input: ${input}. Required inputs are: ${validInputs}`);
}

const ZoroServers = {
  HD1: 'hd-1',
  HD2: 'hd-2',
} as const;
type ZoroServers = (typeof ZoroServers)[keyof typeof ZoroServers];

export function toZoroServers(input: string): ZoroServers {
  if (!input) {
    input = ZoroServers.HD1;
  }
  const lowerCaseInput = input.toLowerCase().trim();
  if (Object.values(ZoroServers).includes(lowerCaseInput as ZoroServers)) {
    return lowerCaseInput as ZoroServers;
  }
  const validInputs = Object.values(ZoroServers).join(' or ');
  throw new Error(`Invalid input: ${input}. Required inputs are: ${validInputs}`);
}

//
const AnimeProvider = {
  HiAnime: 'hianime',
  Animekai: 'animekai',
} as const; // Ensures values are readonly

type AnimeProvider = (typeof AnimeProvider)[keyof typeof AnimeProvider]; // Extracts type

export function toProvider(input: string): AnimeProvider {
  if (!input) {
    return AnimeProvider.HiAnime;
  }

  const normalizedInput = input.toLowerCase().trim();

  if (Object.values(AnimeProvider).some(provider => provider === normalizedInput)) {
    return normalizedInput as AnimeProvider;
  }

  const validAnimeProvider = Object.values(AnimeProvider).join(' or ');
  throw new Error(`Invalid input: ${input}. Required inputs are: ${validAnimeProvider}`);
}
