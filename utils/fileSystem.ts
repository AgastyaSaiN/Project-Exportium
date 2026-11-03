/** A File chosen through a folder picker also knows where it sat inside that folder. */
export type PickedFile = File & { webkitRelativePath?: string };

export const relativePathOf = (file: File): string =>
    (file as PickedFile).webkitRelativePath || file.name;
