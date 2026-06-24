declare module "qrcode-terminal" {
  interface QrcodeTerminal {
    generate(
      input: string,
      options: { small?: boolean },
      callback: (qr: string) => void,
    ): void;
  }

  const qrcode: QrcodeTerminal;
  export default qrcode;
  export function generate(
    input: string,
    options: { small?: boolean },
    callback: (qr: string) => void,
  ): void;
}
