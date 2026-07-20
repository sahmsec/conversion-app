import {
  BlockStack,
  Box,
  Checkbox,
  Divider,
  InlineGrid,
  InlineStack,
  RangeSlider,
  Select,
  Text,
  TextField,
} from "@shopify/polaris";
import type { GlobalWidgetSettings } from "../../lib/widget-config";

/**
 * The shared "Global Settings For Every Widget" panel (PRD). Fully controlled:
 * pass the current global settings + an onChange. Reused by every widget's
 * settings screen so all widgets get identical global controls for free.
 */
export function GlobalSettingsPanel({
  value,
  onChange,
}: {
  value: GlobalWidgetSettings;
  onChange: (next: GlobalWidgetSettings) => void;
}) {
  const patch = (partial: Partial<GlobalWidgetSettings>) =>
    onChange({ ...value, ...partial });

  const scheduleEnabled = value.schedule !== null;

  return (
    <BlockStack gap="500">
      {/* Visibility */}
      <BlockStack gap="200">
        <Text as="h3" variant="headingSm">
          Visibility
        </Text>
        <InlineStack gap="400">
          <Checkbox
            label="Show on desktop"
            checked={value.devices.desktop}
            onChange={(v) => patch({ devices: { ...value.devices, desktop: v } })}
          />
          <Checkbox
            label="Show on mobile"
            checked={value.devices.mobile}
            onChange={(v) => patch({ devices: { ...value.devices, mobile: v } })}
          />
        </InlineStack>
        <Select
          label="Position"
          options={[
            { label: "Bottom of screen", value: "bottom" },
            { label: "Top of screen", value: "top" },
          ]}
          value={value.position}
          onChange={(v) => patch({ position: v as GlobalWidgetSettings["position"] })}
        />
      </BlockStack>

      <Divider />

      {/* Colors */}
      <BlockStack gap="200">
        <Text as="h3" variant="headingSm">
          Colors
        </Text>
        <InlineGrid columns={{ xs: 1, sm: 3 }} gap="300">
          <ColorField
            label="Background"
            value={value.colors.bg}
            onChange={(bg) => patch({ colors: { ...value.colors, bg } })}
          />
          <ColorField
            label="Text"
            value={value.colors.text}
            onChange={(text) => patch({ colors: { ...value.colors, text } })}
          />
          <ColorField
            label="Accent / button"
            value={value.colors.accent}
            onChange={(accent) => patch({ colors: { ...value.colors, accent } })}
          />
        </InlineGrid>
      </BlockStack>

      <Divider />

      {/* Typography */}
      <BlockStack gap="200">
        <Text as="h3" variant="headingSm">
          Typography
        </Text>
        <RangeSlider
          label={`Font size: ${value.typography.fontSize}px`}
          min={10}
          max={32}
          value={value.typography.fontSize}
          onChange={(v) =>
            patch({ typography: { ...value.typography, fontSize: Number(v) } })
          }
          output
        />
        <Select
          label="Font weight"
          options={[
            { label: "Light (300)", value: "300" },
            { label: "Regular (400)", value: "400" },
            { label: "Medium (500)", value: "500" },
            { label: "Semibold (600)", value: "600" },
            { label: "Bold (700)", value: "700" },
            { label: "Extra bold (800)", value: "800" },
          ]}
          value={String(value.typography.fontWeight)}
          onChange={(v) =>
            patch({ typography: { ...value.typography, fontWeight: Number(v) } })
          }
        />
      </BlockStack>

      <Divider />

      {/* Animation */}
      <BlockStack gap="200">
        <Text as="h3" variant="headingSm">
          Animation
        </Text>
        <Select
          label="Entrance animation"
          options={[
            { label: "None", value: "none" },
            { label: "Fade", value: "fade" },
            { label: "Slide", value: "slide" },
          ]}
          value={value.animation.type}
          onChange={(v) =>
            patch({
              animation: {
                ...value.animation,
                type: v as GlobalWidgetSettings["animation"]["type"],
              },
            })
          }
        />
        <RangeSlider
          label={`Speed: ${value.animation.speedMs}ms`}
          min={0}
          max={1000}
          step={50}
          value={value.animation.speedMs}
          onChange={(v) =>
            patch({ animation: { ...value.animation, speedMs: Number(v) } })
          }
          output
        />
      </BlockStack>

      <Divider />

      {/* Scheduling */}
      <BlockStack gap="200">
        <Text as="h3" variant="headingSm">
          Scheduling
        </Text>
        <Checkbox
          label="Only show during a scheduled window"
          checked={scheduleEnabled}
          onChange={(on) =>
            patch({
              schedule: on ? { days: [0, 1, 2, 3, 4, 5, 6] } : null,
            })
          }
        />
        {scheduleEnabled && value.schedule && (
          <Box paddingInlineStart="400">
            <BlockStack gap="300">
              <InlineGrid columns={{ xs: 1, sm: 2 }} gap="300">
                <TextField
                  label="Start date"
                  type="date"
                  autoComplete="off"
                  value={value.schedule.start ?? ""}
                  onChange={(start) =>
                    patch({ schedule: { ...value.schedule!, start: start || undefined } })
                  }
                />
                <TextField
                  label="End date"
                  type="date"
                  autoComplete="off"
                  value={value.schedule.end ?? ""}
                  onChange={(end) =>
                    patch({ schedule: { ...value.schedule!, end: end || undefined } })
                  }
                />
              </InlineGrid>
              <DayPicker
                value={value.schedule.days}
                onChange={(days) => patch({ schedule: { ...value.schedule!, days } })}
              />
            </BlockStack>
          </Box>
        )}
      </BlockStack>
    </BlockStack>
  );
}

/** Hex text field paired with a native colour swatch. */
function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <BlockStack gap="100">
      <TextField
        label={label}
        value={value}
        autoComplete="off"
        onChange={onChange}
        connectedLeft={
          <input
            type="color"
            aria-label={`${label} colour`}
            value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#000000"}
            onChange={(e) => onChange(e.target.value)}
            style={{
              width: 36,
              height: 36,
              padding: 0,
              border: "none",
              background: "none",
              cursor: "pointer",
            }}
          />
        }
      />
    </BlockStack>
  );
}

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function DayPicker({
  value,
  onChange,
}: {
  value: number[];
  onChange: (days: number[]) => void;
}) {
  const toggle = (day: number) => {
    const set = new Set(value);
    set.has(day) ? set.delete(day) : set.add(day);
    onChange([...set].sort((a, b) => a - b));
  };
  return (
    <BlockStack gap="100">
      <Text as="span" variant="bodySm" tone="subdued">
        Active days
      </Text>
      <InlineStack gap="200">
        {DAY_LABELS.map((label, day) => (
          <Checkbox
            key={day}
            label={label}
            labelHidden={false}
            checked={value.includes(day)}
            onChange={() => toggle(day)}
          />
        ))}
      </InlineStack>
    </BlockStack>
  );
}
