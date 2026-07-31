"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useEditorStore } from "@/store/useEditorStore";
import { TEMPLATE_META, TEMPLATE_IDS } from "@/lib/template-defaults";
import { OFFSET_MIN_MS, OFFSET_MAX_MS } from "@/lib/timing";
import type { AnimationId, FontId } from "@/lib/types";

const FONT_OPTIONS: { id: FontId; label: string }[] = [
  { id: "poppins", label: "Poppins" },
  { id: "roboto", label: "Roboto" },
  { id: "helvChildren", label: "Helv Children" },
  { id: "mochica", label: "Mochica" },
  { id: "ttNormsSerif", label: "TT Norms Serif" },
  { id: "bananaStick", label: "Banana Stick" },
  { id: "komikaAxis", label: "Komika Axis" },
];

const ANIMATION_OPTIONS: { id: AnimationId; label: string }[] = [
  { id: "none", label: "Aucune" },
  { id: "fade", label: "Fondu" },
  { id: "pop", label: "Pop" },
  { id: "rise", label: "Montée" },
  { id: "blur", label: "Flou" },
];

// Base UI Slider renvoie number | number[] → on extrait la 1re valeur.
function sliderValue(value: number | readonly number[]): number {
  return typeof value === "number" ? value : (value[0] ?? 0);
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs text-ink-dim">{label}</span>
      {children}
    </label>
  );
}

export function StylePanel() {
  const style = useEditorStore((s) => s.style);
  const offsetMs = useEditorStore((s) => s.offsetMs);
  const setStyle = useEditorStore((s) => s.setStyle);
  const setTemplate = useEditorStore((s) => s.setTemplate);
  const setOffsetMs = useEditorStore((s) => s.setOffsetMs);

  return (
    <Tabs defaultValue="style" className="w-full">
      <TabsList className="w-full">
        <TabsTrigger value="style">Style</TabsTrigger>
        <TabsTrigger value="position">Position</TabsTrigger>
      </TabsList>

      {/* ── STYLE ─────────────────────────────────────────────────────── */}
      <TabsContent value="style" className="flex flex-col gap-4 pt-4">
        <Row label="Template">
          <div className="grid grid-cols-2 gap-2">
            {TEMPLATE_IDS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setTemplate(id)}
                data-testid={`template-${id}`}
                data-active={style.template === id || undefined}
                className={[
                  "min-h-11 rounded-md border px-2 text-sm transition-colors",
                  style.template === id
                    ? "border-brand bg-brand/10 text-ink"
                    : "border-line text-ink-dim hover:text-ink",
                ].join(" ")}
              >
                {TEMPLATE_META[id].label}
              </button>
            ))}
          </div>
        </Row>

        <Row label="Police">
          <Select value={style.font} onValueChange={(v) => setStyle({ font: v as FontId })}>
            <SelectTrigger data-testid="font-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONT_OPTIONS.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Row>

        <div className="grid grid-cols-2 gap-3">
          <Row label="Couleur du texte">
            <input
              type="color"
              value={style.color}
              onChange={(e) => setStyle({ color: e.target.value })}
              data-testid="color-text"
              className="h-11 w-full rounded-md border border-line bg-bg"
            />
          </Row>
          <Row label="Mot actif">
            <input
              type="color"
              value={style.highlightColor}
              onChange={(e) => setStyle({ highlightColor: e.target.value })}
              data-testid="color-highlight"
              className="h-11 w-full rounded-md border border-line bg-bg"
            />
          </Row>
        </div>

        <Row label={`Taille — ${style.fontSize}%`}>
          <Slider
            min={2}
            max={12}
            step={0.5}
            value={[style.fontSize]}
            onValueChange={(v) => setStyle({ fontSize: sliderValue(v) })}
          />
        </Row>

        <Row label="Animation">
          <Select
            value={style.animation}
            onValueChange={(v) => setStyle({ animation: v as AnimationId })}
          >
            <SelectTrigger data-testid="animation-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ANIMATION_OPTIONS.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Row>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setStyle({ uppercase: !style.uppercase })}
            data-testid="toggle-uppercase"
            data-active={style.uppercase || undefined}
            className={[
              "min-h-11 rounded-md border px-3 text-sm",
              style.uppercase ? "border-brand bg-brand/10 text-ink" : "border-line text-ink-dim",
            ].join(" ")}
          >
            Majuscules {style.uppercase ? "ON" : "OFF"}
          </button>
          <Row label={`Contour — ${style.strokeWidth}`}>
            <Slider
              min={0}
              max={20}
              step={1}
              value={[style.strokeWidth]}
              onValueChange={(v) => setStyle({ strokeWidth: sliderValue(v) })}
            />
          </Row>
        </div>
      </TabsContent>

      {/* ── POSITION ──────────────────────────────────────────────────── */}
      <TabsContent value="position" className="flex flex-col gap-4 pt-4">
        <Row label={`Position verticale — ${Math.round(style.positionY * 100)}%`}>
          <Slider
            min={5}
            max={95}
            step={1}
            value={[style.positionY * 100]}
            onValueChange={(v) => setStyle({ positionY: sliderValue(v) / 100 })}
          />
        </Row>
        <Row label={`Synchro — ${offsetMs > 0 ? "+" : ""}${offsetMs} ms`}>
          <Slider
            min={OFFSET_MIN_MS}
            max={OFFSET_MAX_MS}
            step={10}
            value={[offsetMs]}
            onValueChange={(v) => setOffsetMs(sliderValue(v))}
          />
        </Row>
      </TabsContent>
    </Tabs>
  );
}
