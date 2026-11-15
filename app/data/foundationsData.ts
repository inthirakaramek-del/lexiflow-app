import { FOUNDATIONS_PART1 } from "./foundationsPart1";
import { FOUNDATIONS_PART2 } from "./foundationsPart2";
import { FOUNDATIONS_PART3 } from "./foundationsPart3";

export interface FoundationChapter {
  id: string;
  title: string;
  tag: string;
  icon: string;
  summary: string;
  startPage: number;
  endPage: number;
  lines: string[];
  searchableText: string;
}

export const FOUNDATIONS_DATA: FoundationChapter[] = [
  ...FOUNDATIONS_PART1,
  ...FOUNDATIONS_PART2,
  ...FOUNDATIONS_PART3,
];
