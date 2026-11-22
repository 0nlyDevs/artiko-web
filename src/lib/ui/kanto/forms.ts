"use client";

// The KANTO form controls as they are. They attach their own change handlers, so they cross into the
// browser here: a server component can render them, a client component gives them `onChange`.
export { TextField } from "@/kanto/components/text-field/TextField";
export type { TextAreaFieldProps, TextFieldProps } from "@/kanto/components/text-field/TextField";
export { ChoiceTiles } from "@/kanto/components/choice-tile/ChoiceTile";
export type { ChoiceOption, ChoiceTilesProps } from "@/kanto/components/choice-tile/ChoiceTile";
export { Checkbox } from "@/kanto/components/checkbox/Checkbox";
export type { CheckboxProps } from "@/kanto/components/checkbox/Checkbox";
