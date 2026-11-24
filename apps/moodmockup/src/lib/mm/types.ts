export const TAGS = ["color", "typography", "layout", "mood", "imagery", "spacing"] as const;
export type Tag = (typeof TAGS)[number];

export interface BoardItem {
  id: string;
  source: "upload" | "library";
  /** object URL for uploads, data URL for library items */
  src: string;
  name: string;
  /** library items carry a textual description the AI can read without vision */
  description?: string;
  note: string;
  tags: Tag[];
  /** upload content hash used to reject duplicates */
  contentHash?: string;
}

export interface AppSpec {
  description: string;
  features: string[];
}