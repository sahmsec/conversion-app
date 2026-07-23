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
import type {
  GlobalWidgetSettings,
  Targeting,
  WidgetStyle,
} from "../../lib/widget-config";

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
        <Checkbox
          label="Let shoppers dismiss (✕)"
          checked={value.dismissible}
          onChange={(v) => patch({ dismissible: v })}
          helpText="Adds a close button; stays closed for the rest of the visit."
        />
      </BlockStack>

      <Divider />

      {/* Display rules */}
      <BlockStack gap="200">
        <Text as="h3" variant="headingSm">
          Where to show
        </Text>
        <Select
          label="Pages"
          options={[
            { label: "All pages", value: "all" },
            { label: "Home page", value: "home" },
            { label: "Product pages", value: "product" },
            { label: "Collection pages", value: "collection" },
            { label: "Cart page", value: "cart" },
          ]}
          value={value.targeting.pages}
          onChange={(p) =>
            patch({ targeting: { ...value.targeting, pages: p as Targeting["pages"] } })
          }
        />
        {value.targeting.pages === "product" && (
          <TextField
            label="Only these products (optional)"
            value={value.targeting.productHandles.join("\n")}
            onChange={(v) =>
              patch({ targeting: { ...value.targeting, productHandles: v.split("\n") } })
            }
            helpText="Product handles, one per line (the end of the product URL, e.g. blue-t-shirt). Leave blank for all products."
            autoComplete="off"
            multiline={2}
          />
        )}
        {value.targeting.pages === "collection" && (
          <TextField
            label="Only these collections (optional)"
            value={value.targeting.collectionHandles.join("\n")}
            onChange={(v) =>
              patch({ targeting: { ...value.targeting, collectionHandles: v.split("\n") } })
            }
            helpText="Collection handles, one per line. Leave blank for all collections."
            autoComplete="off"
            multiline={2}
          />
        )}
        <TextField
          label="Countries (optional)"
          value={value.targeting.countries.join(", ")}
          onChange={(v) =>
            patch({ targeting: { ...value.targeting, countries: v.split(/[\s,]+/) } })
          }
          helpText="2-letter country codes (e.g. US, CA, GB), comma-separated. Leave blank to show in all countries."
          autoComplete="off"
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

      {/* Shape & style */}
      <BlockStack gap="200">
        <Text as="h3" variant="headingSm">
          Shape &amp; style
        </Text>
        <Select
          label="Form factor"
          options={[
            { label: "Full-width bar", value: "bar" },
            { label: "Floating pill", value: "pill" },
            { label: "Boxed card", value: "boxed" },
          ]}
          value={value.style.formFactor}
          onChange={(v) =>
            patch({ style: { ...value.style, formFactor: v as WidgetStyle["formFactor"] } })
          }
          helpText="Full-width spans the screen edge; pill and boxed float as a centered, rounded shape."
        />
        {value.style.formFactor !== "bar" && (
          <InlineGrid columns={{ xs: 1, sm: 2 }} gap="300">
            <RangeSlider
              label={`Corner radius: ${value.style.radius}px`}
              min={0}
              max={40}
              value={value.style.radius}
              onChange={(v) => patch({ style: { ...value.style, radius: Number(v) } })}
              output
            />
            <TextField
              label="Max width (px)"
              type="number"
              min={0}
              value={String(value.style.maxWidth)}
              onChange={(v) =>
                patch({ style: { ...value.style, maxWidth: Math.max(0, parseInt(v, 10) || 0) } })
              }
              autoComplete="off"
              helpText="0 = auto"
            />
          </InlineGrid>
        )}
        <TextField
          label="Leading icon (optional)"
          value={value.style.icon}
          onChange={(v) => patch({ style: { ...value.style, icon: v } })}
          helpText="An emoji shown before the text, e.g. 🚚 or 🔥."
          autoComplete="off"
          maxLength={8}
        />
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

      {/* Custom CSS */}
      <BlockStack gap="200">
        <Text as="h3" variant="headingSm">
          Custom CSS
        </Text>
        <TextField
          label="Custom CSS"
          labelHidden
          value={value.customCss}
          onChange={(v) => patch({ customCss: v })}
          multiline={4}
          autoComplete="off"
          monospaced
          placeholder=".searchaly-bar { letter-spacing: 0.02em; }"
          helpText="Advanced — CSS applied to this widget on your storefront. Target .searchaly-bar, .searchaly-pop, .searchaly-sticky, etc."
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
