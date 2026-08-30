declare module "mailparser" {
  export function simpleParser(source: Buffer | string): Promise<{
    from?: { text?: string };
    subject?: string;
    text?: string;
    html?: string;
    messageId?: string;
    date?: Date;
  }>;
}
