// ... existing code ...
const messagesQuery = useInfiniteQuery({
  queryKey: ['messages', selectedConversation?.id],
  queryFn: ({ pageParam = 1 }) => {
    if (!selectedConversation?.id) {
      throw new Error('No conversation selected');
    }
    return fetchMessages(selectedConversation.id, pageParam, pageSize);
  },
  enabled: !!selectedConversation?.id,
  initialPageParam: 1,
  getNextPageParam: (lastPageData, allPagesData) => {
    // Only log in development to reduce console noise
    if (process.env.NODE_ENV === 'development') {
      console.log('getNextPageParam called:', {
        lastPageLength: lastPageData.length,
        pageSize,
        totalPages: allPagesData.length
      });
    }
    
    // If the last page has fewer items than pageSize, we've reached the end
    if (lastPageData.length < pageSize) {
      return undefined;
    }
    
    // Return the next page number
    const nextPage = allPagesData.length + 1;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Returning next page:', nextPage);
    }
    
    return nextPage;
  },
  // ... existing code ...
});
// ... existing code ...