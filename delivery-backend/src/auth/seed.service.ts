import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { Role } from './roles.enum';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.createDefaultAdmin();
  }

  private async createDefaultAdmin() {
    const adminEmail = this.configService.get<string>('ADMIN_EMAIL');
    const adminPassword = this.configService.get<string>('ADMIN_PASSWORD');

    if (!adminEmail || !adminPassword) {
      this.logger.warn(
        'ADMIN_EMAIL o ADMIN_PASSWORD no definidos en .env — no se creara el admin por defecto',
      );
      return;
    }

    const existingAdmin = await this.usersService.findByEmail(adminEmail);

    if (existingAdmin) {
      this.logger.log(`Admin ya existe: ${adminEmail}`);
      return;
    }

    await this.usersService.create({
      name: 'Administrador',
      email: adminEmail,
      password: adminPassword,
      role: Role.ADMIN,
    });

    this.logger.log(`Admin creado exitosamente: ${adminEmail}`);
  }
}
