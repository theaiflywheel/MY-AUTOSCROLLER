export interface ExtensionConfig {
  enabled: boolean;
  ytShorts: boolean;
  igReels: boolean;
  xVideo: boolean;
  threshold: number; // e.g., 98
  playbackSpeed: number; // e.g., 1
  pauseOnHover: boolean;
  pauseOnComments: boolean;
}

export interface ExtensionFile {
  name: string;
  language: string;
  path: string;
  content: string;
}
