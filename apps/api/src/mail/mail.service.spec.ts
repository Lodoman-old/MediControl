import { Test } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";
import { MailService } from "./mail.service";

jest.mock("nodemailer");

describe("MailService", () => {
  let svc: MailService;
  const mockSendMail = jest.fn().mockResolvedValue({ messageId: "test-id" });

  beforeAll(async () => {
    (nodemailer.createTransport as jest.Mock).mockReturnValue({ sendMail: mockSendMail });
    const mod = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              if (key === "SMTP_HOST") return "smtp.test.com";
              if (key === "SMTP_PORT") return 587;
              if (key === "SMTP_USER") return "user";
              if (key === "SMTP_PASS") return "pass";
              if (key === "SMTP_FROM") return "from@test.com";
              return undefined;
            },
          },
        },
      ],
    }).compile();
    svc = mod.get(MailService);
  });

  afterEach(() => mockSendMail.mockClear());

  it("sends email with attachment", async () => {
    await svc.sendReport(["to@test.com"], "Subject", "Body", Buffer.from("PDF"), "test.pdf");
    expect(mockSendMail).toHaveBeenCalledWith({
      from: "from@test.com",
      to: "to@test.com",
      subject: "Subject",
      text: "Body",
      attachments: [{ filename: "test.pdf", content: Buffer.from("PDF") }],
    });
  });

  it("sends to multiple recipients", async () => {
    await svc.sendReport(["a@test.com", "b@test.com"], "S", "B", Buffer.from("P"), "r.pdf");
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "a@test.com, b@test.com" }),
    );
  });

  it("uses default from address when SMTP_FROM not set", async () => {
    const mod = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string, defaultValue?: string) => {
              if (key === "SMTP_HOST") return "smtp.test.com";
              if (key === "SMTP_PORT") return 587;
              if (key === "SMTP_USER") return "user";
              if (key === "SMTP_PASS") return "pass";
              if (key === "SMTP_FROM") return defaultValue ?? "reportes@medicontrol.mx";
              return defaultValue;
            },
          },
        },
      ],
    }).compile();
    const svc2 = mod.get(MailService);
    await svc2.sendReport(["to@test.com"], "S", "B", Buffer.from("P"), "r.pdf");
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({ from: "reportes@medicontrol.mx" }),
    );
  });
});
