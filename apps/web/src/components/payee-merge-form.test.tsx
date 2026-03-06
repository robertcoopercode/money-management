import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { PayeeMergeForm } from "./payee-merge-form.js"

const payees = [
  { id: "payee-1", name: "Coffee Shop" },
  { id: "payee-2", name: "Grocery Store" },
]

afterEach(() => {
  cleanup()
})

describe("PayeeMergeForm", () => {
  it("shows disabled submit state when selections are incomplete", () => {
    render(
      <PayeeMergeForm
        payees={payees}
        selection={{ sourcePayeeId: "", targetPayeeId: "" }}
        isPending={false}
        onSelectionChange={vi.fn()}
        onValidSubmit={vi.fn()}
        onInvalidSubmit={vi.fn()}
      />,
    )

    expect(
      screen.getByText("Select both a source and target payee."),
    ).toBeTruthy()
    expect(screen.getByRole("button", { name: "Merge Payees" })).toHaveProperty(
      "disabled",
      true,
    )
  })

  it("submits only when source and target payees differ", async () => {
    const user = userEvent.setup()
    const onSelectionChange = vi.fn()
    const onValidSubmit = vi.fn()
    const onInvalidSubmit = vi.fn()

    render(
      <PayeeMergeForm
        payees={payees}
        selection={{ sourcePayeeId: "payee-1", targetPayeeId: "payee-2" }}
        isPending={false}
        onSelectionChange={onSelectionChange}
        onValidSubmit={onValidSubmit}
        onInvalidSubmit={onInvalidSubmit}
      />,
    )

    await user.click(screen.getByRole("button", { name: "Merge Payees" }))

    expect(onValidSubmit).toHaveBeenCalledTimes(1)
    expect(onInvalidSubmit).not.toHaveBeenCalled()

    await user.selectOptions(
      screen.getByLabelText("Source (duplicate)"),
      "payee-2",
    )
    expect(onSelectionChange).toHaveBeenCalledWith({
      sourcePayeeId: "payee-2",
      targetPayeeId: "payee-2",
    })
  })
})
