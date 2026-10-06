import * as zustandModule from 'zustand'
const create = zustandModule.create || zustandModule.default || zustandModule

const currentMonth = String(new Date().getMonth() + 1)

const useProduction_v2Store = create((set) => ({
  transferFilters: {
    month: currentMonth,
    dateFrom: '',
    dateTo: '',
    status: '',
    factory: '',
    stage: '',
    type: '',
    tab: 'pending',
    page: 1,
  },
  setTransferFilters: (partial) =>
    set((s) => ({ transferFilters: { ...s.transferFilters, ...partial } })),

  inspectionFilters: {
    month: currentMonth,
    tab: 'pending',
    page: 1,
  },
  setInspectionFilters: (partial) =>
    set((s) => ({ inspectionFilters: { ...s.inspectionFilters, ...partial } })),

  currentTransfer: null,
  setCurrentTransfer: (ticket) => set({ currentTransfer: ticket }),

  currentInspection: null,
  setCurrentInspection: (ticket) => set({ currentInspection: ticket }),
}))

export default useProduction_v2Store
