export class WhatsAppConnectorError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "WhatsAppConnectorError";
    this.code = code;
  }
}
