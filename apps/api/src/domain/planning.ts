export const calculateCategoryAvailableMinor = ({
  priorAssignedMinor,
  priorActivityMinor,
  assignedMinor,
  activityMinor,
}: {
  priorAssignedMinor: number
  priorActivityMinor: number
  assignedMinor: number
  activityMinor: number
}) => priorAssignedMinor + priorActivityMinor + assignedMinor + activityMinor

export const calculateReadyToAssignMinor = ({
  incomeThroughMonthMinor,
  assignedThroughMonthMinor,
}: {
  incomeThroughMonthMinor: number
  assignedThroughMonthMinor: number
}) => incomeThroughMonthMinor - assignedThroughMonthMinor
