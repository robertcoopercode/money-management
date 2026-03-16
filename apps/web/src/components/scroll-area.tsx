import type { ComponentPropsWithoutRef } from "react"
import { ScrollArea as BaseScrollArea } from "@base-ui/react/scroll-area"

type ScrollAreaProps = ComponentPropsWithoutRef<typeof BaseScrollArea.Root> & {
  orientation?: "vertical" | "horizontal" | "both"
}

export function ScrollArea({
  children,
  className,
  orientation = "vertical",
  ...props
}: ScrollAreaProps) {
  return (
    <BaseScrollArea.Root className={`scroll-area ${className ?? ""}`} {...props}>
      <BaseScrollArea.Viewport className="scroll-area-viewport">
        <BaseScrollArea.Content className="scroll-area-content">
          {children}
        </BaseScrollArea.Content>
      </BaseScrollArea.Viewport>
      {(orientation === "vertical" || orientation === "both") && (
        <BaseScrollArea.Scrollbar
          orientation="vertical"
          className="scroll-area-scrollbar scroll-area-scrollbar-vertical"
        >
          <BaseScrollArea.Thumb className="scroll-area-thumb" />
        </BaseScrollArea.Scrollbar>
      )}
      {(orientation === "horizontal" || orientation === "both") && (
        <BaseScrollArea.Scrollbar
          orientation="horizontal"
          className="scroll-area-scrollbar scroll-area-scrollbar-horizontal"
        >
          <BaseScrollArea.Thumb className="scroll-area-thumb" />
        </BaseScrollArea.Scrollbar>
      )}
      {orientation === "both" && <BaseScrollArea.Corner className="scroll-area-corner" />}
    </BaseScrollArea.Root>
  )
}
