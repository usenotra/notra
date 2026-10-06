export interface SlackHeadline {
  pre: string;
  mention: string;
  secondLinePre: string;
  accent: string;
}

export interface SlackThreadMessage {
  author: string;
  message: string;
  mention?: string;
  avatarGradient?: string;
  isBot?: boolean;
}

export interface SlackFeature {
  title: string;
  description: string;
}
