
export const useDateRange = (timeFilter: 'today' | 'yesterday' | 'week' | 'month') => {
  const getDateRange = () => {
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
        // For 'week', ensure endDate is also set to the end of today if not already
        // This example assumes 'now' is already the end of the day for 'week' if needed,
        // or that queries handle the 'endDate' inclusively/exclusively appropriately.
        // If 'week' should be a full 7 days from start of day 1 to end of day 7,
        // 'now' might need adjustment for 'week' as well.
        // For simplicity, current 'week' logic makes endDate as 'now'.
        break;
      case 'month': { // Added curly braces
        startDate.setDate(1); // First day of the current month
        startDate.setHours(0, 0, 0, 0); // Start of that day

        // Calculate endDate as the end of the last day of the current month
        // Create a new date for endDate to avoid modifying 'now' directly if 'now' is used elsewhere
        const monthEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Last day of current month
        monthEndDate.setHours(23, 59, 59, 999); // End of that day
        return { startDate, endDate: monthEndDate }; // Return explicitly for 'month'
      } // Added curly braces
    }

    return { startDate, endDate: now };
  };

  return getDateRange();
};
