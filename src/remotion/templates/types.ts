import type { CaptionPage, CaptionStyle } from "@/lib/types";

// Contrat d'un composant template (§8). Le template reçoit la page courante,
// l'index du mot actif (relatif à la page), le style, et le temps (frame/fps
// déjà ajustés du décalage de sync par la composition).
export type TemplateComponentProps = {
  page: CaptionPage;
  activeWordIndex: number;
  style: CaptionStyle;
  frame: number;
  fps: number;
};

export type TemplateComponent = React.FC<TemplateComponentProps>;
