// The KANTO kit of the app pages: the pieces of the Figma components frame (186:423) and the KANTO
// controls that screens reuse. Everything here reads the tokens of src/kanto/styles/tokens.css, which
// the (app) layout loads through globals.css. Server components can import any of it: the pieces that
// need the browser are marked as client components in their own file.

// New pieces
export { CategoryChip, CategoryChipGroup } from "./category-chip";
export type { CategoryChipGroupProps, CategoryChipProps } from "./category-chip";
export { Switch } from "./switch";
export type { SwitchProps } from "./switch";
export { UnderlinedField } from "./underlined-field";
export type { UnderlinedFieldProps } from "./underlined-field";
export { WorkRow, WorkRowLink, WorkRows } from "./work-row";
export type { WorkRowProps } from "./work-row";
export { Cartel } from "./cartel";
export type { CartelProps } from "./cartel";
export { PantheonFrame } from "./pantheon-frame";
export type { PantheonFrameProps } from "./pantheon-frame";
export { BadgeLabel } from "./badge-label";
export type { BadgeLabelProps } from "./badge-label";
export { badgeState } from "./badge-state";
export type { BadgeState } from "./badge-state";

// KANTO pieces as they are
export { Button } from "@/kanto/components/button/Button";
export type { ButtonProps, ButtonVariant } from "@/kanto/components/button/Button";
export { WoodFrame } from "@/kanto/components/wood-frame/WoodFrame";
export type { WoodFrameProps } from "@/kanto/components/wood-frame/WoodFrame";
export { Checkbox, ChoiceTiles, TextField } from "./forms";
export type { CheckboxProps, ChoiceOption, ChoiceTilesProps, TextAreaFieldProps, TextFieldProps } from "./forms";

// KANTO pieces redrawn for the app: same stylesheet, next/link and the three languages
export { ButtonLink } from "./button-link";
export type { ButtonLinkProps } from "./button-link";
export { DropZone } from "./drop-zone";
export type { DropZoneProps } from "./drop-zone";
export { StatusBanner } from "./status-banner";
export type { BannerTone, StatusBannerProps } from "./status-banner";
export { Stepper } from "./stepper";
export type { StepperProps, StepperStep } from "./stepper";
export { Tracker } from "./tracker";
export type { TrackerState, TrackerStep } from "./tracker";
export { DemoBadge } from "./demo-badge";
export type { DemoBadgeProps } from "./demo-badge";
