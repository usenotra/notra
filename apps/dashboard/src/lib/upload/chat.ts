export function dragEventHasFiles(event: DragEvent): boolean {
  const types = event.dataTransfer?.types;
  if (!types) {
    return false;
  }
  for (const type of types) {
    if (type === "Files") {
      return true;
    }
  }
  return false;
}
