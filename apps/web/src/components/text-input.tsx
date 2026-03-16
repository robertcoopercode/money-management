import { Input, type InputProps } from "@base-ui/react/input"
import { forwardRef } from "react"

export const TextInput = forwardRef<HTMLInputElement, InputProps>(
  function TextInput(props, ref) {
    return (
      <Input
        ref={ref}
        {...props}
        className={
          props.className
            ? `app-text-input ${props.className}`
            : "app-text-input"
        }
      />
    )
  },
)
