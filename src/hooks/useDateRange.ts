
export const useDateRange = (
  timeFilter: 'today' | 'yesterday' | 'week' | 'month' | 'custom',
  customDateRange?: { from: Date; to: Date }
) => {
  const getDateRange = () => {
    if (timeFilter === 'custom' && customDateRange?.from && customDateRange?.to) {
      return { startDate: customDateRange.from, endDate: customDateRange.to };
    }

    const now = new Date();
    const startDate = new Date();

    switch (timeFilter) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'yesterday':
        startDate.setDate(now.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        now.setDate(now.getDate() - 1);
        now.setHours(23, 59, 59, 999);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month': {
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        const monthEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        monthEndDate.setHours(23, 59, 59, 999);
        return { startDate, endDate: monthEndDate };
      }
    }

    return { startDate, endDate: now };
  };

  return getDateRange();
};
