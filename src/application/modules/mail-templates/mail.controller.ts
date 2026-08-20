import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ClerkAuthGuard, Roles, RolesGuard } from '../../../common';
import { ERole } from '../../../infrastructure';
import { AppMailService } from '../../../common';
import { SendTestMailRequest } from './models';

@ApiBearerAuth()
@ApiTags('Mail')
@UseGuards(ClerkAuthGuard, RolesGuard)
@Roles(ERole.SuperAdmin)
@Controller({ path: 'mail', version: '1' })
export class MailController {
  constructor(
    private readonly mailService: AppMailService,
    @InjectPinoLogger(MailController.name) private readonly logger: PinoLogger,
  ) {}

  @ApiOperation({
    summary: 'Send a test email using a seeded template',
    description:
      'Renders a stored HTML template with the provided context and sends it via NodeMailer. Use this to verify mail configuration and template rendering.',
  })
  @ApiOkResponse({ schema: { type: 'object', properties: { sent: { type: 'boolean' } } } })
  @HttpCode(HttpStatus.OK)
  @Post('test')
  public async sendTest(@Body() body: SendTestMailRequest): Promise<{ sent: boolean }> {
    this.logger.info({ to: body.to, templateSlug: body.templateSlug }, 'Test mail request');
    await this.mailService.sendTemplatedAsync(
      body.to,
      body.templateSlug,
      body.context ?? {},
      body.subject,
    );
    return { sent: true };
  }

  @ApiOperation({ summary: 'Send a raw HTML email (no template lookup)' })
  @ApiOkResponse({ schema: { type: 'object', properties: { sent: { type: 'boolean' } } } })
  @HttpCode(HttpStatus.OK)
  @Post('send-raw')
  public async sendRaw(
    @Body() body: { to: string; subject: string; html: string },
  ): Promise<{ sent: boolean }> {
    await this.mailService.sendAsync({ to: body.to, subject: body.subject, html: body.html });
    return { sent: true };
  }
}
