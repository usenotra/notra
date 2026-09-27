// Convert Apple photos before the chat upload so the attachment and AI model both receive JPEG.
export async function prepareChatImage(file: File): Promise<File> {
  if (!/\.heic$/i.test(file.name) && file.type !== "image/heic") {
    return file;
  }
  const body = new FormData();
  body.set("file", file);
  const response = await fetch("/api/uploads/convert-heic", {
    method: "POST",
    body,
  });
  if (!response.ok) {
    throw new Error("Could not convert HEIC image");
  }
  return new File(
    [await response.blob()],
    `${file.name.replace(/\.heic$/i, "")}.jpg`,
    {
      type: "image/jpeg",
    }
  );
}
