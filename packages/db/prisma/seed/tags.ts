export type TagSeed = {
  name: string
  normalizedName: string
  description: string
  backgroundColor: string
  textColor: string
}

export const tags: TagSeed[] = [
  {
    name: "HOCKEY",
    normalizedName: "HOCKEY",
    description: "Hockey league expenses",
    backgroundColor: "#DC2626",
    textColor: "#FFFFFF",
  },
  {
    name: "RUNNING",
    normalizedName: "RUNNING",
    description: "Running gear & race fees",
    backgroundColor: "#059669",
    textColor: "#FFFFFF",
  },
  {
    name: "DATE NIGHT",
    normalizedName: "DATE NIGHT",
    description: "Date night outings",
    backgroundColor: "#F472B6",
    textColor: "#831843",
  },
  {
    name: "WORK EXPENSE",
    normalizedName: "WORK EXPENSE",
    description: "Reimbursable work purchases",
    backgroundColor: "#F59E0B",
    textColor: "#78350F",
  },
  {
    name: "COTTAGE WEEKEND",
    normalizedName: "COTTAGE WEEKEND",
    description: "Muskoka cottage trip expenses",
    backgroundColor: "#A5B4FC",
    textColor: "#312E81",
  },
  {
    name: "CAMPING",
    normalizedName: "CAMPING",
    description: "Camping & outdoor trip gear",
    backgroundColor: "#065F46",
    textColor: "#ECFDF5",
  },
  {
    name: "MEAL PREP",
    normalizedName: "MEAL PREP",
    description: "Bulk grocery hauls for meal prep",
    backgroundColor: "#7C3AED",
    textColor: "#FFFFFF",
  },
  {
    name: "GIFTS",
    normalizedName: "GIFTS",
    description: "Gift-related purchases",
    backgroundColor: "#EC4899",
    textColor: "#FFFFFF",
  },
  {
    name: "HOME PROJECT",
    normalizedName: "HOME PROJECT",
    description: "Patio and home improvement purchases",
    backgroundColor: "#D97706",
    textColor: "#FFFFFF",
  },
  {
    name: "PET",
    normalizedName: "PET",
    description: "All Mango-related expenses",
    backgroundColor: "#06B6D4",
    textColor: "#FFFFFF",
  },
]
