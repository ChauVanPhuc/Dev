import { create } from 'zustand'

const useProduction_v2Store = create((set) => ({
  transferFilters: {
    month: '7',
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
    month: '7',
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
