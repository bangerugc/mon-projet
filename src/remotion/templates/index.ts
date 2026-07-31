import type { TemplateId } from "@/lib/types";
import { TEMPLATE_META, applyTemplateDefaults } from "@/lib/template-defaults";
import type { TemplateComponent } from "./types";
import { Minimal } from "./Minimal";
import { Karaoke } from "./Karaoke";
import { Punch } from "./Punch";
import { Handwritten } from "./Handwritten";
import { Editorial } from "./Editorial";

export type { TemplateComponent, TemplateComponentProps } from "./types";
export { applyTemplateDefaults };

const COMPONENTS: Record<TemplateId, TemplateComponent> = {
  minimal: Minimal,
  karaoke: Karaoke,
  punch: Punch,
  handwritten: Handwritten,
  editorial: Editorial,
};

// Registry des templates (§8) = données (label + défauts, lib/template-defaults)
// + composant. Ajouter un 6e template = créer un fichier, l'ajouter à
// COMPONENTS et à TEMPLATE_META. Rien d'autre.
export const TEMPLATES = Object.fromEntries(
  (Object.keys(TEMPLATE_META) as TemplateId[]).map((id) => [
    id,
    {
      label: TEMPLATE_META[id].label,
      Component: COMPONENTS[id],
      defaults: TEMPLATE_META[id].defaults,
    },
  ]),
) as Record<
  TemplateId,
  { label: string; Component: TemplateComponent; defaults: (typeof TEMPLATE_META)[TemplateId]["defaults"] }
>;
