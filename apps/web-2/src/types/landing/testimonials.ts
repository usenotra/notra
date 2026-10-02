interface TestimonialShader {
  size: number;
  colorFront: string;
  className: string;
}

export interface Testimonial {
  quote: string;
  name: string;
  role: string;
  avatar: string;
  avatarAlt: string;
  shader: TestimonialShader;
}

export interface TestimonialsShaderProps {
  size: number;
  colorFront: string;
  className: string;
}

export interface TestimonialsGateProps {
  children: React.ReactNode;
}
