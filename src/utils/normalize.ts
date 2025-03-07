import { error } from 'console';

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
  //check for undefined
  if (!input) {
    input = Format.TV;
  }
  // Normalize the input to uppercase
  const upperCaseInput = input.toUpperCase();

  // Check if the normalized input is a valid Format
  if (Object.values(Format).includes(upperCaseInput as Format)) {
    return upperCaseInput as Format;
  }

  const validFormats = Object.values(Format).join(', ');
  throw new Error(`Invalid input: "${input}". Required inputs are: ${validFormats}`);
}
export function toFormatJikan(input: string): Format {
  //check for undefined
  if (!input) {
    input = Format.TV;
  }
  // Normalize the input tolowercase
  const lowerCaseInput = input.toLowerCase();

  // Check if the normalized input is a valid Format
  if (Object.values(Format).includes(lowerCaseInput as Format)) {
    return lowerCaseInput as Format;
  }

  const validFormats = Object.values(Format).join(', ');
  throw new Error(`Invalid input: "${input}". Required inputs are: ${validFormats}`);
}

const Seasons = {
  WINTER: 'WINTER',
  SPRING: 'SPRING',
  SUMMER: 'SUMMER',
  FALL: 'FALL',
} as const;
type Seasons = (typeof Seasons)[keyof typeof Seasons];

export function toAnilistSeasons(input: string): Seasons {
  //check for undefined
  const validSeason = Object.values(Seasons).join(', ');
  if (!input) {
    throw new Error(`Missing paramaters. Required paramaters are: ${validSeason}`);
  }
  // Normalize the input toupperCase
  const upperCaseInput = input.toUpperCase();

  // Check if the normalized input is a valid Format
  if (Object.values(Seasons).includes(upperCaseInput as Seasons)) {
    return upperCaseInput as Seasons;
  }

  throw new Error(`Invalid input: "${input}". Required inputs are: ${validSeason}`);
}

// const SubOrDub = {
//   SUB: 'sub',
//   DUB: 'dub',
// } as const;
// type SubOrDub = (typeof SubOrDub)[keyof typeof SubOrDub];

// export function toCategory(input: string): SubOrDub {
//   //check for undefined
//   if (!input) {
//     input = SubOrDub.SUB;
//   }
//   // Normalize the input to lowercase
//   const lowerCaseInput = input.toLowerCase();

//   // Check if the normalized input is a valid Format
//   if (Object.values(SubOrDub).includes(lowerCaseInput as SubOrDub)) {
//     return lowerCaseInput as SubOrDub;
//   }

//   // If invalid, throw an error with the required inputs
//   const validInputs = Object.values(SubOrDub).join(', ');
//   throw new Error(`Invalid input: "${input}". Required inputs are: ${validInputs}`);
// }
