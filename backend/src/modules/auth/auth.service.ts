import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../../database/entities/user.entity';
import { RefreshToken } from '../../database/entities/refresh-token.entity';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private config: ConfigService,
    @InjectRepository(RefreshToken)
    private refreshTokenRepo: Repository<RefreshToken>,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersService.findByEmail(email);
    if (user && (await bcrypt.compare(password, user.passwordHash))) {
      return user;
    }
    return null;
  }

  async login(user: User) {
    const tokens = await this.issueTokens(user);
    await this.updateLastLogin(user.id);
    return {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      user: this.sanitizeUser(user),
    };
  }

  async refresh(refreshToken: string) {
    const tokenEntity = await this.refreshTokenRepo.findOne({
      where: { token: refreshToken },
      relations: ['user'],
    });
    if (!tokenEntity || tokenEntity.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    await this.refreshTokenRepo.delete({ id: tokenEntity.id });
    return this.issueTokens(tokenEntity.user);
  }

  async logout(userId: string, token?: string) {
    if (token) {
      await this.refreshTokenRepo.delete({ token, userId });
    } else {
      await this.refreshTokenRepo.delete({ userId });
    }
    return { message: 'Logged out' };
  }

  private async issueTokens(user: User) {
    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.config.get('jwt.accessExpiresIn') || '30m',
    });
    const refreshExpiresIn = this.config.get('jwt.refreshExpiresIn') || '7d';
    const refreshToken = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await this.refreshTokenRepo.save({
      userId: user.id,
      token: refreshToken,
      expiresAt,
    });
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      accessToken,
      refreshToken,
    };
  }

  private async updateLastLogin(userId: string) {
    await this.usersService.updateLastLogin(userId);
  }

  sanitizeUser(user: User) {
    const { passwordHash, ...rest } = user;
    return rest;
  }
}
