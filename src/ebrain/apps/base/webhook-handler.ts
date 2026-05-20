export interface IncomingRequest {
  headers: Record<string, string | string[] | undefined>;
  rawBody: string | Uint8Array;
}

export interface Event {
  eventId: string;
  eventType: string;
  receivedAt: Date;
  /** Vendor-neutral envelope; concrete handlers narrow payload internally. */
  payload: unknown;
}

export interface WebhookHandler {
  verify(req: IncomingRequest): Promise<boolean>;
  decode(req: IncomingRequest): Promise<Event>;
}
