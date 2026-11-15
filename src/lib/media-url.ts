/**
 * Public URL for a stored photo. The version suffix lets us invalidate any browser-cached
 * responses if the way /media serves files ever changes (bump it then).
 */
const MEDIA_VERSION = "2";

export const mediaUrl = (id: string | null) => (id ? `/media/${id}?v=${MEDIA_VERSION}` : "");
