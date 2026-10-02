export interface SlackHeadline {
  pre: string;
  channel: string;
  post: string;
  secondLinePre: string;
  accent: string;
}

export interface SlackThreadMessage {
  author: string;
  message: string;
  avatarGradient: string;
}

export interface SlackFeature {
  title: string;
  description: string;
}
