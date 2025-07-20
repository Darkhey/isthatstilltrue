import "@ncdai/react-wheel-picker/style.css";

import * as WheelPickerPrimitive from "@ncdai/react-wheel-picker";

import { cn } from "@/lib/utils";

type WheelPickerOption = WheelPickerPrimitive.WheelPickerOption;
type WheelPickerClassNames = WheelPickerPrimitive.WheelPickerClassNames;

function WheelPickerWrapper({
  className,
  ...props
}: React.ComponentProps<typeof WheelPickerPrimitive.WheelPickerWrapper>) {
  return (
    <WheelPickerPrimitive.WheelPickerWrapper
      className={cn(
        "w-56 rounded-lg border border-border bg-background px-1 shadow-sm",
        "*:data-rwp:first:*:data-rwp-highlight-wrapper:rounded-s-md",
        "*:data-rwp:last:*:data-rwp-highlight-wrapper:rounded-e-md",
        className
      )}
      {...props}
    />
  );
}

function WheelPicker({
  classNames,
  ...props
}: React.ComponentProps<typeof WheelPickerPrimitive.WheelPicker>) {
  return (
    <WheelPickerPrimitive.WheelPicker
      classNames={{
        optionItem: "text-muted-foreground",
        highlightWrapper:
          "bg-muted text-foreground",
        ...classNames,
      }}
      {...props}
    />
  );
}

export { WheelPicker, WheelPickerWrapper };
export type { WheelPickerClassNames, WheelPickerOption };