import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { AppService } from "./app.service";
import { Public } from "./auth/decorators/public.decorator";

@ApiTags("General")
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: "Informacion de la API", description: "Devuelve version y estado" })
  getRoot() {
    return this.appService.info();
  }

  @Public()
  @Get("health")
  @ApiOperation({ summary: "Verificar salud del servicio", description: "Health check con DB y Redis" })
  getHealth() {
    return this.appService.health();
  }
}
