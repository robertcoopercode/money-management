import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { CategoryAutocomplete } from "./category-autocomplete.js"

const categoryGroups = [
  {
    id: "group-fixed",
    name: "Fixed / Annual",
    categories: [
      { id: "rent", name: "Rent" },
      { id: "hydro", name: "Hydro" },
    ],
  },
  {
    id: "group-variable",
    name: "Variable",
    categories: [{ id: "groceries", name: "Groceries" }],
  },
]

afterEach(() => {
  cleanup()
})

describe("CategoryAutocomplete", () => {
  it("filters categories while typing", async () => {
    const user = userEvent.setup()

    render(
      <CategoryAutocomplete
        categoryGroups={categoryGroups}
        value=""
        onChange={vi.fn()}
      />,
    )

    const input = screen.getByRole("combobox")
    await user.click(input)
    await user.type(input, "hydr")

    expect(screen.getByRole("option", { name: /Hydro/i })).toBeTruthy()
    expect(screen.queryByRole("option", { name: /Rent/i })).toBeNull()
  })

  it("selects an existing category from filtered results", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <CategoryAutocomplete
        categoryGroups={categoryGroups}
        value=""
        onChange={onChange}
      />,
    )

    const input = screen.getByRole("combobox")
    await user.click(input)
    await user.type(input, "ren")
    await user.click(screen.getByRole("option", { name: /Rent/i }))

    expect(onChange).toHaveBeenLastCalledWith("rent")
  })

  it("shows create button only when no category matches", async () => {
    const user = userEvent.setup()
    const onCreateCategory = vi
      .fn()
      .mockResolvedValue({ id: "new", name: "Car Insurance" })

    render(
      <CategoryAutocomplete
        categoryGroups={categoryGroups}
        value=""
        onChange={vi.fn()}
        onCreateCategory={onCreateCategory}
      />,
    )

    const input = screen.getByRole("combobox")
    await user.click(input)
    await user.type(input, "Car Insurance")

    const createOption = screen.getByRole("option", {
      name: /Create "Car Insurance" Category/i,
    })
    await user.click(createOption)

    expect(onCreateCategory).toHaveBeenCalledWith("Car Insurance")
  })
})
