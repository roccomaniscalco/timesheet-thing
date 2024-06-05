export const CONTRACTOR_STATUS = ['draft', 'submitted'] as const
export type ContractorStatus = (typeof CONTRACTOR_STATUS)[number]

export const MANAGER_STATUS = ['approved', 'rejected'] as const
export type ManagerStatus = (typeof MANAGER_STATUS)[number]

export const STATUS = [...CONTRACTOR_STATUS, ...MANAGER_STATUS] as const
export type Status = (typeof STATUS)[number]

export const WEEKDAY = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const
export type Weekday = (typeof WEEKDAY)[number]
