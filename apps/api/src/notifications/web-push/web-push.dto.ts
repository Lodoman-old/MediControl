import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsUrl } from "class-validator";

export class WebPushSubscribeDto {
  @ApiProperty({ description: "Endpoint de la suscripcion Web Push" })
  @IsString()
  @IsUrl({ require_tld: false }, { message: "Endpoint invalido" })
  endpoint!: string;

  @ApiProperty({ description: "Llave publica p256dh del navegador" })
  @IsString()
  p256dh!: string;

  @ApiProperty({ description: "Secreto auth del navegador" })
  @IsString()
  auth!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userAgent?: string;
}

export class WebPushUnsubscribeDto {
  @ApiProperty({ description: "Endpoint de la suscripcion Web Push" })
  @IsString()
  endpoint!: string;
}
