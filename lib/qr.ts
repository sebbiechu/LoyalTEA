import QRCode from "qrcode";

/**
 * Generate a QR code data URL encoding the user's UUID.
 */
export async function generateQRCode(userId: string): Promise<string> {
  const dataUrl = await QRCode.toDataURL(userId, {
    width: 300,
    margin: 2,
    color: {
      dark: "#2D6A4F",
      light: "#FEFAE0",
    },
  });
  return dataUrl;
}
