export type StarVideoInputProps = {
  owner: string;
  repo: string;
  stars: number;
  avatars: string[];
  backgroundColor: string;
};

export interface GithubOAuthState {
  state: string;
  repo?: string;
}

export interface GithubOAuthConfig {
  clientId: string;
  clientSecret: string;
}

export interface RepoStarData {
  id: string;
  owner: string;
  repo: string;
  stars: number;
  avatars: string[];
  htmlUrl: string;
}

export interface ConfettiPiece {
  seed: string;
  startX: number;
  color: string;
  size: number;
  isCircle: boolean;
  phaseOffset: number;
  fallDuration: number;
  swayAmplitude: number;
  spin: number;
}

export interface AvatarSlot {
  url: string;
  angle: number;
  radius: number;
  appearFrame: number;
  size: number;
  floatPhase: number;
  orbitDir: number;
}
