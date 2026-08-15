export interface PokemonDto {
  id: number;
  name: string;
  spriteUrl: string;
  types: string[];
  height: number; // decimetres
  weight: number; // hectograms
}
