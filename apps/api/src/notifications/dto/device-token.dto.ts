import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsIn } from "class-validator";

export class RegisterDeviceDto {
  @ApiProperty()
  @IsString()
  token!: string;

  @ApiProperty({ enum: ["android", "ios", "web"] })
  @IsIn(["android", "ios", "web"])
  platform!: string;
}

export class UnregisterDeviceDto {
  @ApiProperty()
  @IsString()
  token!: string;
}
