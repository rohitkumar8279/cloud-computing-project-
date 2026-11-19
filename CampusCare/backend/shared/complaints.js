// Shapes stored items for API responses (drops internal attributes).
export function toApi(item) {
  if (!item) return null;
  // eslint-disable-next-line no-unused-vars
  const { entityType, ...rest } = item;
  return {
    adminRemarks: '',
    assignedTo: '',
    statusHistory: [],
    ...rest,
  };
}

/** Lighter shape for list views. */
export function toListItem(item) {
  return {
    complaintId: item.complaintId,
    title: item.title,
    category: item.category,
    department: item.department,
    status: item.status,
    studentName: item.studentName,
    studentEmail: item.studentEmail,
    location: item.location,
    hasAttachment: Boolean(item.attachmentKey),
    assignedTo: item.assignedTo || '',
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    lastStatusChangeAt: item.lastStatusChangeAt || item.createdAt,
  };
}
