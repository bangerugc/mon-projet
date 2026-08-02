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
import { cn } from "@/lib/utils";
import type { AnimationId, FontId, TemplateId } from "@/lib/types";

// Aperçu visuel d'un template : le nom rendu dans SON propre style (comme les
// vignettes de la référence). Approximation CSS légère (pas de Remotion ici).
function TemplatePreview({ id, label }: { id: TemplateId; label: string }) {
  const box =
    "flex h-11 w-full items-center justify-center overflow-hidden rounded bg-[#4b4b52] px-1.5";
  const stroke = {
    WebkitTextStroke: "0.6px #000",
    paintOrder: "stroke fill" as const,
  };
  const base = { fontSize: 11, whiteSpace: "nowrap" as const };
  if (id === "leon")
    return (
      <div className={box}>
        <span style={{ ...base, fontWeight: 800, fontStyle: "italic", textTransform: "uppercase", color: "#fff", backgroundColor: "#f5511e", padding: "1px 5px", borderRadius: 4, ...stroke }}>
          {label}
        </span>
      </div>
    );
  if (id === "hormozi2")
    return (
      <div className={box}>
        <span style={{ ...base, fontWeight: 800, fontStyle: "italic", textTransform: "uppercase", color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,.6)", ...stroke }}>
          {label}
        </span>
      </div>
    );
  if (id === "ali")
    return (
      <div className={box}>
        <span style={{ ...base, fontWeight: 700, fontStyle: "italic", color: "#111114", backgroundColor: "#fff", padding: "2px 7px", borderRadius: 6 }}>
          {label}
        </span>
      </div>
    );
  if (id === "hormozi3")
    return (
      <div className={box}>
        <span style={{ ...base, fontWeight: 800, textTransform: "uppercase", color: "#fff", textShadow: "1.5px 1.5px 0 rgba(0,0,0,.9)", ...stroke }}>
          {label}
        </span>
      </div>
    );
  return (
    <div className={box}>
      <span style={{ ...base, fontWeight: 700, fontStyle: "italic", textTransform: "uppercase", color: "#e8dfd0", letterSpacing: 0.5 }}>
        {label}
      </span>
    </div>
  );
}

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
    <label className="flex flex-col gap-2">
      <span className="text-[11px] font-medium uppercase tracking-wider text-ink-dim">
        {label}
      </span>
      {children}
    </label>
  );
}

function ColorField({
  label,
  value,
  onChange,
  testid,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  testid: string;
}) {
  return (
    <Row label={label}>
      <div className="flex h-9 items-center gap-2 rounded-md border border-line bg-panel pl-1.5 pr-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          data-testid={testid}
          aria-label={label}
          className="size-6 cursor-pointer rounded border-0 bg-transparent p-0"
        />
        <span className="font-mono text-xs uppercase tracking-wide text-ink-dim">
          {value}
        </span>
      </div>
    </Row>
  );
}

export function StylePanel() {
  const style = useEditorStore((s) => s.style);
  const offsetMs = useEditorStore((s) => s.offsetMs);
  const dedupeRepetitions = useEditorStore((s) => s.dedupeRepetitions);
  const setStyle = useEditorStore((s) => s.setStyle);
  const setDedupeRepetitions = useEditorStore((s) => s.setDedupeRepetitions);
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
                aria-label={TEMPLATE_META[id].label}
                className={cn(
                  "rounded-lg border p-1 transition-all",
                  style.template === id
                    ? "border-brand ring-1 ring-brand"
                    : "border-line hover:border-ink-dim",
                )}
              >
                <TemplatePreview id={id} label={TEMPLATE_META[id].label} />
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
          <ColorField
            label="Couleur du texte"
            value={style.color}
            onChange={(v) => setStyle({ color: v })}
            testid="color-text"
          />
          <ColorField
            label="Mot actif"
            value={style.highlightColor}
            onChange={(v) => setStyle({ highlightColor: v })}
            testid="color-highlight"
          />
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

        <button
          type="button"
          onClick={() => setDedupeRepetitions(!dedupeRepetitions)}
          data-testid="toggle-dedupe"
          data-active={dedupeRepetitions || undefined}
          className={cn(
            "flex min-h-11 items-center justify-between rounded-md border px-3 text-sm",
            dedupeRepetitions
              ? "border-brand bg-brand/10 text-ink"
              : "border-line text-ink-dim",
          )}
        >
          <span>Retirer les répétitions</span>
          <span className="font-mono text-xs">{dedupeRepetitions ? "ON" : "OFF"}</span>
        </button>
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
