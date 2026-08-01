import type { TemplateId } from "@/lib/types";
import { TEMPLATE_META, applyTemplateDefaults } from "@/lib/template-defaults";
import type { TemplateComponent } from "./types";
import { Leon } from "./Leon";
import { Hormozi2 } from "./Hormozi2";
import { Ali } from "./Ali";
import { Hormozi3 } from "./Hormozi3";
import { Luke } from "./Luke";

export type { TemplateComponent, TemplateComponentProps } from "./types";
export { applyTemplateDefaults };

const COMPONENTS: Record<TemplateId, TemplateComponent> = {
  leon: Leon,
  hormozi2: Hormozi2,
  ali: Ali,
  hormozi3: Hormozi3,
  luke: Luke,
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
